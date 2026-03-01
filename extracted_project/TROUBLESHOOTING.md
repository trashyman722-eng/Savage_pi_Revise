# SAVAGE Framework - Troubleshooting Guide

Comprehensive troubleshooting guide for common SAVAGE framework issues.

## Installation Issues

### Installation Script Fails

**Problem**: `install.sh` exits with errors

**Solution**:
```bash
# Run with verbose output
bash -x install.sh

# Check for specific errors in output
# Common causes:
# 1. Not running as root: sudo bash install.sh
# 2. No internet connection: Check network connectivity
# 3. Insufficient disk space: df -h
# 4. Incompatible OS: Ensure Raspbian Lite (Bullseye or later)
```

### Package Installation Fails

**Problem**: `apt-get install` fails with dependency errors

**Solution**:
```bash
# Update package lists
sudo apt-get update

# Fix broken dependencies
sudo apt-get install -f

# Try installation again
sudo apt-get install -y package_name

# Check for held packages
apt-mark showhold
```

### Python Dependencies Fail

**Problem**: `pip3 install -r requirements.txt` fails

**Solution**:
```bash
# Upgrade pip
pip3 install --upgrade pip

# Install with verbose output
pip3 install -v -r requirements.txt

# Install packages individually to identify problematic ones
pip3 install psutil
pip3 install scapy
# ... etc

# Check for version conflicts
pip3 check
```

### Node.js Dependencies Fail

**Problem**: `pnpm install` fails with errors

**Solution**:
```bash
# Clear pnpm cache
pnpm store prune

# Remove node_modules and lock file
rm -rf node_modules pnpm-lock.yaml

# Reinstall
pnpm install

# Check for disk space
df -h

# Check Node.js version
node --version  # Should be 18+
```

## Hardware Issues

### Display Not Working

**Problem**: ELEGOO 2.8" TFT display is blank or not responding

**Solution**:
```bash
# Verify SPI is enabled
sudo raspi-config
# Navigate to: Interfacing Options > SPI > Enable

# Check GPIO connections
gpio readall

# Test SPI communication
ls -la /dev/spidev*

# Check for GPIO conflicts
sudo lsof /dev/mem

# Review logs
tail -f ~/.manus-logs/devserver.log

# Verify display configuration
cat server/hardware/hardware-manager.ts | grep -A 10 "ELEGOO_TFT_CONFIG"
```

**Advanced Debugging**:
```bash
# Test SPI device directly
sudo spidev-test -D /dev/spidev0.0

# Check GPIO pin states
gpio -g read 17  # Reset pin
gpio -g read 18  # Backlight pin

# Monitor GPIO events
sudo gpiomon gpiochip0 17 18
```

### Touch Screen Not Working

**Problem**: Display works but touch input not responding

**Solution**:
```bash
# Check touch device
ls -la /dev/input/

# Test touch input
evtest /dev/input/event0

# Recalibrate touch screen
xinput_calibrator --device "EETI eGalax Touch Screen"

# Check for GPIO conflicts
sudo lsof /dev/input/event*
```

### RFID Modules Not Detected

**Problem**: PN532 or RDM6300 modules not responding

**Solution**:

**For PN532 (I2C)**:
```bash
# Enable I2C
sudo raspi-config
# Navigate to: Interfacing Options > I2C > Enable

# Scan I2C devices
sudo i2cdetect -y 1
# Should show 0x24 for PN532

# Test I2C communication
sudo i2cget -y 1 0x24 0x00

# Check I2C speed
sudo i2cget -y 1 0x24 0x00

# Verify wiring
# SDA -> GPIO2 (pin 3)
# SCL -> GPIO3 (pin 5)
# VCC -> 3.3V (pin 1)
# GND -> GND (pin 6, 9, 14, 20, 25)
```

**For RDM6300 (UART)**:
```bash
# Enable UART
sudo raspi-config
# Navigate to: Interfacing Options > Serial > Enable

# Check serial ports
ls -la /dev/ttyUSB*
ls -la /dev/ttyAMA0

# Test serial communication
sudo cat /dev/ttyUSB0
# Present RFID card to module
# Should output: 0x02 + 10 hex chars + 2 checksum + 0x03

# Check baud rate
stty -F /dev/ttyUSB0
# Should show: 9600

# Verify wiring
# TX -> GPIO14 (pin 8)
# RX -> GPIO15 (pin 10)
# VCC -> 5V (pin 2, 4)
# GND -> GND (pin 6, 9, 14, 20, 25)
```

### UPS HAT Not Charging

**Problem**: Battery not charging or showing incorrect level

**Solution**:
```bash
# Check I2C communication
sudo i2cdetect -y 1
# Should show 0x36

# Read battery voltage (register 0x02)
sudo i2cget -y 1 0x36 0x02 w

# Read battery percentage (register 0x04)
sudo i2cget -y 1 0x36 0x04

# Read charging status (register 0x05)
sudo i2cget -y 1 0x36 0x05

# Verify power supply
# Ensure 5V power supply provides minimum 500mA current

# Check Pogo pin connection
# Ensure pins are clean and making contact
# Clean with isopropyl alcohol if needed

# Verify wiring
# SDA -> GPIO2 (pin 3)
# SCL -> GPIO3 (pin 5)
# Pogo 1 -> +5V Output
# Pogo 2 -> +5V Input (charging)
# Pogo 3 -> GND
```

## Software Issues

### Service Not Starting

**Problem**: `sudo systemctl start savage` fails

**Solution**:
```bash
# Check service status
sudo systemctl status savage

# View service logs
sudo journalctl -u savage -f

# Check for errors
sudo systemctl start savage 2>&1

# Verify service file
cat /etc/systemd/system/savage.service

# Test application directly
cd /home/pi/savage-framework
npm run start

# Check port availability
sudo lsof -i :3000

# Verify permissions
ls -la /home/pi/savage-framework/dist/index.js
```

### Database Connection Failed

**Problem**: Cannot connect to MySQL database

**Solution**:
```bash
# Check MySQL status
sudo systemctl status mysql

# Start MySQL if stopped
sudo systemctl start mysql

# Test MySQL connection
mysql -u savage -p -h localhost -D savage

# Check MySQL configuration
cat /etc/mysql/my.cnf

# Verify credentials in .env
cat /home/pi/savage-framework/.env | grep DATABASE_URL

# Check MySQL user permissions
mysql -u root -p
SHOW GRANTS FOR 'savage'@'localhost';
```

### WebSocket Connection Fails

**Problem**: Dashboard not receiving real-time updates

**Solution**:
```bash
# Check WebSocket server
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  http://localhost:3000/ws

# Check Nginx WebSocket configuration
sudo cat /etc/nginx/sites-available/savage-framework | grep -A 5 "location /ws"

# Verify proxy headers
sudo nginx -T

# Check firewall
sudo ufw status
sudo ufw allow 3000/tcp

# Monitor WebSocket connections
sudo netstat -an | grep 3000
```

### API Endpoints Not Responding

**Problem**: tRPC procedures return errors

**Solution**:
```bash
# Test API endpoint
curl -X POST http://localhost:3000/api/trpc/auth.me

# Check server logs
tail -f ~/.manus-logs/devserver.log

# Verify tRPC router
cat server/routers.ts

# Check for TypeScript errors
pnpm run check

# Rebuild project
pnpm run build

# Check for port conflicts
sudo lsof -i :3000
```

## Performance Issues

### High CPU Usage

**Problem**: CPU usage consistently above 80%

**Solution**:
```bash
# Monitor CPU usage
top -b -n 1 | head -20

# Check process CPU usage
ps aux --sort=-%cpu | head -10

# Identify resource-heavy operations
# 1. Disable unused RFID modules
# 2. Reduce metrics collection frequency
# 3. Limit concurrent operations
# 4. Optimize database queries

# Check for infinite loops
grep -r "while (true)" server/

# Monitor system load
uptime
```

### High Memory Usage

**Problem**: Memory usage consistently above 85%

**Solution**:
```bash
# Check memory usage
free -h

# Monitor memory by process
ps aux --sort=-%mem | head -10

# Check for memory leaks
# 1. Restart service: sudo systemctl restart savage
# 2. Monitor memory over time: watch -n 1 free -h
# 3. Check for unclosed connections

# Reduce memory usage
# 1. Disable metrics history
# 2. Reduce activity log retention
# 3. Limit concurrent sessions
# 4. Disable experimental features
```

### Slow Dashboard Response

**Problem**: Dashboard is sluggish or unresponsive

**Solution**:
```bash
# Check network latency
ping -c 5 localhost

# Monitor network traffic
sudo iftop

# Check database performance
# 1. Review slow query log
# 2. Add database indexes
# 3. Optimize queries

# Check for network issues
sudo netstat -an | grep ESTABLISHED

# Monitor WebSocket latency
# Check browser console for timing information
```

## Network Issues

### Cannot Connect to Target Networks

**Problem**: Hunting or Raid operations fail to connect

**Solution**:
```bash
# Check Wi-Fi adapter
iwconfig

# Verify bettercap installation
bettercap --version

# Check network permissions
sudo usermod -a -G netdev pi

# Test network connectivity
ping -c 5 8.8.8.8

# Check for network conflicts
sudo arp-scan --localnet

# Monitor network interfaces
ifconfig
```

### Handshake Upload Fails

**Problem**: Cannot upload handshakes to wpa-sec

**Solution**:
```bash
# Check internet connectivity
ping -c 5 wpa-sec.stanev.net

# Verify API key
cat /home/pi/savage-framework/.env | grep WPASEC_API_KEY

# Test API connection
curl -X GET "https://wpa-sec.stanev.net/api/status" \
  -H "Authorization: Bearer YOUR_API_KEY"

# Check firewall rules
sudo ufw status

# Monitor upload process
tail -f ~/.manus-logs/devserver.log | grep -i "upload\|wpa-sec"
```

## Permission Issues

### Permission Denied Errors

**Problem**: Operations fail with permission denied

**Solution**:
```bash
# Check current user groups
groups

# Add user to required groups
sudo usermod -a -G gpio pi
sudo usermod -a -G spi pi
sudo usermod -a -G i2c pi
sudo usermod -a -G dialout pi

# Reboot to apply changes
sudo reboot

# Verify permissions
groups pi

# Check file permissions
ls -la /dev/spidev*
ls -la /dev/i2c*
ls -la /dev/ttyUSB*
```

### GPIO Permission Denied

**Problem**: Cannot access GPIO pins

**Solution**:
```bash
# Check GPIO permissions
ls -la /dev/gpiomem

# Add user to gpio group
sudo usermod -a -G gpio pi

# Set GPIO permissions
sudo chmod g+rw /dev/gpiomem

# Reboot
sudo reboot
```

## Logging & Debugging

### Enable Debug Logging

```bash
# Set log level to debug
# Edit .env:
LOG_LEVEL=debug

# Restart service
sudo systemctl restart savage

# View debug logs
sudo journalctl -u savage -f --lines=100
```

### Check Application Logs

```bash
# View recent logs
tail -f ~/.manus-logs/devserver.log

# Search for errors
grep "ERROR" ~/.manus-logs/devserver.log

# View WebSocket events
grep "WebSocket\|ws:" ~/.manus-logs/devserver.log

# Monitor in real-time
watch -n 1 'tail -20 ~/.manus-logs/devserver.log'
```

### System Logs

```bash
# View systemd service logs
sudo journalctl -u savage -f

# View system messages
sudo tail -f /var/log/syslog

# Check kernel messages
dmesg | tail -20

# Monitor system events
sudo journalctl -f
```

## Recovery Procedures

### Restart Service

```bash
# Restart SAVAGE service
sudo systemctl restart savage

# Verify service is running
sudo systemctl status savage

# Check service logs
sudo journalctl -u savage -f
```

### Reset Configuration

```bash
# Backup current configuration
cp /home/pi/savage-framework/.env /home/pi/savage-framework/.env.backup

# Reset to defaults
# Edit .env and restore default values
# Or copy from docs/CONFIGURATION.md

# Restart service
sudo systemctl restart savage
```

### Factory Reset

```bash
# Stop service
sudo systemctl stop savage

# Backup data
tar -czf /home/pi/savage-framework-backup.tar.gz /home/pi/savage-framework

# Remove project
rm -rf /home/pi/savage-framework

# Reinstall
git clone https://github.com/yourusername/savage-framework.git /home/pi/savage-framework
cd /home/pi/savage-framework
sudo bash install.sh
```

## Getting Help

- **Documentation**: See README.md, QUICKSTART.md, docs/DRIVERS.md
- **GitHub Issues**: Report bugs and request features
- **Community**: Join our Discord for discussions
- **Logs**: Always include relevant log files when reporting issues

---

**Last Updated**: February 2026
**Version**: 1.0
