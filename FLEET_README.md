# Fleet Inventory Management Application

A comprehensive, cloud-based fleet and inventory management system designed to streamline device tracking, vehicle assignments, subscription renewals, and fleet operations management.

## Features

### Core Modules

1. **Inventory Management**
   - Device and SIM card tracking
   - Bulk upload via Excel
   - Status tracking (Available, Assigned, Removed, Available for Transfer)
   - Ownership-based logic (Owned/Leasing)

2. **Vehicle Assignment**
   - Multiple job types: New Installation, Removal, Device Replacement, Transfer Installation
   - Automatic inventory updates
   - Platform tracking (Securepath, AVL View, etc.)
   - Comprehensive vehicle and device information

3. **Replacement Tracker**
   - Track device replacements with reason logging
   - Automatic inventory management based on ownership
   - Historical tracking

4. **Removal Tracker**
   - Track device removals
   - Automatic inventory status updates
   - Reason and remarks logging

5. **Platform Masterlist**
   - Live list of assigned trackers per platform
   - Auto-updated with installations/removals
   - Platform-specific Excel exports

6. **Pending Tasks**
   - Task management for installations, transfers, removals, rechecks, renewals
   - Priority-based tracking
   - Assignment to team members

7. **Subscription Renewals**
   - Certificate expiry tracking
   - SIM subscription management
   - Platform renewal tracking
   - Automatic status updates (Upcoming, Due, Overdue, Renewed)

8. **Client Management**
   - Complete client database
   - Installation history tracking
   - Contact information management

9. **Employee Login & Roles**
   - Role-based access control
   - Roles: Admin, Manager, Accounts, Support, Sales, Viewer
   - Activity logging

10. **Analytics Dashboard**
    - Installation metrics
    - Technician performance tracking
    - Location-based analytics
    - Client statistics

11. **Reporting & Exports**
    - Activity summary reports
    - Excel exports (inventory, masterlist, renewals)
    - PDF certificate generation (ITC)
    - Filtered data exports

12. **Job Scheduling**
    - Calendar-based job assignment
    - WhatsApp integration ready
    - Technician notifications

## Technology Stack

### Backend
- **Runtime**: Node.js 18
- **Framework**: Express.js
- **Database**: PostgreSQL 15
- **ORM**: Prisma
- **Authentication**: JWT
- **File Processing**: xlsx (Excel), pdfkit (PDF)

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI)
- **Charts**: Recharts
- **HTTP Client**: Axios
- **Routing**: React Router v6

### Deployment
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx (for frontend)
- **Database**: PostgreSQL (containerized)

## Quick Start with Docker

### Prerequisites
- Docker (version 20.10+)
- Docker Compose (version 2.0+)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd shivas-repository
   ```

2. **Configure environment variables**

   Backend (.env):
   ```bash
   cp backend/.env.example backend/.env
   ```
   Edit `backend/.env` and update the JWT_SECRET and other settings as needed.

   Frontend (.env):
   ```bash
   cp frontend/.env.example frontend/.env
   ```

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

   This will start:
   - PostgreSQL database on port 5432
   - Backend API on port 5000
   - Frontend application on port 3000

4. **Initialize the database**

   The database will be automatically migrated and seeded on first run.

5. **Access the application**

   Open your browser and navigate to: `http://localhost:3000`

   **Default Login Credentials:**
   - Email: `admin@fleet.com`
   - Password: `admin123`

## Manual Installation (Without Docker)

### Backend Setup

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Set up PostgreSQL database**
   ```bash
   # Install PostgreSQL and create database
   createdb fleet_inventory
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Run migrations and seed**
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   npx prisma db seed
   ```

5. **Start the backend**
   ```bash
   npm run dev
   ```

   Backend will run on `http://localhost:5000`

### Frontend Setup

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env if needed (default: http://localhost:5000)
   ```

3. **Start the frontend**
   ```bash
   npm run dev
   ```

   Frontend will run on `http://localhost:3000`

## Project Structure

```
shivas-repository/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── seed.js             # Seed data
│   ├── routes/                 # API routes
│   │   ├── auth.js
│   │   ├── devices.js
│   │   ├── assignments.js
│   │   └── ...
│   ├── middleware/
│   │   └── auth.js             # Authentication middleware
│   ├── uploads/                # File upload directory
│   ├── certificates/           # Generated certificates
│   ├── server.js               # Express server
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable components
│   │   │   └── Layout.jsx
│   │   ├── context/            # React context
│   │   │   └── AuthContext.jsx
│   │   ├── pages/              # Page components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Devices.jsx
│   │   │   └── ...
│   │   ├── services/           # API services
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
├── docker-compose.yml
└── FLEET_README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password

### Devices
- `GET /api/devices` - List all devices
- `POST /api/devices` - Create device
- `PUT /api/devices/:id` - Update device
- `DELETE /api/devices/:id` - Delete device
- `GET /api/devices/available/list` - Get available devices

### SIMs
- `GET /api/sims` - List all SIMs
- `POST /api/sims` - Create SIM
- `PUT /api/sims/:id` - Update SIM
- `DELETE /api/sims/:id` - Delete SIM

### Assignments
- `GET /api/assignments` - List assignments
- `POST /api/assignments` - Create assignment
- `PUT /api/assignments/:id` - Update assignment
- `DELETE /api/assignments/:id` - Deactivate assignment
- `GET /api/assignments/platform/masterlist` - Get platform masterlist

### Renewals
- `GET /api/renewals` - List renewals
- `PUT /api/renewals/:id/renew` - Mark as renewed
- `POST /api/renewals/update-statuses` - Update renewal statuses

### Reports
- `GET /api/reports/activity-summary` - Activity summary report
- `GET /api/reports/export/inventory` - Export inventory
- `GET /api/reports/export/masterlist` - Export platform masterlist
- `POST /api/reports/generate-certificate` - Generate ITC certificate

### Uploads
- `POST /api/uploads/devices` - Bulk upload devices
- `POST /api/uploads/sims` - Bulk upload SIMs
- `GET /api/uploads/template/:type` - Download upload template

## User Roles & Permissions

| Feature | Admin | Manager | Accounts | Support | Sales | Viewer |
|---------|-------|---------|----------|---------|-------|--------|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Devices | ✓ | ✓ | - | ✓ | - | View Only |
| Assignments | ✓ | ✓ | - | ✓ | - | View Only |
| Renewals | ✓ | ✓ | ✓ | ✓ | - | View Only |
| Reports | ✓ | ✓ | ✓ | ✓ | ✓ | View Only |
| User Management | ✓ | ✓ | - | - | - | - |
| Settings | ✓ | ✓ | - | - | - | - |

## Database Schema

The application uses PostgreSQL with the following main entities:
- Users
- Devices
- SIMs
- Clients
- Vehicles
- VehicleAssignments
- Replacements
- Removals
- Renewals
- PendingTasks
- JobSchedules
- StaticData
- ActivityLogs

See `backend/prisma/schema.prisma` for the complete schema definition.

## Development

### Backend Development
```bash
cd backend
npm run dev          # Start with nodemon
npm run prisma:generate  # Regenerate Prisma client
npm run prisma:migrate   # Create new migration
```

### Frontend Development
```bash
cd frontend
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

## Production Deployment

### Using Docker Compose (Recommended)

1. **Update environment variables**
   - Set strong JWT_SECRET in backend/.env
   - Update database credentials
   - Configure WhatsApp API keys if using

2. **Build and deploy**
   ```bash
   docker-compose up -d --build
   ```

3. **Set up SSL/HTTPS (Recommended)**
   - Use a reverse proxy like Nginx or Traefik
   - Obtain SSL certificates (Let's Encrypt)

4. **Configure backups**
   - Set up automated PostgreSQL backups
   - Back up the uploads and certificates directories

### Cloud Deployment Options

#### AWS
- Deploy on EC2 with Docker
- Use RDS for PostgreSQL
- Use S3 for file storage
- Use CloudFront for CDN

#### Azure
- Deploy on Azure Container Instances
- Use Azure Database for PostgreSQL
- Use Azure Blob Storage for files

#### Google Cloud
- Deploy on Cloud Run
- Use Cloud SQL for PostgreSQL
- Use Cloud Storage for files

## Bulk Upload Format

### Device Upload Template
Excel columns: `Model`, `IMEI`, `Serial Number`, `Ownership`

### SIM Upload Template
Excel columns: `Brand`, `SIM Number`, `Serial Number`, `Ownership`

Download templates from the application's upload dialogs.

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
docker-compose ps

# View logs
docker-compose logs postgres

# Restart services
docker-compose restart
```

### Frontend Not Loading
```bash
# Check backend is running
curl http://localhost:5000/health

# View frontend logs
docker-compose logs frontend

# Rebuild frontend
docker-compose up -d --build frontend
```

### Permission Issues
```bash
# Fix file permissions
sudo chmod -R 755 backend/uploads backend/certificates
```

## Security Considerations

1. **Change default credentials** immediately after first login
2. **Use strong JWT secrets** in production
3. **Enable HTTPS** for production deployments
4. **Regular database backups**
5. **Keep dependencies updated**
6. **Use environment variables** for sensitive data
7. **Implement rate limiting** for API endpoints
8. **Regular security audits**

## Future Enhancements

- WhatsApp Business API integration for notifications
- Mobile app (React Native)
- Real-time tracking integration
- Advanced analytics and reporting
- Multi-language support
- Automated renewal reminders
- Integration with accounting software
- API documentation with Swagger

## Support

For issues, questions, or contributions, please refer to the project repository.

## License

MIT License - see LICENSE file for details

## Credits

Developed for fleet and inventory management operations, replacing manual Excel-based workflows with a modern, cloud-based solution.
