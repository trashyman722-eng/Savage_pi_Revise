import { Server as HTTPServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { getOrchestrator, cleanupOrchestrator, WebSocketEvent } from "./orchestration";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME } from "@shared/const";
import type { IncomingMessage } from "http";

interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  isAlive?: boolean;
}

/**
 * Initialize WebSocket server for real-time SAVAGE events
 */
export function initializeWebSocketServer(httpServer: HTTPServer): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: "/api/ws" });

  // Heartbeat interval to detect stale connections
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws: AuthenticatedWebSocket) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("connection", async (ws: AuthenticatedWebSocket, req: any) => {
    try {
      // Extract and verify session cookie
      const cookies = req.headers.cookie?.split(";").reduce((acc: Record<string, string>, cookie: string) => {
        const [key, value] = cookie.trim().split("=");
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>) || {};

      const sessionCookie = cookies[COOKIE_NAME];
      if (!sessionCookie) {
        ws.close(1008, "Unauthorized");
        return;
      }

      // Verify session token and get user
      let user;
      try {
        // Create a mock request with the cookie
        const mockReq = {
          headers: { cookie: `${COOKIE_NAME}=${sessionCookie}` },
        } as any;
        user = await sdk.authenticateRequest(mockReq);
      } catch (error) {
        ws.close(1008, "Unauthorized");
        return;
      }

      if (!user || !user.id) {
        ws.close(1008, "Unauthorized");
        return;
      }

      const userId = user.id;

      ws.userId = userId;
      ws.isAlive = true;

      console.log(`[WebSocket] User ${userId} connected`);

      // Get orchestrator for this user
      const orchestrator = getOrchestrator(userId);

      // Subscribe to orchestrator events
      const eventHandler = (event: WebSocketEvent) => {
        if (ws.readyState === 1) { // WebSocket.OPEN = 1
          ws.send(JSON.stringify(event));
        }
      };

      orchestrator.onEvent(eventHandler);

      // Send current state to client
      ws.send(JSON.stringify({
        type: "state_sync",
        severity: "info",
        timestamp: new Date(),
        data: orchestrator.getState(),
        userId,
      }));

      // Handle incoming messages
      ws.on("message", async (data: any) => {
        try {
          const message = JSON.parse(data.toString());
          await handleWebSocketMessage(ws, message, orchestrator);
        } catch (error) {
          console.error("[WebSocket] Error handling message:", error);
          ws.send(JSON.stringify({
            type: "error",
            severity: "high",
            timestamp: new Date(),
            data: { message: "Invalid message format" },
            userId,
          }));
        }
      });

      // Handle pong
      ws.on("pong", () => {
        ws.isAlive = true;
      });

      // Handle disconnect
      ws.on("close", () => {
        console.log(`[WebSocket] User ${userId} disconnected`);
        orchestrator.offEvent(eventHandler);
        cleanupOrchestrator(userId);
      });

      // Handle errors
      ws.on("error", (error: Error) => {
        console.error("[WebSocket] Connection error:", error);
      });
    } catch (error) {
      console.error("[WebSocket] Connection error:", error);
      ws.close(1011, "Internal server error");
    }
  });

  // Cleanup on server close
  process.on("exit", () => {
    clearInterval(heartbeatInterval);
    wss.close();
  });

  return wss;
}

/**
 * Handle incoming WebSocket messages
 */
async function handleWebSocketMessage(ws: AuthenticatedWebSocket, message: any, orchestrator: any): Promise<void> {
  const { type, payload } = message;

  try {
    switch (type) {
      case "get_state":
        ws.send(JSON.stringify({
          type: "state_sync",
          severity: "info",
          timestamp: new Date(),
          data: orchestrator.getState(),
          userId: ws.userId,
        }));
        break;

      case "start_hunting":
        await orchestrator.startHunting(payload.sessionId);
        break;

      case "pause_hunting":
        await orchestrator.pauseHunting();
        break;

      case "resume_hunting":
        await orchestrator.resumeHunting();
        break;

      case "complete_hunting_and_start_raid":
        await orchestrator.completeHuntingAndStartRaid(payload.raidSessionId, payload.targetId);
        break;

      case "pause_raid":
        await orchestrator.pauseRaid();
        break;

      case "resume_raid":
        await orchestrator.resumeRaid();
        break;

      case "complete_raid":
        await orchestrator.completeRaid();
        break;

      case "go_idle":
        await orchestrator.goIdle();
        break;

      case "report_handshake_captured":
        orchestrator.reportHandshakeCaptured(
          payload.handshakeId,
          payload.ssid,
          payload.bssid,
          payload.signalStrength
        );
        break;

      case "report_crack_progress":
        orchestrator.reportCrackProgress(
          payload.handshakeId,
          payload.progress,
          payload.method
        );
        break;

      case "report_handshake_cracked":
        orchestrator.reportHandshakeCracked(
          payload.handshakeId,
          payload.ssid,
          payload.password,
          payload.method
        );
        break;

      case "report_target_discovered":
        orchestrator.reportTargetDiscovered(
          payload.targetId,
          payload.ipAddress,
          payload.hostname,
          payload.macAddress
        );
        break;

      case "report_service_discovered":
        orchestrator.reportServiceDiscovered(
          payload.serviceId,
          payload.targetId,
          payload.port,
          payload.protocol,
          payload.serviceName,
          payload.version
        );
        break;

      case "report_vulnerability_found":
        orchestrator.reportVulnerabilityFound(
          payload.vulnId,
          payload.serviceId,
          payload.title,
          payload.severity,
          payload.cvssScore,
          payload.cveId
        );
        break;

      case "report_credential_found":
        orchestrator.reportCredentialFound(
          payload.credId,
          payload.serviceId,
          payload.username,
          payload.method
        );
        break;

      case "report_device_status":
        orchestrator.reportDeviceStatus(
          payload.cpuUsage,
          payload.memoryUsage,
          payload.temperature,
          payload.batteryLevel
        );
        break;

      default:
        console.warn(`[WebSocket] Unknown message type: ${type}`);
    }
  } catch (error) {
    console.error(`[WebSocket] Error handling ${type}:`, error);
    ws.send(JSON.stringify({
      type: "error",
      severity: "high",
      timestamp: new Date(),
      data: { message: `Error handling ${type}`, error: String(error) },
      userId: ws.userId,
    }));
  }
}
