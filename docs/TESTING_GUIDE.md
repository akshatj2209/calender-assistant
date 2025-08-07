# Database Testing Guide

This guide walks you through testing the PostgreSQL database integration step by step.

## 🧪 Testing Overview

We'll test the database in this order:
1. **Database Connection** - PostgreSQL connectivity
2. **Prisma Setup** - Client generation and migrations
3. **Repository Layer** - CRUD operations
4. **Data Relationships** - Foreign keys and joins
5. **Performance** - Bulk operations and queries

## 🚀 Quick Start Testing

### Step 1: Start Database
```bash
# Option A: Using Docker (Recommended)
npm run docker:up

# Check if running
docker-compose ps

# View logs if needed
npm run docker:logs

# Option B: Use your local PostgreSQL
# Make sure PostgreSQL is running on port 5432
```

### Step 2: Setup Database
```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed with test data
npm run db:seed

# Verify with GUI (optional)
npm run db:studio
```

### Step 3: Run Database Tests
```bash
# Run comprehensive database tests
npm run db:test
```

## 📋 Manual Testing Steps

If you prefer to test manually, follow these steps:

### Test 1: Database Connection
```bash
# Test PostgreSQL connection
psql -h localhost -p 5432 -U gmail_app -d gmail_assistant

# Inside psql, run:
\dt  # List tables
\q   # Quit
```

**Expected Result**: Should list all Prisma-generated tables.

### Test 2: Prisma Client
```bash
# Generate client
npm run db:generate

# Push schema (alternative to migrate)
npm run db:push
```

**Expected Result**: No errors, client generated successfully.

### Test 3: Database GUI
```bash
# Open Prisma Studio
npm run db:studio

# Open browser: http://localhost:5555
```

**Expected Result**: Can see and browse database tables.

## 🔍 Understanding Test Results

The `npm run db:test` command will show results like:

```
🧪 Testing: Database Connection
✅ Database Connection - 45ms
   📡 Database connection successful

🧪 Testing: User Repository  
✅ User Repository - 123ms
   👤 Created user: abc123...
   ⚙️ Updated user config: def456...
   🧹 Cleaned up test user

📊 DATABASE TEST SUMMARY
========================
Total Tests: 7
✅ Passed: 7  
❌ Failed: 0
⏱️  Total Time: 892ms
📊 Success Rate: 100.0%

🎉 ALL TESTS PASSED!
```

## 🛠️ Common Issues & Solutions

### Issue 1: Connection Refused
```
Error: P1001: Can't reach database server at localhost:5432
```

**Solutions:**
```bash
# Check if database is running
docker-compose ps

# Start database if stopped
npm run docker:up

# Check logs for errors
npm run docker:logs

# For local PostgreSQL
sudo service postgresql status
sudo service postgresql start
```

### Issue 2: Authentication Failed
```
Error: P1002: Authentication failed against database server
```

**Solutions:**
1. Check `.env` file DATABASE_URL
2. Verify credentials in docker-compose.yml match .env
3. For Docker setup, use: `postgresql://gmail_app:dev_password_123@localhost:5432/gmail_assistant`

### Issue 3: Database Doesn't Exist
```
Error: P3014: Prisma cannot connect to the database
```

**Solutions:**
```bash
# Recreate database
npm run docker:down
npm run docker:up

# Wait for database to be ready
sleep 10

# Run migrations
npm run db:migrate
```

### Issue 4: Schema Out of Sync
```
Error: Schema drift detected
```

**Solutions:**
```bash
# Reset and recreate
npm run db:reset

# Or push current schema
npm run db:push
```

## 📊 Test Coverage

Our database tests cover:

### ✅ Core Functionality
- [x] Database connection
- [x] Table creation (migrations)
- [x] CRUD operations
- [x] Data validation
- [x] Relationships/joins

### ✅ Repository Pattern
- [x] User repository (create, read, update, delete)
- [x] Email repository (with search and filtering)
- [x] Calendar repository (with date queries)
- [x] Google tokens management
- [x] User configuration

### ✅ Data Integrity
- [x] Foreign key constraints
- [x] Unique constraints  
- [x] Data type validation
- [x] Required field validation
- [x] Relationship integrity

### ✅ Performance
- [x] Bulk operations
- [x] Search queries
- [x] Index usage
- [x] Connection pooling

## 🎯 Success Criteria

Tests are considered successful if:

1. **All tests pass** (100% success rate)
2. **Response times < 1000ms** for test suite
3. **No connection errors** 
4. **All relationships work** correctly
5. **Data persists** after operations
6. **Cleanup completes** without errors

## 🧹 Cleanup After Testing

```bash
# Stop database (keeps data)
npm run docker:down

# Remove everything including data
docker-compose down -v

# Remove Docker images (optional)
docker system prune
```

## 🔄 Continuous Testing

For ongoing development:

```bash
# Run tests whenever you change schema
npm run db:test

# Watch for changes and auto-test
npm run test:watch  # Will include DB tests
```

## 📈 Next Steps After Testing

Once all tests pass:

1. ✅ **Database is ready** for API integration
2. ✅ **Repository pattern working** correctly  
3. ✅ **Data relationships established**
4. ✅ **Performance acceptable**

You can proceed to:
- Integrate database with existing API routes
- Add authentication middleware
- Implement email processing with database
- Build frontend with real data

## 🔧 Advanced Testing

### Load Testing
```bash
# Test with more data
npm run db:seed  # Run multiple times

# Check performance
npm run db:test
```

### Manual SQL Testing
```bash
# Connect to database
psql -h localhost -p 5432 -U gmail_app -d gmail_assistant

# Test queries manually
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM email_records;
SELECT COUNT(*) FROM calendar_event_records;
```

### Backup Testing
```bash
# Test backup
docker exec gmail-assistant-db pg_dump -U gmail_app gmail_assistant > test-backup.sql

# Test restore
docker exec -i gmail-assistant-db psql -U gmail_app gmail_assistant < test-backup.sql
```

This comprehensive testing ensures your database layer is solid before integrating with the APIs! 🎉