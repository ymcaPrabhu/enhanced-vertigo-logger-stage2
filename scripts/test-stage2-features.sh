#!/bin/bash

# Stage 2 Feature Testing Script
# Tests all enhanced features added in Stage 2

echo "🧪 Testing Stage 2 Enhanced Features..."
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"
PASS_COUNT=0
FAIL_COUNT=0

# Test function
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="$3"
    local description="$4"

    echo -n "Testing: $description... "

    response=$(curl -s -w "%{http_code}" -o /tmp/test_response.json "$url")
    status_code="${response: -3}"

    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASSED${NC} ($status_code)"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo -e "${RED}❌ FAILED${NC} (Expected: $expected_status, Got: $status_code)"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
}

# Test Analytics Endpoints
echo -e "${BLUE}📊 Testing Analytics Features${NC}"
test_endpoint "analytics" "$BASE_URL/api/analytics" "200" "Analytics Data API"

# Verify analytics response structure
if curl -s "$BASE_URL/api/analytics" | grep -q "total_episodes"; then
    echo -e "Analytics Structure: ${GREEN}✅ PASSED${NC} (Contains total_episodes)"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "Analytics Structure: ${RED}❌ FAILED${NC} (Missing total_episodes)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

if curl -s "$BASE_URL/api/analytics" | grep -q "severity_distribution"; then
    echo -e "Analytics Structure: ${GREEN}✅ PASSED${NC} (Contains severity_distribution)"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "Analytics Structure: ${RED}❌ FAILED${NC} (Missing severity_distribution)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Test Pattern Analysis
echo
echo -e "${BLUE}🧠 Testing AI Pattern Analysis${NC}"
test_endpoint "patterns" "$BASE_URL/api/patterns" "200" "Pattern Analysis API"

# Verify pattern analysis structure
if curl -s "$BASE_URL/api/patterns" | grep -q "common_triggers"; then
    echo -e "Pattern Structure: ${GREEN}✅ PASSED${NC} (Contains common_triggers)"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "Pattern Structure: ${RED}❌ FAILED${NC} (Missing common_triggers)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

if curl -s "$BASE_URL/api/patterns" | grep -q "recommendations"; then
    echo -e "Pattern Structure: ${GREEN}✅ PASSED${NC} (Contains recommendations)"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "Pattern Structure: ${RED}❌ FAILED${NC} (Missing recommendations)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Test PDF Report Generation
echo
echo -e "${BLUE}📄 Testing PDF Report Generation${NC}"
test_endpoint "pdf_report" "$BASE_URL/api/report/pdf" "200" "PDF Medical Report"

# Check PDF headers
pdf_headers=$(curl -s -I "$BASE_URL/api/report/pdf")
if echo "$pdf_headers" | grep -q "content-type: application/pdf"; then
    echo -e "PDF Content Type: ${GREEN}✅ PASSED${NC} (application/pdf)"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "PDF Content Type: ${RED}❌ FAILED${NC} (Wrong content type)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

if echo "$pdf_headers" | grep -q "content-disposition: attachment"; then
    echo -e "PDF Download Header: ${GREEN}✅ PASSED${NC} (attachment disposition)"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "PDF Download Header: ${RED}❌ FAILED${NC} (Missing attachment)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Test PWA Features
echo
echo -e "${BLUE}📱 Testing PWA Features${NC}"
test_endpoint "manifest" "$BASE_URL/manifest.json" "200" "PWA Manifest"
test_endpoint "service_worker" "$BASE_URL/sw.js" "200" "Service Worker"

# Verify manifest structure
if curl -s "$BASE_URL/manifest.json" | grep -q '"name": "Vertigo Logger"'; then
    echo -e "Manifest Structure: ${GREEN}✅ PASSED${NC} (Contains app name)"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "Manifest Structure: ${RED}❌ FAILED${NC} (Missing app name)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

if curl -s "$BASE_URL/sw.js" | grep -q "CACHE_NAME"; then
    echo -e "Service Worker: ${GREEN}✅ PASSED${NC} (Contains cache logic)"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "Service Worker: ${RED}❌ FAILED${NC} (Missing cache logic)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Test Enhanced Web Interface
echo
echo -e "${BLUE}🌐 Testing Enhanced Web Interface${NC}"
test_endpoint "main_page" "$BASE_URL/" "200" "Main Application Page"

# Check for Chart.js inclusion
if curl -s "$BASE_URL/" | grep -q "chart.js"; then
    echo -e "Chart.js Integration: ${GREEN}✅ PASSED${NC} (Chart.js included)"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "Chart.js Integration: ${RED}❌ FAILED${NC} (Chart.js missing)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Check for analytics tab
if curl -s "$BASE_URL/" | grep -q "Analytics Dashboard"; then
    echo -e "Analytics Tab: ${GREEN}✅ PASSED${NC} (Analytics tab present)"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "Analytics Tab: ${RED}❌ FAILED${NC} (Analytics tab missing)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Test Existing Stage 1 Features (Regression Tests)
echo
echo -e "${BLUE}🔄 Testing Stage 1 Feature Compatibility${NC}"
test_endpoint "health" "$BASE_URL/health" "200" "Health Check"
test_endpoint "episodes" "$BASE_URL/api/episodes" "200" "Episodes API"
test_endpoint "csv_export" "$BASE_URL/api/export" "200" "CSV Export"

# Performance Test
echo
echo -e "${BLUE}⚡ Testing Performance${NC}"
start_time=$(date +%s%N)
curl -s "$BASE_URL/api/analytics" > /dev/null
end_time=$(date +%s%N)
duration=$((($end_time - $start_time) / 1000000))

if [ $duration -lt 100 ]; then
    echo -e "Analytics Response Time: ${GREEN}✅ PASSED${NC} (${duration}ms < 100ms)"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "Analytics Response Time: ${YELLOW}⚠ SLOW${NC} (${duration}ms > 100ms)"
fi

# Memory Usage Check
echo -n "Testing: Memory Usage... "
memory_usage=$(ps -o pid,vsz -p $(pgrep vertigo-logger) | tail -1 | awk '{print $2}')
memory_mb=$((memory_usage / 1024))

if [ $memory_mb -lt 50 ]; then
    echo -e "${GREEN}✅ PASSED${NC} (${memory_mb}MB < 50MB)"
    PASS_COUNT=$((PASS_COUNT + 1))
else
    echo -e "${YELLOW}⚠ HIGH${NC} (${memory_mb}MB > 50MB)"
fi

# Summary
echo
echo "================================================"
echo -e "${BLUE}📋 STAGE 2 TESTING SUMMARY${NC}"
echo "================================================"
echo -e "Total Tests: $((PASS_COUNT + FAIL_COUNT))"
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"

if [ $FAIL_COUNT -eq 0 ]; then
    echo
    echo -e "${GREEN}🎉 ALL STAGE 2 FEATURES WORKING PERFECTLY!${NC}"
    echo -e "${GREEN}✅ Ready for production deployment${NC}"
    exit 0
else
    echo
    echo -e "${RED}❌ Some tests failed. Please review and fix issues.${NC}"
    exit 1
fi