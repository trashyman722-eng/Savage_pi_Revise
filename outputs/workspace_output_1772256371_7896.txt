import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Dashboard from "./pages/Dashboard";
import HandshakeManager from "./pages/HandshakeManager";
import CredentialVault from "./pages/CredentialVault";
import NetworkTargets from "./pages/NetworkTargets";
import DeviceStatus from "./pages/DeviceStatus";
import ActivityLog from "./pages/ActivityLog";
import Configuration from "./pages/Configuration";
import ReportGenerator from "./pages/ReportGenerator";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import SavageLayout from "./components/SavageLayout";
import Home from "./pages/Home";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <SavageLayout>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/handshakes" component={HandshakeManager} />
        <Route path="/credentials" component={CredentialVault} />
        <Route path="/targets" component={NetworkTargets} />
        <Route path="/device" component={DeviceStatus} />
        <Route path="/activity" component={ActivityLog} />
        <Route path="/config" component={Configuration} />
        <Route path="/reports" component={ReportGenerator} />
        <Route path="/404" component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
    </SavageLayout>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
