# SAVAGE Framework - Deployment Guide

## Quick Start

### 1. System Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y nodejs npm git build-essential

# Enable hardware interfaces
sudo raspi-config nonint do_spi 0
sudo raspi-config nonint do_i2c 0
sudo raspi-config nonint do_serial_hw 0

# Disable GUI (headless)
sudo systemctl set-default multi-user.target

# Disable unnecessary services
sudo systemctl disable bluetooth
sudo systemctl disable hciuart

# Optimize kernel parameters
echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
echo "vm.vfs_cache_pressure=50" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Set CPU governor to performance
echo "performance" | sudo tee /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor
```

### 2. Application Installation

```bash
# Clone repository
git clone <repository-url> /opt/savage-pi
cd /opt/savage-pi

# Install Node.js dependencies
npm install --production

# Build TypeScript
npm run build

# Create data directory
mkdir -p data/logs

# Install systemd service
sudo cp systemd/savage-framework.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable savage-framework.service

# Start service
sudo systemctl start savage-framework.service
```

### 3. Verification

```bash
# Check service status
sudo systemctl status savage-framework.service

# View logs
sudo journalctl -u savage-framework.service -f

# Check memory usage
free -h

# Check CPU usage
top -bn1 | grep "Cpu(s)"
```

## Hardware Configuration

### I2C Bus Configuration

```bash
# Verify I2C devices
sudo i2cdetect -y 1

# Expected output:
# 0x24 - PN532 NFC
# 0x36 - UPS HAT
```

### SPI Bus Configuration

```bash
# Verify SPI devices
ls -la /dev/spidev*

# Expected output:
# /dev/spidev0.0 - TFT Display
```

### UART Configuration

```bash
# Verify UART device
ls -la /dev/serial0

# Expected output:
# /dev/serial0 -> ttyAMA0 (RDM6300 RFID)
```

### GPIO Configuration

```bash
# Verify GPIO access
ls -la /sys/class/gpio/

# Expected GPIO pins:
# GPIO 17 - Display Reset
# GPIO 18 - Display Backlight
# GPIO 25 - Display DC
# GPIO 8  - Display CS
```

## Systemd Service Management

### Service Commands

```bash
# Start service
sudo systemctl start savage-framework.service

# Stop service
sudo systemctl stop savage-framework.service

# Restart service
sudo systemctl restart savage-framework.service

# Enable on boot
sudo systemctl enable savage-framework.service

# Disable on boot
sudo systemctl disable savage-framework.service

# View status
sudo systemctl status savage-framework.service
```

### Service Configuration

Edit `/etc/systemd/system/savage-framework.service`:

```ini
[Unit]
Description=SAVAGE Framework - Raspberry Pi Zero 2 W Embedded Edition
After=network.target multi-user.target
Wants=network-online.target

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=/opt/savage-pi
ExecStart=/usr/bin/node /opt/savage-pi/dist/main.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=savage-framework

# Resource limits
MemoryLimit=300M
MemorySwap=0
CPUQuota=80%

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/savage-pi/data

# Environment
NODE_ENV=production
NODE_OPTIONS="--max-old-space-size=256"

[Install]
WantedBy=multi-user.target
```

### Service Reload

```bash
# After modifying service file
sudo systemctl daemon-reload
sudo systemctl restart savage-framework.service
```

## Monitoring and Logging

### View Logs

```bash
# Real-time logs
sudo journalctl -u savage-framework.service -f

# Last 100 lines
sudo journalctl -u savage-framework.service -n 100

# Since boot
sudo journalctl -u savage-framework.service --since boot

# Error logs only
sudo journalctl -u savage-framework.service -p err

# Last hour
sudo journalctl -u savage-framework.service --since "1 hour ago"
```

### Log Files

```bash
# View application logs
cat /opt/savage-pi/data/logs/savage-*.log

# Rotate logs (if needed)
logrotate /etc/logrotate.d/savage-framework
```

### Health Monitoring

```bash
# Check service status
sudo systemctl status savage-framework.service

# Check memory usage
free -h

# Check CPU usage
top -bn1 | grep "Cpu(s)"

# Check disk usage
df -h

# Check temperature
vcgencmd measure_temp

# Check uptime
uptime
```

## Troubleshooting

### Service Won't Start

```bash
# Check service status
sudo systemctl status savage-framework.service

# View logs for errors
sudo journalctl -u savage-framework.service -n 50

# Check if Node.js is installed
node --version

# Check if build exists
ls -la /opt/savage-pi/dist/

# Check permissions
ls -la /opt/savage-pi/
```

### Display Not Working

```bash
# Check framebuffer
ls -la /dev/fb0

# Check SPI device
ls -la /dev/spidev0.0

# Check GPIO permissions
ls -la /sys/class/gpio/

# Test framebuffer
cat /dev/urandom > /dev/fb0
```

### Hardware Not Detected

```bash
# Check I2C devices
sudo i2cdetect -y 1

# Check UART
ls -la /dev/serial0

# Check SPI
ls -la /dev/spidev*

# Check kernel messages
dmesg | grep -i i2c
dmesg | grep -i spi
dmesg | grep -i uart
```

### High Memory Usage

```bash
# Check Node.js memory
ps aux | grep node

# Check system memory
free -h

# Restart service
sudo systemctl restart savage-framework.service

# Adjust memory limit
# Edit systemd service: MemoryLimit=300M
sudo systemctl daemon-reload
sudo systemctl restart savage-framework.service
```

### High CPU Usage

```bash
# Check CPU usage
top -bn1 | grep node

# Check CPU governor
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor

# Set to performance
echo "performance" | sudo tee /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor

# Check for loops
sudo journalctl -u savage-framework.service -f
```

## Performance Tuning

### Boot Time Optimization

```bash
# Disable unnecessary services
sudo systemctl disable bluetooth
sudo systemctl disable hciuart
sudo systemctl disable wpa_supplicant

# Optimize kernel parameters
echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
echo "vm.vfs_cache_pressure=50" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Use systemd service with dependencies
# Already configured in savage-framework.service
```

### Memory Optimization

```bash
# Set Node.js heap limit
NODE_OPTIONS="--max-old-space-size=256"

# Adjust application config
# Edit src/config/app.ts:
# maxHeapSize: 256 * 1024 * 1024
# maxLogEntries: 1000
# maxMetricsHistory: 100

# Use systemd memory limits
# Edit systemd service:
# MemoryLimit=300M
# MemorySwap=0
```

### CPU Optimization

```bash
# Set CPU governor to performance
echo "performance" | sudo tee /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor

# Adjust polling intervals
# Edit src/config/app.ts:
# pollingInterval: 1000
# metricsUpdateInterval: 5000

# Use systemd CPU limits
# Edit systemd service:
# CPUQuota=80%
```

## Security Hardening

### Systemd Security

```bash
# Verify security settings
sudo systemctl show savage-framework.service | grep -i security

# Expected output:
# NoNewPrivileges=yes
# PrivateTmp=yes
# ProtectSystem=full
# ProtectHome=yes
```

### Firewall Configuration

```bash
# Install ufw
sudo apt install ufw

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 8080/tcp  # If web interface enabled
sudo ufw enable
```

### User Security

```bash
# Create dedicated user (optional)
sudo useradd -r -s /bin/false savage

# Update systemd service
# User=savage
# Group=savage

# Set permissions
sudo chown -R savage:savage /opt/savage-pi
```

## Backup and Recovery

### Backup Configuration

```bash
# Backup application
tar -czf savage-backup-$(date +%Y%m%d).tar.gz /opt/savage-pi

# Backup database
cp /opt/savage-pi/data/savage.db /opt/savage-pi/data/savage.db.backup

# Backup logs
tar -czf savage-logs-$(date +%Y%m%d).tar.gz /opt/savage-pi/data/logs
```

### Recovery

```bash
# Restore application
tar -xzf savage-backup-YYYYMMDD.tar.gz -C /

# Restore database
cp /opt/savage-pi/data/savage.db.backup /opt/savage-pi/data/savage.db

# Restart service
sudo systemctl restart savage-framework.service
```

## Updates and Maintenance

### Update Application

```bash
# Stop service
sudo systemctl stop savage-framework.service

# Pull latest changes
cd /opt/savage-pi
git pull

# Install dependencies
npm install --production

# Build
npm run build

# Start service
sudo systemctl start savage-framework.service
```

### System Updates

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Update Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Reboot if kernel updated
sudo reboot
```

### Regular Maintenance

```bash
# Clean old logs
find /opt/savage-pi/data/logs -name "*.log" -mtime +7 -delete

# Clean old backups
find /opt/savage-pi/data -name "*.backup" -mtime +30 -delete

# Check disk space
df -h

# Check service health
sudo systemctl status savage-framework.service
```

## Production Checklist

### Pre-Deployment

- [ ] System updated and optimized
- [ ] Hardware interfaces enabled (SPI, I2C, UART)
- [ ] GUI disabled (headless mode)
- [ ] Unnecessary services disabled
- [ ] Kernel parameters optimized
- [ ] CPU governor set to performance
- [ ] Firewall configured
- [ ] Security settings verified

### Deployment

- [ ] Application installed
- [ ] Dependencies installed
- [ ] TypeScript built
- [ ] Data directories created
- [ ] Systemd service installed
- [ ] Service enabled
- [ ] Service started
- [ ] Logs verified

### Post-Deployment

- [ ] Service status verified
- [ ] Hardware detected
- [ ] Display working
- [ ] Touch working
- [ ] Memory usage normal
- [ ] CPU usage normal
- [ ] Logs clean
- [ ] Health checks passing

### Monitoring

- [ ] Service monitoring configured
- [ ] Log rotation configured
- [ ] Alerts configured
- [ ] Backup schedule configured
- [ ] Update schedule configured
- [ ] Maintenance schedule configured

## Support

### Getting Help

- GitHub Issues: [repository-url]/issues
- Documentation: [repository-url]/wiki
- Email: support@savage-framework.org

### Reporting Issues

When reporting issues, include:
- System information (`uname -a`)
- Service status (`sudo systemctl status savage-framework.service`)
- Recent logs (`sudo journalctl -u savage-framework.service -n 100`)
- Hardware configuration (`sudo i2cdetect -y 1`)
- Memory usage (`free -h`)
- CPU usage (`top -bn1 | grep "Cpu(s)"`)

## Conclusion

This deployment guide provides comprehensive instructions for deploying the SAVAGE Framework on Raspberry Pi Zero 2 W. Follow the steps carefully and verify each stage before proceeding to the next.

For additional information, refer to:
- README.md - Overview and quick start
- ARCHITECTURE.md - System architecture
- AUDIT_REPORT.md - Original audit findings