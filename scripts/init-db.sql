-- Database initialization script
-- This runs when PostgreSQL container starts for the first time

-- Create additional extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create additional indexes for better performance (after Prisma migrations)
-- These will be created by Prisma, but good to have as backup

-- Ensure database is properly configured
ALTER DATABASE gmail_assistant SET timezone TO 'UTC';

-- Create a read-only user for reporting/analytics (optional)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'gmail_readonly') THEN
        CREATE USER gmail_readonly WITH PASSWORD 'readonly_pass_123';
        GRANT CONNECT ON DATABASE gmail_assistant TO gmail_readonly;
        GRANT USAGE ON SCHEMA public TO gmail_readonly;
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO gmail_readonly;
        -- Grant select on future tables
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO gmail_readonly;
    END IF;
END
$$;

-- Log initialization
INSERT INTO pg_stat_statements_reset();