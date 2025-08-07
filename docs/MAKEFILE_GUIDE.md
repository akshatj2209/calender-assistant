# Makefile Guide - Gmail Calendar Assistant

## 🚀 Quick Start

The Makefile provides automated commands for Docker, database, and development workflows.

### Complete Setup (First Time)
```bash
# Complete setup from scratch
make setup
```

This will:
1. Install dependencies (`npm install`)
2. Start PostgreSQL container (`docker-compose up -d`)
3. Generate Prisma client
4. Run database migrations
5. Seed database with sample data

### Start Development
```bash
# Start development environment
make dev
```

### Just Start Docker + Database
```bash
# If you only need to start Docker and database
make start
```

## 📋 Available Commands

### Quick Commands
| Command | Description |
|---------|-------------|
| `make help` | Show all available commands |
| `make setup` | Complete first-time setup |
| `make start` | Start Docker + Database |
| `make dev` | Start full development environment |
| `make status` | Show system status |

### Docker Management
| Command | Description |
|---------|-------------|
| `make docker-up` | Start PostgreSQL container |
| `make docker-down` | Stop PostgreSQL container |
| `make docker-restart` | Restart PostgreSQL |
| `make docker-logs` | View container logs |
| `make docker-clean` | Remove containers and volumes |

### Database Operations
| Command | Description |
|---------|-------------|
| `make db-setup` | Initialize database (generate + migrate + seed) |
| `make db-generate` | Generate Prisma client |
| `make db-migrate` | Run database migrations |
| `make db-seed` | Seed database with sample data |
| `make db-reset` | Reset database (destructive!) |
| `make db-studio` | Open Prisma Studio |

### Testing
| Command | Description |
|---------|-------------|
| `make test` | Run all tests |
| `make test-db` | Test database connection |
| `make test-api` | Test API integration |
| `make health-check` | Check service health |

### Development
| Command | Description |
|---------|-------------|
| `make install` | Install dependencies |
| `make build` | Build project |
| `make lint` | Run linter |
| `make typecheck` | Run TypeScript checks |

## 🛠️ Typical Workflows

### First-Time Setup
```bash
# Clone the repository
git clone <repo-url>
cd gmail-assistant

# Complete setup
make setup

# Start development
make dev
```

### Daily Development
```bash
# Start your day
make start

# Or start with frontend too
make dev
```

### Testing Your Changes
```bash
# Test database
make test-db

# Test API integration
make test-api

# Check health
make health-check
```

### Troubleshooting
```bash
# Check system status
make status

# View container logs
make docker-logs

# Emergency stop everything
make emergency-stop

# Complete reset (nuclear option)
make emergency-reset
```

## 🐳 Docker Requirements

Make sure you have Docker installed and running:

### Windows
- Install Docker Desktop
- Ensure it's running (Docker whale icon in system tray)

### macOS
- Install Docker Desktop
- Start Docker Desktop application

### Linux
- Install docker and docker-compose
- Start docker service: `sudo systemctl start docker`

## 📝 Environment Setup

The Makefile includes environment management:

```bash
# Check if .env exists
make env-check

# Create .env from template
make env-setup
```

## 🔧 Customization

You can customize the Makefile by editing these variables at the top:

```makefile
# Database settings
DB_NAME = gmail_assistant
DB_USER = postgres
DB_PASS = password
DB_PORT = 5432

# Server settings
API_PORT = 3001
FRONTEND_PORT = 3000
```

## ❓ Troubleshooting

### Port Already in Use
```bash
# Stop everything
make emergency-stop

# Try again
make start
```

### Database Connection Issues
```bash
# Check Docker status
make status

# View database logs
make docker-logs

# Reset database
make db-reset
```

### Permission Issues (Linux/macOS)
```bash
# Make sure Makefile is executable
chmod +x Makefile

# Run with sudo if needed
sudo make docker-up
```

### Windows-Specific Issues
- Make sure you're using a Unix-compatible terminal (Git Bash, WSL)
- Ensure Docker Desktop is running
- Use `mingw32-make` instead of `make` if needed

## 🎯 Pro Tips

1. **Always start with `make help`** to see available commands
2. **Use `make status`** to check what's running
3. **Run `make test`** before committing changes  
4. **Use `make emergency-stop`** if things get stuck
5. **Keep Docker Desktop running** during development

## 🚨 Emergency Commands

If something goes wrong:

```bash
# Stop everything
make emergency-stop

# Clean everything (nuclear option)
make emergency-reset

# Start fresh
make setup
```

## 📊 Health Monitoring

```bash
# Quick health check
make health-check

# Detailed status
make status

# View logs
make logs
```

This will show you:
- Docker container status
- Database connectivity
- API server status
- Frontend status

---

The Makefile makes it easy to manage the entire development lifecycle. Just run `make help` anytime to see what's available! 🎉