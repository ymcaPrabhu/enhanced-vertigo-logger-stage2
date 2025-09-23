#!/bin/bash
# test-features-stage1.sh - Comprehensive Stage 1 feature testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="http://localhost:3000"
PASSED=0
FAILED=0

# Function to run test
run_test() {
    local test_name="$1"
    local test_command="$2"

    echo -e "${YELLOW}Testing: $test_name${NC}"

    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASSED: $test_name${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAILED: $test_name${NC}"
        ((FAILED++))
    fi
    echo ""
}

echo -e "${BLUE}🧪 Testing Stage 1 MVP Features...${NC}"
echo ""

# Test 1: Database Connection
run_test "Database Connection" "sqlite3 vertigo.db 'SELECT COUNT(*) FROM episodes;' > /dev/null"

# Test 2: Database Schema
run_test "Database Schema" "sqlite3 vertigo.db '.schema episodes' | grep -q 'CREATE TABLE episodes'"

# Test 3: Test Data
run_test "Test Data Exists" "sqlite3 vertigo.db 'SELECT COUNT(*) FROM episodes;' | grep -v '^0$' > /dev/null"

# Start server for API tests
echo -e "${YELLOW}🚀 Starting server for API tests...${NC}"
./target/release/vertigo-logger &
SERVER_PID=$!
sleep 3

# Test 4: Server Health
run_test "Server Health Check" "curl -f $BASE_URL/health > /dev/null 2>&1"

# Test 5: Static Files
run_test "Web Interface Serving" "curl -f $BASE_URL/ | grep -q 'Vertigo Episode Logger'"

# Test 6: API - Get Episodes
run_test "API - Get Episodes" "curl -f $BASE_URL/api/episodes > /dev/null 2>&1"

# Test 7: API - Create Episode
run_test "API - Create Episode" "curl -f -X POST $BASE_URL/api/episodes -H 'Content-Type: application/json' -d '{\"severity\":3,\"symptoms\":\"Test dizziness\",\"duration_minutes\":15}' > /dev/null 2>&1"

# Test 8: API - AI Analysis
run_test "API - AI Analysis" "curl -f -X POST $BASE_URL/api/analyze -H 'Content-Type: application/json' -d '{\"symptoms\":\"severe dizziness and nausea\",\"severity\":4}' | grep -q 'analysis'"

# Test 9: API - Export Data
run_test "API - Export CSV" "curl -f $BASE_URL/api/export | grep -q 'ID,Timestamp'"

# Test 10: Memory Usage Check
run_test "Memory Usage < 100MB" "ps aux | grep vertigo-logger | grep -v grep | awk '{print \$4}' | awk '{if(\$1 < 10.0) exit 0; else exit 1}'"

# Test 11: Response Time Check
run_test "Response Time < 1s" "time curl -f $BASE_URL/health 2>&1 | grep -q 'real.*0m0'"

# Clean up
echo -e "${YELLOW}🧹 Cleaning up test server...${NC}"
kill $SERVER_PID 2>/dev/null || true
sleep 2

# Results Summary
echo "===================="
echo -e "${GREEN}PASSED: $PASSED${NC}"
echo -e "${RED}FAILED: $FAILED${NC}"
echo "===================="

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All Stage 1 features validated successfully!${NC}"
    exit 0
else
    echo -e "${RED}💥 $FAILED feature test(s) failed!${NC}"
    exit 1
fi