import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Cpu,
  HardDrive,
  Thermometer,
  Battery,
  Wifi,
  Clock,
  AlertCircle,
  CheckCircle2,
  Zap,
  Activity,
} from "lucide-react";
import { toast } from "sonner";

interface DeviceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  temperature: number;
  batteryLevel: number;
  operationalMode: "hunting" | "raid" | "idle" | "charging";
  isConnected: boolean;
  uptime: number;
  timestamp: Date;
}

interface MetricsHistory {
  timestamp: string;
  cpu: number;
  memory: number;
  temperature: number;
  battery: number;
}

export default function DeviceStatus() {
  const [metrics, setMetrics] = useState<DeviceMetrics | null>(null);
  const [history, setHistory] = useState<MetricsHistory[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch current device metrics
  const { data: metricsData, refetch } = trpc.metrics.getCurrent.useQuery();

  useEffect(() => {
    if (metricsData) {
      const newMetrics: DeviceMetrics = {
        cpuUsage: Math.round(metricsData.cpu.usage),
        memoryUsage: Math.round(metricsData.memory.usagePercent),
        temperature: Math.round(metricsData.temperature.cpu),
        batteryLevel: Math.round(metricsData.battery.level),
        operationalMode: "idle",
        isConnected: true,
        uptime: metricsData.uptime,
        timestamp: new Date(),
      };

      setMetrics(newMetrics);

      // Add to history (keep last 20 entries)
      const newHistory: MetricsHistory = {
        timestamp: new Date().toLocaleTimeString(),
        cpu: newMetrics.cpuUsage,
        memory: newMetrics.memoryUsage,
        temperature: newMetrics.temperature,
        battery: newMetrics.batteryLevel,
      };

      setHistory((prev) => [...prev.slice(-19), newHistory]);
    }
  }, [metricsData]);

  // Auto-refresh every 3 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refetch();
    }, 3000);

    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

  const getTemperatureColor = (temp: number) => {
    if (temp < 40) return "text-blue-400";
    if (temp < 60) return "text-green-400";
    if (temp < 75) return "text-yellow-400";
    return "text-red-400";
  };

  const getTemperatureStatus = (temp: number) => {
    if (temp < 40) return "Cold";
    if (temp < 60) return "Normal";
    if (temp < 75) return "Warm";
    return "Critical";
  };

  const getBatteryColor = (battery: number) => {
    if (battery > 75) return "text-green-400";
    if (battery > 50) return "text-yellow-400";
    if (battery > 25) return "text-orange-400";
    return "text-red-400";
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case "hunting":
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/50";
      case "raid":
        return "bg-red-500/20 text-red-400 border-red-500/50";
      case "charging":
        return "bg-green-500/20 text-green-400 border-green-500/50";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/50";
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "hunting":
        return <Wifi className="w-4 h-4" />;
      case "raid":
        return <Zap className="w-4 h-4" />;
      case "charging":
        return <Battery className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <Activity className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
        <p className="text-gray-400 mt-4">Loading device status...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cyan-400 glow-text">
            Device Status
          </h1>
          <p className="text-gray-400 mt-2">
            Real-time Raspberry Pi system metrics and health monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded border ${
              metrics.isConnected
                ? "bg-green-500/20 text-green-400 border-green-500/50"
                : "bg-red-500/20 text-red-400 border-red-500/50"
            }`}
          >
            {metrics.isConnected ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span className="text-sm font-bold">
              {metrics.isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
      </div>

      {/* Operational Mode & Uptime */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gray-900 border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm uppercase">Operational Mode</p>
              <Badge className={`mt-3 ${getModeColor(metrics.operationalMode)}`}>
                <span className="mr-2">{getModeIcon(metrics.operationalMode)}</span>
                {metrics.operationalMode.toUpperCase()}
              </Badge>
            </div>
            <Activity className="w-8 h-8 text-cyan-400/30" />
          </div>
        </Card>

        <Card className="bg-gray-900 border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm uppercase">System Uptime</p>
              <p className="text-cyan-400 font-bold text-lg mt-3">
                {formatUptime(metrics.uptime)}
              </p>
            </div>
            <Clock className="w-8 h-8 text-cyan-400/30" />
          </div>
        </Card>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* CPU Usage */}
        <Card className="bg-gray-900 border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              <p className="text-gray-500 text-sm uppercase">CPU Usage</p>
            </div>
            <span className="text-2xl font-bold text-cyan-400">
              {metrics.cpuUsage}%
            </span>
          </div>
          <Progress value={metrics.cpuUsage} className="h-2 bg-gray-700" />
          <div className="mt-3 flex justify-between text-xs text-gray-500">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </Card>

        {/* Memory Usage */}
        <Card className="bg-gray-900 border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-blue-400" />
              <p className="text-gray-500 text-sm uppercase">Memory Usage</p>
            </div>
            <span className="text-2xl font-bold text-blue-400">
              {metrics.memoryUsage}%
            </span>
          </div>
          <Progress value={metrics.memoryUsage} className="h-2 bg-gray-700" />
          <div className="mt-3 flex justify-between text-xs text-gray-500">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </Card>

        {/* Temperature */}
        <Card className="bg-gray-900 border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-orange-400" />
              <p className="text-gray-500 text-sm uppercase">Temperature</p>
            </div>
            <span className={`text-2xl font-bold ${getTemperatureColor(metrics.temperature)}`}>
              {metrics.temperature}°C
            </span>
          </div>
          <Progress
            value={Math.min(metrics.temperature, 100)}
            className="h-2 bg-gray-700"
          />
          <div className="mt-3 flex justify-between items-center">
            <span className="text-xs text-gray-500">0°C</span>
            <Badge className="bg-gray-800 text-gray-300">
              {getTemperatureStatus(metrics.temperature)}
            </Badge>
            <span className="text-xs text-gray-500">100°C</span>
          </div>
        </Card>

        {/* Battery Level */}
        <Card className="bg-gray-900 border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Battery className="w-5 h-5 text-green-400" />
              <p className="text-gray-500 text-sm uppercase">Battery Level</p>
            </div>
            <span className={`text-2xl font-bold ${getBatteryColor(metrics.batteryLevel)}`}>
              {metrics.batteryLevel}%
            </span>
          </div>
          <Progress value={metrics.batteryLevel} className="h-2 bg-gray-700" />
          <div className="mt-3 flex justify-between text-xs text-gray-500">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </Card>
      </div>

      {/* Charts */}
      {history.length > 1 && (
        <div className="grid grid-cols-2 gap-4">
          {/* CPU & Memory Trend */}
          <Card className="bg-gray-900 border-gray-700 p-6">
            <h3 className="text-cyan-400 font-bold mb-4">CPU & Memory Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="timestamp"
                  stroke="#666"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#666" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #333",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cpu"
                  stroke="#00d9ff"
                  dot={false}
                  name="CPU %"
                />
                <Line
                  type="monotone"
                  dataKey="memory"
                  stroke="#0099ff"
                  dot={false}
                  name="Memory %"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Temperature & Battery Trend */}
          <Card className="bg-gray-900 border-gray-700 p-6">
            <h3 className="text-cyan-400 font-bold mb-4">
              Temperature & Battery Trend
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="timestamp"
                  stroke="#666"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#666" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #333",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="temperature"
                  stroke="#ff9900"
                  dot={false}
                  name="Temp °C"
                />
                <Line
                  type="monotone"
                  dataKey="battery"
                  stroke="#00ff00"
                  dot={false}
                  name="Battery %"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* System Health Summary */}
      <Card className="bg-gray-900 border-cyan-500/30 p-6">
        <h3 className="text-cyan-400 font-bold mb-4">System Health Summary</h3>
        <div className="grid grid-cols-4 gap-4">
          {[
            {
              label: "CPU Status",
              value:
                metrics.cpuUsage < 80
                  ? "Healthy"
                  : metrics.cpuUsage < 95
                    ? "Elevated"
                    : "Critical",
              color:
                metrics.cpuUsage < 80
                  ? "text-green-400"
                  : metrics.cpuUsage < 95
                    ? "text-yellow-400"
                    : "text-red-400",
            },
            {
              label: "Memory Status",
              value:
                metrics.memoryUsage < 80
                  ? "Healthy"
                  : metrics.memoryUsage < 95
                    ? "Elevated"
                    : "Critical",
              color:
                metrics.memoryUsage < 80
                  ? "text-green-400"
                  : metrics.memoryUsage < 95
                    ? "text-yellow-400"
                    : "text-red-400",
            },
            {
              label: "Temperature",
              value: getTemperatureStatus(metrics.temperature),
              color: getTemperatureColor(metrics.temperature),
            },
            {
              label: "Battery Status",
              value:
                metrics.batteryLevel > 50
                  ? "Good"
                  : metrics.batteryLevel > 20
                    ? "Low"
                    : "Critical",
              color:
                metrics.batteryLevel > 50
                  ? "text-green-400"
                  : metrics.batteryLevel > 20
                    ? "text-yellow-400"
                    : "text-red-400",
            },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-gray-500 text-xs uppercase mb-2">{item.label}</p>
              <p className={`font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Last Updated */}
      <div className="text-center text-gray-500 text-sm">
        Last updated: {metrics.timestamp.toLocaleTimeString()}
        {autoRefresh && " (auto-refreshing every 5 seconds)"}
      </div>
    </div>
  );
}
