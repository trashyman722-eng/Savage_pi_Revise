import { EventEmitter } from "events";
import { BettercapWrapper, BettercapConfig, AccessPoint } from "./bettercap-wrapper";
import { HandshakeManager, HandshakeMetadata } from "./handshake-manager";
import { getOrchestrator } from "../orchestration";

/**
 * Hunting Orchestrator
 * Coordinates bettercap reconnaissance and handshake capture
 */

export interface HuntingConfig {
  interface: string;
  outputDir: string;
  channels?: number[];
  dwellTime?: number;
  aggressiveness?: "low" | "medium" | "high";
  autoDeauth?: boolean;
  targetSSIDs?: string[];
}

export interface HuntingStats {
  isRunning: boolean;
  accessPointsDiscovered: number;
  handshakesCaptured: number;
  clientsDetected: number;
  elapsedTime: number;
}

export class HuntingOrchestrator extends EventEmitter {
  private bettercap: BettercapWrapper | null = null;
  private handshakeManager: HandshakeManager;
  private config: HuntingConfig;
  private isRunning = false;
  private startTime: Date | null = null;
  private userId: number;
  private sessionId: number | null = null;

  constructor(userId: number, config: HuntingConfig) {
    super();
    this.userId = userId;
    this.config = config;
    this.handshakeManager = new HandshakeManager(
      `${config.outputDir}/handshakes`
    );

    // Wire up handshake manager events
    this.handshakeManager.on("handshake_added", (handshake) => {
      this.onHandshakeCaptured(handshake);
    });

    this.handshakeManager.on("crack_status_updated", (handshake) => {
      this.emit("crack_status_updated", handshake);
    });
  }

  /**
   * Start hunting session
   */
  async start(sessionId: number): Promise<void> {
    if (this.isRunning) {
      throw new Error("Hunting is already running");
    }

    try {
      this.sessionId = sessionId;
      this.startTime = new Date();

      // Initialize bettercap
      const bettercapConfig: BettercapConfig = {
        interface: this.config.interface,
        channel: this.config.channels?.[0],
        dwellTime: this.config.dwellTime || 5000,
        aggressiveness: this.config.aggressiveness || "medium",
        outputDir: this.config.outputDir,
      };

      this.bettercap = new BettercapWrapper(bettercapConfig);

      // Wire up bettercap events
      this.bettercap.on("ap_discovered", (ap) => this.onAPDiscovered(ap));
      this.bettercap.on("handshake_captured", (handshake) =>
        this.onBettercapHandshakeCaptured(handshake)
      );
      this.bettercap.on("client_discovered", (client) =>
        this.onClientDiscovered(client)
      );
      this.bettercap.on("error", (error) => this.onBettercapError(error));

      // Start bettercap
      await this.bettercap.start();

      this.isRunning = true;
      this.emit("started", { sessionId });

      // Notify orchestrator
      const orchestrator = getOrchestrator(this.userId);
      orchestrator.reportDeviceStatus(0, 0, 0, 100);
    } catch (error) {
      console.error("[HuntingOrchestrator] Failed to start:", error);
      throw error;
    }
  }

  /**
   * Stop hunting session
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.bettercap) {
      throw new Error("Hunting is not running");
    }

    try {
      await this.bettercap.stop();
      this.isRunning = false;
      this.emit("stopped");
    } catch (error) {
      console.error("[HuntingOrchestrator] Failed to stop:", error);
      throw error;
    }
  }

  /**
   * Pause hunting
   */
  async pause(): Promise<void> {
    if (!this.isRunning) {
      throw new Error("Hunting is not running");
    }

    // In a real implementation, this would pause bettercap
    this.emit("paused");
  }

  /**
   * Resume hunting
   */
  async resume(): Promise<void> {
    if (this.isRunning) {
      throw new Error("Hunting is already running");
    }

    // In a real implementation, this would resume bettercap
    this.emit("resumed");
  }

  /**
   * De-authenticate clients from an AP
   */
  async deauthenticate(bssid: string, clientMac?: string): Promise<void> {
    if (!this.bettercap || !this.isRunning) {
      throw new Error("Hunting is not running");
    }

    try {
      await this.bettercap.deauthenticate(bssid, clientMac);
    } catch (error) {
      console.error("[HuntingOrchestrator] Failed to de-authenticate:", error);
      throw error;
    }
  }

  /**
   * Get discovered access points
   */
  getAccessPoints(): AccessPoint[] {
    return this.bettercap?.getAccessPoints() || [];
  }

  /**
   * Get captured handshakes
   */
  getHandshakes(): HandshakeMetadata[] {
    return this.handshakeManager.getAllHandshakes();
  }

  /**
   * Get handshake manager
   */
  getHandshakeManager(): HandshakeManager {
    return this.handshakeManager;
  }

  /**
   * Get hunting statistics
   */
  getStats(): HuntingStats {
    const bettercapStats = this.bettercap?.getStats() || {
      isRunning: false,
      accessPointsDiscovered: 0,
      handshakesCaptured: 0,
      totalClients: 0,
    };

    const elapsedTime = this.startTime
      ? Date.now() - this.startTime.getTime()
      : 0;

    return {
      isRunning: this.isRunning,
      accessPointsDiscovered: bettercapStats.accessPointsDiscovered,
      handshakesCaptured: bettercapStats.handshakesCaptured,
      clientsDetected: bettercapStats.totalClients,
      elapsedTime,
    };
  }

  /**
   * Handle AP discovery
   */
  private onAPDiscovered(ap: AccessPoint): void {
    this.emit("ap_discovered", ap);

    // Notify orchestrator
    const orchestrator = getOrchestrator(this.userId);
    orchestrator.reportTargetDiscovered(
      ap.channel, // Using channel as ID for now
      ap.ssid,
      ap.ssid,
      ap.bssid
    );
  }

  /**
   * Handle handshake captured by bettercap
   */
  private onBettercapHandshakeCaptured(handshake: any): void {
    // Add to handshake manager
    this.handshakeManager
      .addHandshake(handshake.bssid, handshake.ssid, handshake.filePath)
      .catch((error) => {
        console.error(
          "[HuntingOrchestrator] Failed to add handshake:",
          error
        );
      });
  }

  /**
   * Handle handshake added to manager
   */
  private onHandshakeCaptured(handshake: HandshakeMetadata): void {
    this.emit("handshake_captured", handshake);

    // Notify orchestrator
    const orchestrator = getOrchestrator(this.userId);
    orchestrator.reportHandshakeCaptured(
      parseInt(handshake.id.slice(0, 8), 16),
      handshake.ssid,
      handshake.bssid,
      -50 // Default signal strength
    );
  }

  /**
   * Handle client discovery
   */
  private onClientDiscovered(client: any): void {
    this.emit("client_discovered", client);
  }

  /**
   * Handle bettercap errors
   */
  private onBettercapError(error: string): void {
    console.error("[HuntingOrchestrator] Bettercap error:", error);
    this.emit("error", error);

    const orchestrator = getOrchestrator(this.userId);
    orchestrator.reportError(`Bettercap error: ${error}`);
  }

  /**
   * Check if hunting is active
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

/**
 * Global hunting orchestrator instances (one per user)
 */
const huntingOrchestrators = new Map<number, HuntingOrchestrator>();

/**
 * Get or create hunting orchestrator for user
 */
export function getHuntingOrchestrator(
  userId: number,
  config?: HuntingConfig
): HuntingOrchestrator {
  if (!huntingOrchestrators.has(userId) && config) {
    huntingOrchestrators.set(userId, new HuntingOrchestrator(userId, config));
  }
  return huntingOrchestrators.get(userId)!;
}

/**
 * Cleanup hunting orchestrator for user
 */
export function cleanupHuntingOrchestrator(userId: number): void {
  const orchestrator = huntingOrchestrators.get(userId);
  if (orchestrator) {
    orchestrator.removeAllListeners();
    huntingOrchestrators.delete(userId);
  }
}
