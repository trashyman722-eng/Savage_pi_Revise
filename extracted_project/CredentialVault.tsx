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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Lock,
  Server,
  Key,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

interface Credential {
  id: number;
  serviceId: number;
  username: string;
  passwordHash: string;
  discoveryMethod?: string;
  discoveredAt: Date;
  service?: {
    name: string;
    port: number;
    protocol: string;
  };
}

interface CredentialGroup {
  service: string;
  port: number;
  protocol: string;
  credentials: Credential[];
}

export default function CredentialVault() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(
    new Set()
  );
  const [selectedCredential, setSelectedCredential] =
    useState<Credential | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Fetch credentials from raid results
  const { data: credentialsData, isLoading, refetch } = trpc.raid.getCredentials.useQuery();

  useEffect(() => {
    if (credentialsData) {
      const formatted = credentialsData.map((c: any) => ({
        ...c,
        discoveredAt: new Date(c.timestamp),
      }));
      setCredentials(formatted);
    }
  }, [credentialsData]);

  const filteredCredentials = credentials.filter((c) => {
    return (
      c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.service?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.service?.port.toString().includes(searchQuery)
    );
  });

  const groupedCredentials = filteredCredentials.reduce(
    (acc: Record<string, CredentialGroup>, cred) => {
      const key = `${cred.service?.name || "Unknown"}:${cred.service?.port || "?"}`;

      if (!acc[key]) {
        acc[key] = {
          service: cred.service?.name || "Unknown",
          port: cred.service?.port || 0,
          protocol: cred.service?.protocol || "unknown",
          credentials: [],
        };
      }

      acc[key].credentials.push(cred);
      return acc;
    },
    {}
  );

  const togglePasswordVisibility = (credentialId: number) => {
    const newVisible = new Set(visiblePasswords);
    if (newVisible.has(credentialId)) {
      newVisible.delete(credentialId);
    } else {
      newVisible.add(credentialId);
    }
    setVisiblePasswords(newVisible);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getServiceIcon = (service: string) => {
    switch (service.toLowerCase()) {
      case "ssh":
        return <Server className="w-4 h-4 text-cyan-400" />;
      case "ftp":
        return <Server className="w-4 h-4 text-blue-400" />;
      case "smb":
        return <Shield className="w-4 h-4 text-purple-400" />;
      case "http":
      case "https":
        return <Server className="w-4 h-4 text-green-400" />;
      default:
        return <Key className="w-4 h-4 text-gray-400" />;
    }
  };

  const getServiceColor = (service: string) => {
    switch (service.toLowerCase()) {
      case "ssh":
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/50";
      case "ftp":
        return "bg-blue-500/20 text-blue-400 border-blue-500/50";
      case "smb":
        return "bg-purple-500/20 text-purple-400 border-purple-500/50";
      case "http":
      case "https":
        return "bg-green-500/20 text-green-400 border-green-500/50";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/50";
    }
  };

  const stats = {
    total: credentials.length,
    unique: new Set(credentials.map((c) => c.username)).size,
    services: Object.keys(groupedCredentials).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cyan-400 glow-text">
            Credential Vault
          </h1>
          <p className="text-gray-400 mt-2">
            Manage and organize discovered credentials from network reconnaissance
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-cyan-600 hover:bg-cyan-700 text-black font-bold">
              <Plus className="w-4 h-4 mr-2" />
              Add Credential
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-cyan-500/50">
            <DialogHeader>
              <DialogTitle className="text-cyan-400">Add Credential</DialogTitle>
              <DialogDescription className="text-gray-400">
                Manually add a discovered credential to your vault
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Service</label>
                <Input
                  placeholder="SSH, FTP, SMB, etc."
                  className="bg-gray-800 border-gray-700 text-gray-300 mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">Username</label>
                <Input
                  placeholder="admin"
                  className="bg-gray-800 border-gray-700 text-gray-300 mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="bg-gray-800 border-gray-700 text-gray-300 mt-1"
                />
              </div>
              <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-black font-bold">
                Add to Vault
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Credentials", value: stats.total, icon: Lock },
          { label: "Unique Users", value: stats.unique, icon: Key },
          { label: "Services", value: stats.services, icon: Server },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="bg-gray-900 border-cyan-500/30 border-l-4 border-l-cyan-500"
            >
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{stat.label}</p>
                  <p className="text-3xl font-bold text-cyan-400 mt-2">
                    {stat.value}
                  </p>
                </div>
                <Icon className="w-8 h-8 text-cyan-400/30" />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Search Bar */}
      <div>
        <Input
          placeholder="Search by username, service, or port..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-gray-800 border-gray-700 text-gray-300 placeholder-gray-500"
        />
      </div>

      {/* Credentials by Service */}
      {isLoading ? (
        <div className="text-center py-12">
          <Lock className="w-8 h-8 text-cyan-400 animate-pulse mx-auto" />
          <p className="text-gray-400 mt-4">Loading credentials...</p>
        </div>
      ) : Object.keys(groupedCredentials).length === 0 ? (
        <div className="text-center py-12">
          <Lock className="w-8 h-8 text-gray-600 mx-auto" />
          <p className="text-gray-400 mt-4">No credentials discovered yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedCredentials).map(([key, group]) => (
            <Card
              key={key}
              className="bg-gray-900 border-gray-700 overflow-hidden"
            >
              {/* Service Header */}
              <div className={`p-4 border-b border-gray-700 flex items-center justify-between ${getServiceColor(group.service)}`}>
                <div className="flex items-center gap-3">
                  {getServiceIcon(group.service)}
                  <div>
                    <h3 className="font-bold">{group.service.toUpperCase()}</h3>
                    <p className="text-xs opacity-75">
                      Port {group.port} • {group.protocol.toUpperCase()}
                    </p>
                  </div>
                </div>
                <Badge className="bg-gray-800 text-gray-300">
                  {group.credentials.length} credential
                  {group.credentials.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              {/* Credentials Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-800/50 border-b border-gray-700">
                    <TableRow>
                      <TableHead className="text-cyan-400">Username</TableHead>
                      <TableHead className="text-cyan-400">Password</TableHead>
                      <TableHead className="text-cyan-400">Discovery Method</TableHead>
                      <TableHead className="text-cyan-400">Discovered</TableHead>
                      <TableHead className="text-cyan-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.credentials.map((cred) => (
                      <TableRow
                        key={cred.id}
                        className="border-b border-gray-700 hover:bg-gray-800/50"
                      >
                        <TableCell className="text-gray-300 font-mono">
                          {cred.username}
                        </TableCell>
                        <TableCell className="text-gray-300 font-mono">
                          <div className="flex items-center gap-2">
                            {visiblePasswords.has(cred.id) ? (
                              <span className="text-green-400">
                                {cred.passwordHash}
                              </span>
                            ) : (
                              <span className="text-gray-500">••••••••</span>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="p-0 h-auto text-gray-400 hover:text-cyan-400"
                              onClick={() =>
                                togglePasswordVisibility(cred.id)
                              }
                            >
                              {visiblePasswords.has(cred.id) ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-400 text-sm">
                          {cred.discoveryMethod || "Manual"}
                        </TableCell>
                        <TableCell className="text-gray-400 text-sm">
                          {cred.discoveredAt.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20"
                              onClick={() =>
                                copyToClipboard(
                                  `${cred.username}:${cred.passwordHash}`
                                )
                              }
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-600/50 text-red-400 hover:bg-red-500/20"
                              onClick={() => {
                                toast.info(
                                  `Delete credential ${cred.username}`
                                );
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
            </Card>
          ))}
        </div>
      )}

      {/* Export Options */}
      {credentials.length > 0 && (
        <Card className="bg-gray-900 border-cyan-500/30 p-6">
          <h3 className="text-cyan-400 font-bold mb-4">Export Options</h3>
          <div className="flex gap-4">
            <Button
              variant="outline"
              className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20"
            >
              Export as CSV
            </Button>
            <Button
              variant="outline"
              className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20"
            >
              Export as JSON
            </Button>
            <Button
              variant="outline"
              className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20"
            >
              Copy All to Clipboard
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
