/**
 * Application Configuration
 * Optimized for embedded deployment on Pi Zero 2 W
 */

export interface AppConfig {
  name: string;
  version: string;
  environment: 'production' | 'development';
  debug: boolean;
  
  // Memory limits
  maxHeapSize: number;
  maxLogEntries: number;
  maxMetricsHistory: number;
  maxWebSocketConnections: number;
  
  // Performance
  pollingInterval: number;
  metricsUpdateInterval: number;
  displayRefreshRate: number;
  
  // Web interface (optional)
  webEnabled: boolean;
  webPort: number;
  webHost: string;
  
  // Paths
  dataPath: string;
  logPath: string;
  dbPath: string;
  
  // Hardware
  hardwareEnabled: boolean;
  displayEnabled: boolean;
  touchEnabled: boolean;
}

/**
 * Production Configuration
 * Optimized for minimal memory and maximum stability
 */
export const PRODUCTION_CONFIG: AppConfig = {
  name: 'SAVAGE Framework',
  version: '2.0.0',
  environment: 'production',
  debug: false,
  
  // Memory limits (512MB RAM total)
  maxHeapSize: 256 * 1024 * 1024, // 256MB
  maxLogEntries: 1000,
  maxMetricsHistory: 100,
  maxWebSocketConnections: 5,
  
  // Performance
  pollingInterval: 1000, // 1 second
  metricsUpdateInterval: 5000, // 5 seconds
  displayRefreshRate: 30, // 30 FPS max
  
  // Web interface (disabled by default for embedded)
  webEnabled: false,
  webPort: 8080,
  webHost: '0.0.0.0',
  
  // Paths
  dataPath: '/opt/savage-pi/data',
  logPath: '/opt/savage-pi/data/logs',
  dbPath: '/opt/savage-pi/data/savage.db',
  
  // Hardware
  hardwareEnabled: true,
  displayEnabled: true,
  touchEnabled: true,
};

/**
 * Development Configuration
 * More verbose logging and debugging
 */
export const DEVELOPMENT_CONFIG: AppConfig = {
  ...PRODUCTION_CONFIG,
  environment: 'development',
  debug: true,
  maxHeapSize: 512 * 1024 * 1024, // 512MB
  maxLogEntries: 10000,
  webEnabled: true,
};

/**
 * Get configuration based on environment
 */
export function getConfig(): AppConfig {
  const env = process.env.NODE_ENV || 'production';
  return env === 'development' ? DEVELOPMENT_CONFIG : PRODUCTION_CONFIG;
}

/**
 * Current configuration
 */
export const config = getConfig();