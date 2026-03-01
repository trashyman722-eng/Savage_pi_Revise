import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { EventEmitter } from "events";

/**
 * Handshake Manager
 * Manages local handshake storage, indexing, and cracking coordination
 */

export interface HandshakeMetadata {
  id: string;
  bssid: string;
  ssid: string;
  filePath: string;
  fileHash: string;
  fileSize: number;
  capturedAt: Date;
  crackStatus: "captured" | "uploading" | "cracking" | "cracked" | "failed";
  crackedPassword?: string;
  crackMethod?: string; // "local" | "wpa-sec" | "online"
  crackProgress?: number; // 0-100
  uploadedToWpaSec?: boolean;
  wpaSecJobId?: string;
  tags: string[];
  notes?: string;
}

export class HandshakeManager extends EventEmitter {
  private storageDir: string;
  private metadataFile: string;
  private metadata: Map<string, HandshakeMetadata> = new Map();

  constructor(storageDir: string) {
    super();
    this.storageDir = storageDir;
    this.metadataFile = path.join(storageDir, ".handshakes.json");

    // Create storage directory if it doesn't exist
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    // Load existing metadata
    this.loadMetadata();
  }

  /**
   * Add a new handshake to the manager
   */
  async addHandshake(
    bssid: string,
    ssid: string,
    sourcePath: string
  ): Promise<HandshakeMetadata> {
    try {
      // Generate unique ID
      const id = crypto.randomBytes(8).toString("hex");

      // Read file and calculate hash
      const fileData = fs.readFileSync(sourcePath);
      const fileHash = crypto
        .createHash("sha256")
        .update(fileData)
        .digest("hex");

      // Check if handshake already exists
      const existing = Array.from(this.metadata.values()).find(
        (h) => h.fileHash === fileHash
      );

      if (existing) {
        this.emit("duplicate_handshake", existing);
        return existing;
      }

      // Copy file to storage
      const fileName = `${bssid.replace(/:/g, "_")}_${id}.cap`;
      const destPath = path.join(this.storageDir, fileName);
      fs.copyFileSync(sourcePath, destPath);

      // Create metadata
      const metadata: HandshakeMetadata = {
        id,
        bssid: bssid.toUpperCase(),
        ssid,
        filePath: destPath,
        fileHash,
        fileSize: fileData.length,
        capturedAt: new Date(),
        crackStatus: "captured",
        tags: [],
      };

      this.metadata.set(id, metadata);
      this.saveMetadata();

      this.emit("handshake_added", metadata);
      return metadata;
    } catch (error) {
      console.error("[HandshakeManager] Failed to add handshake:", error);
      throw error;
    }
  }

  /**
   * Get all handshakes
   */
  getAllHandshakes(): HandshakeMetadata[] {
    return Array.from(this.metadata.values());
  }

  /**
   * Get handshakes by BSSID
   */
  getHandshakesByBssid(bssid: string): HandshakeMetadata[] {
    return Array.from(this.metadata.values()).filter(
      (h) => h.bssid === bssid.toUpperCase()
    );
  }

  /**
   * Get handshakes by crack status
   */
  getHandshakesByStatus(
    status: HandshakeMetadata["crackStatus"]
  ): HandshakeMetadata[] {
    return Array.from(this.metadata.values()).filter(
      (h) => h.crackStatus === status
    );
  }

  /**
   * Get handshake by ID
   */
  getHandshake(id: string): HandshakeMetadata | undefined {
    return this.metadata.get(id);
  }

  /**
   * Update handshake crack status
   */
  updateCrackStatus(
    id: string,
    status: HandshakeMetadata["crackStatus"],
    password?: string,
    method?: string
  ): HandshakeMetadata | undefined {
    const handshake = this.metadata.get(id);

    if (!handshake) {
      return undefined;
    }

    handshake.crackStatus = status;

    if (password) {
      handshake.crackedPassword = password;
    }

    if (method) {
      handshake.crackMethod = method;
    }

    if (status === "cracked") {
      handshake.crackProgress = 100;
    }

    this.saveMetadata();
    this.emit("crack_status_updated", handshake);

    return handshake;
  }

  /**
   * Update crack progress
   */
  updateCrackProgress(id: string, progress: number): void {
    const handshake = this.metadata.get(id);

    if (handshake) {
      handshake.crackProgress = Math.min(100, Math.max(0, progress));
      this.saveMetadata();
      this.emit("crack_progress_updated", handshake);
    }
  }

  /**
   * Mark handshake as uploaded to wpa-sec
   */
  markUploadedToWpaSec(id: string, jobId: string): void {
    const handshake = this.metadata.get(id);

    if (handshake) {
      handshake.uploadedToWpaSec = true;
      handshake.wpaSecJobId = jobId;
      handshake.crackStatus = "uploading";
      this.saveMetadata();
      this.emit("uploaded_to_wpasec", handshake);
    }
  }

  /**
   * Add tag to handshake
   */
  addTag(id: string, tag: string): void {
    const handshake = this.metadata.get(id);

    if (handshake && !handshake.tags.includes(tag)) {
      handshake.tags.push(tag);
      this.saveMetadata();
      this.emit("tag_added", { id, tag });
    }
  }

  /**
   * Remove tag from handshake
   */
  removeTag(id: string, tag: string): void {
    const handshake = this.metadata.get(id);

    if (handshake) {
      handshake.tags = handshake.tags.filter((t) => t !== tag);
      this.saveMetadata();
      this.emit("tag_removed", { id, tag });
    }
  }

  /**
   * Add note to handshake
   */
  addNote(id: string, note: string): void {
    const handshake = this.metadata.get(id);

    if (handshake) {
      handshake.notes = note;
      this.saveMetadata();
      this.emit("note_added", { id, note });
    }
  }

  /**
   * Delete handshake
   */
  deleteHandshake(id: string): boolean {
    const handshake = this.metadata.get(id);

    if (!handshake) {
      return false;
    }

    try {
      // Delete file
      if (fs.existsSync(handshake.filePath)) {
        fs.unlinkSync(handshake.filePath);
      }

      // Remove from metadata
      this.metadata.delete(id);
      this.saveMetadata();

      this.emit("handshake_deleted", id);
      return true;
    } catch (error) {
      console.error("[HandshakeManager] Failed to delete handshake:", error);
      return false;
    }
  }

  /**
   * Export handshake file
   */
  exportHandshake(id: string, destPath: string): boolean {
    const handshake = this.metadata.get(id);

    if (!handshake) {
      return false;
    }

    try {
      fs.copyFileSync(handshake.filePath, destPath);
      this.emit("handshake_exported", { id, destPath });
      return true;
    } catch (error) {
      console.error("[HandshakeManager] Failed to export handshake:", error);
      return false;
    }
  }

  /**
   * Get handshake file content
   */
  getHandshakeFile(id: string): Buffer | null {
    const handshake = this.metadata.get(id);

    if (!handshake || !fs.existsSync(handshake.filePath)) {
      return null;
    }

    try {
      return fs.readFileSync(handshake.filePath);
    } catch (error) {
      console.error("[HandshakeManager] Failed to read handshake file:", error);
      return null;
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    const all = Array.from(this.metadata.values());

    return {
      total: all.length,
      captured: all.filter((h) => h.crackStatus === "captured").length,
      cracking: all.filter((h) => h.crackStatus === "cracking").length,
      cracked: all.filter((h) => h.crackStatus === "cracked").length,
      failed: all.filter((h) => h.crackStatus === "failed").length,
      uploadedToWpaSec: all.filter((h) => h.uploadedToWpaSec).length,
      totalSize: all.reduce((sum, h) => sum + h.fileSize, 0),
    };
  }

  /**
   * Search handshakes
   */
  search(query: string): HandshakeMetadata[] {
    const lowerQuery = query.toLowerCase();

    return Array.from(this.metadata.values()).filter(
      (h) =>
        h.bssid.toLowerCase().includes(lowerQuery) ||
        h.ssid.toLowerCase().includes(lowerQuery) ||
        h.id.includes(lowerQuery) ||
        h.tags.some((t) => t.toLowerCase().includes(lowerQuery)) ||
        h.crackedPassword?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Load metadata from disk
   */
  private loadMetadata(): void {
    try {
      if (fs.existsSync(this.metadataFile)) {
        const data = fs.readFileSync(this.metadataFile, "utf-8");
        const parsed = JSON.parse(data);

        for (const [id, metadata] of Object.entries(parsed)) {
          const m = metadata as any;
          this.metadata.set(id, {
            ...m,
            capturedAt: new Date(m.capturedAt),
          });
        }

        console.log(
          `[HandshakeManager] Loaded ${this.metadata.size} handshakes from disk`
        );
      }
    } catch (error) {
      console.error("[HandshakeManager] Failed to load metadata:", error);
    }
  }

  /**
   * Save metadata to disk
   */
  private saveMetadata(): void {
    try {
      const data: Record<string, HandshakeMetadata> = {};

      const entries = Array.from(this.metadata.entries());
      for (const [id, metadata] of entries) {
        data[id] = metadata;
      }

      fs.writeFileSync(this.metadataFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("[HandshakeManager] Failed to save metadata:", error);
    }
  }
}
