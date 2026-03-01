import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { getRaidOrchestrator, cleanupRaidOrchestrator } from "../raid/raid-orchestrator";

const RAID_CONFIG = {
  scanType: (process.env.RAID_SCAN_TYPE as any) || "standard",
  enableBruteForce: process.env.RAID_ENABLE_BRUTEFORCE !== "false",
  enableVulnScanning: process.env.RAID_ENABLE_VULN_SCANNING !== "false",
};

export const raidRouter = router({
  /**
   * Start raid session
   */
  startSession: protectedProcedure
    .input(
      z.object({
        target: z.string(),
        ports: z.string().optional(),
        scanType: z.enum(["quick", "standard", "comprehensive"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const session = await db.createRaidSession(ctx.user.id, 0); // Target ID will be set later

        if (!session) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }

        // Initialize raid orchestrator
        const orchestrator = getRaidOrchestrator(ctx.user.id, {
          ...RAID_CONFIG,
          scanType: input.scanType || RAID_CONFIG.scanType,
        });

        // Start raid in background
        orchestrator
          .start(input.target, session.id, input.ports)
          .catch((error) => {
            console.error("[Raid] Session failed:", error);
          });

        await db.logActivity(
          ctx.user.id,
          "raid_started",
          "info",
          `Started raid session on target ${input.target}`,
          "raid_session",
          session.id
        );

        return session;
      } catch (error) {
        console.error("[Raid] Failed to start session:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to start raid session",
        });
      }
    }),

  /**
   * Stop raid session
   */
  stopSession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const orchestrator = getRaidOrchestrator(ctx.user.id, RAID_CONFIG);

        if (!orchestrator.isActive()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Raid is not active",
          });
        }

        await orchestrator.stop();
        await db.updateRaidSessionStatus(input.sessionId, "completed");

        await db.logActivity(
          ctx.user.id,
          "raid_stopped",
          "info",
          "Stopped raid session",
          "raid_session",
          input.sessionId
        );

        return { success: true };
      } catch (error) {
        console.error("[Raid] Failed to stop session:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to stop raid session",
        });
      }
    }),

  /**
   * Get raid sessions
   */
  getSessions: protectedProcedure.query(async ({ ctx }) => {
    return db.getRaidSessionsByUser(ctx.user.id);
  }),

  /**
   * Get scan results
   */
  getResults: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const orchestrator = getRaidOrchestrator(ctx.user.id, RAID_CONFIG);

        return {
          nmap: orchestrator.getNmapResults(),
          bruteForce: orchestrator.getBruteForceResults(),
          vulnerabilities: orchestrator.getVulnerabilityResults(),
        };
      } catch (error) {
        console.error("[Raid] Failed to get results:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get raid results",
        });
      }
    }),

  /**
   * Get raid statistics
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const orchestrator = getRaidOrchestrator(ctx.user.id, RAID_CONFIG);
    return orchestrator.getStats();
  }),

  /**
   * Get discovered hosts
   */
  getHosts: protectedProcedure.query(async ({ ctx }) => {
    const orchestrator = getRaidOrchestrator(ctx.user.id, RAID_CONFIG);
    const results = orchestrator.getNmapResults();
    return results?.hosts || [];
  }),

  /**
   * Get discovered services
   */
  getServices: protectedProcedure.query(async ({ ctx }) => {
    const orchestrator = getRaidOrchestrator(ctx.user.id, RAID_CONFIG);
    const results = orchestrator.getNmapResults();

    if (!results) return [];

    const services = [];
    for (const host of results.hosts) {
      for (const port of host.ports) {
        if (port.state === "open") {
          services.push({
            ip: host.ip,
            port: port.number,
            protocol: port.protocol,
            service: port.service,
            version: port.version,
            product: port.product,
          });
        }
      }
    }

    return services;
  }),

  /**
   * Get discovered vulnerabilities
   */
  getVulnerabilities: protectedProcedure.query(async ({ ctx }) => {
    const orchestrator = getRaidOrchestrator(ctx.user.id, RAID_CONFIG);
    const results = orchestrator.getVulnerabilityResults();

    const vulns = [];
    for (const result of results) {
      for (const vuln of result.vulnerabilities) {
        vulns.push({
          ...vuln,
          service: result.service,
        });
      }
    }

    return vulns;
  }),

  /**
   * Get discovered credentials
   */
  getCredentials: protectedProcedure.query(async ({ ctx }) => {
    const orchestrator = getRaidOrchestrator(ctx.user.id, RAID_CONFIG);
    return orchestrator.getBruteForceResults();
  }),

  /**
   * Cleanup orchestrator
   */
  cleanup: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      cleanupRaidOrchestrator(ctx.user.id);
      return { success: true };
    } catch (error) {
      console.error("[Raid] Cleanup failed:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Cleanup failed",
      });
    }
  }),
});
