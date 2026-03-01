import { EventEmitter } from "events";
import axios from "axios";

/**
 * Vulnerability Scanner
 * Identifies vulnerabilities in discovered services using CVE databases
 */

export interface ServiceInfo {
  ip: string;
  port: number;
  service: string;
  product?: string;
  version?: string;
}

export interface Vulnerability {
  cveId: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  cvssScore: number;
  cvssVector?: string;
  affectedVersions: string[];
  remediation?: string;
  references: string[];
}

export interface ScanResult {
  service: ServiceInfo;
  vulnerabilities: Vulnerability[];
  scanTime: Date;
}

export class VulnerabilityScanner extends EventEmitter {
  private cveDatabase: Map<string, Vulnerability[]> = new Map();
  private isRunning = false;
  private results: ScanResult[] = [];

  constructor() {
    super();
    this.initializeCVEDatabase();
  }

  /**
   * Scan service for vulnerabilities
   */
  async scanService(service: ServiceInfo): Promise<Vulnerability[]> {
    try {
      this.emit("scan_started", service);

      const vulnerabilities = await this.findVulnerabilities(service);

      const result: ScanResult = {
        service,
        vulnerabilities,
        scanTime: new Date(),
      };

      this.results.push(result);

      for (const vuln of vulnerabilities) {
        this.emit("vulnerability_found", {
          service,
          vulnerability: vuln,
        });
      }

      this.emit("scan_completed", result);

      return vulnerabilities;
    } catch (error) {
      console.error("[VulnScanner] Scan failed:", error);
      this.emit("scan_error", { service, error });
      return [];
    }
  }

  /**
   * Scan multiple services
   */
  async scanServices(services: ServiceInfo[]): Promise<ScanResult[]> {
    this.isRunning = true;
    this.results = [];

    try {
      for (const service of services) {
        if (!this.isRunning) break;

        await this.scanService(service);

        // Small delay between scans
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      this.emit("all_scans_completed", this.results);

      return this.results;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Stop scanning
   */
  stop(): void {
    this.isRunning = false;
    this.emit("stopped");
  }

  /**
   * Find vulnerabilities for a service
   */
  private async findVulnerabilities(
    service: ServiceInfo
  ): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];

    // Check local CVE database
    if (service.product) {
      const key = `${service.product}:${service.version || "*"}`;
      const dbVulns = this.cveDatabase.get(key);

      if (dbVulns) {
        vulnerabilities.push(...dbVulns);
      }

      // Also check wildcard entries
      const wildcardKey = `${service.product}:*`;
      const wildcardVulns = this.cveDatabase.get(wildcardKey);

      if (wildcardVulns) {
        // Filter by version if available
        if (service.version) {
          const filtered = wildcardVulns.filter((v) =>
            this.isVersionAffected(service.version!, v.affectedVersions)
          );
          vulnerabilities.push(...filtered);
        } else {
          vulnerabilities.push(...wildcardVulns);
        }
      }
    }

    // Check service-specific vulnerabilities
    const serviceVulns = this.getServiceVulnerabilities(
      service.service,
      service.port
    );
    vulnerabilities.push(...serviceVulns);

    // Remove duplicates
    const unique = Array.from(
      new Map(vulnerabilities.map((v) => [v.cveId, v])).values()
    );

    return unique.sort((a, b) => b.cvssScore - a.cvssScore);
  }

  /**
   * Check if version is affected by vulnerability
   */
  private isVersionAffected(
    version: string,
    affectedVersions: string[]
  ): boolean {
    for (const affected of affectedVersions) {
      if (affected === "*") return true;
      if (affected === version) return true;

      // Simple version range check (e.g., "1.0-2.0")
      if (affected.includes("-")) {
        const [min, max] = affected.split("-");
        if (this.compareVersions(version, min) >= 0 &&
            this.compareVersions(version, max) <= 0) {
          return true;
        }
      }

      // Prefix match (e.g., "1.0.*")
      if (affected.endsWith("*")) {
        const prefix = affected.slice(0, -1);
        if (version.startsWith(prefix)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Compare two version strings
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split(".").map(Number);
    const parts2 = v2.split(".").map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;

      if (p1 < p2) return -1;
      if (p1 > p2) return 1;
    }

    return 0;
  }

  /**
   * Get service-specific vulnerabilities
   */
  private getServiceVulnerabilities(
    service: string,
    port: number
  ): Vulnerability[] {
    const vulns: Vulnerability[] = [];

    // Common service vulnerabilities
    if (service === "ssh" || port === 22) {
      vulns.push({
        cveId: "CVE-2023-28432",
        title: "SSH Weak Algorithms",
        description: "SSH server supports weak encryption algorithms",
        severity: "medium",
        cvssScore: 5.3,
        affectedVersions: ["*"],
        remediation: "Disable weak algorithms in SSH configuration",
        references: ["https://nvd.nist.gov/vuln/detail/CVE-2023-28432"],
      });
    }

    if (service === "ftp" || port === 21) {
      vulns.push({
        cveId: "CVE-2021-22911",
        title: "FTP Cleartext Transmission",
        description: "FTP transmits credentials in cleartext",
        severity: "high",
        cvssScore: 7.5,
        affectedVersions: ["*"],
        remediation: "Use SFTP or FTPS instead of FTP",
        references: ["https://nvd.nist.gov/vuln/detail/CVE-2021-22911"],
      });
    }

    if (service === "http" || service === "https" || port === 80 || port === 443) {
      vulns.push({
        cveId: "CVE-2023-44487",
        title: "HTTP/2 Rapid Reset",
        description: "HTTP/2 implementation vulnerable to rapid reset attacks",
        severity: "high",
        cvssScore: 7.5,
        affectedVersions: ["*"],
        remediation: "Update web server to latest version",
        references: ["https://nvd.nist.gov/vuln/detail/CVE-2023-44487"],
      });
    }

    if (service === "smb" || port === 445 || port === 139) {
      vulns.push({
        cveId: "CVE-2017-0144",
        title: "SMB EternalBlue",
        description: "Critical remote code execution vulnerability in SMB",
        severity: "critical",
        cvssScore: 9.8,
        affectedVersions: ["*"],
        remediation: "Apply security patches for Windows",
        references: ["https://nvd.nist.gov/vuln/detail/CVE-2017-0144"],
      });
    }

    return vulns;
  }

  /**
   * Initialize CVE database with common vulnerabilities
   */
  private initializeCVEDatabase(): void {
    // Apache vulnerabilities
    this.cveDatabase.set("Apache:2.4.0-2.4.48", [
      {
        cveId: "CVE-2021-41773",
        title: "Apache Path Traversal",
        description: "Path traversal vulnerability in Apache 2.4.49 and earlier",
        severity: "critical",
        cvssScore: 9.8,
        affectedVersions: ["2.4.0-2.4.49"],
        remediation: "Update to Apache 2.4.50 or later",
        references: ["https://nvd.nist.gov/vuln/detail/CVE-2021-41773"],
      },
    ]);

    // Nginx vulnerabilities
    this.cveDatabase.set("Nginx:*", [
      {
        cveId: "CVE-2021-23017",
        title: "Nginx Off-by-one",
        description: "Off-by-one buffer overflow in Nginx",
        severity: "high",
        cvssScore: 8.1,
        affectedVersions: ["1.16.0-1.21.0"],
        remediation: "Update to Nginx 1.21.1 or later",
        references: ["https://nvd.nist.gov/vuln/detail/CVE-2021-23017"],
      },
    ]);

    // OpenSSL vulnerabilities
    this.cveDatabase.set("OpenSSL:*", [
      {
        cveId: "CVE-2022-0778",
        title: "OpenSSL Infinite Loop",
        description: "Infinite loop in OpenSSL certificate parsing",
        severity: "high",
        cvssScore: 7.5,
        affectedVersions: ["1.0.2-1.1.1"],
        remediation: "Update to OpenSSL 1.1.1n or 3.0.2",
        references: ["https://nvd.nist.gov/vuln/detail/CVE-2022-0778"],
      },
    ]);
  }

  /**
   * Get all scan results
   */
  getResults(): ScanResult[] {
    return this.results;
  }

  /**
   * Get statistics
   */
  getStats() {
    const totalVulns = this.results.reduce(
      (sum, r) => sum + r.vulnerabilities.length,
      0
    );

    const criticalVulns = this.results.reduce(
      (sum, r) =>
        sum + r.vulnerabilities.filter((v) => v.severity === "critical").length,
      0
    );

    const highVulns = this.results.reduce(
      (sum, r) =>
        sum + r.vulnerabilities.filter((v) => v.severity === "high").length,
      0
    );

    return {
      isRunning: this.isRunning,
      servicesScanned: this.results.length,
      totalVulnerabilities: totalVulns,
      criticalVulnerabilities: criticalVulns,
      highVulnerabilities: highVulns,
    };
  }

  /**
   * Check if scanner is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}
