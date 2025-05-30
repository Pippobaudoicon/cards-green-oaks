# Production Deployment Guide

## For Ionos or other hosting providers

### 1. Upload files
Upload all project files to your server:
- server.js
- package.json
- public/ folder (with all contents)
- README.md

### 2. Install Node.js dependencies
```bash
npm install --production
```

### 3. Environment Configuration
Create a .env file (optional) or set environment variables:
```
PORT=3000
NODE_ENV=production
```

### 4. Start with PM2 (Recommended)
```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start server.js --name "italian-cards"

# Make it startup on boot
pm2 startup
pm2 save
```

### 5. Nginx Configuration (if using reverse proxy)
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 6. Firewall Configuration
Make sure to open the required port (default 3000) in your firewall:
```bash
# For Ubuntu/Debian
sudo ufw allow 3000

# For CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

### 7. SSL Certificate (Optional but recommended)
Use Let's Encrypt for free SSL:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Monitoring and Logs

### PM2 Commands
```bash
# View logs
pm2 logs italian-cards

# Monitor resource usage
pm2 monit

# Restart application
pm2 restart italian-cards

# Stop application
pm2 stop italian-cards

# Delete application from PM2
pm2 delete italian-cards
```

### Health Check
The application will log:
- Server start message with port
- User connections and disconnections
- Room creation and management

## Troubleshooting

### Common Issues:
1. **Port already in use**: Change PORT environment variable
2. **Permission denied**: Run with sudo or change to port > 1024
3. **Module not found**: Run `npm install`
4. **Socket.IO connection failed**: Check firewall and proxy settings

### Performance Tips:
- Use PM2 cluster mode for multiple CPU cores: `pm2 start server.js -i max`
- Enable gzip compression in Nginx
- Set up log rotation for PM2 logs
- Monitor memory usage and restart if needed
