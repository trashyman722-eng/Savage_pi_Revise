import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { huntingRouter } from "./routers/hunting";
import { raidRouter } from "./routers/raid";
import { metricsRouter } from "./routers/metrics";
import { rfidRouter } from "./routers/rfid";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,
  hunting: huntingRouter,
  raid: raidRouter,
  metrics: metricsRouter,
  rfid: rfidRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Network Target procedures
  targets: router({
    create: protectedProcedure
      .input(z.object({
        ipAddress: z.string(),
        hostname: z.string().optional(),
        macAddress: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const target = await db.createNetworkTarget(ctx.user.id, input.ipAddress, input.hostname, input.macAddress);
        if (!target) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        await db.logActivity(ctx.user.id, "target_discovered", "info", `Discovered network target ${input.ipAddress}`, "network_target", target.id);
        
        return target;
      }),

    getAll: protectedProcedure.query(async ({ ctx }) => {
      return db.getNetworkTargetsByUser(ctx.user.id);
    }),

    updateStatus: protectedProcedure
      .input(z.object({
        targetId: z.number(),
        status: z.enum(["active", "inactive", "compromised"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateNetworkTargetStatus(input.targetId, input.status);
        await db.logActivity(ctx.user.id, "target_status_changed", "info", `Target status changed to ${input.status}`, "network_target", input.targetId);
        return { success: true };
      }),
  }),

  // Service procedures
  services: router({
    create: protectedProcedure
      .input(z.object({
        networkTargetId: z.number(),
        port: z.number(),
        protocol: z.string(),
        serviceName: z.string().optional(),
        version: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const service = await db.createService(
          input.networkTargetId,
          input.port,
          input.protocol,
          input.serviceName,
          input.version
        );
        if (!service) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        await db.logActivity(ctx.user.id, "service_discovered", "info", `Discovered service ${input.serviceName} on port ${input.port}`, "service", service.id);
        
        return service;
      }),

    getByTarget: protectedProcedure
      .input(z.object({
        networkTargetId: z.number(),
      }))
      .query(async ({ input }) => {
        return db.getServicesByTarget(input.networkTargetId);
      }),
  }),

  // Vulnerability procedures
  vulnerabilities: router({
    create: protectedProcedure
      .input(z.object({
        serviceId: z.number(),
        title: z.string(),
        severity: z.enum(["critical", "high", "medium", "low", "info"]),
        cveId: z.string().optional(),
        cweId: z.string().optional(),
        description: z.string().optional(),
        cvssScore: z.number().optional(),
        remediation: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const vuln = await db.createVulnerability(
          input.serviceId,
          input.title,
          input.severity,
          input.cveId,
          input.cweId,
          input.description,
          input.cvssScore,
          input.remediation
        );
        if (!vuln) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        await db.logActivity(ctx.user.id, "vulnerability_found", input.severity, `Found vulnerability: ${input.title}`, "vulnerability", vuln.id);
        
        return vuln;
      }),

    getByService: protectedProcedure
      .input(z.object({
        serviceId: z.number(),
      }))
      .query(async ({ input }) => {
        return db.getVulnerabilitiesByService(input.serviceId);
      }),
  }),

  // Credential procedures
  credentials: router({
    create: protectedProcedure
      .input(z.object({
        serviceId: z.number(),
        username: z.string(),
        passwordHash: z.string(),
        discoveryMethod: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const cred = await db.createCredential(
          input.serviceId,
          input.username,
          input.passwordHash,
          input.discoveryMethod
        );
        if (!cred) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        await db.logActivity(ctx.user.id, "credential_found", "high", `Found credential for ${input.username}`, "credential", cred.id);
        
        return cred;
      }),

    getByService: protectedProcedure
      .input(z.object({
        serviceId: z.number(),
      }))
      .query(async ({ input }) => {
        return db.getCredentialsByService(input.serviceId);
      }),
  }),

  // Activity Log procedures
  activity: router({
    getRecent: protectedProcedure
      .input(z.object({
        limit: z.number().default(100),
      }))
      .query(async ({ ctx, input }) => {
        return db.getActivityLogByUser(ctx.user.id, input.limit);
      }),
  }),

  // Device Status procedures
  device: router({
    updateStatus: protectedProcedure
      .input(z.object({
        cpuUsage: z.number().optional(),
        memoryUsage: z.number().optional(),
        temperature: z.number().optional(),
        batteryLevel: z.number().optional(),
        operationalMode: z.enum(["hunting", "raid", "idle", "charging"]).optional(),
        isConnected: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const status = await db.updateDeviceStatus(
          ctx.user.id,
          input.cpuUsage,
          input.memoryUsage,
          input.temperature,
          input.batteryLevel,
          input.operationalMode,
          input.isConnected
        );
        if (!status) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        return status;
      }),

    getStatus: protectedProcedure.query(async ({ ctx }) => {
      return db.getLatestDeviceStatus(ctx.user.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;
