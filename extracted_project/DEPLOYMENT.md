# SAVAGE Framework - Deployment Guide

Production deployment guide for SAVAGE framework on Raspberry Pi Zero 2W.

## Pre-Deployment Checklist

Before deploying SAVAGE to production, verify:

- [ ] All hardware components are properly connected and tested
- [ ] System dependencies are installed and verified
- [ ] Environment variables are configured in `.env`
- [ ] Database is initialized and accessible
- [ ] SSL certificates are generated (if using HTTPS)
- [ ] Firewall rules are configured
- [ ] Systemd service is created and tested
- [ ] Nginx reverse proxy is configured
- [ ] Backups are in place
- [ ] Documentation is reviewed

## Installation Steps

### 1. Prepare Raspberry Pi

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Enable required interfaces
sudo raspi-config
# Enable: I2C, SPI, UART, Serial

# Reboot to apply changes
sudo reboot
```

### 2. Clone Repository

```bash
cd ~
git clone https://github.com/yourusername/savage-framework.git
cd savage-framework
```

### 3. Run Installation Script

```bash
# Make script executable
chmod +x install.sh

# Run installation (requires root)
sudo bash install.sh
```

The installation script will:
- Update system packages
- Install all dependencies
- Enable interfaces
- Build the project
- Configure systemd service
- Setup database
- Configure firewall

### 4. Configure Environment

```bash
# Copy environment template
cp docs/CONFIGURATION.md .env

# Edit configuration
nano .env

# Set required values:
# - DATABASE_URL
# - VITE_APP_ID
# - OAUTH_SERVER_URL
# - WPASEC_API_KEY (optional)
```

### 5. Initialize Database

```bash
# Generate migrations
pnpm drizzle-kit generate

# Apply migrations
pnpm drizzle-kit migrate

# Verify database
mysql -u savage -p -h localhost -D savage
SHOW TABLES;
```

### 6. Build Project

```bash
# Build application
pnpm run build

# Verify build
ls -la dist/
```

### 7. Start Service

```bash
# Start SAVAGE service
sudo systemctl start savage

# Verify service is running
sudo systemctl status savage

# Enable service to start on boot
sudo systemctl enable savage

# Check logs
sudo journalctl -u savage -f
```

### 8. Verify Deployment

```bash
# Check service status
sudo systemctl status savage

# Verify port is listening
sudo lsof -i :3000

# Test dashboard
curl http://localhost:3000

# Check logs for errors
sudo journalctl -u savage --lines=50
```

## Production Configuration

### Enable HTTPS/SSL

```bash
# Generate self-signed certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/savage.key \
  -out /etc/ssl/certs/savage.crt

# Update Nginx configuration
sudo nano /etc/nginx/sites-available/savage-framework

# Add SSL configuration:
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    
    ssl_certificate /etc/ssl/certs/savage.crt;
    ssl_certificate_key /etc/ssl/private/savage.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # ... rest of configuration
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name _;
    return 301 https://$host$request_uri;
}

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### Enable Firewall

```bash
# Check firewall status
sudo ufw status

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Deny other ports
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Enable firewall
sudo ufw enable
```

### Optimize Performance

```bash
# Edit .env for production
NODE_ENV=production
LOG_LEVEL=warn
METRICS_RETENTION_DAYS=7
ACTIVITY_LOG_RETENTION_DAYS=30

# Disable debug features
DEBUG=false
EXPERIMENTAL_FEATURES=false
REQUEST_LOGGING=false

# Optimize database
# Add indexes for frequently queried columns
# Tune MySQL configuration
```

### Configure Monitoring

```bash
# Install monitoring tools
sudo apt-get install -y htop iotop nethogs

# Setup log rotation
sudo nano /etc/logrotate.d/savage

# Add:
/home/pi/savage-framework/.manus-logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 pi pi
    sharedscripts
}

# Test log rotation
sudo logrotate -f /etc/logrotate.d/savage
```

## Backup & Recovery

### Automated Backups

```bash
# Create backup script
sudo nano /usr/local/bin/savage-backup.sh

#!/bin/bash
BACKUP_DIR="/home/pi/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup .env
cp /home/pi/savage-framework/.env $BACKUP_DIR/env_$DATE

# Backup database
mysqldump -u savage -p$(grep DATABASE_URL /home/pi/savage-framework/.env | cut -d: -f3 | cut -d@ -f1) \
  savage > $BACKUP_DIR/database_$DATE.sql

# Backup project
tar -czf $BACKUP_DIR/project_$DATE.tar.gz /home/pi/savage-framework

# Keep only last 7 days
find $BACKUP_DIR -mtime +7 -delete

# Make script executable
sudo chmod +x /usr/local/bin/savage-backup.sh

# Schedule daily backups
sudo crontab -e

# Add:
0 2 * * * /usr/local/bin/savage-backup.sh
```

### Manual Backup

```bash
# Backup configuration
cp /home/pi/savage-framework/.env /home/pi/savage-framework/.env.backup

# Backup database
mysqldump -u savage -p savage > /home/pi/savage-framework/backup.sql

# Backup entire project
tar -czf /home/pi/savage-framework-backup.tar.gz /home/pi/savage-framework
```

### Recovery Procedure

```bash
# Stop service
sudo systemctl stop savage

# Restore .env
cp /home/pi/savage-framework/.env.backup /home/pi/savage-framework/.env

# Restore database
mysql -u savage -p savage < /home/pi/savage-framework/backup.sql

# Restore project (if needed)
rm -rf /home/pi/savage-framework
tar -xzf /home/pi/savage-framework-backup.tar.gz -C /home/pi

# Restart service
sudo systemctl start savage
```

## Monitoring & Maintenance

### System Monitoring

```bash
# Monitor CPU and memory
watch -n 1 'top -b -n 1 | head -20'

# Monitor disk usage
watch -n 1 'df -h'

# Monitor network
sudo iftop

# Monitor processes
sudo iotop
```

### Service Monitoring

```bash
# Check service status
sudo systemctl status savage

# View recent logs
sudo journalctl -u savage --lines=100

# Follow logs in real-time
sudo journalctl -u savage -f

# Search for errors
sudo journalctl -u savage | grep ERROR
```

### Database Monitoring

```bash
# Check database size
mysql -u savage -p -e "SELECT table_name, ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb FROM information_schema.TABLES WHERE table_schema = 'savage';"

# Monitor active connections
mysql -u savage -p -e "SHOW PROCESSLIST;"

# Check slow queries
mysql -u savage -p -e "SHOW VARIABLES LIKE 'slow_query_log';"
```

### Regular Maintenance

```bash
# Weekly: Check disk space
df -h

# Weekly: Review logs for errors
sudo journalctl -u savage --since "1 week ago" | grep ERROR

# Monthly: Optimize database
mysql -u savage -p -e "OPTIMIZE TABLE handshakes, networks, services, vulnerabilities, credentials, raids, activity_log, device_status;"

# Monthly: Update system packages
sudo apt-get update
sudo apt-get upgrade -y

# Quarterly: Review and rotate backups
ls -lah /home/pi/backups/
```

## Troubleshooting Deployment

### Service Won't Start

```bash
# Check service status
sudo systemctl status savage

# View detailed logs
sudo journalctl -u savage -n 50

# Test application directly
cd /home/pi/savage-framework
npm run start

# Check for port conflicts
sudo lsof -i :3000
```

### Database Connection Failed

```bash
# Check MySQL status
sudo systemctl status mysql

# Test connection
mysql -u savage -p -h localhost -D savage

# Check credentials in .env
cat /home/pi/savage-framework/.env | grep DATABASE_URL

# Verify user permissions
mysql -u root -p
SHOW GRANTS FOR 'savage'@'localhost';
```

### High Resource Usage

```bash
# Monitor resource usage
top

# Check for memory leaks
ps aux --sort=-%mem

# Check for disk space issues
df -h

# Optimize configuration
# Edit .env and reduce retention periods
# Disable unused features
```

## Scaling & Performance

### Optimize for Raspberry Pi Zero 2W

```bash
# Reduce memory footprint
# 1. Disable unused RFID modules
# 2. Limit metrics retention
# 3. Reduce concurrent operations
# 4. Use lightweight scan profiles

# Improve battery life
# 1. Reduce display brightness
# 2. Disable backlight during idle
# 3. Use lower AI aggression
# 4. Implement sleep mode

# Accelerate operations
# 1. Use optimized wordlists
# 2. Enable GPU acceleration (if available)
# 3. Implement distributed cracking
```

### Database Optimization

```bash
# Add indexes
mysql -u savage -p -D savage << EOF
CREATE INDEX idx_handshake_ssid ON handshakes(ssid);
CREATE INDEX idx_network_bssid ON networks(bssid);
CREATE INDEX idx_service_host ON services(host_id);
CREATE INDEX idx_vulnerability_service ON vulnerabilities(service_id);
CREATE INDEX idx_credential_raid ON credentials(raid_id);
EOF

# Optimize tables
mysql -u savage -p -D savage << EOF
OPTIMIZE TABLE handshakes;
OPTIMIZE TABLE networks;
OPTIMIZE TABLE services;
OPTIMIZE TABLE vulnerabilities;
OPTIMIZE TABLE credentials;
OPTIMIZE TABLE raids;
OPTIMIZE TABLE activity_log;
OPTIMIZE TABLE device_status;
EOF
```

## Security Hardening

### Change Default Credentials

```bash
# Change Raspberry Pi password
passwd

# Change MySQL root password
mysql -u root
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;

# Change SAVAGE database user password
mysql -u root -p
ALTER USER 'savage'@'localhost' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;
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

### Setup Fail2Ban

```bash
# Install fail2ban
sudo apt-get install -y fail2ban

# Create SAVAGE jail
sudo nano /etc/fail2ban/jail.d/savage.conf

[savage]
enabled = true
port = http,https
filter = savage
logpath = ~/.manus-logs/devserver.log
maxretry = 5
findtime = 600
bantime = 3600

# Create filter
sudo nano /etc/fail2ban/filter.d/savage.conf

[Definition]
failregex = .*Unauthorized.*
            .*Authentication failed.*
ignoreregex =

# Restart fail2ban
sudo systemctl restart fail2ban
```

## Post-Deployment Verification

```bash
# Verify all services are running
sudo systemctl status savage
sudo systemctl status mysql
sudo systemctl status nginx

# Test dashboard access
curl -I http://localhost:3000

# Test API endpoints
curl -X POST http://localhost:3000/api/trpc/auth.me

# Check hardware
i2cdetect -y 1
gpio readall

# Monitor logs
sudo journalctl -u savage -f

# Verify backups
ls -la /home/pi/backups/
```

## Rollback Procedure

If deployment fails:

```bash
# Stop service
sudo systemctl stop savage

# Restore from backup
tar -xzf /home/pi/savage-framework-backup.tar.gz -C /home/pi

# Restore database
mysql -u savage -p savage < /home/pi/savage-framework/backup.sql

# Restart service
sudo systemctl start savage

# Verify
sudo systemctl status savage
```

---

**Last Updated**: February 2026
**Version**: 1.0
