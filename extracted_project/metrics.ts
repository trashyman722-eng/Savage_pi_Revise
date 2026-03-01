import { router, protectedProcedure } from "../_core/trpc";
import { metricsReader } from "../metrics/system-metrics";
import {
  storeMetricsSnapshot,
  getLatestMetrics,
  getMetricsHistory,
  cleanupOldMetrics,
} from "../metrics/metrics-storage";
import { z } from "zod";

export const metricsRouter = router({
  /**
   * Get current system metrics
   */
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    try {
      const metrics = await metricsReader.getAllMetrics();

      // Store metrics snapshot in database
      await storeMetricsSnapshot(metrics, ctx.user.id);

      return metrics;
    } catch (error) {
      console.error("[Metrics Router] Failed to get current metrics:", error);
      throw error;
    }
  }),

  /**
   * Get latest stored metrics
   */
  getLatest: protectedProcedure.query(async ({ ctx }) => {
    try {
      const metrics = await getLatestMetrics(ctx.user.id);
      return metrics;
    } catch (error) {
      console.error("[Metrics Router] Failed to get latest metrics:", error);
      throw error;
    }
  }),

  /**
   * Get metrics history for specified hours
   */
  getHistory: protectedProcedure
    .input(z.object({ hours: z.number().min(1).max(168).default(24) }))
    .query(async ({ ctx, input }) => {
      try {
        const history = await getMetricsHistory(ctx.user.id, input.hours);
        return history;
      } catch (error) {
        console.error("[Metrics Router] Failed to get metrics history:", error);
        throw error;
      }
    }),

  /**
   * Get CPU metrics
   */
  getCpuMetrics: protectedProcedure.query(async () => {
    try {
      const cpuUsage = await metricsReader.readCpuUsage();
      const cpuInfo = await metricsReader.readCpuInfo();

      return {
        usage: cpuUsage,
        cores: cpuInfo.cores,
        frequency: cpuInfo.frequency,
      };
    } catch (error) {
      console.error("[Metrics Router] Failed to get CPU metrics:", error);
      throw error;
    }
  }),

  /**
   * Get memory metrics
   */
  getMemoryMetrics: protectedProcedure.query(async () => {
    try {
      const memory = await metricsReader.readMemoryUsage();
      return memory;
    } catch (error) {
      console.error("[Metrics Router] Failed to get memory metrics:", error);
      throw error;
    }
  }),

  /**
   * Get temperature metrics
   */
  getTemperatureMetrics: protectedProcedure.query(async () => {
    try {
      const temperature = await metricsReader.readTemperature();
      return temperature;
    } catch (error) {
      console.error("[Metrics Router] Failed to get temperature metrics:", error);
      throw error;
    }
  }),

  /**
   * Get battery metrics
   */
  getBatteryMetrics: protectedProcedure.query(async () => {
    try {
      const battery = await metricsReader.readBatteryStatus();
      return battery;
    } catch (error) {
      console.error("[Metrics Router] Failed to get battery metrics:", error);
      throw error;
    }
  }),

  /**
   * Get disk metrics
   */
  getDiskMetrics: protectedProcedure.query(async () => {
    try {
      const disk = await metricsReader.readDiskUsage();
      return disk;
    } catch (error) {
      console.error("[Metrics Router] Failed to get disk metrics:", error);
      throw error;
    }
  }),

  /**
   * Get system uptime
   */
  getUptime: protectedProcedure.query(async () => {
    try {
      const uptime = await metricsReader.readUptime();
      const loadAverage = await metricsReader.readLoadAverage();

      return {
        uptime,
        loadAverage,
      };
    } catch (error) {
      console.error("[Metrics Router] Failed to get uptime:", error);
      throw error;
    }
  }),

  /**
   * Cleanup old metrics
   */
  cleanup: protectedProcedure
    .input(z.object({ days: z.number().min(1).default(7) }))
    .mutation(async ({ input }) => {
      try {
        await cleanupOldMetrics(input.days);
        return { success: true };
      } catch (error) {
        console.error("[Metrics Router] Failed to cleanup metrics:", error);
        throw error;
      }
    }),
});
