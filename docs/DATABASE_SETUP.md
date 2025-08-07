# Database Setup Guide - PostgreSQL + Prisma

This guide will walk you through setting up PostgreSQL database for the Gmail Calendar Assistant using Prisma ORM.

## 🗄️ Overview

The application uses:
- **PostgreSQL** - Primary database
- **Prisma ORM** - Type-safe database client and migrations
- **Repository Pattern** - Clean data access layer
- **MVC Architecture** - Organized controller structure

## 📋 Prerequisites

- Node.js 18+ installed
- PostgreSQL 13+ installed and running

## 🚀 Quick Setup

### Option 1: Local PostgreSQL Installation

#### 1. Install PostgreSQL

**On Windows:**
1. Download from [PostgreSQL Official Site](https://www.postgresql.org/download/windows/)
2. Run installer and follow setup wizard
3. Remember the password you set for the `postgres` user
4. Default port is `5433`

**On Mac (using Homebrew):**
```bash
# Install PostgreSQL
brew install postgresql

# Start PostgreSQL service
brew services start postgresql

# Create a database user
createuser -s postgres
```

**On Ubuntu/Debian:**
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Switch to postgres user and create database
sudo -u postgres psql
```

#### 2. Create Database and User

Connect to PostgreSQL as admin:
```bash
# Connect as postgres user
psql -U postgres -h localhost
```

Create database and user:
```sql
-- Create database
CREATE DATABASE gmail_assistant;

-- Create user (optional - you can use postgres user)
CREATE USER gmail_app WITH PASSWORD 'secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE gmail_assistant TO gmail_app;

-- Connect to the database
\c gmail_assistant;

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO gmail_app;

-- Exit
\q
```

### Option 2: Docker PostgreSQL (Recommended for Development)

Create `docker-compose.yml` in project root:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    container_name: gmail-assistant-db
    environment:
      POSTGRES_DB: gmail_assistant
      POSTGRES_USER: gmail_app
      POSTGRES_PASSWORD: dev_password_123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

Start the database:
```bash
# Start PostgreSQL container
docker-compose up -d

# Check if running
docker-compose ps

# View logs (if needed)
docker-compose logs postgres
```

## ⚙️ Configuration

### 1. Environment Variables

Update your `.env` file:
```bash
# Copy example file
cp .env.example .env
```

Edit `.env` and update the database URL:
```env
# For local PostgreSQL
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/gmail_assistant?schema=public"

# For Docker setup
DATABASE_URL="postgresql://gmail_app:dev_password_123@localhost:5432/gmail_assistant?schema=public"

# For production (example)
DATABASE_URL="postgresql://user:password@your-db-host:5432/gmail_assistant?schema=public&sslmode=require"
```

### 2. Database Connection Format
```
postgresql://[USER[:PASSWORD]@][HOST][:PORT]/DATABASE[?schema=SCHEMA&other=params]
```

**Components:**
- `USER`: Database username
- `PASSWORD`: Database password  
- `HOST`: Database host (localhost for local)
- `PORT`: Database port (5432 default)
- `DATABASE`: Database name
- `schema`: PostgreSQL schema (public default)

## 🔧 Installation & Setup

### 1. Install Dependencies
```bash
# Install all dependencies including Prisma
npm install

# Install Prisma CLI globally (optional)
npm install -g prisma
```

### 2. Initialize Database

#### Generate Prisma Client
```bash
# Generate TypeScript client from schema
npm run db:generate

# Or using Prisma CLI directly
npx prisma generate
```

#### Run Migrations
```bash
# Create and apply migrations (development)
npm run db:migrate

# Or using Prisma CLI
npx prisma migrate dev --name init

# For production deployment
npm run db:deploy
```

#### Verify Setup
```bash
# Open Prisma Studio (database GUI)
npm run db:studio

# Or
npx prisma studio
```

Access Prisma Studio at: http://localhost:5555

### 3. Seed Database (Optional)
```bash
# Run seed script
npm run db:seed

# This will create:
# - Sample user
# - Default configuration
# - Test data (if NODE_ENV=development)
```

## 🏗️ Database Schema Overview

### Core Tables

#### `users`
- User accounts and authentication
- Links to Google OAuth tokens
- User-specific configuration

#### `google_tokens`
- Secure storage of OAuth tokens
- Automatic refresh token handling
- Token expiry tracking

#### `email_records`
- Processed email history
- AI analysis results
- Processing status tracking

#### `calendar_event_records`  
- Created calendar events
- Attendee management
- Event status tracking

#### `user_configs`
- Per-user business rules
- Custom scheduling preferences
- Email templates

#### `processing_metrics`
- Daily usage statistics
- Performance tracking
- Success/failure rates

#### `activity_logs`
- Audit trail
- Error tracking
- User actions

### Relationships
```
User (1) ←→ (1) GoogleTokens
User (1) ←→ (1) UserConfig
User (1) ←→ (*) EmailRecord
User (1) ←→ (*) CalendarEventRecord
User (1) ←→ (*) ProcessingMetrics
EmailRecord (1) ←→ (*) CalendarEventRecord
```

## 🔧 Maintenance Commands

### Development Workflow
```bash
# Reset database (WARNING: Deletes all data)
npm run db:reset

# Push schema changes without migration
npm run db:push

# View database in browser
npm run db:studio

# Generate new migration
npx prisma migrate dev --name your_migration_name
```

### Production Deployment
```bash
# Apply migrations to production
npm run db:deploy

# Generate client for production
npm run db:generate
```

### Backup & Restore
```bash
# Backup database
pg_dump -h localhost -U gmail_app -d gmail_assistant > backup.sql

# Restore database
psql -h localhost -U gmail_app -d gmail_assistant < backup.sql

# Using Docker
docker exec gmail-assistant-db pg_dump -U gmail_app gmail_assistant > backup.sql
docker exec -i gmail-assistant-db psql -U gmail_app gmail_assistant < backup.sql
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Connection Failed
```
Error: P1001: Can't reach database server at localhost:5432
```
**Solutions:**
- Check if PostgreSQL is running: `sudo service postgresql status`
- Verify port 5432 is not blocked
- Check DATABASE_URL format
- For Docker: `docker-compose ps`

#### 2. Authentication Failed
```
Error: P1002: Authentication failed against database server
```
**Solutions:**
- Verify username/password in DATABASE_URL
- Check user permissions in PostgreSQL
- Ensure user has access to the database

#### 3. Database Does Not Exist
```
Error: P1003: Database gmail_assistant does not exist
```
**Solutions:**
- Create database: `createdb gmail_assistant`
- Or use SQL: `CREATE DATABASE gmail_assistant;`

#### 4. Migration Failed
```
Error: P3009: migrate found failed migration
```
**Solutions:**
- Reset migrations: `npm run db:reset`
- Fix migration manually: `npx prisma migrate resolve --applied "migration_name"`
- Rollback: `npx prisma migrate resolve --rolled-back "migration_name"`

#### 5. Schema Out of Sync
```
Error: Schema drift detected
```
**Solutions:**
- Push changes: `npm run db:push`
- Create new migration: `npx prisma migrate dev`
- Reset and recreate: `npm run db:reset`

### Performance Optimization

#### 1. Database Indexes
The schema includes optimized indexes for:
- User lookups by email
- Gmail message ID searches  
- Date range queries
- Processing status filtering

#### 2. Connection Pooling
For production, configure connection pooling:
```env
DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public&connection_limit=20&pool_timeout=20"
```

#### 3. Query Optimization
- Use repository methods for complex queries
- Implement pagination for large datasets
- Use selective field queries when possible

## 📊 Monitoring

### Database Health Checks
```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('gmail_assistant'));

-- Check table sizes
SELECT schemaname,tablename,pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables WHERE schemaname='public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check active connections
SELECT count(*) FROM pg_stat_activity WHERE datname='gmail_assistant';

-- Check slow queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
WHERE query LIKE '%email_records%' 
ORDER BY mean_time DESC LIMIT 10;
```

### Application Metrics
Access via API endpoints:
- `GET /api/status` - Overall system health
- `GET /api/emails/stats?userId=xxx` - Email processing stats
- `GET /api/users/:id/stats` - User activity stats

## 🔐 Security Best Practices

### Database Security
1. **Use strong passwords** for database users
2. **Limit user permissions** to only required operations
3. **Enable SSL/TLS** for production connections
4. **Regular backups** with encryption
5. **Monitor access logs** for suspicious activity

### Application Security  
1. **Input validation** using Zod schemas
2. **SQL injection protection** via Prisma (automatic)
3. **Sensitive data encryption** for tokens
4. **Rate limiting** on database operations
5. **Audit logging** for all data changes

## 🚀 Next Steps

Once database setup is complete:

1. **Test Connection**: Run `npm run db:studio`
2. **Start Application**: `npm run dev`
3. **Verify APIs**: Check `/api/status` endpoint
4. **Run Tests**: `npm test` (if available)
5. **Monitor Logs**: Watch for database connection messages

The database is now ready to support the Gmail Calendar Assistant! 🎉