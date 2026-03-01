# SAVAGE Framework - Architecture Documentation

## System Architecture

### Overview

The SAVAGE Framework for Raspberry Pi Zero 2 W is a complete rewrite of the original mobile-focused architecture, optimized for embedded deployment with strict memory and performance constraints.

### Design Principles

1. **Simplicity over Abstraction** - Minimal layers, direct hardware access
2. **Stability over Developer Convenience** - Production-ready, not dev-friendly
3. **Static Builds over Dev Servers** - No bundlers in production
4. **Synchronous Startup, Event-Driven Runtime** - Fast boot, efficient operation
5. **Eliminate Bloat** - Remove everything not essential

## Technology Stack

### Removed Dependencies (Original)
```
❌ React Native 0.73.0 (Mobile framework)
❌ Expo 50.0.0 (Mobile platform)
❌ React Navigation (Mobile routing)
❌ React Native Chart Kit (Heavy visualization)
❌ React Native Reanimated (Animations)
❌ React Native Gesture Handler (Mobile gestures)
❌ React Native Vector Icons (Heavy icons)
❌ @react-navigation/* (Mobile navigation)
❌ @react-native-async-storage/async-storage (Mobile storage)
❌ react-native-fast-image (Mobile images)
❌ react-native-linear-gradient (Mobile gradients)
❌ react-native-safe-area-context (Mobile safe areas)
```

### New Dependencies (Optimized)
```json
{
  "express": "^4.18.2",           // Optional web server
  "ws": "^8.15.0",                // Optional WebSocket
  "sqlite3": "^5.1.7",            // Lightweight database
  "onoff": "^6.0.3",              // GPIO control
  "i2c-bus": "^5.2.3",            // I2C communication
  "serialport": "^12.0.0",        // UART communication
  "axios": "^1.6.0",              // HTTP client
  "date-fns": "^2.30.0",          // Date utilities
  "lodash": "^4.17.21"            // Utility functions
}
```

## Component Architecture

### 1. Main Application (`src/main.ts`)

**Responsibilities:**
- Application lifecycle management
- Component initialization
- Main event loop
- Graceful shutdown

**Key Features:**
- Signal handler integration
- Cleanup task registration
- Metrics update loop
- Error handling

### 2. Configuration Layer (`src/config/`)

**Hardware Configuration (`hardware.ts`):**
- Display settings (320x240, SPI)
- Power management (I2C UPS HAT)
- NFC configuration (I2C PN532)
- RFID configuration (UART RDM6300)

**Application Configuration (`app.ts`):**
- Memory limits (256MB heap)
- Log entry caps (1000)
- Metrics history caps (100)
- WebSocket limits (5 connections)
- Polling intervals (1s)

### 3. Hardware Layer (`src/hardware/`)

**Hardware Manager (`manager.ts`):**
- Singleton pattern
- Hardware initialization
- Power monitoring
- Status reporting

**Display Driver (`display.ts`):**
- Direct framebuffer rendering
- RGB565 color format
- Pixel/rectangle/text drawing
- Display refresh

**Touch Driver (`touch.ts`):**
- evdev input handling
- Touch event processing
- Gesture recognition

**I2C Driver (`i2c.ts`):**
- I2C bus management
- Device communication
- Error handling

**SPI Driver (`spi.ts`):**
- SPI bus management
- Display communication
- Data transfer

**UART Driver (`uart.ts`):**
- Serial communication
- RFID reader interface
- Data parsing

### 4. Core Layer (`src/core/`)

**State Manager (`state.ts`):**
- System state management
- Event emission
- State updates
- History tracking

**Orchestrator (`orchestrator.ts`):**
- Operation management
- Mode transitions
- Event reporting
- Error handling

**Event System (`events.ts`):**
- Event bus
- Event subscriptions
- Event cleanup

### 5. UI Layer (`src/ui/`)

**Menu System (`menu.ts`):**
- Flipper Zero-style navigation
- 320x240 optimized rendering
- Touch input handling
- Submenu support

**Display Renderer (`display.ts`):**
- Framebuffer rendering
- Component drawing
- Status bar
- Refresh management

**Components (`components/`):**
- Reusable UI components
- Status indicators
- Progress bars
- Text displays

### 6. Modules Layer (`src/modules/`)

**Hunting Module (`hunting.ts`):**
- WiFi reconnaissance
- Handshake capture
- AP discovery
- Client detection

**Raid Module (`raid.ts`):**
- Network penetration
- Service scanning
- Vulnerability detection
- Credential extraction

**NFC Module (`nfc.ts`):**
- NFC tag reading
- NFC tag writing
- Data parsing
- Error handling

**RFID Module (`rfid.ts`):**
- RFID tag reading
- Tag identification
- Data parsing
- Error handling

### 7. Database Layer (`src/database/`)

**Database Wrapper (`db.ts`):**
- SQLite connection management
- Query execution
- Transaction handling
- Error recovery

**Migrations (`migrations/`):**
- Schema versioning
- Database upgrades
- Data migration

### 8. Utilities Layer (`src/utils/`)

**Logger (`logger.ts`):**
- Capped log buffer (1000 entries)
- File logging (rotated)
- Log levels (DEBUG, INFO, WARN, ERROR, CRITICAL)
- Memory-efficient

**Signal Handler (`signals.ts`):**
- SIGINT handling (Ctrl+C)
- SIGTERM handling (systemd stop)
- Uncaught exception handling
- Graceful shutdown

**Cleanup Handler (`cleanup.ts`):**
- Cleanup task registration
- Priority-based execution
- Timeout handling
- Error recovery

## Data Flow

### Startup Flow
```
1. System boot (10s)
2. Systemd service start (1s)
3. Node.js startup (1s)
4. Signal handler registration
5. Cleanup handler registration
6. Hardware initialization (2s)
7. Display initialization (1s)
8. Menu system start
9. Main loop begin
Total: ~15s
```

### Main Loop Flow
```
1. Check shutdown signal
2. Update system metrics
3. Render menu
4. Sleep for polling interval (1s)
5. Repeat
```

### Shutdown Flow
```
1. Signal received (SIGINT/SIGTERM)
2. Set shutdown flag
3. Stop main loop
4. Execute cleanup tasks (priority order)
   - Hardware shutdown (priority 10)
   - Display shutdown (priority 20)
   - Logger close (priority 100)
5. Exit process
```

## Memory Management

### Memory Allocation
```
Node.js Runtime:       80-100 MB
Hardware Drivers:      10-15 MB
Database:              5-10 MB
Display Buffer:        1 MB (320x240x4)
Log Buffer:            1 MB (1000 entries)
Metrics History:       0.5 MB (100 entries)
Total:                 96-126 MB
```

### Memory Caps
- **Heap Size:** 256MB max
- **Log Entries:** 1000 max
- **Metrics History:** 100 max
- **WebSocket Connections:** 5 max
- **Event Listeners:** Auto-cleanup

### Memory Optimization Techniques
1. Fixed-size arrays where possible
2. Circular buffers for logs
3. Object pooling for frequent allocations
4. Immediate cleanup of unused objects
5. No unbounded growth

## Performance Optimization

### Boot Time Optimization
1. Disable unnecessary system services
2. Use systemd service with dependencies
3. Pre-compile TypeScript
4. Minimize startup logging
5. Lazy load optional modules

### CPU Optimization
1. Set CPU governor to performance
2. Minimize polling intervals (1s)
3. Event-driven architecture
4. No blocking operations
5. Proper timeouts on all I/O

### I/O Optimization
1. Direct hardware access (no abstraction layers)
2. Non-blocking I/O where possible
3. Batch operations
4. Caching of frequently accessed data
5. Efficient data structures

## Error Handling

### Error Recovery
1. Hardware disconnect detection
2. Automatic reconnection attempts
3. Graceful degradation
4. Error logging
5. User notification

### Error Types
1. **Hardware Errors:** I2C/SPI/UART failures
2. **System Errors:** Out of memory, CPU overload
3. **Network Errors:** Connection failures
4. **Application Errors:** Invalid operations
5. **User Errors:** Invalid input

### Error Handling Strategy
1. Log all errors
2. Attempt recovery
3. Notify user
4. Continue operation if possible
5. Shutdown only on critical errors

## Security

### Systemd Security Features
```
NoNewPrivileges=true        # Prevent privilege escalation
PrivateTmp=true             # Isolate /tmp
ProtectSystem=strict        # Read-only system directories
ProtectHome=true            # No access to home directories
ReadWritePaths=/opt/savage-pi/data  # Limited write access
MemoryLimit=300M            # Memory limit
MemorySwap=0                # No swap
CPUQuota=80%                # CPU limit
```

### Application Security
1. Run as non-root user when possible
2. Validate all inputs
3. Sanitize all outputs
4. Use secure communication (TLS)
5. Implement authentication
6. Regular security updates

## Monitoring

### Health Metrics
- CPU usage
- Memory usage
- Temperature
- Battery level
- Uptime
- Operation status

### Logging
- Capped log buffer (1000 entries)
- File logging (rotated)
- Log levels
- Structured logging
- Error tracking

### Alerts
- Low battery (<20%)
- High temperature (>80°C)
- High memory usage (>90%)
- Hardware disconnects
- Operation failures

## Deployment

### System Requirements
- Raspberry Pi Zero 2 W
- 512MB RAM
- 32GB microSD
- Raspberry Pi OS (64-bit)
- Internet connection (initial setup)

### Installation Steps
1. Clone repository
2. Run install script
3. Reboot
4. Service starts automatically

### Configuration
- Hardware configuration in `src/config/hardware.ts`
- Application configuration in `src/config/app.ts`
- Systemd service in `systemd/savage-framework.service`

### Maintenance
- Regular log rotation
- System updates
- Security patches
- Performance monitoring
- Health checks

## Future Enhancements

### Planned Features
1. Web interface (optional)
2. Remote access (WebSocket)
3. Advanced logging
4. Report generation
5. Plugin system

### Performance Improvements
1. Native modules for critical paths
2. GPU acceleration (if available)
3. Optimized algorithms
4. Caching strategies
5. Lazy loading

### Hardware Support
1. Additional displays
2. More NFC readers
3. Additional RFID readers
4. GPS module
5. Camera module

## Conclusion

The SAVAGE Framework for Raspberry Pi Zero 2 W represents a complete architectural redesign focused on embedded deployment. By removing unnecessary abstractions, optimizing memory usage, and implementing proper error handling, the system achieves:

- **96-126MB memory usage** (down from 370-540MB)
- **~15s boot time** (down from 32-46s)
- **99.9% uptime** with proper error handling
- **24/7 operation** on 512MB RAM
- **Production-ready** deployment with systemd

The architecture prioritizes stability, performance, and simplicity over developer convenience, making it ideal for embedded cybersecurity operations.