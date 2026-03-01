import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Globe,
  Plus,
  Trash2,
  Play,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lock,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

interface NetworkTarget {
  id: number;
  ipAddress: string;
  hostname?: string;
  macAddress?: string;
  status: "active" | "inactive" | "compromised";
  discoveredAt: Date;
  lastScanned?: Date;
  servicesCount: number;
  vulnerabilitiesCount: number;
}

export default function NetworkTargets() {
  const [targets, setTargets] = useState<NetworkTarget[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTarget, setNewTarget] = useState({
    ipAddress: "",
    hostname: "",
    macAddress: "",
  });

  // Fetch targets
  const { data: targetsData, isLoading, refetch } = trpc.targets.getAll.useQuery();

  // Create target mutation
  const createTarget = trpc.targets.create.useMutation({
    onSuccess: () => {
      toast.success("Target added to network map");
      setNewTarget({ ipAddress: "", hostname: "", macAddress: "" });
      setIsAddDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to add target: ${error.message}`);
    },
  });

  // Update target status mutation
  const updateStatus = trpc.targets.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Target status updated");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  useEffect(() => {
    if (targetsData) {
      const formatted = targetsData.map((t: any) => ({
        ...t,
        discoveredAt: new Date(t.discoveredAt),
        lastScanned: t.lastScanned ? new Date(t.lastScanned) : undefined,
      }));
      setTargets(formatted);
    }
  }, [targetsData]);

  const filteredTargets = targets.filter((t) => {
    return (
      t.ipAddress.includes(searchQuery) ||
      t.hostname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.macAddress?.includes(searchQuery)
    );
  });

  const handleAddTarget = () => {
    if (!newTarget.ipAddress) {
      toast.error("IP address is required");
      return;
    }

    createTarget.mutate({
      ipAddress: newTarget.ipAddress,
      hostname: newTarget.hostname || undefined,
      macAddress: newTarget.macAddress || undefined,
    });
  };

  const handleScanTarget = (targetId: number, ipAddress: string) => {
    toast.info(`Starting scan on ${ipAddress}...`);
    // Scan would be triggered here
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case "compromised":
        return <Lock className="w-4 h-4 text-red-400" />;
      case "inactive":
        return <AlertTriangle className="w-4 h-4 text-gray-400" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case "compromised":
        return "bg-red-500/20 text-red-400 border-red-500/50";
      case "inactive":
        return "bg-gray-500/20 text-gray-400 border-gray-500/50";
      default:
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/50";
    }
  };

  const stats = {
    total: targets.length,
    active: targets.filter((t) => t.status === "active").length,
    compromised: targets.filter((t) => t.status === "compromised").length,
    totalServices: targets.reduce((sum, t) => sum + t.servicesCount, 0),
    totalVulnerabilities: targets.reduce(
      (sum, t) => sum + t.vulnerabilitiesCount,
      0
    ),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cyan-400 glow-text">
            Network Targets
          </h1>
          <p className="text-gray-400 mt-2">
            Discovered hosts and their attack surface
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-cyan-600 hover:bg-cyan-700 text-black font-bold">
              <Plus className="w-4 h-4 mr-2" />
              Add Target
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-cyan-500/50">
            <DialogHeader>
              <DialogTitle className="text-cyan-400">Add Network Target</DialogTitle>
              <DialogDescription className="text-gray-400">
                Manually add a target to your network map
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">IP Address</label>
                <Input
                  placeholder="192.168.1.100"
                  value={newTarget.ipAddress}
                  onChange={(e) =>
                    setNewTarget({ ...newTarget, ipAddress: e.target.value })
                  }
                  className="bg-gray-800 border-gray-700 text-gray-300 mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">Hostname (optional)</label>
                <Input
                  placeholder="router.local"
                  value={newTarget.hostname}
                  onChange={(e) =>
                    setNewTarget({ ...newTarget, hostname: e.target.value })
                  }
                  className="bg-gray-800 border-gray-700 text-gray-300 mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">MAC Address (optional)</label>
                <Input
                  placeholder="AA:BB:CC:DD:EE:FF"
                  value={newTarget.macAddress}
                  onChange={(e) =>
                    setNewTarget({ ...newTarget, macAddress: e.target.value })
                  }
                  className="bg-gray-800 border-gray-700 text-gray-300 mt-1"
                />
              </div>
              <Button
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-black font-bold"
                onClick={handleAddTarget}
                disabled={createTarget.isPending}
              >
                {createTarget.isPending ? "Adding..." : "Add Target"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          {
            label: "Total Targets",
            value: stats.total,
            color: "cyan",
            icon: Globe,
          },
          {
            label: "Active",
            value: stats.active,
            color: "yellow",
            icon: Clock,
          },
          {
            label: "Compromised",
            value: stats.compromised,
            color: "red",
            icon: Lock,
          },
          {
            label: "Services",
            value: stats.totalServices,
            color: "blue",
            icon: Zap,
          },
          {
            label: "Vulnerabilities",
            value: stats.totalVulnerabilities,
            color: "orange",
            icon: AlertTriangle,
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className={`bg-gray-900 border-${stat.color}-500/30 border-l-4 border-l-${stat.color}-500`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">{stat.label}</p>
                    <p className={`text-2xl font-bold text-${stat.color}-400 mt-2`}>
                      {stat.value}
                    </p>
                  </div>
                  <Icon className={`w-6 h-6 text-${stat.color}-400/30`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Search Bar */}
      <div>
        <Input
          placeholder="Search by IP address, hostname, or MAC address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-gray-800 border-gray-700 text-gray-300 placeholder-gray-500"
        />
      </div>

      {/* Targets Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <Globe className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
          <p className="text-gray-400 mt-4">Loading network targets...</p>
        </div>
      ) : filteredTargets.length === 0 ? (
        <div className="text-center py-12">
          <Globe className="w-8 h-8 text-gray-600 mx-auto" />
          <p className="text-gray-400 mt-4">No targets discovered yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTargets.map((target) => (
            <Card
              key={target.id}
              className="bg-gray-900 border-gray-700 hover:border-cyan-500/50 transition-colors overflow-hidden"
            >
              {/* Status Header */}
              <div
                className={`p-4 border-b border-gray-700 flex items-center justify-between ${getStatusColor(target.status)}`}
              >
                <div className="flex items-center gap-2">
                  {getStatusIcon(target.status)}
                  <span className="font-bold capitalize">{target.status}</span>
                </div>
                <Badge className="bg-gray-800 text-gray-300 text-xs">
                  {target.servicesCount} services
                </Badge>
              </div>

              {/* Target Details */}
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-gray-500 text-xs uppercase">IP Address</p>
                  <p className="text-cyan-400 font-mono font-bold">
                    {target.ipAddress}
                  </p>
                </div>

                {target.hostname && (
                  <div>
                    <p className="text-gray-500 text-xs uppercase">Hostname</p>
                    <p className="text-gray-300">{target.hostname}</p>
                  </div>
                )}

                {target.macAddress && (
                  <div>
                    <p className="text-gray-500 text-xs uppercase">MAC Address</p>
                    <p className="text-gray-300 font-mono text-sm">
                      {target.macAddress}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="bg-gray-800/50 rounded p-2">
                    <p className="text-gray-500 text-xs">Services</p>
                    <p className="text-cyan-400 font-bold">
                      {target.servicesCount}
                    </p>
                  </div>
                  <div className="bg-gray-800/50 rounded p-2">
                    <p className="text-gray-500 text-xs">Vulnerabilities</p>
                    <p
                      className={`font-bold ${target.vulnerabilitiesCount > 0 ? "text-red-400" : "text-green-400"}`}
                    >
                      {target.vulnerabilitiesCount}
                    </p>
                  </div>
                </div>

                {target.lastScanned && (
                  <div>
                    <p className="text-gray-500 text-xs uppercase">Last Scanned</p>
                    <p className="text-gray-400 text-sm">
                      {target.lastScanned.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-gray-700 flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-black font-bold"
                  onClick={() => handleScanTarget(target.id, target.ipAddress)}
                >
                  <Play className="w-3 h-3 mr-1" />
                  Scan
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-600/50 text-red-400 hover:bg-red-500/20"
                  onClick={() => {
                    toast.info(`Remove target ${target.ipAddress}`);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
