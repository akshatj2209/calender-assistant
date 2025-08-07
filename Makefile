# Gmail Calendar Assistant - Development Makefile
# Automates Docker, database, and development workflows

.PHONY: help setup start stop restart clean dev test build status logs

# Default target
help:
	@echo "📋 Gmail Calendar Assistant - Available Commands"
	@echo "================================================="
	@echo ""
	@echo "🚀 Quick Start:"
	@echo "  make setup     - Complete setup (Docker + Database + Dependencies)"
	@echo "  make start     - Start all services"
	@echo "  make dev       - Start development environment"
	@echo ""
	@echo "🐳 Docker Management:"
	@echo "  make docker-up        - Start PostgreSQL container"
	@echo "  make docker-down      - Stop PostgreSQL container"
	@echo "  make docker-restart   - Restart PostgreSQL container"
	@echo "  make docker-logs      - View container logs"
	@echo "  make docker-clean     - Remove containers and volumes"
	@echo ""
	@echo "🗄️  Database Operations:"
	@echo "  make db-setup     - Initialize database (generate + migrate + seed)"
	@echo "  make db-generate  - Generate Prisma client"
	@echo "  make db-migrate   - Run database migrations"
	@echo "  make db-seed      - Seed database with sample data"
	@echo "  make db-reset     - Reset database (destructive)"
	@echo "  make db-studio    - Open Prisma Studio"
	@echo ""
	@echo "🧪 Testing:"
	@echo "  make test         - Run all tests"
	@echo "  make test-db      - Test database connection"
	@echo "  make test-api     - Test API integration"
	@echo ""
	@echo "🔧 Development:"
	@echo "  make install      - Install dependencies"
	@echo "  make build        - Build project"
	@echo "  make lint         - Run linter"
	@echo "  make typecheck    - Run TypeScript checks"
	@echo ""
	@echo "📊 Status:"
	@echo "  make status       - Show system status"
	@echo "  make logs         - Show application logs"

# 🚀 Quick Start Commands
setup: install docker-up wait db-setup
	@echo "✅ Setup complete! Run 'make dev' to start development"

start: docker-up wait db-generate dev-backend

dev: docker-up wait db-generate
	@echo "🚀 Starting development environment..."
	npm run dev

# 🐳 Docker Commands
docker-up:
	@echo "🐳 Starting PostgreSQL container..."
	docker-compose up -d
	@echo "✅ PostgreSQL container started"

docker-down:
	@echo "🛑 Stopping PostgreSQL container..."
	docker-compose down
	@echo "✅ PostgreSQL container stopped"

docker-restart: docker-down docker-up

docker-logs:
	@echo "📋 PostgreSQL container logs:"
	docker-compose logs -f postgres

docker-clean:
	@echo "🧹 Cleaning up Docker resources..."
	docker-compose down -v --remove-orphans
	docker system prune -f
	@echo "✅ Docker cleanup complete"

# 🗄️  Database Commands
db-setup: db-generate db-migrate db-seed
	@echo "✅ Database setup complete"

db-generate:
	@echo "🔧 Generating Prisma client..."
	npm run db:generate

db-migrate:
	@echo "📊 Running database migrations..."
	npm run db:migrate

db-seed:
	@echo "🌱 Seeding database..."
	npm run db:seed

db-reset:
	@echo "⚠️  Resetting database (this will delete all data)..."
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		npm run db:reset; \
		echo "✅ Database reset complete"; \
	else \
		echo "❌ Database reset cancelled"; \
	fi

db-studio:
	@echo "🎨 Opening Prisma Studio..."
	npm run db:studio

# 🧪 Testing Commands
test: test-db test-api
	@echo "✅ All tests completed"

test-db:
	@echo "🧪 Testing database connection..."
	npm run db:test

test-api:
	@echo "🧪 Testing API integration..."
	npm run api:test

test-full:
	@echo "🧪 Running full test suite..."
	npm run test:full

# 🔧 Development Commands
install:
	@echo "📦 Installing dependencies..."
	npm install
	@echo "✅ Dependencies installed"

build:
	@echo "🏗️  Building project..."
	npm run build

build-backend:
	@echo "🏗️  Building backend..."
	npm run build:backend

build-frontend:
	@echo "🏗️  Building frontend..."
	npm run build:frontend

dev-backend:
	@echo "🚀 Starting backend server..."
	npm run dev:backend

dev-frontend:
	@echo "🚀 Starting frontend server..."
	npm run dev:frontend

lint:
	@echo "🔍 Running linter..."
	npm run lint

lint-fix:
	@echo "🔧 Fixing linting issues..."
	npm run lint:fix

typecheck:
	@echo "🔍 Running TypeScript checks..."
	npm run typecheck

# 📊 Status and Monitoring
status:
	@echo "📊 System Status Check"
	@echo "======================"
	@echo ""
	@echo "🐳 Docker Status:"
	@docker-compose ps 2>/dev/null || echo "   Docker not running"
	@echo ""
	@echo "📦 Node Version:"
	@node --version 2>/dev/null || echo "   Node.js not installed"
	@echo ""
	@echo "🗄️  Database Status:"
	@npm run db:test 2>/dev/null || echo "   Database connection failed"

logs:
	@echo "📋 Application logs (last 50 lines):"
	@tail -n 50 ~/.npm/_logs/*.log 2>/dev/null || echo "No logs found"

# 🛠️  Utility Commands
wait:
	@echo "⏳ Waiting for services to start..."
	@powershell -Command "Start-Sleep -Seconds 3" 2>nul || timeout /t 3 /nobreak >nul

clean: docker-clean
	@echo "🧹 Cleaning up build artifacts..."
	@rm -rf node_modules/.cache
	@rm -rf dist
	@rm -rf .next
	@echo "✅ Cleanup complete"

# 🔄 Environment Management
env-check:
	@echo "🔍 Environment Check"
	@echo "==================="
	@echo ""
	@if [ ! -f .env ]; then \
		echo "❌ .env file not found"; \
		echo "💡 Copy .env.example to .env and configure it"; \
	else \
		echo "✅ .env file exists"; \
	fi

env-setup:
	@if [ ! -f .env ]; then \
		echo "📝 Creating .env from template..."; \
		cp .env.example .env; \
		echo "✅ .env file created from .env.example"; \
		echo "⚠️  Please edit .env with your configuration"; \
	else \
		echo "✅ .env file already exists"; \
	fi

# 🚨 Emergency Commands
emergency-stop:
	@echo "🚨 Emergency stop - killing all processes..."
	docker-compose down --remove-orphans
	pkill -f "tsx"
	pkill -f "next"
	@echo "🛑 All processes stopped"

emergency-reset: emergency-stop docker-clean
	@echo "🚨 Emergency reset - cleaning everything..."
	@rm -rf node_modules
	@echo "🔄 Run 'make setup' to reinitialize"

# 📈 Performance and Health Checks
health-check:
	@echo "🏥 Health Check"
	@echo "==============="
	@curl -s http://localhost:3001/health 2>/dev/null | jq '.' || echo "❌ Backend not responding"
	@curl -s http://localhost:3000 2>/dev/null > /dev/null && echo "✅ Frontend responding" || echo "❌ Frontend not responding"

# 📚 Documentation
docs:
	@echo "📚 Documentation Links"
	@echo "======================"
	@echo "Setup Guide: ./docs/DATABASE_SETUP.md"
	@echo "API Docs: ./docs/API_DATABASE_INTEGRATION.md"
	@echo "Troubleshooting: ./docs/TROUBLESHOOTING.md"