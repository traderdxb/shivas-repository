# Fleet Inventory Management - Deployment Guide

This guide provides detailed instructions for deploying the Fleet Inventory Management Application.

## Quick Deployment with Docker

### Prerequisites
- Docker 20.10+ installed
- Docker Compose 2.0+ installed
- 2GB+ RAM available
- 10GB+ disk space

### Steps

1. **Clone and Navigate**
   ```bash
   git clone <your-repo-url>
   cd shivas-repository
   ```

2. **Environment Configuration**
   ```bash
   # Backend
   cp backend/.env.example backend/.env

   # Frontend
   cp frontend/.env.example frontend/.env
   ```

3. **Start Services**
   ```bash
   docker-compose up -d
   ```

4. **Access Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Database: localhost:5432

5. **Default Credentials**
   - Email: admin@fleet.com
   - Password: admin123

## Production Deployment

### Environment Variables

#### Backend (.env)
```env
# Database
DATABASE_URL="postgresql://fleetuser:YOUR_STRONG_PASSWORD@localhost:5432/fleet_inventory"

# JWT Secret (Generate strong secret)
JWT_SECRET="your-super-secret-jwt-key-min-32-characters"

# Server
PORT=5000
NODE_ENV=production

# WhatsApp API (Optional)
WHATSAPP_API_KEY=""
WHATSAPP_PHONE_NUMBER=""

# File Upload
MAX_FILE_SIZE=10485760
```

#### Frontend (.env)
```env
VITE_API_URL=https://your-domain.com/api
```

### Security Checklist

- [ ] Change default admin password
- [ ] Generate strong JWT_SECRET (min 32 characters)
- [ ] Update database credentials
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Set up automated backups
- [ ] Enable rate limiting
- [ ] Review CORS settings
- [ ] Update all default credentials

### SSL/HTTPS Setup

#### Using Nginx Reverse Proxy

1. **Install Nginx**
   ```bash
   sudo apt update
   sudo apt install nginx certbot python3-certbot-nginx
   ```

2. **Create Nginx Configuration**
   ```bash
   sudo nano /etc/nginx/sites-available/fleet-app
   ```

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
           proxy_cache_bypass $http_upgrade;
       }

       location /api {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Enable Site**
   ```bash
   sudo ln -s /etc/nginx/sites-available/fleet-app /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **Get SSL Certificate**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

### Database Backup

#### Automated Backup Script

Create `/home/user/backup-fleet-db.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/home/user/backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="fleet_inventory_$DATE.sql"

mkdir -p $BACKUP_DIR

docker exec fleet-db pg_dump -U fleetuser fleet_inventory > "$BACKUP_DIR/$FILENAME"

# Compress backup
gzip "$BACKUP_DIR/$FILENAME"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "fleet_inventory_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $FILENAME.gz"
```

#### Setup Cron Job

```bash
chmod +x /home/user/backup-fleet-db.sh
crontab -e
```

Add line:
```
0 2 * * * /home/user/backup-fleet-db.sh >> /home/user/backup.log 2>&1
```

### Monitoring

#### Health Check Endpoint

The backend provides a health check endpoint:
```bash
curl http://localhost:5000/health
```

#### Docker Container Monitoring

```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Monitor resources
docker stats
```

### Scaling

#### Horizontal Scaling

For high-traffic deployments:

1. **Load Balancer Setup**
   - Use Nginx or HAProxy
   - Run multiple backend instances
   - Sticky sessions for WebSocket support

2. **Database Optimization**
   - Use connection pooling
   - Set up read replicas
   - Implement caching (Redis)

3. **File Storage**
   - Move to cloud storage (S3, Azure Blob)
   - Use CDN for static assets

### Cloud Platform Deployment

#### AWS Deployment

1. **EC2 Instance**
   - Launch Ubuntu 22.04 instance (t3.medium or larger)
   - Configure security groups (ports 22, 80, 443)
   - Allocate Elastic IP

2. **RDS for Database**
   - Create PostgreSQL 15 instance
   - Configure security group for EC2 access
   - Update DATABASE_URL in backend/.env

3. **S3 for File Storage**
   - Create S3 bucket
   - Configure IAM roles
   - Update upload routes to use S3

4. **CloudFront CDN**
   - Create distribution
   - Point to S3 bucket
   - Configure caching rules

#### Azure Deployment

1. **Azure Container Instances**
   - Create resource group
   - Deploy containers
   - Configure networking

2. **Azure Database for PostgreSQL**
   - Create database server
   - Configure firewall rules
   - Update connection strings

3. **Azure Blob Storage**
   - Create storage account
   - Configure access policies
   - Update upload configuration

#### Google Cloud Platform

1. **Cloud Run**
   - Build container images
   - Deploy to Cloud Run
   - Configure environment variables

2. **Cloud SQL**
   - Create PostgreSQL instance
   - Configure connections
   - Update DATABASE_URL

3. **Cloud Storage**
   - Create buckets
   - Configure IAM
   - Update storage configuration

### Updating the Application

#### Pull Latest Changes

```bash
cd shivas-repository
git pull origin main
```

#### Rebuild and Restart

```bash
docker-compose down
docker-compose up -d --build
```

#### Database Migrations

```bash
docker exec -it fleet-backend npx prisma migrate deploy
```

### Troubleshooting

#### Container Won't Start

```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Verify environment variables
docker-compose config

# Restart specific service
docker-compose restart backend
```

#### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Test connection
docker exec -it fleet-db psql -U fleetuser -d fleet_inventory

# View database logs
docker-compose logs postgres
```

#### Port Already in Use

```bash
# Find process using port
sudo lsof -i :3000
sudo lsof -i :5000

# Kill process or change ports in docker-compose.yml
```

#### Out of Disk Space

```bash
# Clean up Docker
docker system prune -a

# Remove old backups
find /home/user/backups -mtime +30 -delete

# Check disk usage
df -h
du -sh /*
```

### Performance Optimization

#### Backend Optimization

1. **Enable Compression**
   Add to server.js:
   ```javascript
   import compression from 'compression';
   app.use(compression());
   ```

2. **Database Indexing**
   - Index frequently queried fields
   - Use connection pooling
   - Optimize slow queries

3. **Caching**
   - Implement Redis for session storage
   - Cache static data responses
   - Use HTTP caching headers

#### Frontend Optimization

1. **Build Optimization**
   ```bash
   cd frontend
   npm run build
   ```

2. **Enable Compression in Nginx**
   ```nginx
   gzip on;
   gzip_types text/plain text/css application/json application/javascript;
   gzip_min_length 1000;
   ```

3. **Browser Caching**
   ```nginx
   location /assets/ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

### Maintenance Tasks

#### Weekly
- Review application logs
- Check disk space
- Verify backups are running
- Monitor error rates

#### Monthly
- Update dependencies
- Review security patches
- Test backup restoration
- Analyze performance metrics

#### Quarterly
- Full security audit
- Database optimization
- User access review
- Documentation updates

### Support and Monitoring Tools

#### Recommended Tools

1. **Monitoring**
   - Prometheus + Grafana
   - New Relic
   - DataDog

2. **Logging**
   - ELK Stack (Elasticsearch, Logstash, Kibana)
   - Papertrail
   - Loggly

3. **Error Tracking**
   - Sentry
   - Rollbar
   - Bugsnag

4. **Uptime Monitoring**
   - UptimeRobot
   - Pingdom
   - StatusCake

### Emergency Procedures

#### Database Restoration

```bash
# Stop application
docker-compose down

# Restore from backup
gunzip < /home/user/backups/fleet_inventory_20240101_020000.sql.gz | \
docker exec -i fleet-db psql -U fleetuser fleet_inventory

# Restart application
docker-compose up -d
```

#### Rollback Deployment

```bash
# Checkout previous version
git log --oneline
git checkout <previous-commit-hash>

# Rebuild and deploy
docker-compose down
docker-compose up -d --build
```

## Getting Help

For deployment issues or questions:
1. Check logs: `docker-compose logs`
2. Review FLEET_README.md
3. Check GitHub issues
4. Contact system administrator

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
