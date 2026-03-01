import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Lock,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface Handshake {
  id: string;
  bssid: string;
  ssid: string;
  capturedAt: Date;
  crackStatus: "captured" | "uploading" | "cracking" | "cracked" | "failed";
  crackedPassword?: string;
  crackMethod?: string;
  crackProgress?: number;
  fileSize: number;
  uploadedToWpaSec?: boolean;
  wpaSecJobId?: string;
  tags: string[];
  notes?: string;
}

export default function HandshakeManager() {
  const [handshakes, setHandshakes] = useState<Handshake[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHandshake, setSelectedHandshake] = useState<Handshake | null>(
    null
  );
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Fetch handshakes
  const { data: handshakesData, isLoading, refetch } = trpc.hunting.getHandshakes.useQuery();

  // Upload to wpa-sec mutation
  const uploadToWpaSec = trpc.hunting.uploadToWpaSec.useMutation({
    onSuccess: () => {
      toast.success("Handshake uploaded to wpa-sec");
      refetch();
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  // Check wpa-sec status mutation
  const checkWpaSecStatus = trpc.hunting.checkWpaSecStatus.useQuery(
    { jobId: "" },
    { enabled: false }
  );

  useEffect(() => {
    if (handshakesData) {
      setHandshakes(
        handshakesData.map((h: any) => ({
          ...h,
          capturedAt: new Date(h.capturedAt),
        }))
      );
    }
  }, [handshakesData]);

  const filteredHandshakes = handshakes.filter((h) => {
    const matchesSearch =
      h.bssid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.ssid.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || h.crackStatus === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const handleUploadToWpaSec = (handshakeId: string) => {
    uploadToWpaSec.mutate({ handshakeId });
  };

  const handleCheckStatus = (jobId: string) => {
    toast.info("Checking wpa-sec status...");
    // Status check would be implemented here
  };

  const handleDownload = (handshake: Handshake) => {
    toast.info(`Download functionality would be implemented here for ${handshake.id}`);
  };

  const handleDelete = (handshakeId: string) => {
    toast.info(`Delete functionality would be implemented here for ${handshakeId}`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "captured":
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case "cracking":
        return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />;
      case "cracked":
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "captured":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case "cracking":
        return "bg-blue-500/20 text-blue-400 border-blue-500/50";
      case "cracked":
        return "bg-green-500/20 text-green-400 border-green-500/50";
      case "failed":
        return "bg-red-500/20 text-red-400 border-red-500/50";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/50";
    }
  };

  const stats = {
    total: handshakes.length,
    captured: handshakes.filter((h) => h.crackStatus === "captured").length,
    cracking: handshakes.filter((h) => h.crackStatus === "cracking").length,
    cracked: handshakes.filter((h) => h.crackStatus === "cracked").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cyan-400 glow-text">
            Handshake Vault
          </h1>
          <p className="text-gray-400 mt-2">Manage captured Wi-Fi handshakes and track cracking progress</p>
        </div>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-cyan-600 hover:bg-cyan-700 text-black font-bold">
              <Upload className="w-4 h-4 mr-2" />
              Upload Handshake
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-cyan-500/50">
            <DialogHeader>
              <DialogTitle className="text-cyan-400">Upload Handshake</DialogTitle>
              <DialogDescription className="text-gray-400">
                Select a .cap or .pcap file to add to your vault
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                type="file"
                accept=".cap,.pcap,.pcapng"
                className="bg-gray-800 border-gray-700 text-gray-300"
              />
              <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-black font-bold">
                Upload
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Handshakes", value: stats.total, color: "cyan" },
          { label: "Captured", value: stats.captured, color: "yellow" },
          { label: "Cracking", value: stats.cracking, color: "blue" },
          { label: "Cracked", value: stats.cracked, color: "green" },
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

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-gray-900 border-b border-gray-700">
          <TabsTrigger
            value="all"
            onClick={() => setFilterStatus("all")}
            className="data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-400"
          >
            All Handshakes
          </TabsTrigger>
          <TabsTrigger
            value="captured"
            onClick={() => setFilterStatus("captured")}
            className="data-[state=active]:bg-yellow-600/20 data-[state=active]:text-yellow-400"
          >
            Captured
          </TabsTrigger>
          <TabsTrigger
            value="cracking"
            onClick={() => setFilterStatus("cracking")}
            className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400"
          >
            Cracking
          </TabsTrigger>
          <TabsTrigger
            value="cracked"
            onClick={() => setFilterStatus("cracked")}
            className="data-[state=active]:bg-green-600/20 data-[state=active]:text-green-400"
          >
            Cracked
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filterStatus} className="mt-6">
          {/* Search Bar */}
          <div className="mb-6">
            <Input
              placeholder="Search by BSSID or SSID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-800 border-gray-700 text-gray-300 placeholder-gray-500"
            />
          </div>

          {/* Handshakes Table */}
          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
              <p className="text-gray-400 mt-4">Loading handshakes...</p>
            </div>
          ) : filteredHandshakes.length === 0 ? (
            <div className="text-center py-12">
              <Lock className="w-8 h-8 text-gray-600 mx-auto" />
              <p className="text-gray-400 mt-4">No handshakes found</p>
            </div>
          ) : (
            <div className="border border-gray-700 rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-800/50 border-b border-gray-700">
                  <TableRow>
                    <TableHead className="text-cyan-400">BSSID</TableHead>
                    <TableHead className="text-cyan-400">SSID</TableHead>
                    <TableHead className="text-cyan-400">Captured</TableHead>
                    <TableHead className="text-cyan-400">Status</TableHead>
                    <TableHead className="text-cyan-400">Progress</TableHead>
                    <TableHead className="text-cyan-400">Password</TableHead>
                    <TableHead className="text-cyan-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHandshakes.map((handshake) => (
                    <TableRow
                      key={handshake.id}
                      className="border-b border-gray-700 hover:bg-gray-800/50 cursor-pointer"
                      onClick={() => setSelectedHandshake(handshake)}
                    >
                      <TableCell className="text-gray-300 font-mono text-sm">
                        {handshake.bssid}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {handshake.ssid}
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        {handshake.capturedAt.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(handshake.crackStatus)}
                          <Badge className={`${getStatusColor(handshake.crackStatus)}`}>
                            {handshake.crackStatus}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {handshake.crackProgress !== undefined && (
                          <div className="w-24">
                            <Progress
                              value={handshake.crackProgress}
                              className="h-2 bg-gray-700"
                            />
                            <span className="text-xs text-gray-400 mt-1">
                              {handshake.crackProgress}%
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {handshake.crackedPassword ? (
                          <span className="text-green-400 font-mono text-sm">
                            {handshake.crackedPassword}
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {handshake.crackStatus === "captured" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUploadToWpaSec(handshake.id);
                              }}
                              disabled={uploadToWpaSec.isPending || false}
                            >
                              <Zap className="w-3 h-3" />
                            </Button>
                          )}
                          {handshake.uploadedToWpaSec && handshake.wpaSecJobId && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCheckStatus(handshake.wpaSecJobId!);
                              }}
                              disabled={false}
                            >
                              <RefreshCw className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-600 text-gray-400 hover:bg-gray-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(handshake);
                            }}
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-600/50 text-red-400 hover:bg-red-500/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(handshake.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Panel */}
      {selectedHandshake && (
        <Card className="bg-gray-900 border-cyan-500/30 p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-cyan-400 font-bold mb-4">Network Details</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-500 text-sm">BSSID</p>
                  <p className="text-gray-300 font-mono">{selectedHandshake.bssid}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">SSID</p>
                  <p className="text-gray-300">{selectedHandshake.ssid}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">File Size</p>
                  <p className="text-gray-300">
                    {(selectedHandshake.fileSize / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-cyan-400 font-bold mb-4">Crack Status</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-500 text-sm">Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(selectedHandshake.crackStatus)}
                    <Badge className={`${getStatusColor(selectedHandshake.crackStatus)}`}>
                      {selectedHandshake.crackStatus}
                    </Badge>
                  </div>
                </div>
                {selectedHandshake.crackedPassword && (
                  <div>
                    <p className="text-gray-500 text-sm">Password</p>
                    <p className="text-green-400 font-mono">
                      {selectedHandshake.crackedPassword}
                    </p>
                  </div>
                )}
                {selectedHandshake.crackMethod && (
                  <div>
                    <p className="text-gray-500 text-sm">Method</p>
                    <p className="text-gray-300">{selectedHandshake.crackMethod}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
