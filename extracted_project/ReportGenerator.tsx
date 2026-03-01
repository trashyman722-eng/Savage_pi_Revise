import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Download,
  Calendar,
  Building2,
  Mail,
  Phone,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Lock,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

interface ReportConfig {
  title: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  testDate: string;
  reportDate: string;
  testerName: string;
  scope: string;
  methodology: string;
  includeFindings: boolean;
  includeVulnerabilities: boolean;
  includeRecommendations: boolean;
  includeTechnicalDetails: boolean;
  confidential: boolean;
}

interface ReportStats {
  totalVulnerabilities: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  networksCompromised: number;
  servicesExploited: number;
  credentialsDiscovered: number;
}

export default function ReportGenerator() {
  const [config, setConfig] = useState<ReportConfig>({
    title: "Penetration Test Report",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    testDate: new Date().toISOString().split("T")[0],
    reportDate: new Date().toISOString().split("T")[0],
    testerName: "SAVAGE Framework",
    scope: "",
    methodology: "OWASP Testing Guide v4.2",
    includeFindings: true,
    includeVulnerabilities: true,
    includeRecommendations: true,
    includeTechnicalDetails: true,
    confidential: true,
  });

  const [stats] = useState<ReportStats>({
    totalVulnerabilities: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
    networksCompromised: 0,
    servicesExploited: 0,
    credentialsDiscovered: 0,
  });

  const generateReport = trpc.system.notifyOwner.useMutation({
    onSuccess: () => {
      toast.success("Report generation initiated");
    },
    onError: (error: any) => {
      toast.error(`Failed to generate report: ${error.message}`);
    },
  });

  const handleGenerateReport = () => {
    if (!config.clientName || !config.scope) {
      toast.error("Please fill in client name and scope");
      return;
    }

    generateReport.mutate({
      title: `Report: ${config.title}`,
      content: `Penetration test report for ${config.clientName}`,
    });
  };

  const riskScore = Math.min(
    100,
    stats.critical * 40 + stats.high * 20 + stats.medium * 10 + stats.low * 5
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cyan-400 glow-text">
            Report Generator
          </h1>
          <p className="text-gray-400 mt-2">
            Generate professional penetration test reports with findings and recommendations
          </p>
        </div>
        <FileText className="w-8 h-8 text-cyan-400/30" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Client Information */}
        <Card className="bg-gray-900 border-gray-700 p-6 col-span-2">
          <h3 className="text-cyan-400 font-bold mb-6">Client Information</h3>

          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm uppercase block mb-2">
                Organization Name
              </label>
              <Input
                value={config.clientName}
                onChange={(e) =>
                  setConfig({ ...config, clientName: e.target.value })
                }
                placeholder="Acme Corporation"
                className="bg-gray-800 border-gray-700 text-gray-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-gray-400 text-sm uppercase block mb-2">
                  Contact Email
                </label>
                <Input
                  type="email"
                  value={config.clientEmail}
                  onChange={(e) =>
                    setConfig({ ...config, clientEmail: e.target.value })
                  }
                  placeholder="contact@example.com"
                  className="bg-gray-800 border-gray-700 text-gray-300"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm uppercase block mb-2">
                  Contact Phone
                </label>
                <Input
                  value={config.clientPhone}
                  onChange={(e) =>
                    setConfig({ ...config, clientPhone: e.target.value })
                  }
                  placeholder="+1 (555) 123-4567"
                  className="bg-gray-800 border-gray-700 text-gray-300"
                />
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-sm uppercase block mb-2">
                Tester Name
              </label>
              <Input
                value={config.testerName}
                onChange={(e) =>
                  setConfig({ ...config, testerName: e.target.value })
                }
                placeholder="Your name or team"
                className="bg-gray-800 border-gray-700 text-gray-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-gray-400 text-sm uppercase block mb-2">
                  Test Date
                </label>
                <Input
                  type="date"
                  value={config.testDate}
                  onChange={(e) =>
                    setConfig({ ...config, testDate: e.target.value })
                  }
                  className="bg-gray-800 border-gray-700 text-gray-300"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm uppercase block mb-2">
                  Report Date
                </label>
                <Input
                  type="date"
                  value={config.reportDate}
                  onChange={(e) =>
                    setConfig({ ...config, reportDate: e.target.value })
                  }
                  className="bg-gray-800 border-gray-700 text-gray-300"
                />
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-sm uppercase block mb-2">
                Test Scope
              </label>
              <Textarea
                value={config.scope}
                onChange={(e) =>
                  setConfig({ ...config, scope: e.target.value })
                }
                placeholder="Describe the scope of the penetration test (networks, systems, services, etc.)"
                className="bg-gray-800 border-gray-700 text-gray-300 min-h-24"
              />
            </div>

            <div>
              <label className="text-gray-400 text-sm uppercase block mb-2">
                Methodology
              </label>
              <Select
                value={config.methodology}
                onValueChange={(value) =>
                  setConfig({ ...config, methodology: value })
                }
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="OWASP Testing Guide v4.2">
                    OWASP Testing Guide v4.2
                  </SelectItem>
                  <SelectItem value="NIST SP 800-115">NIST SP 800-115</SelectItem>
                  <SelectItem value="PTES">
                    Penetration Testing Execution Standard (PTES)
                  </SelectItem>
                  <SelectItem value="Custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Risk Summary */}
        <Card className="bg-gray-900 border-cyan-500/30 p-6">
          <h3 className="text-cyan-400 font-bold mb-6">Risk Summary</h3>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-400 text-sm">Overall Risk Score</span>
                <span className="text-cyan-400 font-bold">{riskScore}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    riskScore > 75
                      ? "bg-red-500"
                      : riskScore > 50
                        ? "bg-orange-500"
                        : riskScore > 25
                          ? "bg-yellow-500"
                          : "bg-green-500"
                  }`}
                  style={{ width: `${riskScore}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-red-500/20 p-2 rounded border border-red-500/50">
                <div className="text-red-400 font-bold">{stats.critical}</div>
                <div className="text-red-300 text-xs">Critical</div>
              </div>
              <div className="bg-orange-500/20 p-2 rounded border border-orange-500/50">
                <div className="text-orange-400 font-bold">{stats.high}</div>
                <div className="text-orange-300 text-xs">High</div>
              </div>
              <div className="bg-yellow-500/20 p-2 rounded border border-yellow-500/50">
                <div className="text-yellow-400 font-bold">{stats.medium}</div>
                <div className="text-yellow-300 text-xs">Medium</div>
              </div>
              <div className="bg-blue-500/20 p-2 rounded border border-blue-500/50">
                <div className="text-blue-400 font-bold">{stats.low}</div>
                <div className="text-blue-300 text-xs">Low</div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-700 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Networks Compromised</span>
                <span className="text-cyan-400 font-mono">
                  {stats.networksCompromised}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Services Exploited</span>
                <span className="text-cyan-400 font-mono">
                  {stats.servicesExploited}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Credentials Discovered</span>
                <span className="text-cyan-400 font-mono">
                  {stats.credentialsDiscovered}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Report Sections */}
      <Card className="bg-gray-900 border-gray-700 p-6">
        <h3 className="text-cyan-400 font-bold mb-6">Report Sections</h3>

        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.includeFindings}
              onChange={(e) =>
                setConfig({ ...config, includeFindings: e.target.checked })
              }
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500"
            />
            <span className="text-gray-300">Include Executive Summary</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.includeVulnerabilities}
              onChange={(e) =>
                setConfig({
                  ...config,
                  includeVulnerabilities: e.target.checked,
                })
              }
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500"
            />
            <span className="text-gray-300">Include Vulnerability Details</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.includeRecommendations}
              onChange={(e) =>
                setConfig({
                  ...config,
                  includeRecommendations: e.target.checked,
                })
              }
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500"
            />
            <span className="text-gray-300">
              Include Remediation Recommendations
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.includeTechnicalDetails}
              onChange={(e) =>
                setConfig({
                  ...config,
                  includeTechnicalDetails: e.target.checked,
                })
              }
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500"
            />
            <span className="text-gray-300">Include Technical Details</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.confidential}
              onChange={(e) =>
                setConfig({ ...config, confidential: e.target.checked })
              }
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500"
            />
            <span className="text-gray-300">Mark as Confidential</span>
          </label>
        </div>
      </Card>

      {/* Generate Button */}
      <div className="flex gap-3">
        <Button
          className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-black font-bold text-lg py-6"
            onClick={handleGenerateReport}
            disabled={generateReport.isPending || false}
        >
          {generateReport.isPending ? (
            <>
              <div className="animate-spin mr-2 w-4 h-4 border-2 border-black border-t-transparent rounded-full" />
              Generating...
            </>
          ) : (
            <>
              <Download className="w-5 h-5 mr-2" />
              Generate PDF Report
            </>
          )}
        </Button>
      </div>

      {/* Report Preview Info */}
      <Card className="bg-gray-900 border-cyan-500/30 p-6">
        <h3 className="text-cyan-400 font-bold mb-4">Report Contents</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex gap-2">
            <FileText className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-gray-300 font-semibold">Executive Summary</p>
              <p className="text-gray-500 text-xs">
                High-level overview of findings and risk assessment
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-gray-300 font-semibold">Vulnerability Report</p>
              <p className="text-gray-500 text-xs">
                Detailed findings with CVSS scoring and impact analysis
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-gray-300 font-semibold">Exploitation Results</p>
              <p className="text-gray-500 text-xs">
                Networks compromised, services exploited, credentials discovered
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-gray-300 font-semibold">Recommendations</p>
              <p className="text-gray-500 text-xs">
                Remediation steps and security improvements
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
