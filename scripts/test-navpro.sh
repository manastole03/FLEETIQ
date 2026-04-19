#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# FleetIQ — NavPro API Live Connection Test
# Usage: bash scripts/test-navpro.sh
# ─────────────────────────────────────────────────────────────────────────────

BASE="https://api.truckerpath.com/navpro"

# Load token from .env
JWT=$(grep TRUCKERPATH_API_KEY .env 2>/dev/null | cut -d'"' -f2)
if [ -z "$JWT" ]; then
  echo "❌ TRUCKERPATH_API_KEY not found in .env"
  exit 1
fi

echo "────────────────────────────────────────────"
echo "  FleetIQ — NavPro API Test"
echo "  Base URL: $BASE"
echo "  Token: ${JWT:0:40}..."
echo "────────────────────────────────────────────"
echo ""

# ── 1. Driver Query ──────────────────────────────────────────────────────────
echo "1️⃣  POST /api/driver/query"
RESPONSE=$(curl -s \
  --max-time 10 \
  --connect-timeout 5 \
  -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$BASE/api/driver/query" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"driver_status":"ACTIVE","page":0,"size":10}' 2>&1)

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_STATUS")

echo "Status: $HTTP_STATUS"
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
echo ""

# ── 2. Vehicle Query ─────────────────────────────────────────────────────────
echo "2️⃣  POST /api/vehicle/query"
RESPONSE=$(curl -s \
  --max-time 10 \
  --connect-timeout 5 \
  -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$BASE/api/vehicle/query" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"status":"ACTIVE","vehicle_type":"TRUCK","page":0,"size":10}' 2>&1)

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_STATUS")

echo "Status: $HTTP_STATUS"
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
echo ""

echo "────────────────────────────────────────────"
echo "Results:"
echo "  200 → API connected, data returned ✅"
echo "  000 → Cannot reach server (no network / firewall)"
echo "  401 → JWT token expired or invalid"
echo "  403 → Account lacks permission for this endpoint"
echo "────────────────────────────────────────────"
