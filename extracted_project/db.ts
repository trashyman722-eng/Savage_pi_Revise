import { eq, and, desc, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  huntingSessions,
  handshakes,
  networkTargets,
  services,
  vulnerabilities,
  credentials,
  raidSessions,
  activityLog,
  deviceStatus,
  HuntingSession,
  Handshake,
  NetworkTarget,
  Service,
  Vulnerability,
  Credential,
  RaidSession,
  ActivityLog,
  DeviceStatus,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Hunting Session queries
export async function createHuntingSession(userId: number, targetArea?: string): Promise<HuntingSession | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(huntingSessions).values({
    userId,
    targetArea,
    status: "active",
  });

  return db.select().from(huntingSessions).where(eq(huntingSessions.id, Number(result[0].insertId))).then(r => r[0] || null);
}

export async function getHuntingSessionsByUser(userId: number): Promise<HuntingSession[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(huntingSessions).where(eq(huntingSessions.userId, userId)).orderBy(desc(huntingSessions.createdAt));
}

export async function updateHuntingSessionStatus(sessionId: number, status: "active" | "paused" | "completed"): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(huntingSessions).set({ status }).where(eq(huntingSessions.id, sessionId));
}

// Handshake queries
export async function createHandshake(huntingSessionId: number, ssid: string, bssid: string, signalStrength?: number, wpaVersion?: string): Promise<Handshake | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(handshakes).values({
    huntingSessionId,
    ssid,
    bssid,
    signalStrength,
    wpaVersion,
  });

  return db.select().from(handshakes).where(eq(handshakes.id, Number(result[0].insertId))).then(r => r[0] || null);
}

export async function getHandshakesBySession(huntingSessionId: number): Promise<Handshake[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(handshakes).where(eq(handshakes.huntingSessionId, huntingSessionId)).orderBy(desc(handshakes.captureTime));
}

export async function updateHandshakeCrackStatus(handshakeId: number, crackStatus: string, crackedPassword?: string, crackMethod?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(handshakes).set({ crackStatus: crackStatus as any, crackedPassword, crackMethod }).where(eq(handshakes.id, handshakeId));
}

// Network Target queries
export async function createNetworkTarget(userId: number, ipAddress: string, hostname?: string, macAddress?: string): Promise<NetworkTarget | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(networkTargets).values({
    userId,
    ipAddress,
    hostname,
    macAddress,
  });

  return db.select().from(networkTargets).where(eq(networkTargets.id, Number(result[0].insertId))).then(r => r[0] || null);
}

export async function getNetworkTargetsByUser(userId: number): Promise<NetworkTarget[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(networkTargets).where(eq(networkTargets.userId, userId)).orderBy(desc(networkTargets.lastSeen));
}

export async function updateNetworkTargetStatus(targetId: number, status: "active" | "inactive" | "compromised"): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(networkTargets).set({ status, lastSeen: new Date() }).where(eq(networkTargets.id, targetId));
}

// Service queries
export async function createService(networkTargetId: number, port: number, protocol: string, serviceName?: string, version?: string): Promise<Service | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(services).values({
    networkTargetId,
    port,
    protocol,
    serviceName,
    version,
  });

  return db.select().from(services).where(eq(services.id, Number(result[0].insertId))).then(r => r[0] || null);
}

export async function getServicesByTarget(networkTargetId: number): Promise<Service[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(services).where(eq(services.networkTargetId, networkTargetId)).orderBy(desc(services.port));
}

// Vulnerability queries
export async function createVulnerability(serviceId: number, title: string, severity: string, cveId?: string, cweId?: string, description?: string, cvssScore?: number, remediation?: string): Promise<Vulnerability | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(vulnerabilities).values({
    serviceId,
    title,
    severity: severity as any,
    cveId,
    cweId,
    description,
    cvssScore: cvssScore as any,
    remediation,
  });

  return db.select().from(vulnerabilities).where(eq(vulnerabilities.id, Number(result[0].insertId))).then(r => r[0] || null);
}

export async function getVulnerabilitiesByService(serviceId: number): Promise<Vulnerability[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(vulnerabilities).where(eq(vulnerabilities.serviceId, serviceId)).orderBy(desc(vulnerabilities.cvssScore));
}

// Credential queries
export async function createCredential(serviceId: number, username: string, passwordHash: string, discoveryMethod?: string): Promise<Credential | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(credentials).values({
    serviceId,
    username,
    passwordHash,
    discoveryMethod,
  });

  return db.select().from(credentials).where(eq(credentials.id, Number(result[0].insertId))).then(r => r[0] || null);
}

export async function getCredentialsByService(serviceId: number): Promise<Credential[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(credentials).where(eq(credentials.serviceId, serviceId));
}

// Raid Session queries
export async function createRaidSession(userId: number, networkTargetId: number): Promise<RaidSession | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(raidSessions).values({
    userId,
    networkTargetId,
    status: "active",
  });

  return db.select().from(raidSessions).where(eq(raidSessions.id, Number(result[0].insertId))).then(r => r[0] || null);
}

export async function getRaidSessionsByUser(userId: number): Promise<RaidSession[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(raidSessions).where(eq(raidSessions.userId, userId)).orderBy(desc(raidSessions.createdAt));
}

export async function updateRaidSessionStatus(sessionId: number, status: "active" | "paused" | "completed"): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(raidSessions).set({ status }).where(eq(raidSessions.id, sessionId));
}

// Activity Log queries
export async function logActivity(userId: number, eventType: string, severity: string, description?: string, relatedEntityType?: string, relatedEntityId?: number, metadata?: any): Promise<ActivityLog | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(activityLog).values({
    userId,
    eventType,
    severity: severity as any,
    description,
    relatedEntityType,
    relatedEntityId,
    metadata,
  });

  return db.select().from(activityLog).where(eq(activityLog.id, Number(result[0].insertId))).then(r => r[0] || null);
}

export async function getActivityLogByUser(userId: number, limit: number = 100): Promise<ActivityLog[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(activityLog).where(eq(activityLog.userId, userId)).orderBy(desc(activityLog.createdAt)).limit(limit);
}

// Device Status queries
export async function updateDeviceStatus(userId: number, cpuUsage?: number, memoryUsage?: number, temperature?: number, batteryLevel?: number, operationalMode?: string, isConnected?: boolean): Promise<DeviceStatus | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(deviceStatus).values({
    userId,
    cpuUsage: cpuUsage as any,
    memoryUsage: memoryUsage as any,
    temperature: temperature as any,
    batteryLevel: batteryLevel as any,
    operationalMode: operationalMode as any,
    isConnected,
  });

  return db.select().from(deviceStatus).where(eq(deviceStatus.id, Number(result[0].insertId))).then(r => r[0] || null);
}

export async function getLatestDeviceStatus(userId: number): Promise<DeviceStatus | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(deviceStatus).where(eq(deviceStatus.userId, userId)).orderBy(desc(deviceStatus.createdAt)).limit(1);

  return result.length > 0 ? result[0] : null;
}
