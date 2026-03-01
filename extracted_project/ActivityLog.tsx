import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  Filter,
  Download,
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  Zap,
  Lock,
  Network,
  Search,
} from "lucide-react";
import { toast } from "sonner";

interface ActivityLogEntry {
  id: number;
  eventType: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  message: string;
  entityType?: string;
  entityId?: number;
  timestamp: Date;
  details?: string;
}

export default function ActivityLog() {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterType, setFilterType] = useState("all");

  // Fetch activity logs
  const { data: logsData, isLoading, refetch } = trpc.activity.getRecent.useQuery({
    limit: 500,
  });

  useEffect(() => {
    if (logsData) {
      const formatted = logsData.map((log: any) => ({
        ...log,
        timestamp: new Date(log.timestamp),
      }));
      setLogs(formatted);
    }
  }, [logsData]);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.eventType.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity = filterSeverity === "all" || log.severity === filterSeverity;
    const matchesType = filterType === "all" || log.eventType === filterType;

    return matchesSearch && matchesSeverity && matchesType;
  });

  const eventTypes = Array.from(new Set(logs.map((l) => l.eventType)));
  const severities = ["critical", "high", "medium", "low", "info"];

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case "high":
        return <AlertCircle className="w-4 h-4 text-orange-400" />;
      case "medium":
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case "low":
        return <Info className="w-4 h-4 text-blue-400" />;
      default:
        return <Info className="w-4 h-4 text-gray-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/50";
      case "high":
        return "bg-orange-500/20 text-orange-400 border-orange-500/50";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case "low":
        return "bg-blue-500/20 text-blue-400 border-blue-500/50";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/50";
    }
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes("hunt")) return <Zap className="w-4 h-4" />;
    if (eventType.includes("raid")) return <Network className="w-4 h-4" />;
    if (eventType.includes("credential")) return <Lock className="w-4 h-4" />;
    if (eventType.includes("vulnerability")) return <AlertTriangle className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  const stats = {
    total: logs.length,
    critical: logs.filter((l) => l.severity === "critical").length,
    high: logs.filter((l) => l.severity === "high").length,
    today: logs.filter((l) => {
      const today = new Date();
      return (
        l.timestamp.toDateString() === today.toDateString()
      );
    }).length,
  };

  const handleExport = () => {
    const csv = [
      ["Timestamp", "Severity", "Event Type", "Message"],
      ...filteredLogs.map((log) => [
        log.timestamp.toISOString(),
        log.severity,
        log.eventType,
        log.message,
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-log-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Activity log exported");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cyan-400 glow-text">
            Activity Log
          </h1>
          <p className="text-gray-400 mt-2">
            Timeline of all hunting, raiding, and reconnaissance events
          </p>
        </div>
        <Button
          className="bg-cyan-600 hover:bg-cyan-700 text-black font-bold"
          onClick={handleExport}
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Events", value: stats.total, color: "cyan" },
          { label: "Critical", value: stats.critical, color: "red" },
          { label: "High", value: stats.high, color: "orange" },
          { label: "Today", value: stats.today, color: "blue" },
        ].map((stat) => (
          <Card
            key={stat.label}
            className={`bg-gray-900 border-${stat.color}-500/30 border-l-4 border-l-${stat.color}-500`}
          >
            <div className="p-4">
              <p className="text-gray-400 text-sm">{stat.label}</p>
              <p className={`text-3xl font-bold text-${stat.color}-400 mt-2`}>
                {stat.value}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-gray-400 text-sm mb-2 block">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-800 border-gray-700 text-gray-300 placeholder-gray-500 pl-10"
            />
          </div>
        </div>

        <div>
          <label className="text-gray-400 text-sm mb-2 block">Severity</label>
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-300">
              <SelectValue placeholder="All Severities" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all">All Severities</SelectItem>
              {severities.map((severity) => (
                <SelectItem key={severity} value={severity}>
                  {severity.charAt(0).toUpperCase() + severity.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-gray-400 text-sm mb-2 block">Event Type</label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-300">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all">All Types</SelectItem>
              {eventTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Activity Timeline */}
      {isLoading ? (
        <div className="text-center py-12">
          <Activity className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
          <p className="text-gray-400 mt-4">Loading activity log...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-12">
          <Activity className="w-8 h-8 text-gray-600 mx-auto" />
          <p className="text-gray-400 mt-4">No events found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log, index) => (
            <Card
              key={log.id}
              className="bg-gray-900 border-gray-700 hover:border-cyan-500/50 transition-colors p-4"
            >
              <div className="flex items-start gap-4">
                {/* Timeline connector */}
                {index < filteredLogs.length - 1 && (
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1" />
                    <div className="w-0.5 h-12 bg-gray-700 my-1" />
                  </div>
                )}
                {index === filteredLogs.length - 1 && (
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1" />
                  </div>
                )}

                {/* Event Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    {getEventIcon(log.eventType)}
                    <span className="text-gray-400 text-sm font-mono">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                    <Badge className={`${getSeverityColor(log.severity)}`}>
                      {log.severity.toUpperCase()}
                    </Badge>
                    <Badge className="bg-gray-800 text-gray-300">
                      {log.eventType}
                    </Badge>
                  </div>

                  <p className="text-gray-300 mb-2">{log.message}</p>

                  {log.details && (
                    <details className="text-gray-500 text-sm cursor-pointer hover:text-gray-400">
                      <summary>View Details</summary>
                      <pre className="mt-2 p-2 bg-gray-800 rounded text-xs overflow-x-auto">
                        {log.details}
                      </pre>
                    </details>
                  )}
                </div>

                {/* Severity Icon */}
                <div className="flex-shrink-0">
                  {getSeverityIcon(log.severity)}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Load More */}
      {filteredLogs.length > 0 && (
        <div className="text-center pt-4">
          <Button
            variant="outline"
            className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20"
            onClick={() => refetch()}
          >
            Refresh Log
          </Button>
        </div>
      )}
    </div>
  );
}
