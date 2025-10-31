#!/bin/bash

# Railway Deployment Test Script
# This script tests if your Railway deployment is working correctly

echo "🧪 Fleet Inventory - Deployment Test Suite"
echo "==========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get URLs from user
echo "📋 Please provide your Railway URLs:"
echo ""
read -p "Frontend URL (e.g., https://fleet-frontend-production-xxxx.railway.app): " FRONTEND_URL
read -p "Backend URL (e.g., https://fleet-backend-production-xxxx.railway.app): " BACKEND_URL

echo ""
echo "🔍 Testing deployment..."
echo ""

# Test 1: Backend Health Check
echo -n "Test 1: Backend Health Check... "
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health" 2>/dev/null)
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $HEALTH_RESPONSE)"
else
    echo -e "${RED}✗ FAIL${NC} (HTTP $HEALTH_RESPONSE)"
    echo "   Backend health endpoint is not responding correctly"
fi

# Test 2: Backend API Available
echo -n "Test 2: Backend API Reachable... "
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/static-data" 2>/dev/null)
if [ "$API_RESPONSE" = "200" ] || [ "$API_RESPONSE" = "401" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $API_RESPONSE - API responding)"
else
    echo -e "${RED}✗ FAIL${NC} (HTTP $API_RESPONSE)"
    echo "   Backend API is not reachable"
fi

# Test 3: Frontend Loading
echo -n "Test 3: Frontend Loads... "
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" 2>/dev/null)
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $FRONTEND_RESPONSE)"
else
    echo -e "${RED}✗ FAIL${NC} (HTTP $FRONTEND_RESPONSE)"
    echo "   Frontend is not loading correctly"
fi

# Test 4: Frontend Contains React App
echo -n "Test 4: Frontend Contains App... "
FRONTEND_CONTENT=$(curl -s "$FRONTEND_URL" 2>/dev/null | grep -o "root" | head -1)
if [ "$FRONTEND_CONTENT" = "root" ]; then
    echo -e "${GREEN}✓ PASS${NC} (React app detected)"
else
    echo -e "${YELLOW}⚠ WARNING${NC} (Could not detect React app)"
fi

# Test 5: HTTPS Enabled
echo -n "Test 5: HTTPS Enabled... "
if [[ $FRONTEND_URL == https://* ]] && [[ $BACKEND_URL == https://* ]]; then
    echo -e "${GREEN}✓ PASS${NC} (Both URLs use HTTPS)"
else
    echo -e "${YELLOW}⚠ WARNING${NC} (URLs should use HTTPS)"
fi

# Test 6: Backend Static Data Available
echo -n "Test 6: Database Connected... "
STATIC_DATA=$(curl -s "$BACKEND_URL/api/static-data/device_model" 2>/dev/null)
if [[ $STATIC_DATA == *"Teltonika"* ]]; then
    echo -e "${GREEN}✓ PASS${NC} (Database seeded correctly)"
elif [[ $STATIC_DATA == *"error"* ]]; then
    echo -e "${RED}✗ FAIL${NC} (Database error)"
else
    echo -e "${YELLOW}⚠ WARNING${NC} (Could not verify database)"
fi

# Test 7: CORS Configuration
echo -n "Test 7: CORS Configuration... "
CORS_RESPONSE=$(curl -s -H "Origin: $FRONTEND_URL" -I "$BACKEND_URL/health" 2>/dev/null | grep -i "access-control-allow-origin")
if [ ! -z "$CORS_RESPONSE" ]; then
    echo -e "${GREEN}✓ PASS${NC} (CORS headers present)"
else
    echo -e "${YELLOW}⚠ WARNING${NC} (CORS headers not detected)"
fi

echo ""
echo "📊 Test Summary"
echo "==============="
echo ""

# Count tests
TOTAL_TESTS=7
echo "Total Tests: $TOTAL_TESTS"
echo ""

# Manual verification section
echo "🔍 Manual Verification Required:"
echo ""
echo "Please verify these items manually:"
echo ""
echo "1. Open $FRONTEND_URL in your browser"
echo "   [ ] Login page displays correctly"
echo "   [ ] No console errors (Press F12 → Console tab)"
echo ""
echo "2. Login with admin@fleet.com / admin123"
echo "   [ ] Login successful"
echo "   [ ] Dashboard loads with charts"
echo ""
echo "3. Test navigation"
echo "   [ ] Can access Devices page"
echo "   [ ] Can access Dashboard"
echo "   [ ] All menu items work"
echo ""
echo "4. Test basic operations"
echo "   [ ] Can view devices list"
echo "   [ ] Can click 'Add Device' button"
echo "   [ ] Forms load correctly"
echo ""

echo "🔗 Quick Links:"
echo "==============="
echo ""
echo "Frontend: $FRONTEND_URL"
echo "Backend API: $BACKEND_URL/api"
echo "Health Check: $BACKEND_URL/health"
echo "Login Credentials: admin@fleet.com / admin123"
echo ""

echo "📚 Next Steps:"
echo "=============="
echo ""
echo "If all tests pass:"
echo "1. ✓ Change admin password immediately"
echo "2. ✓ Add your first device"
echo "3. ✓ Create user accounts for your team"
echo "4. ✓ Start importing your inventory data"
echo ""
echo "If any tests fail:"
echo "1. Check Railway deployment logs"
echo "2. Verify environment variables are set correctly"
echo "3. See RAILWAY_DEPLOY.md for troubleshooting"
echo "4. Check DEPLOYMENT_CHECKLIST.md"
echo ""

echo "🎉 Testing complete!"
echo ""
