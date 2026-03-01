import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Play,
  Pause,
  RotateCcw,
  Wifi,
  Zap,
  Crosshair,
  Terminal,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface CommandPanelProps {
  huntingActive?: boolean;
  raidActive?: boolean;
  onStartHunting?: () => void;
  onPauseHunting?: () => void;
  onResumeHunting?: () => void;
  onStopHunting?: () => void;
  onStartRaid?: () => void;
  onPauseRaid?: () => void;
  onStopRaid?: () => void;
}

export default function CommandPanel({
  huntingActive = false,
  raidActive = false,
  onStartHunting,
  onPauseHunting,
  onResumeHunting,
  onStopHunting,
  onStartRaid,
  onPauseRaid,
  onStopRaid,
}: CommandPanelProps) {
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);

  const mockNetworks = [
    { id: "1", name: "Target-Network-1", signal: -45 },
    { id: "2", name: "Target-Network-2", signal: -62 },
    { id: "3", name: "Target-Network-3", signal: -78 },
  ];

  const reconnModules = [
    { id: "nmap", name: "Network Scan (Nmap)", icon: "🔍" },
    { id: "brute", name: "Brute Force Attack", icon: "🔓" },
    { id: "vuln", name: "Vulnerability Scan", icon: "⚠️" },
    { id: "enum", name: "Service Enumeration", icon: "📋" },
    { id: "exploit", name: "Exploit Module", icon: "💣" },
  ];

  const handleExecuteCommand = (command: string) => {
    setIsExecuting(true);
    setTimeout(() => {
      setIsExecuting(false);
      toast.success(`${command} executed successfully`);
    }, 1500);
  };

  const handleConnectToNetwork = () => {
    if (!selectedNetwork) {
      toast.error("Please select a network");
      return;
    }
    handleExecuteCommand(`Connected to ${selectedNetwork}`);
    setSelectedNetwork("");
  };

  const handleExecuteModule = () => {
    if (!selectedModule) {
      toast.error("Please select a module");
      return;
    }
    handleExecuteCommand(`Executed ${selectedModule}`);
    setSelectedModule("");
  };

  return (
    <div className="space-y-4">
      {/* Hunting Controls */}
      <Card className="bg-gray-900 border-cyan-500/30 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-cyan-400" />
            <h3 className="text-cyan-400 font-bold">Hunting Mode</h3>
            {huntingActive && (
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            )}
          </div>
          <span className="text-xs text-gray-500">
            {huntingActive ? "ACTIVE" : "INACTIVE"}
          </span>
        </div>

        <div className="flex gap-2">
          {!huntingActive ? (
            <Button
              className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-black font-bold"
              onClick={onStartHunting}
              disabled={isExecuting}
            >
              <Play className="w-4 h-4 mr-2" />
              Start Hunting
            </Button>
          ) : (
            <>
              <Button
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-black font-bold"
                onClick={onPauseHunting}
                disabled={isExecuting}
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-red-600/50 text-red-400 hover:bg-red-500/20"
                onClick={onStopHunting}
                disabled={isExecuting}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Stop
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Raid Controls */}
      <Card className="bg-gray-900 border-red-500/30 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-red-400" />
            <h3 className="text-red-400 font-bold">Raid Mode</h3>
            {raidActive && (
              <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            )}
          </div>
          <span className="text-xs text-gray-500">
            {raidActive ? "ACTIVE" : "INACTIVE"}
          </span>
        </div>

        <div className="flex gap-2">
          {!raidActive ? (
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
              onClick={onStartRaid}
              disabled={isExecuting}
            >
              <Zap className="w-4 h-4 mr-2" />
              Start Raid
            </Button>
          ) : (
            <>
              <Button
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-black font-bold"
                onClick={onPauseRaid}
                disabled={isExecuting}
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-red-600/50 text-red-400 hover:bg-red-500/20"
                onClick={onStopRaid}
                disabled={isExecuting}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Stop
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-gray-900 border-purple-500/30 p-4">
        <h3 className="text-purple-400 font-bold mb-4 flex items-center gap-2">
          <Terminal className="w-5 h-5" />
          Quick Commands
        </h3>

        <div className="space-y-3">
          {/* Connect to Network */}
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 justify-start"
              >
                <Wifi className="w-4 h-4 mr-2" />
                Connect to Network
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-cyan-500/50">
              <DialogHeader>
                <DialogTitle className="text-cyan-400">
                  Connect to Network
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Select a network to connect to using nmcli
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-2">
                    Available Networks
                  </label>
                  <Select
                    value={selectedNetwork}
                    onValueChange={setSelectedNetwork}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-300">
                      <SelectValue placeholder="Select network..." />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      {mockNetworks.map((net) => (
                        <SelectItem key={net.id} value={net.name}>
                          {net.name} ({net.signal} dBm)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-black font-bold"
                  onClick={handleConnectToNetwork}
                  disabled={isExecuting}
                >
                  {isExecuting ? "Connecting..." : "Connect"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Execute Module */}
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full border-red-500/50 text-red-400 hover:bg-red-500/20 justify-start"
              >
                <Crosshair className="w-4 h-4 mr-2" />
                Execute Module
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-red-500/50">
              <DialogHeader>
                <DialogTitle className="text-red-400">
                  Execute Reconnaissance Module
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Select a module to execute on the target network
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-2">
                    Available Modules
                  </label>
                  <Select
                    value={selectedModule}
                    onValueChange={setSelectedModule}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-300">
                      <SelectValue placeholder="Select module..." />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      {reconnModules.map((mod) => (
                        <SelectItem key={mod.id} value={mod.name}>
                          {mod.icon} {mod.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-yellow-500/20 border border-yellow-500/50 rounded p-3 flex gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-300">
                    Ensure you have authorization before executing any modules.
                  </p>
                </div>

                <Button
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold"
                  onClick={handleExecuteModule}
                  disabled={isExecuting}
                >
                  {isExecuting ? "Executing..." : "Execute"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Manual Command */}
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full border-purple-500/50 text-purple-400 hover:bg-purple-500/20 justify-start"
              >
                <Terminal className="w-4 h-4 mr-2" />
                Manual Command
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-purple-500/50">
              <DialogHeader>
                <DialogTitle className="text-purple-400">
                  Execute Manual Command
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Run custom commands on the target system
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-2">
                    Command
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., nmap -sV 192.168.1.1"
                    className="w-full bg-gray-800 border border-gray-700 text-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>

                <div className="bg-red-500/20 border border-red-500/50 rounded p-3 flex gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">
                    Use with caution. Verify authorization before execution.
                  </p>
                </div>

                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold"
                  onClick={() => handleExecuteCommand("Manual command")}
                  disabled={isExecuting}
                >
                  {isExecuting ? "Executing..." : "Execute"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Card>
    </div>
  );
}
