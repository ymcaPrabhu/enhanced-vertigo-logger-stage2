#!/bin/bash
# install-stage1.sh - One-click Stage 1 MVP installation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Installing Vertigo Logger Stage 1 MVP...${NC}"

# Function to check command success
check_success() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1 failed${NC}"
        exit 1
    fi
}

# 1. System Dependencies Check & Install
echo -e "${YELLOW}📦 Installing system dependencies...${NC}"
pkg update && pkg upgrade -y
check_success "Package update"

pkg install -y rust sqlite git curl
check_success "System dependencies installation"

# 2. Verify Rust Installation
echo -e "${YELLOW}🔍 Testing Rust installation...${NC}"
rustc --version > /dev/null 2>&1
check_success "Rust compiler verification"

cargo --version > /dev/null 2>&1
check_success "Cargo verification"

# 3. Build Project
echo -e "${YELLOW}🔨 Building project...${NC}"
cargo check
check_success "Dependency check"

cargo build --release
check_success "Release build"

# 4. Database Setup
echo -e "${YELLOW}🗄️ Setting up database...${NC}"
if [ ! -f "vertigo.db" ]; then
    sqlite3 vertigo.db < migrations/001_create_episodes.sql
    check_success "Database creation"
else
    echo -e "${GREEN}✅ Database already exists${NC}"
fi

# 5. Test database connection
echo -e "${YELLOW}🔬 Testing database...${NC}"
sqlite3 vertigo.db "SELECT COUNT(*) FROM episodes;" > /dev/null
check_success "Database connectivity test"

# 6. Feature Validation
echo -e "${YELLOW}🧪 Running feature tests...${NC}"
./scripts/test-features-stage1.sh
check_success "Feature validation"

# 7. Start Service in background for testing
echo -e "${YELLOW}🚀 Starting server for health check...${NC}"
./target/release/vertigo-logger &
SERVER_PID=$!

# Wait for server to start
sleep 5

# 8. Health Check
echo -e "${YELLOW}💓 Performing health check...${NC}"
curl -f http://localhost:3000/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Server health check passed${NC}"
else
    echo -e "${RED}❌ Server health check failed${NC}"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

# 9. API Test
echo -e "${YELLOW}🔌 Testing API endpoints...${NC}"
curl -f http://localhost:3000/api/episodes > /dev/null 2>&1
check_success "API endpoint test"

# Stop test server
kill $SERVER_PID 2>/dev/null || true
sleep 2

echo ""
echo -e "${GREEN}🎉 Stage 1 MVP installed successfully!${NC}"
echo ""
echo -e "${BLUE}To start the application:${NC}"
echo -e "  ${YELLOW}./target/release/vertigo-logger${NC}"
echo ""
echo -e "${BLUE}Then access:${NC}"
echo -e "  🌐 Web interface: ${YELLOW}http://localhost:3000${NC}"
echo -e "  🔌 API docs: ${YELLOW}http://localhost:3000/api/episodes${NC}"
echo ""
echo -e "${BLUE}To stop the application:${NC}"
echo -e "  ${YELLOW}Ctrl+C${NC}"
echo ""
echo -e "${GREEN}Installation complete! 🎊${NC}"