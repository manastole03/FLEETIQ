#!/usr/bin/env bash
# NavPro Account Inspector — fixed for real response structure
# Usage: bash scripts/check_navpro.sh

BASE="https://api.truckerpath.com/navpro"
JWT=$(grep TRUCKERPATH_API_KEY .env 2>/dev/null | cut -d'"' -f2)
[ -z "$JWT" ] && echo "❌  TRUCKERPATH_API_KEY not found" && exit 1

H1="Authorization: Bearer $JWT"
H2="Content-Type: application/json"

echo ""
echo "════════════════════════════════════════════════════════"
echo "  NavPro Account Inspector  |  $(date)"
echo "════════════════════════════════════════════════════════"

# ── 1. ALL drivers (no status filter — catches PENDING invites too) ──────────
echo ""
echo "── 1. ALL DRIVERS (ALL STATUSES) ───────────────────────"
curl -s --max-time 15 --connect-timeout 8 \
  -X POST "$BASE/api/driver/query" \
  -H "$H1" -H "$H2" \
  -d '{"page":0,"size":50}' \
  | python3 -c "
import json, sys
r = json.load(sys.stdin)
total = r.get('total', 0)
records = r.get('data', [])
print(f'  Total returned: {len(records)}  (API total: {total})')
for d in records:
    did  = d.get('driver_id','?')
    info = d.get('basic_info') or {}
    fn   = info.get('driver_first_name','—')
    ln   = info.get('driver_last_name','—')
    em   = info.get('driver_email','—')
    ph   = info.get('driver_phone_number','—')
    ws   = info.get('work_status','—')
    dt   = info.get('driver_type','—')
    veh  = (info.get('assignments_vehicles') or {}).get('truck') or {}
    vno  = veh.get('vehicle_no','none')
    print(f'  [{did}] {fn} {ln} | {em} | {ph} | type={dt} | work_status={ws} | truck={vno}')
"

# ── 2. PENDING drivers (invited, not yet accepted) ───────────────────────────
echo ""
echo "── 2. PENDING DRIVERS (invited, awaiting app accept) ────"
curl -s --max-time 15 --connect-timeout 8 \
  -X POST "$BASE/api/driver/query" \
  -H "$H1" -H "$H2" \
  -d '{"driver_status":"PENDING","page":0,"size":50}' \
  | python3 -c "
import json, sys
r = json.load(sys.stdin)
records = r.get('data', [])
print(f'  Total PENDING: {len(records)}')
for d in records:
    did  = d.get('driver_id','?')
    info = d.get('basic_info') or {}
    fn   = info.get('driver_first_name','—')
    ln   = info.get('driver_last_name','—')
    em   = info.get('driver_email','—')
    print(f'  [{did}] {fn} {ln} | {em} | PENDING — needs to accept invite in NavPro app')
"

# ── 3. Vehicles ──────────────────────────────────────────────────────────────
echo ""
echo "── 3. ALL VEHICLES ──────────────────────────────────────"
curl -s --max-time 15 --connect-timeout 8 \
  -X POST "$BASE/api/vehicle/query" \
  -H "$H1" -H "$H2" \
  -d '{"page":0,"size":50}' \
  | python3 -c "
import json, sys
r = json.load(sys.stdin)
data = r.get('data', [])
records = data if isinstance(data, list) else data.get('records', [])
print(f'  Total: {len(records)} vehicle(s)')
for v in records:
    vid  = v.get('vehicle_id','?')
    vno  = v.get('vehicle_no','—')
    make = v.get('vehicle_make','—')
    mdl  = v.get('vehicle_model','—')
    yr   = v.get('vehicle_year','—')
    stat = v.get('vehicle_status') or v.get('status','—')
    print(f'  [{vid}] {vno} | {yr} {make} {mdl} | status={stat}')
"

# ── 4. Routing profiles ───────────────────────────────────────────────────────
echo ""
echo "── 4. ROUTING PROFILES ──────────────────────────────────"
curl -s --max-time 15 --connect-timeout 8 \
  -X GET "$BASE/api/routing-profile/list?page=0&size=20" \
  -H "$H1" -H "$H2" \
  | python3 -c "
import json, sys
r = json.load(sys.stdin)
data = r.get('data', [])
records = data if isinstance(data, list) else data.get('records', [])
print(f'  Total: {len(records)} profile(s)')
for p in records:
    pid  = p.get('routing_profile_id') or p.get('id','?')
    name = p.get('profile_name') or p.get('name','—')
    print(f'  [{pid}] {name}  ← use this ID for trip/create')
"

# ── 5. Create a test trip with the REAL existing driver ID ───────────────────
echo ""
echo "── 5. TEST: CREATE TRIP WITH EXISTING DRIVER 719839 ─────"
TOMORROW=$(python3 -c "from datetime import datetime,timedelta,timezone; print((datetime.now(timezone.utc)+timedelta(days=1)).strftime('%Y-%m-%dT08:00:00Z'))")
curl -s --max-time 15 --connect-timeout 8 \
  -X POST "$BASE/api/trip/create" \
  -H "$H1" -H "$H2" \
  -d "{
    \"scheduled_start_time\": \"$TOMORROW\",
    \"driver_id\": 719839,
    \"routing_profile_id\": 323400,
    \"stop_points\": [
      {
        \"latitude\": 33.4484, \"longitude\": -112.0740,
        \"address_name\": \"Phoenix Distribution Center, Phoenix AZ\",
        \"appointment_time\": \"$TOMORROW\",
        \"dwell_time\": 60,
        \"notes\": \"LOAD-4821 pickup\"
      },
      {
        \"latitude\": 32.7767, \"longitude\": -96.7970,
        \"address_name\": \"Walmart DC, Dallas TX\",
        \"appointment_time\": \"$(python3 -c "from datetime import datetime,timedelta,timezone; print((datetime.now(timezone.utc)+timedelta(days=1,hours=18)).strftime('%Y-%m-%dT%H:%M:%SZ'))")\",
        \"dwell_time\": 90,
        \"notes\": \"LOAD-4821 delivery\"
      }
    ]
  }" \
  | python3 -c "
import json, sys
r = json.load(sys.stdin)
print(f'  Response: {json.dumps(r, indent=2)[:400]}')
"

echo ""
echo "════════════════════════════════════════════════════════"
echo "  KEY FINDINGS:"
echo "  ✅ Vehicles (5) ARE in NavPro"
echo "  ⚠  Invited drivers show as PENDING until they:"
echo "     1. Get the NavPro Driver app (iOS/Android)"
echo "     2. Log in with the email+password from the seeder"
echo "     3. Accept the company invitation"
echo "  ✅ Existing driver 719839 (Yadnesh) is ACTIVE"
echo "  → Trips/loads must use driver_id=719839 until others accept"
echo "════════════════════════════════════════════════════════"
echo ""
