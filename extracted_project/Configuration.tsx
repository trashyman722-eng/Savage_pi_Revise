import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Settings,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Upload,
  Download,
  Zap,
  Wifi,
  Shield,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

interface HuntingConfig {
  channels: number[];
  dwellTime: number;
  aiAggression: number;
  deauthPackets: number;
  handshakeTimeout: number;
  targetSelection: "random" | "signal_strength" | "ai_priority";
  autoUploadToWpaSec: boolean;
  localDictionaryAttack: boolean;
}

interface RaidConfig {
  scanType: "quick" | "standard" | "comprehensive";
  portRange: string;
  enableBruteForce: boolean;
  enableVulnScanning: boolean;
  bruteForceTimeout: number;
  maxAttempts: number;
  delayBetweenAttempts: number;
  enableServiceDetection: boolean;
  enableOsDetection: boolean;
  enableScriptScanning: boolean;
}

interface Wordlist {
  id: string;
  name: string;
  type: "usernames" | "passwords";
  entries: number;
  source: string;
}

export default function Configuration() {
  const [huntingConfig, setHuntingConfig] = useState<HuntingConfig>({
    channels: [1, 6, 11],
    dwellTime: 10,
    aiAggression: 50,
    deauthPackets: 64,
    handshakeTimeout: 30,
    targetSelection: "ai_priority",
    autoUploadToWpaSec: true,
    localDictionaryAttack: false,
  });

  const [raidConfig, setRaidConfig] = useState<RaidConfig>({
    scanType: "standard",
    portRange: "1-10000",
    enableBruteForce: true,
    enableVulnScanning: true,
    bruteForceTimeout: 300,
    maxAttempts: 100,
    delayBetweenAttempts: 50,
    enableServiceDetection: true,
    enableOsDetection: false,
    enableScriptScanning: false,
  });

  const [wordlists, setWordlists] = useState<Wordlist[]>([
    {
      id: "1",
      name: "Common Usernames",
      type: "usernames",
      entries: 1000,
      source: "Built-in",
    },
    {
      id: "2",
      name: "Top 10000 Passwords",
      type: "passwords",
      entries: 10000,
      source: "Built-in",
    },
  ]);

  const [isAddWordlistOpen, setIsAddWordlistOpen] = useState(false);
  const [newWordlist, setNewWordlist] = useState({
    name: "",
    type: "passwords" as const,
    file: null as File | null,
  });

  const handleSaveHuntingConfig = () => {
    toast.success("Hunting configuration saved");
  };

  const handleSaveRaidConfig = () => {
    toast.success("Raid configuration saved");
  };

  const handleResetHuntingConfig = () => {
    setHuntingConfig({
      channels: [1, 6, 11],
      dwellTime: 10,
      aiAggression: 50,
      deauthPackets: 64,
      handshakeTimeout: 30,
      targetSelection: "ai_priority",
      autoUploadToWpaSec: true,
      localDictionaryAttack: false,
    });
    toast.info("Hunting configuration reset to defaults");
  };

  const handleResetRaidConfig = () => {
    setRaidConfig({
      scanType: "standard",
      portRange: "1-10000",
      enableBruteForce: true,
      enableVulnScanning: true,
      bruteForceTimeout: 300,
      maxAttempts: 100,
      delayBetweenAttempts: 50,
      enableServiceDetection: true,
      enableOsDetection: false,
      enableScriptScanning: false,
    });
    toast.info("Raid configuration reset to defaults");
  };

  const handleAddWordlist = () => {
    if (!newWordlist.name || !newWordlist.file) {
      toast.error("Please provide a name and select a file");
      return;
    }

    const newId = (Math.max(...wordlists.map((w) => parseInt(w.id)), 0) + 1).toString();
    const newEntry: Wordlist = {
      id: newId,
      name: newWordlist.name,
      type: newWordlist.type,
      entries: Math.floor(newWordlist.file.size / 20), // Rough estimate
      source: newWordlist.file.name,
    };

    setWordlists([...wordlists, newEntry]);
    setNewWordlist({ name: "", type: "passwords", file: null });
    setIsAddWordlistOpen(false);
    toast.success("Wordlist added successfully");
  };

  const handleDeleteWordlist = (id: string) => {
    setWordlists(wordlists.filter((w) => w.id !== id));
    toast.info("Wordlist removed");
  };

  const handleToggleChannel = (channel: number) => {
    setHuntingConfig((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel].sort((a, b) => a - b),
    }));
  };

  const wifiChannels = Array.from({ length: 13 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cyan-400 glow-text">
            Configuration
          </h1>
          <p className="text-gray-400 mt-2">
            Customize hunting and raid parameters for optimal performance
          </p>
        </div>
        <Settings className="w-8 h-8 text-cyan-400/30" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="hunting" className="w-full">
        <TabsList className="bg-gray-900 border-b border-gray-700">
          <TabsTrigger
            value="hunting"
            className="data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-400"
          >
            <Wifi className="w-4 h-4 mr-2" />
            Hunting Parameters
          </TabsTrigger>
          <TabsTrigger
            value="raid"
            className="data-[state=active]:bg-red-600/20 data-[state=active]:text-red-400"
          >
            <Zap className="w-4 h-4 mr-2" />
            Raid Settings
          </TabsTrigger>
          <TabsTrigger
            value="wordlists"
            className="data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400"
          >
            <Lock className="w-4 h-4 mr-2" />
            Wordlists
          </TabsTrigger>
        </TabsList>

        {/* Hunting Parameters Tab */}
        <TabsContent value="hunting" className="space-y-6 mt-6">
          <Card className="bg-gray-900 border-gray-700 p-6">
            <h3 className="text-cyan-400 font-bold mb-6">Wi-Fi Hunting Configuration</h3>

            <div className="space-y-6">
              {/* Channels Selection */}
              <div>
                <label className="text-gray-400 text-sm uppercase block mb-3">
                  Wi-Fi Channels (2.4 GHz)
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {wifiChannels.map((channel) => (
                    <Button
                      key={channel}
                      variant={
                        huntingConfig.channels.includes(channel)
                          ? "default"
                          : "outline"
                      }
                      className={`${
                        huntingConfig.channels.includes(channel)
                          ? "bg-cyan-600 hover:bg-cyan-700 text-black"
                          : "border-gray-600 text-gray-400 hover:bg-gray-800"
                      }`}
                      onClick={() => handleToggleChannel(channel)}
                    >
                      {channel}
                    </Button>
                  ))}
                </div>
                <p className="text-gray-500 text-xs mt-2">
                  Selected: {huntingConfig.channels.join(", ")}
                </p>
              </div>

              {/* Dwell Time */}
              <div>
                <label className="text-gray-400 text-sm uppercase block mb-3">
                  Dwell Time per Channel: {huntingConfig.dwellTime}s
                </label>
                <Slider
                  value={[huntingConfig.dwellTime]}
                  onValueChange={(value) =>
                    setHuntingConfig({ ...huntingConfig, dwellTime: value[0] })
                  }
                  min={1}
                  max={60}
                  step={1}
                  className="w-full"
                />
                <p className="text-gray-500 text-xs mt-2">
                  Time spent on each channel before switching (1-60 seconds)
                </p>
              </div>

              {/* AI Aggression */}
              <div>
                <label className="text-gray-400 text-sm uppercase block mb-3">
                  AI Target Aggression: {huntingConfig.aiAggression}%
                </label>
                <Slider
                  value={[huntingConfig.aiAggression]}
                  onValueChange={(value) =>
                    setHuntingConfig({ ...huntingConfig, aiAggression: value[0] })
                  }
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-gray-500 text-xs mt-2">
                  Higher values prioritize stronger networks (0-100%)
                </p>
              </div>

              {/* Deauth Packets */}
              <div>
                <label className="text-gray-400 text-sm uppercase block mb-3">
                  Deauth Packets per Target
                </label>
                <Input
                  type="number"
                  value={huntingConfig.deauthPackets}
                  onChange={(e) =>
                    setHuntingConfig({
                      ...huntingConfig,
                      deauthPackets: parseInt(e.target.value) || 0,
                    })
                  }
                  min={1}
                  max={256}
                  className="bg-gray-800 border-gray-700 text-gray-300"
                />
                <p className="text-gray-500 text-xs mt-2">
                  Number of de-authentication packets to send (1-256)
                </p>
              </div>

              {/* Handshake Timeout */}
              <div>
                <label className="text-gray-400 text-sm uppercase block mb-3">
                  Handshake Capture Timeout
                </label>
                <Input
                  type="number"
                  value={huntingConfig.handshakeTimeout}
                  onChange={(e) =>
                    setHuntingConfig({
                      ...huntingConfig,
                      handshakeTimeout: parseInt(e.target.value) || 0,
                    })
                  }
                  min={5}
                  max={300}
                  className="bg-gray-800 border-gray-700 text-gray-300"
                />
                <p className="text-gray-500 text-xs mt-2">
                  Maximum time to wait for handshake (5-300 seconds)
                </p>
              </div>

              {/* Target Selection */}
              <div>
                <label className="text-gray-400 text-sm uppercase block mb-3">
                  Target Selection Method
                </label>
                <Select
                  value={huntingConfig.targetSelection}
                  onValueChange={(value: any) =>
                    setHuntingConfig({
                      ...huntingConfig,
                      targetSelection: value,
                    })
                  }
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="random">Random Selection</SelectItem>
                    <SelectItem value="signal_strength">
                      Strongest Signal
                    </SelectItem>
                    <SelectItem value="ai_priority">AI Priority</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-gray-500 text-xs mt-2">
                  How targets are selected for de-authentication
                </p>
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={huntingConfig.autoUploadToWpaSec}
                    onChange={(e) =>
                      setHuntingConfig({
                        ...huntingConfig,
                        autoUploadToWpaSec: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500"
                  />
                  <span className="text-gray-300">
                    Auto-upload handshakes to wpa-sec
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={huntingConfig.localDictionaryAttack}
                    onChange={(e) =>
                      setHuntingConfig({
                        ...huntingConfig,
                        localDictionaryAttack: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500"
                  />
                  <span className="text-gray-300">
                    Enable local dictionary attack
                  </span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-8 pt-6 border-t border-gray-700">
              <Button
                className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-black font-bold"
                onClick={handleSaveHuntingConfig}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Configuration
              </Button>
              <Button
                variant="outline"
                className="border-gray-600 text-gray-400 hover:bg-gray-800"
                onClick={handleResetHuntingConfig}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Defaults
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Raid Settings Tab */}
        <TabsContent value="raid" className="space-y-6 mt-6">
          <Card className="bg-gray-900 border-gray-700 p-6">
            <h3 className="text-cyan-400 font-bold mb-6">Network Raid Configuration</h3>

            <div className="space-y-6">
              {/* Scan Type */}
              <div>
                <label className="text-gray-400 text-sm uppercase block mb-3">
                  Scan Type
                </label>
                <Select
                  value={raidConfig.scanType}
                  onValueChange={(value: any) =>
                    setRaidConfig({ ...raidConfig, scanType: value })
                  }
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="quick">
                      Quick (1-1000 ports, fast)
                    </SelectItem>
                    <SelectItem value="standard">
                      Standard (1-10000 ports, balanced)
                    </SelectItem>
                    <SelectItem value="comprehensive">
                      Comprehensive (all ports, slow)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Port Range */}
              <div>
                <label className="text-gray-400 text-sm uppercase block mb-3">
                  Port Range
                </label>
                <Input
                  value={raidConfig.portRange}
                  onChange={(e) =>
                    setRaidConfig({ ...raidConfig, portRange: e.target.value })
                  }
                  placeholder="1-10000"
                  className="bg-gray-800 border-gray-700 text-gray-300"
                />
                <p className="text-gray-500 text-xs mt-2">
                  Format: start-end (e.g., 1-65535)
                </p>
              </div>

              {/* Brute Force Timeout */}
              <div>
                <label className="text-gray-400 text-sm uppercase block mb-3">
                  Brute Force Timeout: {raidConfig.bruteForceTimeout}s
                </label>
                <Slider
                  value={[raidConfig.bruteForceTimeout]}
                  onValueChange={(value) =>
                    setRaidConfig({
                      ...raidConfig,
                      bruteForceTimeout: value[0],
                    })
                  }
                  min={30}
                  max={3600}
                  step={30}
                  className="w-full"
                />
                <p className="text-gray-500 text-xs mt-2">
                  Maximum time for brute-force attempts (30-3600 seconds)
                </p>
              </div>

              {/* Max Attempts */}
              <div>
                <label className="text-gray-400 text-sm uppercase block mb-3">
                  Max Attempts per Service
                </label>
                <Input
                  type="number"
                  value={raidConfig.maxAttempts}
                  onChange={(e) =>
                    setRaidConfig({
                      ...raidConfig,
                      maxAttempts: parseInt(e.target.value) || 0,
                    })
                  }
                  min={10}
                  max={1000}
                  className="bg-gray-800 border-gray-700 text-gray-300"
                />
                <p className="text-gray-500 text-xs mt-2">
                  Maximum login attempts before moving to next service
                </p>
              </div>

              {/* Delay Between Attempts */}
              <div>
                <label className="text-gray-400 text-sm uppercase block mb-3">
                  Delay Between Attempts: {raidConfig.delayBetweenAttempts}ms
                </label>
                <Slider
                  value={[raidConfig.delayBetweenAttempts]}
                  onValueChange={(value) =>
                    setRaidConfig({
                      ...raidConfig,
                      delayBetweenAttempts: value[0],
                    })
                  }
                  min={10}
                  max={5000}
                  step={50}
                  className="w-full"
                />
                <p className="text-gray-500 text-xs mt-2">
                  Delay between login attempts to avoid detection
                </p>
              </div>

              {/* Feature Toggles */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={raidConfig.enableBruteForce}
                    onChange={(e) =>
                      setRaidConfig({
                        ...raidConfig,
                        enableBruteForce: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500"
                  />
                  <span className="text-gray-300">Enable brute-force attacks</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={raidConfig.enableVulnScanning}
                    onChange={(e) =>
                      setRaidConfig({
                        ...raidConfig,
                        enableVulnScanning: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500"
                  />
                  <span className="text-gray-300">Enable vulnerability scanning</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={raidConfig.enableServiceDetection}
                    onChange={(e) =>
                      setRaidConfig({
                        ...raidConfig,
                        enableServiceDetection: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500"
                  />
                  <span className="text-gray-300">Enable service detection</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={raidConfig.enableOsDetection}
                    onChange={(e) =>
                      setRaidConfig({
                        ...raidConfig,
                        enableOsDetection: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500"
                  />
                  <span className="text-gray-300">Enable OS detection (slower)</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={raidConfig.enableScriptScanning}
                    onChange={(e) =>
                      setRaidConfig({
                        ...raidConfig,
                        enableScriptScanning: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500"
                  />
                  <span className="text-gray-300">Enable script scanning (slowest)</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-8 pt-6 border-t border-gray-700">
              <Button
                className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-black font-bold"
                onClick={handleSaveRaidConfig}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Configuration
              </Button>
              <Button
                variant="outline"
                className="border-gray-600 text-gray-400 hover:bg-gray-800"
                onClick={handleResetRaidConfig}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Defaults
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Wordlists Tab */}
        <TabsContent value="wordlists" className="space-y-6 mt-6">
          <div className="flex justify-between items-center">
            <h3 className="text-cyan-400 font-bold">Brute-Force Wordlists</h3>
            <Dialog open={isAddWordlistOpen} onOpenChange={setIsAddWordlistOpen}>
              <DialogTrigger asChild>
                <Button className="bg-cyan-600 hover:bg-cyan-700 text-black font-bold">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Wordlist
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-cyan-500/50">
                <DialogHeader>
                  <DialogTitle className="text-cyan-400">Add Wordlist</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Upload a new wordlist for brute-force attacks
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400">Wordlist Name</label>
                    <Input
                      placeholder="e.g., Custom SSH Usernames"
                      value={newWordlist.name}
                      onChange={(e) =>
                        setNewWordlist({ ...newWordlist, name: e.target.value })
                      }
                      className="bg-gray-800 border-gray-700 text-gray-300 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Type</label>
                    <Select
                      value={newWordlist.type}
                      onValueChange={(value: any) =>
                        setNewWordlist({ ...newWordlist, type: value })
                      }
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-300 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="usernames">Usernames</SelectItem>
                        <SelectItem value="passwords">Passwords</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Upload File</label>
                    <input
                      type="file"
                      onChange={(e) =>
                        setNewWordlist({
                          ...newWordlist,
                          file: e.target.files?.[0] || null,
                        })
                      }
                      className="bg-gray-800 border border-gray-700 text-gray-300 rounded px-3 py-2 w-full mt-1"
                    />
                  </div>
                  <Button
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-black font-bold"
                    onClick={handleAddWordlist}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Wordlist
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Wordlists Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {wordlists.map((wordlist) => (
              <Card
                key={wordlist.id}
                className="bg-gray-900 border-gray-700 p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-cyan-400 font-bold">{wordlist.name}</h4>
                    <Badge className="mt-2 bg-gray-800 text-gray-300">
                      {wordlist.type === "usernames" ? "👤" : "🔑"}{" "}
                      {wordlist.type}
                    </Badge>
                  </div>
                  {wordlist.source !== "Built-in" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-600/50 text-red-400 hover:bg-red-500/20"
                      onClick={() => handleDeleteWordlist(wordlist.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Entries:</span>
                    <span className="text-cyan-400 font-mono">
                      {wordlist.entries.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Source:</span>
                    <span className="text-gray-400">{wordlist.source}</span>
                  </div>
                </div>

                {wordlist.source !== "Built-in" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-4 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20"
                  >
                    <Download className="w-3 h-3 mr-2" />
                    Export
                  </Button>
                )}
              </Card>
            ))}
          </div>

          {/* Wordlist Info */}
          <Card className="bg-gray-900 border-cyan-500/30 p-6">
            <h4 className="text-cyan-400 font-bold mb-3">Wordlist Format</h4>
            <p className="text-gray-400 text-sm mb-3">
              Wordlist files should be plain text with one entry per line:
            </p>
            <pre className="bg-gray-800 p-3 rounded text-xs text-gray-300 overflow-x-auto">
{`admin
root
user
guest
password123
letmein
qwerty`}
            </pre>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
