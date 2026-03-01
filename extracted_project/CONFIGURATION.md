# SAVAGE Framework - Configuration Guide

Complete configuration documentation for SAVAGE framework deployment.

## Environment Variables

SAVAGE uses environment variables for configuration. Create a `.env` file in the project root with the following variables:

### Database Configuration

```bash
# MySQL/MariaDB connection string
DATABASE_URL=mysql://username:password@localhost:3306/savage
```

### OAuth & Authentication (Manus)

```bash
# Manus OAuth Application ID
VITE_APP_ID=savage-framework

# Manus OAuth Server URL
OAUTH_SERVER_URL=https://api.manus.im

# Manus OAuth Portal URL (frontend)
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# JWT Secret for session signing
JWT_SECRET=your_jwt_secret_key_here_change_in_production
```

### API Keys & Credentials

```bash
# Manus Forge API Key (server-side)
BUILT_IN_FORGE_API_KEY=your_forge_api_key_here

# Manus Forge API URL
BUILT_IN_FORGE_API_URL=https://api.manus.im/forge

# Frontend Forge API Key
VITE_FRONTEND_FORGE_API_KEY=your_frontend_forge_api_key_here

# Frontend Forge API URL
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im/forge

# WPA-Sec API Key (for handshake cracking)
WPASEC_API_KEY=your_wpasec_api_key_here

# WPA-Sec API URL
WPASEC_API_URL=https://wpa-sec.stanev.net/api
```

### Hardware Configuration

#### ELEGOO 2.8" TFT Display

```bash
# Display resolution
DISPLAY_WIDTH=320
DISPLAY_HEIGHT=240

# SPI device path
DISPLAY_SPI_DEVICE=/dev/spidev0.0

# GPIO pins
DISPLAY_GPIO_RESET=17
DISPLAY_GPIO_BACKLIGHT=18

# Enable touch support
DISPLAY_TOUCH_ENABLED=true
```

#### UPS HAT (C) Power Management

```bash
# I2C bus number
UPS_I2C_BUS=1

# I2C address
UPS_I2C_ADDRESS=0x36

# Check interval (milliseconds)
UPS_CHECK_INTERVAL=5000
```

#### HiLetgo PN532 NFC/RFID Module

```bash
# Enable PN532 module
RFID_PN532_ENABLED=true

# Communication interface (i2c, spi, uart)
RFID_PN532_INTERFACE=i2c

# I2C address
RFID_PN532_I2C_ADDRESS=0x24

# I2C bus number
RFID_PN532_I2C_BUS=1
```

#### RDM6300 125kHz RFID Module

```bash
# Enable RDM6300 module
RFID_RDM6300_ENABLED=true

# Serial port
RFID_RDM6300_PORT=/dev/ttyUSB0

# Baud rate
RFID_RDM6300_BAUDRATE=9600
```

### Hunting Configuration

```bash
# Wi-Fi channels to scan (comma-separated)
HUNTING_CHANNELS=1,6,11

# Dwell time per channel (seconds)
HUNTING_DWELL_TIME=5

# AI aggression level (low, medium, high)
HUNTING_AI_AGGRESSION=medium

# De-authentication packets per target
HUNTING_DEAUTH_PACKETS=15

# Handshake capture timeout (seconds)
HUNTING_HANDSHAKE_TIMEOUT=30

# Auto-upload handshakes to wpa-sec
HUNTING_AUTO_UPLOAD=true
```

### Raid Configuration

```bash
# Nmap scan type (quick, standard, aggressive)
RAID_SCAN_TYPE=standard

# Port range for scanning
RAID_PORT_RANGE=1-65535

# Brute-force timeout (seconds)
RAID_BRUTEFORCE_TIMEOUT=60

# Enable vulnerability scanning
RAID_VULN_SCAN_ENABLED=true

# Enable brute-force attacks
RAID_BRUTEFORCE_ENABLED=true
```

### Logging & Monitoring

```bash
# Log level (debug, info, warn, error)
LOG_LEVEL=info

# Enable activity logging
ACTIVITY_LOGGING_ENABLED=true

# Metrics retention (days)
METRICS_RETENTION_DAYS=7

# Activity log retention (days)
ACTIVITY_LOG_RETENTION_DAYS=30
```

### Security & Compliance

```bash
# Enable HTTPS/SSL
ENABLE_SSL=false

# SSL certificate path
SSL_CERT_PATH=/etc/ssl/certs/savage.crt

# SSL key path
SSL_KEY_PATH=/etc/ssl/private/savage.key

# Enable firewall
ENABLE_FIREWALL=true

# Allowed IP addresses (comma-separated)
ALLOWED_IPS=
```

### Application Settings

```bash
# Application name
APP_NAME=SAVAGE Framework

# Application version
APP_VERSION=1.0.0

# Environment (development, production)
NODE_ENV=production

# Server port
PORT=3000

# Server host
HOST=0.0.0.0

# Debug mode
DEBUG=false

# Session timeout (minutes)
SESSION_TIMEOUT=60

# Max concurrent hunting sessions
MAX_HUNTING_SESSIONS=1

# Max concurrent raid sessions
MAX_RAID_SESSIONS=1
```

### Notifications & Alerts

```bash
# Enable email notifications
EMAIL_NOTIFICATIONS_ENABLED=false

# SMTP server
SMTP_HOST=smtp.gmail.com

# SMTP port
SMTP_PORT=587

# SMTP username
SMTP_USERNAME=your_email@gmail.com

# SMTP password
SMTP_PASSWORD=your_app_password

# Alert recipients (comma-separated)
ALERT_EMAIL_RECIPIENTS=admin@example.com

# Alert thresholds
ALERT_CPU_THRESHOLD=80
ALERT_MEMORY_THRESHOLD=85
ALERT_TEMPERATURE_THRESHOLD=75
ALERT_BATTERY_THRESHOLD=20
```

### Advanced Settings

```bash
# Enable experimental features
EXPERIMENTAL_FEATURES=false

# Binary paths
BETTERCAP_PATH=/usr/bin/bettercap
NMAP_PATH=/usr/bin/nmap
HASHCAT_PATH=/usr/bin/hashcat

# Wordlist paths (comma-separated)
WORDLIST_PATHS=/usr/share/wordlists/rockyou.txt

# GPU acceleration
GPU_ACCELERATION_ENABLED=false
GPU_DEVICE_ID=0
```

## Configuration Files

### Hardware Configuration

Edit `server/hardware/hardware-manager.ts` to customize hardware settings:

```typescript
export const ELEGOO_TFT_CONFIG: DisplayConfig = {
  width: 320,
  height: 240,
  spiDevice: "/dev/spidev0.0",
  gpioReset: 17,
  gpioBacklight: 18,
  touchEnabled: true,
};

export const UPS_HAT_CONFIG: PowerConfig = {
  i2cBus: 1,
  i2cAddress: 0x36,
  checkInterval: 5000,
};
```

### RFID Configuration

Edit `server/rfid/rfid-manager.ts` to configure RFID modules:

```typescript
export const DEFAULT_RFID_CONFIG: RFIDConfig = {
  pn532Enabled: true,
  pn532Interface: "i2c",
  pn532I2CAddress: 0x24,
  pn532I2CBus: 1,
  rdm6300Enabled: true,
  rdm6300Port: "/dev/ttyUSB0",
  rdm6300Baudrate: 9600,
};
```

### Database Schema

The database schema is defined in `drizzle/schema.ts`. To make changes:

1. Edit the schema in `drizzle/schema.ts`
2. Generate migration: `pnpm drizzle-kit generate`
3. Apply migration: `pnpm drizzle-kit migrate`

## Systemd Service Configuration

The systemd service is configured in `/etc/systemd/system/savage.service`:

```ini
[Unit]
Description=SAVAGE Cybersecurity Framework
After=network.target mysql.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/savage-framework
Environment="NODE_ENV=production"
Environment="PORT=3000"
ExecStart=/usr/bin/node /home/pi/savage-framework/dist/index.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=savage

[Install]
WantedBy=multi-user.target
```

To modify service settings:

```bash
# Edit service file
sudo nano /etc/systemd/system/savage.service

# Reload systemd
sudo systemctl daemon-reload

# Restart service
sudo systemctl restart savage
```

## Nginx Reverse Proxy Configuration

The Nginx configuration is located at `/etc/nginx/sites-available/savage-framework`:

```nginx
upstream savage_backend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    listen [::]:80;
    server_name _;

    client_max_body_size 100M;

    location / {
        proxy_pass http://savage_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }

    location /ws {
        proxy_pass http://savage_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

To modify Nginx configuration:

```bash
# Edit configuration
sudo nano /etc/nginx/sites-available/savage-framework

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Firewall Configuration

The firewall is configured during installation. To modify:

```bash
# Check firewall status
sudo ufw status

# Allow additional ports
sudo ufw allow 8080/tcp

# Deny ports
sudo ufw deny 9000/tcp

# Reload firewall
sudo ufw reload
```

## Performance Tuning

### Reduce Memory Usage

1. Disable unused RFID modules in `.env`
2. Limit metrics retention to 7 days
3. Use lightweight scan profiles

### Improve Battery Life

1. Reduce display brightness
2. Disable backlight during idle
3. Use lower AI aggression levels
4. Implement sleep mode

### Accelerate Handshake Cracking

1. Enable GPU acceleration (if available)
2. Use optimized wordlists
3. Implement distributed cracking via wpa-sec

## Security Hardening

### Change Default Credentials

```bash
# Change Raspberry Pi password
passwd

# Change MySQL root password
mysql -u root
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;
```

### Enable SSL/TLS

```bash
# Generate self-signed certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/savage.key \
  -out /etc/ssl/certs/savage.crt

# Update .env
ENABLE_SSL=true
SSL_CERT_PATH=/etc/ssl/certs/savage.crt
SSL_KEY_PATH=/etc/ssl/private/savage.key
```

### Enable SSH Key Authentication

```bash
# Generate SSH key (on client)
ssh-keygen -t ed25519 -C "savage@example.com"

# Copy public key to Raspberry Pi
ssh-copy-id -i ~/.ssh/id_ed25519.pub pi@raspberrypi.local

# Disable password authentication
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no

# Restart SSH
sudo systemctl restart ssh
```

## Backup & Recovery

### Backup Configuration

```bash
# Backup .env file
cp /home/pi/savage-framework/.env /home/pi/savage-framework/.env.backup

# Backup database
mysqldump -u savage -p savage > /home/pi/savage-framework/backup.sql

# Backup project directory
tar -czf /home/pi/savage-framework-backup.tar.gz /home/pi/savage-framework
```

### Restore Configuration

```bash
# Restore .env file
cp /home/pi/savage-framework/.env.backup /home/pi/savage-framework/.env

# Restore database
mysql -u savage -p savage < /home/pi/savage-framework/backup.sql

# Restore project directory
tar -xzf /home/pi/savage-framework-backup.tar.gz -C /home/pi
```

## Troubleshooting Configuration

### Configuration Not Applied

1. Verify `.env` file exists and is readable
2. Check environment variable names match exactly
3. Restart service: `sudo systemctl restart savage`
4. Check logs: `sudo journalctl -u savage -f`

### Hardware Not Detected

1. Verify interfaces are enabled: `sudo raspi-config`
2. Check device connections: `i2cdetect -y 1`, `gpio readall`
3. Review hardware configuration in code
4. Check logs for initialization errors

### Performance Issues

1. Monitor system metrics: `htop`, `free -h`, `vcgencmd measure_temp`
2. Check disk space: `df -h`
3. Review log files for errors
4. Adjust configuration for lower resource usage

---

**Last Updated**: February 2026
**Version**: 1.0
