import { EventEmitter as NodeEventEmitter } from "events";
import { z } from "zod";

/**
 * SAVAGE Orchestration Engine
 * Manages state transitions between Hunting and Raid phases
 * Coordinates real-time event streaming via WebSocket
 */

export type OperationalMode = "hunting" | "raid" | "idle" | "charging";
export type HuntingStatus = "active" | "paused" | "completed";
export type RaidStatus = "active" | "paused" | "completed";

export interface OrchestrationState {
  mode: OperationalMode;
  huntingSessionId: number | null;
  raidSessionId: number | null;
  huntingStatus: HuntingStatus;
  raidStatus: RaidStatus;
  activeTargetId: number | null;
  lastUpdate: Date;
}

export interface WebSocketEvent {
  type: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  timestamp: Date;
  data: Record<string, any>;
  userId: number;
}

export const WebSocketEventSchema = z.object({
  type: z.string(),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  timestamp: z.date(),
  data: z.record(z.string(), z.any()),
  userId: z.number(),
});

/**
 * Event types for WebSocket streaming
 */
export const EVENT_TYPES = {
  // Hunting phase events
  HUNTING_STARTED: "hunting_started",
  HUNTING_PAUSED: "hunting_paused",
  HUNTING_COMPLETED: "hunting_completed",
  HANDSHAKE_CAPTURED: "handshake_captured",
  HANDSHAKE_CRACK_PROGRESS: "handshake_crack_progress",
  HANDSHAKE_CRACKED: "handshake_cracked",

  // Raid phase events
  RAID_STARTED: "raid_started",
  RAID_PAUSED: "raid_paused",
  RAID_COMPLETED: "raid_completed",
  TARGET_DISCOVERED: "target_discovered",
  SERVICE_DISCOVERED: "service_discovered",
  VULNERABILITY_FOUND: "vulnerability_found",
  CREDENTIAL_FOUND: "credential_found",

  // Mode transitions
  MODE_CHANGED: "mode_changed",
  STATE_CHANGED: "state_changed",

  // Device events
  DEVICE_STATUS_UPDATE: "device_status_update",
  BATTERY_WARNING: "battery_warning",
  TEMPERATURE_WARNING: "temperature_warning",

  // Error events
  ERROR: "error",
  WARNING: "warning",
};

/**
 * Core Orchestration Engine
 * Manages state machine and event emission for real-time updates
 */
export class SavageOrchestrator extends NodeEventEmitter {
  private state: OrchestrationState;
  private userId: number;

  constructor(userId: number) {
    super();
    this.userId = userId;
    this.state = {
      mode: "idle",
      huntingSessionId: null,
      raidSessionId: null,
      huntingStatus: "completed",
      raidStatus: "completed",
      activeTargetId: null,
      lastUpdate: new Date(),
    };
  }

  /**
   * Get current orchestration state
   */
  getState(): OrchestrationState {
    return { ...this.state };
  }

  /**
   * Transition to Hunting mode
   */
  async startHunting(huntingSessionId: number): Promise<void> {
    if (this.state.mode === "raid" && this.state.raidStatus === "active") {
      throw new Error("Cannot start hunting while raid is active");
    }

    this.state.mode = "hunting";
    this.state.huntingSessionId = huntingSessionId;
    this.state.huntingStatus = "active";
    this.state.lastUpdate = new Date();

    this.emitEvent({
      type: EVENT_TYPES.MODE_CHANGED,
      severity: "info",
      data: { mode: "hunting", sessionId: huntingSessionId },
    });

    this.emitEvent({
      type: EVENT_TYPES.HUNTING_STARTED,
      severity: "info",
      data: { sessionId: huntingSessionId },
    });
  }

  /**
   * Pause hunting
   */
  async pauseHunting(): Promise<void> {
    if (this.state.mode !== "hunting") {
      throw new Error("Not in hunting mode");
    }

    this.state.huntingStatus = "paused";
    this.state.lastUpdate = new Date();

    this.emitEvent({
      type: EVENT_TYPES.HUNTING_PAUSED,
      severity: "info",
      data: { sessionId: this.state.huntingSessionId },
    });
  }

  /**
   * Resume hunting
   */
  async resumeHunting(): Promise<void> {
    if (this.state.mode !== "hunting") {
      throw new Error("Not in hunting mode");
    }

    this.state.huntingStatus = "active";
    this.state.lastUpdate = new Date();

    this.emitEvent({
      type: EVENT_TYPES.HUNTING_STARTED,
      severity: "info",
      data: { sessionId: this.state.huntingSessionId },
    });
  }

  /**
   * Complete hunting and transition to Raid mode
   */
  async completeHuntingAndStartRaid(raidSessionId: number, targetId: number): Promise<void> {
    if (this.state.mode !== "hunting") {
      throw new Error("Not in hunting mode");
    }

    this.state.huntingStatus = "completed";
    this.state.mode = "raid";
    this.state.raidSessionId = raidSessionId;
    this.state.raidStatus = "active";
    this.state.activeTargetId = targetId;
    this.state.lastUpdate = new Date();

    this.emitEvent({
      type: EVENT_TYPES.HUNTING_COMPLETED,
      severity: "info",
      data: { sessionId: this.state.huntingSessionId },
    });

    this.emitEvent({
      type: EVENT_TYPES.MODE_CHANGED,
      severity: "info",
      data: { mode: "raid", sessionId: raidSessionId, targetId },
    });

    this.emitEvent({
      type: EVENT_TYPES.RAID_STARTED,
      severity: "info",
      data: { sessionId: raidSessionId, targetId },
    });
  }

  /**
   * Pause raid
   */
  async pauseRaid(): Promise<void> {
    if (this.state.mode !== "raid") {
      throw new Error("Not in raid mode");
    }

    this.state.raidStatus = "paused";
    this.state.lastUpdate = new Date();

    this.emitEvent({
      type: EVENT_TYPES.RAID_PAUSED,
      severity: "info",
      data: { sessionId: this.state.raidSessionId },
    });
  }

  /**
   * Resume raid
   */
  async resumeRaid(): Promise<void> {
    if (this.state.mode !== "raid") {
      throw new Error("Not in raid mode");
    }

    this.state.raidStatus = "active";
    this.state.lastUpdate = new Date();

    this.emitEvent({
      type: EVENT_TYPES.RAID_STARTED,
      severity: "info",
      data: { sessionId: this.state.raidSessionId },
    });
  }

  /**
   * Complete raid and return to idle
   */
  async completeRaid(): Promise<void> {
    if (this.state.mode !== "raid") {
      throw new Error("Not in raid mode");
    }

    this.state.raidStatus = "completed";
    this.state.mode = "idle";
    this.state.raidSessionId = null;
    this.state.activeTargetId = null;
    this.state.lastUpdate = new Date();

    this.emitEvent({
      type: EVENT_TYPES.RAID_COMPLETED,
      severity: "info",
      data: { sessionId: this.state.raidSessionId },
    });

    this.emitEvent({
      type: EVENT_TYPES.MODE_CHANGED,
      severity: "info",
      data: { mode: "idle" },
    });
  }

  /**
   * Return to idle mode
   */
  async goIdle(): Promise<void> {
    if (this.state.huntingStatus === "active") {
      this.state.huntingStatus = "completed";
    }
    if (this.state.raidStatus === "active") {
      this.state.raidStatus = "completed";
    }

    this.state.mode = "idle";
    this.state.lastUpdate = new Date();

    this.emitEvent({
      type: EVENT_TYPES.MODE_CHANGED,
      severity: "info",
      data: { mode: "idle" },
    });
  }

  /**
   * Report handshake captured event
   */
  reportHandshakeCaptured(handshakeId: number, ssid: string, bssid: string, signalStrength: number): void {
    this.emitEvent({
      type: EVENT_TYPES.HANDSHAKE_CAPTURED,
      severity: "info",
      data: { handshakeId, ssid, bssid, signalStrength },
    });
  }

  /**
   * Report handshake crack progress
   */
  reportCrackProgress(handshakeId: number, progress: number, method: string): void {
    this.emitEvent({
      type: EVENT_TYPES.HANDSHAKE_CRACK_PROGRESS,
      severity: "info",
      data: { handshakeId, progress, method },
    });
  }

  /**
   * Report handshake cracked
   */
  reportHandshakeCracked(handshakeId: number, ssid: string, password: string, method: string): void {
    this.emitEvent({
      type: EVENT_TYPES.HANDSHAKE_CRACKED,
      severity: "high",
      data: { handshakeId, ssid, password, method },
    });
  }

  /**
   * Report target discovered
   */
  reportTargetDiscovered(targetId: number, ipAddress: string, hostname?: string, macAddress?: string): void {
    this.emitEvent({
      type: EVENT_TYPES.TARGET_DISCOVERED,
      severity: "info",
      data: { targetId, ipAddress, hostname, macAddress },
    });
  }

  /**
   * Report service discovered
   */
  reportServiceDiscovered(serviceId: number, targetId: number, port: number, protocol: string, serviceName?: string, version?: string): void {
    this.emitEvent({
      type: EVENT_TYPES.SERVICE_DISCOVERED,
      severity: "medium",
      data: { serviceId, targetId, port, protocol, serviceName, version },
    });
  }

  /**
   * Report vulnerability found
   */
  reportVulnerabilityFound(vulnId: number, serviceId: number, title: string, severity: string, cvssScore?: number, cveId?: string): void {
    this.emitEvent({
      type: EVENT_TYPES.VULNERABILITY_FOUND,
      severity: severity as any,
      data: { vulnId, serviceId, title, cvssScore, cveId },
    });
  }

  /**
   * Report credential found
   */
  reportCredentialFound(credId: number, serviceId: number, username: string, method: string): void {
    this.emitEvent({
      type: EVENT_TYPES.CREDENTIAL_FOUND,
      severity: "high",
      data: { credId, serviceId, username, method },
    });
  }

  /**
   * Report device status update
   */
  reportDeviceStatus(cpuUsage: number, memoryUsage: number, temperature: number, batteryLevel: number): void {
    this.emitEvent({
      type: EVENT_TYPES.DEVICE_STATUS_UPDATE,
      severity: "info",
      data: { cpuUsage, memoryUsage, temperature, batteryLevel },
    });

    if (temperature > 80) {
      this.emitEvent({
        type: EVENT_TYPES.TEMPERATURE_WARNING,
        severity: "high",
        data: { temperature },
      });
    }

    if (batteryLevel < 20) {
      this.emitEvent({
        type: EVENT_TYPES.BATTERY_WARNING,
        severity: "medium",
        data: { batteryLevel },
      });
    }
  }

  /**
   * Report error
   */
  reportError(message: string, details?: any): void {
    this.emitEvent({
      type: EVENT_TYPES.ERROR,
      severity: "critical",
      data: { message, details },
    });
  }

  /**
   * Report warning
   */
  reportWarning(message: string, details?: any): void {
    this.emitEvent({
      type: EVENT_TYPES.WARNING,
      severity: "high",
      data: { message, details },
    });
  }

  /**
   * Emit WebSocket event
   */
  private emitEvent(event: Omit<WebSocketEvent, "userId" | "timestamp"> & { timestamp?: Date }): void {
    const fullEvent: WebSocketEvent = {
      ...event,
      timestamp: event.timestamp || new Date(),
      userId: this.userId,
    };

    this.emit("event", fullEvent);
    this.emit(event.type, fullEvent);
  }

  /**
   * Subscribe to events
   */
  onEvent(callback: (event: WebSocketEvent) => void): void {
    this.on("event", callback);
  }

  /**
   * Subscribe to specific event type
   */
  onEventType(eventType: string, callback: (event: WebSocketEvent) => void): void {
    this.on(eventType, callback);
  }

  /**
   * Unsubscribe from events
   */
  offEvent(callback: (event: WebSocketEvent) => void): void {
    this.off("event", callback);
  }

  /**
   * Unsubscribe from specific event type
   */
  offEventType(eventType: string, callback: (event: WebSocketEvent) => void): void {
    this.off(eventType, callback);
  }
}

/**
 * Global orchestrator instances (one per user)
 */
const orchestrators = new Map<number, SavageOrchestrator>();

/**
 * Get or create orchestrator for user
 */
export function getOrchestrator(userId: number): SavageOrchestrator {
  if (!orchestrators.has(userId)) {
    orchestrators.set(userId, new SavageOrchestrator(userId));
  }
  return orchestrators.get(userId)!;
}

/**
 * Cleanup orchestrator for user
 */
export function cleanupOrchestrator(userId: number): void {
  const orchestrator = orchestrators.get(userId);
  if (orchestrator) {
    orchestrator.removeAllListeners();
    orchestrators.delete(userId);
  }
}
