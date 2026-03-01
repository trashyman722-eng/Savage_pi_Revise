import { create } from 'zustand';
import { DeviceMetrics, HuntingStatus, RaidStatus } from '@services/websocket';

export interface Device {
  id: string;
  name: string;
  url: string;
  token: string;
  lastConnected: number;
  isConnected: boolean;
}

export interface AppState {
  // Authentication
  authToken: string | null;
  user: { id: string; name: string; email: string } | null;

  // Device Connection
  devices: Device[];
  activeDeviceId: string | null;
  isConnected: boolean;

  // Hunting State
  huntingStatus: HuntingStatus | null;
  handshakes: Array<{
    id: string;
    ssid: string;
    bssid: string;
    signalStrength: number;
    capturedAt: number;
    crackStatus: 'pending' | 'cracking' | 'cracked' | 'failed';
    password?: string;
  }>;

  // Raid State
  raidStatus: RaidStatus | null;
  discoveredHosts: Array<{
    id: string;
    ip: string;
    hostname?: string;
    mac: string;
    services: number;
    vulnerabilities: number;
  }>;

  // Metrics
  metrics: DeviceMetrics | null;
  metricsHistory: DeviceMetrics[];

  // Credentials
  credentials: Array<{
    id: string;
    service: string;
    username: string;
    password: string;
    host: string;
  }>;

  // Activity Log
  activityLog: Array<{
    id: string;
    timestamp: number;
    type: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    message: string;
  }>;

  // UI State
  selectedTab: 'dashboard' | 'hunting' | 'raid' | 'credentials' | 'settings';
  showAlert: boolean;
  alertMessage: string;
  alertType: 'info' | 'warning' | 'error' | 'success';

  // Actions
  setAuthToken: (token: string | null) => void;
  setUser: (user: AppState['user']) => void;
  addDevice: (device: Device) => void;
  removeDevice: (deviceId: string) => void;
  setActiveDevice: (deviceId: string) => void;
  setIsConnected: (connected: boolean) => void;
  setHuntingStatus: (status: HuntingStatus | null) => void;
  addHandshake: (handshake: AppState['handshakes'][0]) => void;
  setRaidStatus: (status: RaidStatus | null) => void;
  addDiscoveredHost: (host: AppState['discoveredHosts'][0]) => void;
  setMetrics: (metrics: DeviceMetrics) => void;
  addCredential: (credential: AppState['credentials'][0]) => void;
  addActivityLog: (log: AppState['activityLog'][0]) => void;
  setSelectedTab: (tab: AppState['selectedTab']) => void;
  showAlertMessage: (message: string, type: AppState['alertType']) => void;
  clearAlert: () => void;
  reset: () => void;
}

const initialState = {
  authToken: null,
  user: null,
  devices: [],
  activeDeviceId: null,
  isConnected: false,
  huntingStatus: null,
  handshakes: [],
  raidStatus: null,
  discoveredHosts: [],
  metrics: null,
  metricsHistory: [],
  credentials: [],
  activityLog: [],
  selectedTab: 'dashboard' as const,
  showAlert: false,
  alertMessage: '',
  alertType: 'info' as const,
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,

  setAuthToken: (token) => set({ authToken: token }),

  setUser: (user) => set({ user }),

  addDevice: (device) =>
    set((state) => ({
      devices: [...state.devices, device],
    })),

  removeDevice: (deviceId) =>
    set((state) => ({
      devices: state.devices.filter((d) => d.id !== deviceId),
      activeDeviceId: state.activeDeviceId === deviceId ? null : state.activeDeviceId,
    })),

  setActiveDevice: (deviceId) => set({ activeDeviceId: deviceId }),

  setIsConnected: (connected) => set({ isConnected: connected }),

  setHuntingStatus: (status) => set({ huntingStatus: status }),

  addHandshake: (handshake) =>
    set((state) => ({
      handshakes: [handshake, ...state.handshakes].slice(0, 100), // Keep last 100
    })),

  setRaidStatus: (status) => set({ raidStatus: status }),

  addDiscoveredHost: (host) =>
    set((state) => ({
      discoveredHosts: [host, ...state.discoveredHosts].slice(0, 100), // Keep last 100
    })),

  setMetrics: (metrics) =>
    set((state) => ({
      metrics,
      metricsHistory: [...state.metricsHistory, metrics].slice(-60), // Keep last 60 samples
    })),

  addCredential: (credential) =>
    set((state) => ({
      credentials: [credential, ...state.credentials],
    })),

  addActivityLog: (log) =>
    set((state) => ({
      activityLog: [log, ...state.activityLog].slice(0, 1000), // Keep last 1000
    })),

  setSelectedTab: (tab) => set({ selectedTab: tab }),

  showAlertMessage: (message, type) =>
    set({
      showAlert: true,
      alertMessage: message,
      alertType: type,
    }),

  clearAlert: () =>
    set({
      showAlert: false,
      alertMessage: '',
    }),

  reset: () => set(initialState),
}));
