import { promises as fs } from "fs";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface SystemMetrics {
  cpu: {
    usage: number; // 0-100
    cores: number;
    frequency: number; // MHz
  };
  memory: {
    total: number; // MB
    used: number; // MB
    available: number; // MB
    usagePercent: number; // 0-100
  };
  temperature: {
    cpu: number; // Celsius
    gpu?: number; // Celsius (if available)
  };
  battery: {
    level: number; // 0-100
    status: "charging" | "discharging" | "full" | "unknown";
    voltage: number; // mV
  };
  uptime: number; // seconds
  loadAverage: {
    oneMin: number;
    fiveMin: number;
    fifteenMin: number;
  };
  disk: {
    total: number; // MB
    used: number; // MB
    available: number; // MB
    usagePercent: number; // 0-100
  };
}

class SystemMetricsReader {
  private lastCpuStats: { user: number; system: number; idle: number } | null =
    null;

  /**
   * Read CPU usage from /proc/stat
   */
  async readCpuUsage(): Promise<number> {
    try {
      const data = await fs.readFile("/proc/stat", "utf-8");
      const lines = data.split("\n");
      const cpuLine = lines[0];

      if (!cpuLine.startsWith("cpu ")) {
        return 0;
      }

      const values = cpuLine.split(/\s+/).slice(1, 8).map(Number);
      const [user, nice, system, idle, iowait, irq, softirq] = values;

      const currentStats = {
        user: user + nice,
        system: system + irq + softirq,
        idle: idle + iowait,
      };

      if (!this.lastCpuStats) {
        this.lastCpuStats = currentStats;
        return 0;
      }

      const prevTotal =
        this.lastCpuStats.user +
        this.lastCpuStats.system +
        this.lastCpuStats.idle;
      const currentTotal = currentStats.user + currentStats.system + currentStats.idle;
      const totalDiff = currentTotal - prevTotal;

      if (totalDiff === 0) {
        return 0;
      }

      const userDiff = currentStats.user - this.lastCpuStats.user;
      const systemDiff = currentStats.system - this.lastCpuStats.system;
      const usage = ((userDiff + systemDiff) / totalDiff) * 100;

      this.lastCpuStats = currentStats;

      return Math.min(100, Math.max(0, usage));
    } catch (error) {
      console.error("[Metrics] Failed to read CPU usage:", error);
      return 0;
    }
  }

  /**
   * Read memory usage from /proc/meminfo
   */
  async readMemoryUsage(): Promise<{
    total: number;
    used: number;
    available: number;
    usagePercent: number;
  }> {
    try {
      const data = await fs.readFile("/proc/meminfo", "utf-8");
      const lines = data.split("\n");
      const memInfo: Record<string, number> = {};

      lines.forEach((line) => {
        const [key, value] = line.split(":");
        if (key && value) {
          memInfo[key.trim()] = parseInt(value.trim());
        }
      });

      const total = memInfo["MemTotal"] || 0;
      const available = memInfo["MemAvailable"] || 0;
      const used = total - available;
      const usagePercent = total > 0 ? (used / total) * 100 : 0;

      return {
        total: Math.round(total / 1024), // Convert to MB
        used: Math.round(used / 1024),
        available: Math.round(available / 1024),
        usagePercent: Math.round(usagePercent * 100) / 100,
      };
    } catch (error) {
      console.error("[Metrics] Failed to read memory usage:", error);
      return {
        total: 0,
        used: 0,
        available: 0,
        usagePercent: 0,
      };
    }
  }

  /**
   * Read CPU temperature from /sys/class/thermal
   */
  async readTemperature(): Promise<{ cpu: number; gpu?: number }> {
    try {
      const temps: { cpu: number; gpu?: number } = { cpu: 0 };

      // Try to read CPU temperature from multiple possible locations
      const cpuTempPaths = [
        "/sys/class/thermal/thermal_zone0/temp",
        "/sys/devices/virtual/thermal/thermal_zone0/temp",
        "/sys/class/hwmon/hwmon0/temp1_input",
      ];

      for (const path of cpuTempPaths) {
        try {
          const data = await fs.readFile(path, "utf-8");
          const tempValue = parseInt(data.trim());
          // Temperature is usually in millidegrees Celsius
          temps.cpu = tempValue >= 1000 ? tempValue / 1000 : tempValue;
          break;
        } catch {
          // Try next path
        }
      }

      // Try to read GPU temperature (Broadcom GPU on Raspberry Pi)
      try {
        const { stdout } = await execFileAsync("vcgencmd", [
          "measure_temp",
        ]);
        const match = stdout.match(/temp=(\d+\.\d+)/);
        if (match) {
          temps.gpu = parseFloat(match[1]);
        }
      } catch {
        // vcgencmd not available
      }

      return temps;
    } catch (error) {
      console.error("[Metrics] Failed to read temperature:", error);
      return { cpu: 0 };
    }
  }

  /**
   * Read battery status from UPS HAT
   */
  async readBatteryStatus(): Promise<{
    level: number;
    status: "charging" | "discharging" | "full" | "unknown";
    voltage: number;
  }> {
    try {
      // Try to read from power supply interface
      const powerSupplyPaths = [
        "/sys/class/power_supply/BAT0",
        "/sys/class/power_supply/BAT1",
        "/sys/class/power_supply/battery",
      ];

      for (const basePath of powerSupplyPaths) {
        try {
          const [capacity, status, voltage] = await Promise.all([
            fs
              .readFile(`${basePath}/capacity`, "utf-8")
              .then((d) => parseInt(d.trim()))
              .catch(() => 0),
            fs
              .readFile(`${basePath}/status`, "utf-8")
              .then((d) => d.trim().toLowerCase())
              .catch(() => "unknown"),
            fs
              .readFile(`${basePath}/voltage_now`, "utf-8")
              .then((d) => parseInt(d.trim()))
              .catch(() => 0),
          ]);

          if (capacity > 0 || voltage > 0) {
            return {
              level: Math.min(100, Math.max(0, capacity)),
              status: (status as any) || "unknown",
              voltage: voltage / 1000, // Convert to mV
            };
          }
        } catch {
          // Try next path
        }
      }

      // Default response if no battery found
      return {
        level: 100,
        status: "unknown",
        voltage: 0,
      };
    } catch (error) {
      console.error("[Metrics] Failed to read battery status:", error);
      return {
        level: 100,
        status: "unknown",
        voltage: 0,
      };
    }
  }

  /**
   * Read system uptime
   */
  async readUptime(): Promise<number> {
    try {
      const data = await fs.readFile("/proc/uptime", "utf-8");
      const uptime = parseFloat(data.split(" ")[0]);
      return Math.round(uptime);
    } catch (error) {
      console.error("[Metrics] Failed to read uptime:", error);
      return 0;
    }
  }

  /**
   * Read load average
   */
  async readLoadAverage(): Promise<{
    oneMin: number;
    fiveMin: number;
    fifteenMin: number;
  }> {
    try {
      const data = await fs.readFile("/proc/loadavg", "utf-8");
      const [oneMin, fiveMin, fifteenMin] = data
        .split(" ")
        .slice(0, 3)
        .map(Number);

      return {
        oneMin: Math.round(oneMin * 100) / 100,
        fiveMin: Math.round(fiveMin * 100) / 100,
        fifteenMin: Math.round(fifteenMin * 100) / 100,
      };
    } catch (error) {
      console.error("[Metrics] Failed to read load average:", error);
      return {
        oneMin: 0,
        fiveMin: 0,
        fifteenMin: 0,
      };
    }
  }

  /**
   * Read disk usage
   */
  async readDiskUsage(): Promise<{
    total: number;
    used: number;
    available: number;
    usagePercent: number;
  }> {
    try {
      const { stdout } = await execFileAsync("df", ["-B", "1", "/"]);
      const lines = stdout.split("\n");
      const dataLine = lines[1];

      if (!dataLine) {
        return {
          total: 0,
          used: 0,
          available: 0,
          usagePercent: 0,
        };
      }

      const parts = dataLine.split(/\s+/);
      const total = parseInt(parts[1]) / (1024 * 1024); // Convert to MB
      const used = parseInt(parts[2]) / (1024 * 1024);
      const available = parseInt(parts[3]) / (1024 * 1024);
      const usagePercent = (used / total) * 100;

      return {
        total: Math.round(total),
        used: Math.round(used),
        available: Math.round(available),
        usagePercent: Math.round(usagePercent * 100) / 100,
      };
    } catch (error) {
      console.error("[Metrics] Failed to read disk usage:", error);
      return {
        total: 0,
        used: 0,
        available: 0,
        usagePercent: 0,
      };
    }
  }

  /**
   * Read CPU core count and frequency
   */
  async readCpuInfo(): Promise<{ cores: number; frequency: number }> {
    try {
      const data = await fs.readFile("/proc/cpuinfo", "utf-8");
      const lines = data.split("\n");

      let cores = 0;
      let frequency = 0;

      lines.forEach((line) => {
        if (line.startsWith("processor")) {
          cores++;
        }
        if (line.startsWith("cpu MHz")) {
          const match = line.match(/:\s*([\d.]+)/);
          if (match) {
            frequency = Math.round(parseFloat(match[1]));
          }
        }
      });

      return {
        cores: Math.max(1, cores),
        frequency: frequency || 1000,
      };
    } catch (error) {
      console.error("[Metrics] Failed to read CPU info:", error);
      return {
        cores: 1,
        frequency: 1000,
      };
    }
  }

  /**
   * Gather all system metrics
   */
  async getAllMetrics(): Promise<SystemMetrics> {
    const [
      cpuUsage,
      memory,
      temperature,
      battery,
      uptime,
      loadAverage,
      disk,
      cpuInfo,
    ] = await Promise.all([
      this.readCpuUsage(),
      this.readMemoryUsage(),
      this.readTemperature(),
      this.readBatteryStatus(),
      this.readUptime(),
      this.readLoadAverage(),
      this.readDiskUsage(),
      this.readCpuInfo(),
    ]);

    return {
      cpu: {
        usage: Math.round(cpuUsage * 100) / 100,
        cores: cpuInfo.cores,
        frequency: cpuInfo.frequency,
      },
      memory,
      temperature,
      battery,
      uptime,
      loadAverage,
      disk,
    };
  }
}

// Export singleton instance
export const metricsReader = new SystemMetricsReader();
