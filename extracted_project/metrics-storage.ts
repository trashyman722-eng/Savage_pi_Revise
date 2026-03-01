import { getDb } from "../db";
import { deviceStatus } from "../../drizzle/schema";
import { SystemMetrics } from "./system-metrics";
import { gt, lt, eq, and } from "drizzle-orm";

/**
 * Store system metrics snapshot in database
 */
export async function storeMetricsSnapshot(metrics: SystemMetrics, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Metrics] Cannot store metrics: database not available");
    return;
  }

  try {
    await db.insert(deviceStatus).values({
      userId,
      cpuUsage: metrics.cpu.usage.toString(),
      memoryUsage: metrics.memory.usagePercent.toString(),
      temperature: metrics.temperature.cpu.toString(),
      batteryLevel: metrics.battery.level.toString(),
    });
  } catch (error) {
    console.error("[Metrics] Failed to store metrics snapshot:", error);
  }
}

/**
 * Get latest metrics snapshot
 */
export async function getLatestMetrics(userId: number): Promise<SystemMetrics | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Metrics] Cannot get metrics: database not available");
    return null;
  }

  try {
    const result = await db
      .select()
      .from(deviceStatus)
      .where(eq(deviceStatus.userId, userId))
      .orderBy((t) => t.lastUpdate)
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      cpu: {
        usage: parseFloat(row.cpuUsage || "0"),
        cores: 4,
        frequency: 1500,
      },
      memory: {
        total: 512,
        used: 256,
        available: 256,
        usagePercent: parseFloat(row.memoryUsage || "0"),
      },
      temperature: {
        cpu: parseFloat(row.temperature || "0"),
      },
      battery: {
        level: parseFloat(row.batteryLevel || "100"),
        status: "unknown",
        voltage: 5000,
      },
      uptime: 0,
      loadAverage: {
        oneMin: 0,
        fiveMin: 0,
        fifteenMin: 0,
      },
      disk: {
        total: 16384,
        used: 8192,
        available: 8192,
        usagePercent: 50,
      },
    };
  } catch (error) {
    console.error("[Metrics] Failed to get latest metrics:", error);
    return null;
  }
}

/**
 * Get metrics history for the last N hours
 */
export async function getMetricsHistory(
  userId: number,
  hours: number = 24
): Promise<SystemMetrics[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Metrics] Cannot get metrics history: database not available");
    return [];
  }

  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const results = await db
      .select()
      .from(deviceStatus)
      .where(eq(deviceStatus.userId, userId))
      .orderBy((t) => t.lastUpdate);

    return results.map((row) => ({
      cpu: {
        usage: 0,
        cores: 4,
        frequency: 1500,
      },
      memory: {
        total: 512,
        used: 256,
        available: 256,
        usagePercent: parseFloat(row.memoryUsage || "0"),
      },
      temperature: {
        cpu: parseFloat(row.temperature || "0"),
      },
      battery: {
        level: parseFloat(row.batteryLevel || "100"),
        status: "unknown",
        voltage: 5000,
      },
      uptime: 0,
      loadAverage: {
        oneMin: 0,
        fiveMin: 0,
        fifteenMin: 0,
      },
      disk: {
        total: 16384,
        used: 8192,
        available: 8192,
        usagePercent: 50,
      },
    }));
  } catch (error) {
    console.error("[Metrics] Failed to get metrics history:", error);
    return [];
  }
}

/**
 * Clean up old metrics (older than N days)
 */
export async function cleanupOldMetrics(days: number = 7): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Metrics] Cannot cleanup metrics: database not available");
    return;
  }

  try {
    const before = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    await db.delete(deviceStatus).where(lt(deviceStatus.lastUpdate, before));
  } catch (error) {
    console.error("[Metrics] Failed to cleanup old metrics:", error);
  }
}
