import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Radar,
  Zap,
  Lock,
  Wifi,
  Target,
  Activity,
  Settings,
  FileText,
  LogOut,
  Menu,
  X,
  Cpu,
  Skull,
} from "lucide-react";
import { toast } from "sonner";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  category: "hunting" | "raid" | "management" | "system";
  color: string;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    path: "/",
    icon: <Radar className="w-5 h-5" />,
    category: "hunting",
    color: "text-cyan-400",
    description: "Main hunting interface",
  },
  {
    label: "Hunting",
    path: "/dashboard",
    icon: <Wifi className="w-5 h-5" />,
    category: "hunting",
    color: "text-cyan-400",
    description: "Wi-Fi reconnaissance mode",
  },
  {
    label: "Handshakes",
    path: "/handshakes",
    icon: <Lock className="w-5 h-5" />,
    category: "hunting",
    color: "text-cyan-400",
    description: "Manage captured handshakes",
  },
  {
    label: "Raid",
    path: "/raid",
    icon: <Zap className="w-5 h-5" />,
    category: "raid",
    color: "text-red-400",
    description: "Network exploitation mode",
  },
  {
    label: "Credentials",
    path: "/credentials",
    icon: <Skull className="w-5 h-5" />,
    category: "raid",
    color: "text-red-400",
    description: "Discovered credentials vault",
  },
  {
    label: "Targets",
    path: "/targets",
    icon: <Target className="w-5 h-5" />,
    category: "raid",
    color: "text-red-400",
    description: "Network target visualization",
  },
  {
    label: "Device Status",
    path: "/device",
    icon: <Cpu className="w-5 h-5" />,
    category: "system",
    color: "text-purple-400",
    description: "Raspberry Pi metrics",
  },
  {
    label: "Activity Log",
    path: "/activity",
    icon: <Activity className="w-5 h-5" />,
    category: "system",
    color: "text-purple-400",
    description: "Event timeline",
  },
  {
    label: "Configuration",
    path: "/config",
    icon: <Settings className="w-5 h-5" />,
    category: "management",
    color: "text-yellow-400",
    description: "Hunting & raid parameters",
  },
  {
    label: "Reports",
    path: "/reports",
    icon: <FileText className="w-5 h-5" />,
    category: "management",
    color: "text-yellow-400",
    description: "Generate test reports",
  },
];

export default function SavageSidebar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "hunting":
        return "HUNTING PHASE";
      case "raid":
        return "RAID PHASE";
      case "system":
        return "SYSTEM";
      case "management":
        return "MANAGEMENT";
      default:
        return category.toUpperCase();
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "hunting":
        return "text-cyan-400";
      case "raid":
        return "text-red-400";
      case "system":
        return "text-purple-400";
      case "management":
        return "text-yellow-400";
      default:
        return "text-gray-400";
    }
  };

  const groupedItems = NAV_ITEMS.reduce(
    (acc, item) => {
      const existing = acc.find((group) => group.category === item.category);
      if (existing) {
        existing.items.push(item);
      } else {
        acc.push({ category: item.category, items: [item] });
      }
      return acc;
    },
    [] as Array<{ category: string; items: NavItem[] }>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Button
          size="sm"
          variant="outline"
          className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <X className="w-4 h-4" />
          ) : (
            <Menu className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-gray-950 border-r border-gray-800 transition-all duration-300 z-40 flex flex-col ${
          isCollapsed ? "w-20" : "w-64"
        } ${!isOpen ? "-translate-x-full md:translate-x-0" : ""}`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between gap-2">
            <div className={`flex items-center gap-2 ${isCollapsed ? "justify-center w-full" : ""}`}>
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-red-400 rounded flex items-center justify-center">
                <Skull className="w-5 h-5 text-black font-bold" />
              </div>
              {!isCollapsed && (
                <div>
                  <h1 className="text-sm font-bold text-cyan-400 glow-text">
                    SAVAGE
                  </h1>
                  <p className="text-xs text-gray-500">Framework</p>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <Button
                size="sm"
                variant="ghost"
                className="text-gray-500 hover:text-gray-400"
                onClick={() => setIsCollapsed(true)}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Expand Button (when collapsed) */}
        {isCollapsed && (
          <div className="p-2 border-b border-gray-800">
            <Button
              size="sm"
              variant="ghost"
              className="w-full text-gray-500 hover:text-gray-400"
              onClick={() => setIsCollapsed(false)}
            >
              <Menu className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-6">
          {groupedItems.map((group) => (
            <div key={group.category}>
              {!isCollapsed && (
                <div className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${getCategoryColor(group.category)}`}>
                  {getCategoryLabel(group.category)}
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = location === item.path;
                  return (
                    <a
                      key={item.path}
                      href={item.path}
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.href = item.path;
                      }}
                      className={`flex items-center gap-3 px-4 py-3 mx-2 rounded transition-all duration-200 group relative ${
                        isActive
                          ? `${item.color} bg-gray-900 border-l-2 border-current`
                          : "text-gray-400 hover:text-gray-300 hover:bg-gray-900/50"
                      }`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      {/* Icon */}
                      <div className="flex-shrink-0">{item.icon}</div>

                      {/* Label */}
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 text-sm font-medium">
                            {item.label}
                          </span>

                          {/* Active Indicator */}
                          {isActive && (
                            <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                          )}
                        </>
                      )}

                      {/* Tooltip on hover (collapsed) */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-gray-200 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                          {item.label}
                        </div>
                      )}
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-800 p-4 space-y-2">
          {!isCollapsed && (
            <div className="text-xs text-gray-500 px-2 py-1">
              <p className="font-semibold text-gray-400">SYSTEM STATUS</p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Hunting:</span>
                  <span className="text-cyan-400">Ready</span>
                </div>
                <div className="flex justify-between">
                  <span>Raid:</span>
                  <span className="text-red-400">Ready</span>
                </div>
              </div>
            </div>
          )}

          <Button
            variant="outline"
            className="w-full border-red-500/50 text-red-400 hover:bg-red-500/20 text-sm"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {!isCollapsed && "Logout"}
          </Button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
