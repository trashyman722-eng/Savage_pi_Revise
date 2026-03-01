import { EventEmitter } from "events";
import { NmapWrapper, NmapScanConfig, Host, NmapResult } from "./nmap-wrapper";
import { BruteForcer, BruteForceConfig, BruteForceResult } from "./brute-forcer";
import { VulnerabilityScanner, ScanResult } from "./vuln-scanner";
import { getOrchestrator } from "../orchestration";

/**
 * Raid Orchestrator
 * Coordinates network scanning, brute-forcing, and vulnerability assessment
 */

export interface RaidConfig {
  scanType?: "quick" | "standard" | "comprehensive";
  enableBruteForce?: boolean;
  enableVulnScanning?: boolean;
  bruteForceWordlists?: {
    usernames: string[];
    passwords: string[];
  };
}

export interface RaidStats {
  isRunning: boolean;
  hostsScanned: number;
  hostsUp: number;
  openPorts: number;
  servicesIdentified: number;
  vulnerabilitiesFound: number;
  credentialsFound: number;
}

export class RaidOrchestrator extends EventEmitter {
  private nmap: NmapWrapper | null = null;
  private bruteForcer: BruteForcer | null = null;
  private vulnScanner: VulnerabilityScanner;
  private config: RaidConfig;
  private isRunning = false;
  private userId: number;
  private sessionId: number | null = null;
  private nmapResults: NmapResult | null = null;
  private bruteForceResults: BruteForceResult[] = [];
  private vulnResults: ScanResult[] = [];

  constructor(userId: number, config: RaidConfig = {}) {
    super();
    this.userId = userId;
    this.config = {
      scanType: "standard",
      enableBruteForce: true,
      enableVulnScanning: true,
      ...config,
    };
    this.vulnScanner = new VulnerabilityScanner();

    // Wire up vulnerability scanner events
    this.vulnScanner.on("vulnerability_found", (data) => {
      this.emit("vulnerability_found", data);
    });
  }

  /**
   * Start raid session
   */
  async start(
    target: string,
    sessionId: number,
    ports?: string
  ): Promise<void> {
    if (this.isRunning) {
      throw new Error("Raid is already running");
    }

    try {
      this.sessionId = sessionId;
      this.isRunning = true;

      this.emit("started", { sessionId, target });

      // Phase 1: Network scanning with Nmap
      await this.performNetworkScan(target, ports);

      // Phase 2: Service enumeration (already done by Nmap -sV)
      if (this.nmapResults) {
        await this.enumerateServices();
      }

      // Phase 3: Vulnerability scanning
      if (this.config.enableVulnScanning && this.nmapResults) {
        await this.performVulnerabilityScanning();
      }

      // Phase 4: Brute force attacks
      if (this.config.enableBruteForce && this.nmapResults) {
        await this.performBruteForceAttacks();
      }

      this.emit("completed", {
        sessionId,
        target,
        stats: this.getStats(),
      });
    } catch (error) {
      console.error("[RaidOrchestrator] Failed to start:", error);
      this.emit("error", error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Stop raid session
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      throw new Error("Raid is not running");
    }

    try {
      if (this.nmap?.isActive()) {
        await this.nmap.stop();
      }

      if (this.bruteForcer?.isActive()) {
        this.bruteForcer.stop();
      }

      if (this.vulnScanner.isActive()) {
        this.vulnScanner.stop();
      }

      this.isRunning = false;
      this.emit("stopped");
    } catch (error) {
      console.error("[RaidOrchestrator] Failed to stop:", error);
      throw error;
    }
  }

  /**
   * Perform network scan with Nmap
   */
  private async performNetworkScan(target: string, ports?: string): Promise<void> {
    try {
      this.emit("scan_phase_started", "network_scan");

      const scanConfig: NmapScanConfig = {
        target,
        ports: ports || "1-10000",
        scanType: this.config.scanType === "quick" ? "syn" : "comprehensive",
        serviceDetection: true,
        osDetection: this.config.scanType === "comprehensive",
        scriptScanning: this.config.scanType === "comprehensive",
        aggressiveness: this.config.scanType === "quick" ? 4 : 3,
      };

      this.nmap = new NmapWrapper(scanConfig);

      // Wire up events
      this.nmap.on("host_discovered", (host) => {
        this.emit("host_discovered", host);
      });

      this.nmap.on("port_discovered", (data) => {
        this.emit("port_discovered", data);
      });

      this.nmap.on("results", (results) => {
        this.nmapResults = results;
        this.emit("scan_phase_completed", {
          phase: "network_scan",
          results,
        });
      });

      await this.nmap.start();

      // Wait for scan to complete
      await new Promise((resolve) => {
        this.nmap?.once("stopped", resolve);
      });
    } catch (error) {
      console.error("[RaidOrchestrator] Network scan failed:", error);
      this.emit("scan_phase_error", { phase: "network_scan", error });
      throw error;
    }
  }

  /**
   * Enumerate services on discovered hosts
   */
  private async enumerateServices(): Promise<void> {
    if (!this.nmapResults) return;

    try {
      this.emit("scan_phase_started", "service_enumeration");

      for (const host of this.nmapResults.hosts) {
        if (!this.isRunning) break;

        for (const port of host.ports) {
          if (port.state === "open") {
            this.emit("service_enumerated", {
              ip: host.ip,
              port: port.number,
              protocol: port.protocol,
              service: port.service,
              version: port.version,
            });
          }
        }
      }

      this.emit("scan_phase_completed", {
        phase: "service_enumeration",
        servicesFound: this.nmapResults.hosts.reduce(
          (sum, h) => sum + h.ports.filter((p) => p.state === "open").length,
          0
        ),
      });
    } catch (error) {
      console.error("[RaidOrchestrator] Service enumeration failed:", error);
      this.emit("scan_phase_error", { phase: "service_enumeration", error });
    }
  }

  /**
   * Perform vulnerability scanning
   */
  private async performVulnerabilityScanning(): Promise<void> {
    if (!this.nmapResults) return;

    try {
      this.emit("scan_phase_started", "vulnerability_scanning");

      for (const host of this.nmapResults.hosts) {
        if (!this.isRunning) break;

        for (const port of host.ports) {
          if (port.state === "open") {
            await this.vulnScanner.scanService({
              ip: host.ip,
              port: port.number,
              service: port.service || "unknown",
              product: port.product,
              version: port.version,
            });
          }
        }
      }

      this.vulnResults = this.vulnScanner.getResults();

      this.emit("scan_phase_completed", {
        phase: "vulnerability_scanning",
        vulnerabilitiesFound: this.vulnResults.reduce(
          (sum, r) => sum + r.vulnerabilities.length,
          0
        ),
      });
    } catch (error) {
      console.error("[RaidOrchestrator] Vulnerability scanning failed:", error);
      this.emit("scan_phase_error", { phase: "vulnerability_scanning", error });
    }
  }

  /**
   * Perform brute force attacks
   */
  private async performBruteForceAttacks(): Promise<void> {
    if (!this.nmapResults || !this.config.enableBruteForce) return;

    try {
      this.emit("scan_phase_started", "brute_force");

      const services = this.extractBruteForceTargets();

      for (const target of services) {
        if (!this.isRunning) break;

        const config: BruteForceConfig = {
          service: target.service as any,
          target: target.ip,
          port: target.port,
          usernames: this.config.bruteForceWordlists?.usernames || [
            "admin",
            "root",
          ],
          passwords: this.config.bruteForceWordlists?.passwords || [
            "password",
            "admin",
          ],
          maxAttempts: 100,
          delayBetweenAttempts: 50,
        };

        this.bruteForcer = new BruteForcer(config);

        this.bruteForcer.on("success", (result) => {
          this.bruteForceResults.push(result);
          this.emit("credential_found", result);
        });

        this.bruteForcer.on("progress", (progress) => {
          this.emit("brute_force_progress", progress);
        });

        const results = await this.bruteForcer.start();
        this.bruteForceResults.push(...results);
      }

      this.emit("scan_phase_completed", {
        phase: "brute_force",
        credentialsFound: this.bruteForceResults.length,
      });
    } catch (error) {
      console.error("[RaidOrchestrator] Brute force failed:", error);
      this.emit("scan_phase_error", { phase: "brute_force", error });
    }
  }

  /**
   * Extract targets for brute force attacks
   */
  private extractBruteForceTargets(): Array<{
    ip: string;
    port: number;
    service: string;
  }> {
    const targets: Array<{ ip: string; port: number; service: string }> = [];

    if (!this.nmapResults) return targets;

    const bruteForceServices = ["ssh", "ftp", "smb", "http", "telnet"];

    for (const host of this.nmapResults.hosts) {
      for (const port of host.ports) {
        if (port.state === "open") {
          const service = port.service?.toLowerCase() || "";

          if (
            bruteForceServices.includes(service) ||
            bruteForceServices.some((s) => service.includes(s))
          ) {
            targets.push({
              ip: host.ip,
              port: port.number,
              service: service || "unknown",
            });
          }
        }
      }
    }

    return targets;
  }

  /**
   * Get raid statistics
   */
  getStats(): RaidStats {
    const stats = this.nmap?.getStats() || {
      isRunning: false,
      hostsScanned: 0,
      hostsUp: 0,
      openPorts: 0,
    };

    const servicesIdentified = this.nmapResults?.hosts.reduce(
      (sum, h) => sum + h.ports.filter((p) => p.state === "open").length,
      0
    ) || 0;

    const vulnStats = this.vulnScanner.getStats();

    return {
      isRunning: this.isRunning,
      hostsScanned: stats.hostsScanned,
      hostsUp: stats.hostsUp,
      openPorts: stats.openPorts,
      servicesIdentified,
      vulnerabilitiesFound: vulnStats.totalVulnerabilities,
      credentialsFound: this.bruteForceResults.length,
    };
  }

  /**
   * Get nmap results
   */
  getNmapResults(): NmapResult | null {
    return this.nmapResults;
  }

  /**
   * Get brute force results
   */
  getBruteForceResults(): BruteForceResult[] {
    return this.bruteForceResults;
  }

  /**
   * Get vulnerability results
   */
  getVulnerabilityResults(): ScanResult[] {
    return this.vulnResults;
  }

  /**
   * Check if raid is active
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

/**
 * Global raid orchestrator instances (one per user)
 */
const raidOrchestrators = new Map<number, RaidOrchestrator>();

/**
 * Get or create raid orchestrator for user
 */
export function getRaidOrchestrator(
  userId: number,
  config?: RaidConfig
): RaidOrchestrator {
  if (!raidOrchestrators.has(userId) && config) {
    raidOrchestrators.set(userId, new RaidOrchestrator(userId, config));
  }
  return raidOrchestrators.get(userId)!;
}

/**
 * Cleanup raid orchestrator for user
 */
export function cleanupRaidOrchestrator(userId: number): void {
  const orchestrator = raidOrchestrators.get(userId);
  if (orchestrator) {
    orchestrator.removeAllListeners();
    raidOrchestrators.delete(userId);
  }
}
