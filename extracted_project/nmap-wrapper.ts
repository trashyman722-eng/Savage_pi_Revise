import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
import * as xml2js from "xml2js";

/**
 * Nmap Wrapper
 * Manages Nmap subprocess for network scanning and service enumeration
 */

export interface NmapScanConfig {
  target: string;
  ports?: string; // "1-1000", "80,443,22", etc.
  scanType?: "syn" | "connect" | "udp" | "comprehensive"; // Default: syn
  serviceDetection?: boolean;
  osDetection?: boolean;
  scriptScanning?: boolean;
  aggressiveness?: 0 | 1 | 2 | 3 | 4 | 5; // T0-T5, default: 3
}

export interface Host {
  ip: string;
  hostname?: string;
  status: "up" | "down";
  osGuess?: string;
  ports: Port[];
}

export interface Port {
  number: number;
  protocol: "tcp" | "udp";
  state: "open" | "closed" | "filtered" | "open|filtered";
  service?: string;
  version?: string;
  product?: string;
  extrainfo?: string;
  cpe?: string[];
}

export interface NmapResult {
  hosts: Host[];
  scanStats: {
    startTime: Date;
    endTime: Date;
    totalHosts: number;
    upHosts: number;
    downHosts: number;
  };
}

export class NmapWrapper extends EventEmitter {
  private process: ChildProcess | null = null;
  private config: NmapScanConfig;
  private isRunning = false;
  private results: NmapResult | null = null;

  constructor(config: NmapScanConfig) {
    super();
    this.config = config;
  }

  /**
   * Start Nmap scan
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error("Nmap scan is already running");
    }

    try {
      const args = this.buildNmapArgs();

      console.log("[Nmap] Starting scan with args:", args);

      this.process = spawn("nmap", args, {
        stdio: ["pipe", "pipe", "pipe"],
      });

      this.isRunning = true;

      let output = "";
      let xmlOutput = "";

      // Handle stdout
      this.process.stdout?.on("data", (data) => {
        output += data.toString();
        this.emit("output", data.toString());
      });

      // Handle stderr
      this.process.stderr?.on("data", (data) => {
        console.error("[Nmap] Error:", data.toString());
        this.emit("error", data.toString());
      });

      // Handle process exit
      this.process.on("exit", async (code) => {
        console.log(`[Nmap] Process exited with code ${code}`);
        this.isRunning = false;

        // Parse results if XML output was generated
        if (xmlOutput) {
          try {
            this.results = await this.parseNmapXml(xmlOutput);
            this.emit("results", this.results);
          } catch (error) {
            console.error("[Nmap] Failed to parse results:", error);
            this.emit("parse_error", error);
          }
        }

        this.emit("stopped", code);
      });

      this.emit("started");
    } catch (error) {
      console.error("[Nmap] Failed to start scan:", error);
      throw error;
    }
  }

  /**
   * Stop Nmap scan
   */
  async stop(): Promise<void> {
    if (!this.process || !this.isRunning) {
      throw new Error("Nmap scan is not running");
    }

    try {
      this.process.kill("SIGTERM");

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
    } catch (error) {
      console.error("[Nmap] Failed to stop scan:", error);
      throw error;
    }
  }

  /**
   * Get scan results
   */
  getResults(): NmapResult | null {
    return this.results;
  }

  /**
   * Check if scan is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Build Nmap command arguments
   */
  private buildNmapArgs(): string[] {
    const args: string[] = [];

    // Set timing template (aggressiveness)
    const timing = this.config.aggressiveness || 3;
    args.push(`-T${timing}`);

    // Set scan type
    if (this.config.scanType === "syn") {
      args.push("-sS");
    } else if (this.config.scanType === "connect") {
      args.push("-sT");
    } else if (this.config.scanType === "udp") {
      args.push("-sU");
    } else if (this.config.scanType === "comprehensive") {
      args.push("-sS", "-sU");
    }

    // Set ports
    if (this.config.ports) {
      args.push("-p", this.config.ports);
    } else {
      args.push("-p", "1-10000"); // Default: common ports
    }

    // Service detection
    if (this.config.serviceDetection) {
      args.push("-sV");
    }

    // OS detection
    if (this.config.osDetection) {
      args.push("-O");
    }

    // Script scanning
    if (this.config.scriptScanning) {
      args.push("-sC");
    }

    // Output formats
    args.push("-oX", "-"); // XML output to stdout

    // Target
    args.push(this.config.target);

    return args;
  }

  /**
   * Parse Nmap XML output
   */
  private async parseNmapXml(xmlData: string): Promise<NmapResult> {
    const parser = new xml2js.Parser();
    const parsed = await parser.parseStringPromise(xmlData);

    const nmaprun = parsed.nmaprun;
    const hosts: Host[] = [];

    if (nmaprun.host) {
      const hostArray = Array.isArray(nmaprun.host)
        ? nmaprun.host
        : [nmaprun.host];

      for (const hostData of hostArray) {
        const host = this.parseHost(hostData);
        if (host) {
          hosts.push(host);
          this.emit("host_discovered", host);
        }
      }
    }

    const startTime = new Date(
      parseInt(nmaprun.$.starttime) * 1000
    );
    const endTime = new Date(parseInt(nmaprun.$.endtime) * 1000);

    const result: NmapResult = {
      hosts,
      scanStats: {
        startTime,
        endTime,
        totalHosts: hosts.length,
        upHosts: hosts.filter((h) => h.status === "up").length,
        downHosts: hosts.filter((h) => h.status === "down").length,
      },
    };

    return result;
  }

  /**
   * Parse individual host from XML
   */
  private parseHost(hostData: any): Host | null {
    const status = hostData.status?.[0]?.$.state;

    if (!status) {
      return null;
    }

    const addresses = hostData.address || [];
    let ip = "";
    let hostname = "";

    for (const addr of addresses) {
      if (addr.$.addrtype === "ipv4") {
        ip = addr.$.addr;
      } else if (addr.$.addrtype === "hostname") {
        hostname = addr.$.addr;
      }
    }

    if (!ip) {
      return null;
    }

    const ports: Port[] = [];

    if (hostData.ports?.[0]?.port) {
      const portArray = Array.isArray(hostData.ports[0].port)
        ? hostData.ports[0].port
        : [hostData.ports[0].port];

      for (const portData of portArray) {
        const port = this.parsePort(portData);
        if (port) {
          ports.push(port);
          this.emit("port_discovered", { ip, port });
        }
      }
    }

    let osGuess: string | undefined;
    if (hostData.os?.[0]?.osmatch?.[0]) {
      osGuess = hostData.os[0].osmatch[0].$.name;
    }

    return {
      ip,
      hostname: hostname || undefined,
      status: status as "up" | "down",
      osGuess,
      ports,
    };
  }

  /**
   * Parse individual port from XML
   */
  private parsePort(portData: any): Port | null {
    const number = parseInt(portData.$.portid);
    const protocol = portData.$.protocol;
    const state = portData.state?.[0]?.$.state;

    if (!state) {
      return null;
    }

    const service = portData.service?.[0];

    return {
      number,
      protocol: protocol as "tcp" | "udp",
      state: state as "open" | "closed" | "filtered" | "open|filtered",
      service: service?.$.name,
      version: service?.$.version,
      product: service?.$.product,
      extrainfo: service?.$.extrainfo,
      cpe: service?.cpe,
    };
  }

  /**
   * Get statistics
   */
  getStats() {
    if (!this.results) {
      return {
        isRunning: this.isRunning,
        hostsScanned: 0,
        hostsUp: 0,
        openPorts: 0,
      };
    }

    const openPorts = this.results.hosts.reduce(
      (sum, host) =>
        sum + host.ports.filter((p) => p.state === "open").length,
      0
    );

    return {
      isRunning: this.isRunning,
      hostsScanned: this.results.scanStats.totalHosts,
      hostsUp: this.results.scanStats.upHosts,
      openPorts,
    };
  }
}
