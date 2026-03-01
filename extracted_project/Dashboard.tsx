import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import "../styles/cyberpunk.css";

type OperationalMode = "hunting" | "raid" | "idle" | "charging";
type EventType = string;

interface WebSocketEvent {
  type: EventType;
  severity: "critical" | "high" | "medium" | "low" | "info";
  timestamp: string;
  data: Record<string, any>;
  userId: number;
}

interface OrchestrationState {
  mode: OperationalMode;
  huntingSessionId: number | null;
  raidSessionId: number | null;
  huntingStatus: string;
  raidStatus: string;
  activeTargetId: number | null;
  lastUpdate: string;
}

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [state, setState] = useState<OrchestrationState | null>(null);
  const [events, setEvents] = useState<WebSocketEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [handshakes, setHandshakes] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);

  const huntingSessions = trpc.hunting.getSessions.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const raidSessions = trpc.raid.getSessions.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const networkTargets = trpc.targets.getAll.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const startHunting = trpc.hunting.startSession.useMutation();
  const startRaid = trpc.raid.startSession.useMutation();

  // Initialize WebSocket connection
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("[WebSocket] Connected");
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketEvent;

        if (message.type === "state_sync") {
          setState(message.data as OrchestrationState);
        } else {
          setEvents((prev) => [message, ...prev.slice(0, 99)]);

          // Update local state based on event
          if (message.type === "target_discovered") {
            setTargets((prev) => [...prev, message.data]);
          } else if (message.type === "handshake_captured") {
            setHandshakes((prev) => [...prev, message.data]);
          }
        }
      } catch (error) {
        console.error("[WebSocket] Error parsing message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("[WebSocket] Error:", error);
    };

    ws.onclose = () => {
      console.log("[WebSocket] Disconnected");
      setIsConnected(false);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [isAuthenticated, user]);

  const sendWebSocketMessage = (type: string, payload: any = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  };

  const handleStartHunting = async () => {
    try {
      const session = await startHunting.mutateAsync({
        targetArea: "SAVAGE Hunting Zone",
      });
      sendWebSocketMessage("start_hunting", { sessionId: session.id });
    } catch (error) {
      console.error("Failed to start hunting:", error);
    }
  };

  const handlePauseHunting = () => {
    sendWebSocketMessage("pause_hunting");
  };

  const handleResumeHunting = () => {
    sendWebSocketMessage("resume_hunting");
  };

  const handleStartRaid = async () => {
    if (!state?.huntingSessionId || targets.length === 0) return;

    try {
      const raid = await startRaid.mutateAsync({
        target: targets[0].ip || "192.168.1.0/24",
        ports: "1-10000",
        scanType: "standard",
      });
      sendWebSocketMessage("raid_started", {
        raidSessionId: raid.id,
        target: targets[0].ip,
      });
    } catch (error) {
      console.error("Failed to start raid:", error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="neon-card text-center">
          <h1 className="neon-text text-3xl mb-4">SAVAGE FRAMEWORK</h1>
          <p className="text-gray-400 mb-6">
            Unified Cybersecurity Platform
          </p>
          <p className="text-red-500">Authentication required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-cyan-400 font-mono">
      {/* Header */}
      <header className="border-b border-cyan-500 bg-black bg-opacity-80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="neon-text text-2xl">⚔ SAVAGE</h1>
            <div className="h-8 w-px bg-cyan-500"></div>
            {state && (
              <div className={`mode-indicator ${state.mode}`}>
                <span className="status-indicator active"></span>
                {state.mode.toUpperCase()}
              </div>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {isConnected ? (
              <span className="text-green-500">● CONNECTED</span>
            ) : (
              <span className="text-red-500">● DISCONNECTED</span>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Control Panel */}
        <section className="mb-8">
          <h2 className="neon-text text-xl mb-4">CONTROL PANEL</h2>
          <div className="neon-card">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <button
                onClick={handleStartHunting}
                disabled={state?.mode === "hunting"}
                className="neon-button"
              >
                START HUNT
              </button>
              <button
                onClick={handlePauseHunting}
                disabled={state?.mode !== "hunting"}
                className="neon-button"
              >
                PAUSE
              </button>
              <button
                onClick={handleResumeHunting}
                disabled={state?.mode !== "hunting"}
                className="neon-button"
              >
                RESUME
              </button>
              <button
                onClick={handleStartRaid}
                disabled={state?.mode === "raid" || targets.length === 0}
                className="neon-button pink"
              >
                INITIATE RAID
              </button>
            </div>
          </div>
        </section>

        {/* Statistics Grid */}
        <section className="mb-8">
          <h2 className="neon-text text-xl mb-4">STATISTICS</h2>
          <div className="data-grid">
            <div className="data-item">
              <div className="data-label">Handshakes Captured</div>
              <div className="data-value">{handshakes.length}</div>
            </div>
            <div className="data-item">
              <div className="data-label">Targets Discovered</div>
              <div className="data-value">{targets.length}</div>
            </div>
            <div className="data-item">
              <div className="data-label">Active Sessions</div>
              <div className="data-value">
                {(huntingSessions.data?.length || 0) +
                  (raidSessions.data?.length || 0)}
              </div>
            </div>
            <div className="data-item">
              <div className="data-label">System Status</div>
              <div className="data-value success">OPERATIONAL</div>
            </div>
          </div>
        </section>

        {/* Hunting Mode */}
        {state?.mode === "hunting" && (
          <section className="mb-8">
            <h2 className="neon-text text-xl mb-4">HUNTING MODE</h2>
            <div className="neon-card active">
              <div className="mb-4">
                <div className="data-label">Session ID</div>
                <div className="data-value">
                  {state.huntingSessionId || "N/A"}
                </div>
              </div>
              <div className="neon-divider"></div>
              <div className="mt-4">
                <div className="data-label">Status</div>
                <div className="flex items-center gap-2">
                  <span className="status-indicator active"></span>
                  <span className="text-yellow-400 uppercase font-bold">
                    {state.huntingStatus}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Raid Mode */}
        {state?.mode === "raid" && (
          <section className="mb-8">
            <h2 className="neon-text text-xl mb-4">RAID MODE</h2>
            <div className="neon-card active">
              <div className="mb-4">
                <div className="data-label">Target ID</div>
                <div className="data-value">{state.activeTargetId || "N/A"}</div>
              </div>
              <div className="neon-divider"></div>
              <div className="mt-4">
                <div className="data-label">Status</div>
                <div className="flex items-center gap-2">
                  <span className="status-indicator critical"></span>
                  <span className="text-red-500 uppercase font-bold">
                    {state.raidStatus}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Recent Events */}
        <section>
          <h2 className="neon-text text-xl mb-4">ACTIVITY LOG</h2>
          <div className="neon-card">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {events.length === 0 ? (
                <p className="text-gray-500">No events yet...</p>
              ) : (
                events.map((event, idx) => (
                  <div
                    key={idx}
                    className={`text-sm p-2 border-l-2 ${
                      event.severity === "critical"
                        ? "border-red-500 text-red-400"
                        : event.severity === "high"
                          ? "border-yellow-500 text-yellow-400"
                          : "border-cyan-500 text-cyan-400"
                    }`}
                  >
                    <span className="text-gray-500">
                      [{new Date(event.timestamp).toLocaleTimeString()}]
                    </span>{" "}
                    <span className="uppercase font-bold">{event.type}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
