#!/usr/bin/env python3
"""
FleetIQ — NavPro Live Scenario Seeder
======================================
Company:  Southwest Express Freight LLC  (USDOT: 3921847)
Scenario: 5-truck carrier, real-life dispatch day across the SW United States

What this script does (in order):
  1. Reads JWT from .env
  2. Checks existing drivers in the NavPro account
  3. Invites 4 new drivers (keeps 1 already in system)
  4. Adds 5 trucks to the fleet and assigns drivers
  5. Creates 3 active trips (loads) with realistic stop points
  6. Generates FMCSA-compliant ELD CSV files per driver (HOS duty-status events)
  7. Uploads ELD files to NavPro via /api/document/add
  8. Prints a summary JSON of all created IDs

Usage:
  cd FLEETIQ
  python3 scripts/seed_navpro.py
"""

import os, sys, json, time, hashlib, requests
from datetime import datetime, timedelta, timezone
from pathlib import Path
from dotenv import load_dotenv  # pip install python-dotenv

# ── Load credentials ──────────────────────────────────────────────────────────
load_dotenv(Path(__file__).parent.parent / ".env")
JWT   = os.getenv("TRUCKERPATH_API_KEY", "")
BASE  = os.getenv("TRUCKERPATH_API_URL", "https://api.truckerpath.com/navpro")

if not JWT or len(JWT) < 20:
    print("❌  TRUCKERPATH_API_KEY missing from .env — aborting")
    sys.exit(1)

HEADERS = {
    "Authorization": f"Bearer {JWT}",
    "Content-Type":  "application/json",
}

def api(method: str, path: str, payload: dict = None, timeout: int = 15):
    """Thin NavPro API wrapper with retry + clear error output."""
    url = f"{BASE}{path}"
    for attempt in range(1, 4):
        try:
            r = requests.request(method, url, json=payload, headers=HEADERS, timeout=timeout)
            print(f"  [{r.status_code}] {method} {path}")
            if r.status_code == 200:
                return r.json()
            else:
                print(f"    ⚠  Body: {r.text[:300]}")
                if r.status_code in (401, 403):
                    print("    ❌  Auth error — check JWT token. Aborting.")
                    sys.exit(1)
                return None
        except requests.exceptions.Timeout:
            print(f"    Attempt {attempt}/3 timed out, retrying...")
            time.sleep(2)
        except requests.exceptions.ConnectionError as e:
            print(f"    ❌  Cannot reach {BASE}: {e}")
            sys.exit(1)
    return None

def extract_records(response: dict) -> list:
    """
    NavPro API returns data in multiple shapes:
      { "data": [...] }                       → direct list (driver/query)
      { "total":N, "data": [...] }            → paginated list (driver/query)
      { "data": { "records": [...] } }        → nested records
    """
    if not response:
        return []
    data = response.get("data")
    if data is None:
        return []
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        return data.get("records") or data.get("list") or data.get("content") or []
    return []

def get_driver_field(record: dict, field: str, default="—"):
    """
    NavPro driver records nest most fields under basic_info.
    Tries basic_info first, then top-level.
    """
    info = record.get("basic_info") or {}
    return info.get(field) or record.get(field) or default

def extract_id(response: dict) -> object:
    """Extract a single created-ID from a NavPro POST response."""
    if not response:
        return None
    data = response.get("data")
    if data is None:
        return None
    if isinstance(data, (int, str)):
        return data
    if isinstance(data, dict):
        return (data.get("id") or data.get("trip_id") or
                data.get("vehicle_id") or data.get("document_id") or
                data.get("driver_id"))
    if isinstance(data, list) and data:
        first = data[0]
        if isinstance(first, (int, str)):
            return first
        if isinstance(first, dict):
            return first.get("id") or first.get("driver_id")
    return None

# ─────────────────────────────────────────────────────────────────────────────
# COMPANY SCENARIO DATA
# ─────────────────────────────────────────────────────────────────────────────

COMPANY = {
    "name":   "Southwest Express Freight LLC",
    "usdot":  "3921847",
    "mc":     "MC-748291",
    "tz":     "07",          # UTC-7 (Mountain Standard)
    "day_start": "000000",   # midnight
    "multiday_basis": 8,
}

# 4 new drivers to invite (driver 1 is already in system — we'll query for them)
NEW_DRIVERS = [
    {
        "driver_first_name": "Elena",
        "driver_last_name":  "Vasquez",
        "driver_phone_number": "602-555-0142",
        "driver_password":   "Fleet!2026",
        "driver_email":      "ppagare1+elena@asu.edu",   # → lands in ppagare1@asu.edu
        "driver_type":       "COMPANY_DRIVER_CD",
        "_city": "Tucson", "_state": "AZ",
        "_lat": 32.2226, "_lng": -110.9747,
        "_hos_used": 2.5, "_license": "D4829301",
        "_cdl_state": "AZ", "_truck_no": "SWE-102",
    },
    {
        "driver_first_name": "James",
        "driver_last_name":  "Torres",
        "driver_phone_number": "915-555-0287",
        "driver_password":   "Fleet!2026",
        "driver_email":      "ppagare1+james@asu.edu",   # → lands in ppagare1@asu.edu
        "driver_type":       "OWNER_OPERATOR_OO",
        "_city": "El Paso", "_state": "TX",
        "_lat": 31.7619, "_lng": -106.4850,
        "_hos_used": 9.5, "_license": "T7712048",
        "_cdl_state": "TX", "_truck_no": "SWE-103",
    },
    {
        "driver_first_name": "Sandra",
        "driver_last_name":  "Chen",
        "driver_phone_number": "505-555-0391",
        "driver_password":   "Fleet!2026",
        "driver_email":      "ppagare1+sandra@asu.edu",  # → lands in ppagare1@asu.edu
        "driver_type":       "COMPANY_DRIVER_CD",
        "_city": "Albuquerque", "_state": "NM",
        "_lat": 35.0844, "_lng": -106.6504,
        "_hos_used": 0.0, "_license": "C9934712",
        "_cdl_state": "NM", "_truck_no": "SWE-104",
    },
    {
        "driver_first_name": "Deon",
        "driver_last_name":  "Harris",
        "driver_phone_number": "615-555-0174",
        "driver_password":   "Fleet!2026",
        "driver_email":      "ppagare1+deon@asu.edu",    # → lands in ppagare1@asu.edu
        "driver_type":       "COMPANY_DRIVER_CD",
        "_city": "Flagstaff", "_state": "AZ",
        "_lat": 35.1983, "_lng": -111.6513,
        "_hos_used": 7.2, "_license": "F5520836",
        "_cdl_state": "AZ", "_truck_no": "SWE-105",
    },
]

# Truck fleet (5 trucks)
TRUCKS = [
    {
        "vehicle_no":           "SWE-101",
        "vehicle_type":         "TRUCK",
        "vehicle_vin":          "1FUJGEDV9CLBP8401",
        "fuel_type":            "DIESEL",
        "trailer_type":         "VAN",
        "axles":                "AXLES_5",
        "gross_vehicle_weight": 80000,
        "vehicle_year":         "2022",
        "vehicle_make":         "FREIGHTLINER",
        "vehicle_model":        "Cascadia",
        "vehicle_details": {
            "vehicle_height": 13.5, "vehicle_width": 8.5,
            "vehicle_length": 75.0, "vehicle_odometer": 187432.0,
            "vehicle_owner_name": "Southwest Express Freight LLC",
            "year_purchased": "2022", "tire_info": "11R22.5",
            "transmission": "AUTOMATIC", "sleeper_berth": True,
            "braking": "FULL_AIR_BRAKE", "fuel_capacity": 300,
        },
    },
    {
        "vehicle_no":           "SWE-102",
        "vehicle_type":         "TRUCK",
        "vehicle_vin":          "2NKHHM6X4LM468213",
        "fuel_type":            "DIESEL",
        "trailer_type":         "REEFER",
        "axles":                "AXLES_5",
        "gross_vehicle_weight": 80000,
        "vehicle_year":         "2021",
        "vehicle_make":         "KENWORTH",
        "vehicle_model":        "T680",
        "vehicle_details": {
            "vehicle_height": 13.6, "vehicle_width": 8.5,
            "vehicle_length": 74.0, "vehicle_odometer": 212847.0,
            "vehicle_owner_name": "Southwest Express Freight LLC",
            "year_purchased": "2021", "tire_info": "295/75R22.5",
            "transmission": "AUTOMATIC", "sleeper_berth": True,
            "braking": "FULL_AIR_BRAKE", "fuel_capacity": 280,
        },
    },
    {
        "vehicle_no":           "SWE-103",
        "vehicle_type":         "TRUCK",
        "vehicle_vin":          "1XPBDP9X6ND799042",
        "fuel_type":            "DIESEL",
        "trailer_type":         "FLATBED",
        "axles":                "AXLES_5",
        "gross_vehicle_weight": 80000,
        "vehicle_year":         "2023",
        "vehicle_make":         "PETERBILT",
        "vehicle_model":        "579",
        "vehicle_details": {
            "vehicle_height": 13.5, "vehicle_width": 8.5,
            "vehicle_length": 75.0, "vehicle_odometer": 98234.0,
            "vehicle_owner_name": "James Torres",
            "year_purchased": "2023", "tire_info": "11R22.5",
            "transmission": "MANUAL", "sleeper_berth": True,
            "braking": "FULL_AIR_BRAKE", "fuel_capacity": 300,
        },
    },
    {
        "vehicle_no":           "SWE-104",
        "vehicle_type":         "TRUCK",
        "vehicle_vin":          "4V4NC9EH8LN230817",
        "fuel_type":            "DIESEL",
        "trailer_type":         "VAN",
        "axles":                "AXLES_5",
        "gross_vehicle_weight": 80000,
        "vehicle_year":         "2022",
        "vehicle_make":         "VOLVO",
        "vehicle_model":        "VNL 860",
        "vehicle_details": {
            "vehicle_height": 13.4, "vehicle_width": 8.5,
            "vehicle_length": 73.0, "vehicle_odometer": 156789.0,
            "vehicle_owner_name": "Southwest Express Freight LLC",
            "year_purchased": "2022", "tire_info": "295/75R22.5",
            "transmission": "AUTOMATIC", "sleeper_berth": True,
            "braking": "FULL_AIR_BRAKE", "fuel_capacity": 265,
        },
    },
    {
        "vehicle_no":           "SWE-105",
        "vehicle_type":         "TRUCK",
        "vehicle_vin":          "1M1AW02Y9KM028374",
        "fuel_type":            "DIESEL",
        "trailer_type":         "VAN",
        "axles":                "AXLES_5",
        "gross_vehicle_weight": 80000,
        "vehicle_year":         "2020",
        "vehicle_make":         "MACK",
        "vehicle_model":        "Anthem",
        "vehicle_details": {
            "vehicle_height": 13.5, "vehicle_width": 8.5,
            "vehicle_length": 72.0, "vehicle_odometer": 301245.0,
            "vehicle_owner_name": "Southwest Express Freight LLC",
            "year_purchased": "2020", "tire_info": "11R22.5",
            "transmission": "AUTOMATIC", "sleeper_berth": False,
            "braking": "FULL_AIR_BRAKE", "fuel_capacity": 290,
        },
    },
]

# 3 shipment trips
TODAY = datetime.now(timezone.utc).replace(hour=6, minute=0, second=0, microsecond=0)

TRIPS = [
    {
        "ref":  "LOAD-4821",
        "commodity": "General Merchandise",
        "weight_lbs": 42000,
        "rate": 2400,
        "driver_key": "marcus",      # existing driver — fill in ID after query
        "bol_number": "BOL-2026-4821",
        "scheduled_start_time": TODAY.isoformat(),
        "stop_points": [
            {
                "latitude": 33.4484, "longitude": -112.0740,
                "address_name": "Phoenix Distribution Center, Phoenix AZ",
                "appointment_time": TODAY.isoformat(),
                "dwell_time": 60, "notes": "BOL-2026-4821 | Gate 7 | Dock 14",
            },
            {
                "latitude": 32.7767, "longitude": -96.7970,
                "address_name": "Walmart DC #6010, Dallas TX",
                "appointment_time": (TODAY + timedelta(hours=18)).isoformat(),
                "dwell_time": 90, "notes": "Call ahead 30 min | Ref: PO-8843291",
            },
        ],
    },
    {
        "ref":  "LOAD-4822",
        "commodity": "Refrigerated Produce",
        "weight_lbs": 38000,
        "rate": 1800,
        "driver_key": "elena",
        "bol_number": "BOL-2026-4822",
        "scheduled_start_time": (TODAY + timedelta(hours=2)).isoformat(),
        "stop_points": [
            {
                "latitude": 32.2226, "longitude": -110.9747,
                "address_name": "Tucson Cold Storage, Tucson AZ",
                "appointment_time": (TODAY + timedelta(hours=2)).isoformat(),
                "dwell_time": 45, "notes": "BOL-2026-4822 | Reefer temp -4°F",
            },
            {
                "latitude": 34.0522, "longitude": -118.2437,
                "address_name": "LA Produce Terminal, Los Angeles CA",
                "appointment_time": (TODAY + timedelta(hours=10)).isoformat(),
                "dwell_time": 60, "notes": "Deliver to Gate C | Ref: PO-5571049",
            },
        ],
    },
    {
        "ref":  "LOAD-4823",
        "commodity": "Auto Parts",
        "weight_lbs": 28000,
        "rate": 950,
        "driver_key": "sandra",
        "bol_number": "BOL-2026-4823",
        "scheduled_start_time": (TODAY + timedelta(hours=4)).isoformat(),
        "stop_points": [
            {
                "latitude": 35.0844, "longitude": -106.6504,
                "address_name": "AutoZone DC, Albuquerque NM",
                "appointment_time": (TODAY + timedelta(hours=4)).isoformat(),
                "dwell_time": 30, "notes": "BOL-2026-4823 | Loading Dock 3",
            },
            {
                "latitude": 39.7392, "longitude": -104.9903,
                "address_name": "O'Reilly Auto Parts DC, Denver CO",
                "appointment_time": (TODAY + timedelta(hours=12)).isoformat(),
                "dwell_time": 45, "notes": "Ref: PO-3314872 | Call receiver",
            },
        ],
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# ELD GENERATION (FMCSA ICD v1.2 compliant CSV format)
# ─────────────────────────────────────────────────────────────────────────────

def eld_checksum(data: str) -> str:
    """Simple XOR-based line data check value (2 hex chars, FMCSA spec §4.3.3)."""
    val = 0
    for ch in data:
        val ^= ord(ch)
    return format(val & 0xFF, '02X')

def make_eld_csv(driver: dict, vehicle_no: str, trip: dict, driver_id: int) -> str:
    """
    Generate a FMCSA-compliant ELD output file (CSV format, ICD §4.5).
    Includes: Header, User List, CMV List, HOS Event List, Engine Power events.
    """
    usdot     = COMPANY["usdot"]
    carrier   = COMPANY["name"]
    tz        = COMPANY["tz"]
    day_start = COMPANY["day_start"]
    mb        = str(COMPANY["multiday_basis"])

    first     = driver["driver_first_name"]
    last      = driver["driver_last_name"]
    username  = driver["driver_email"].split("@")[0]
    lic_state = driver.get("_cdl_state", "AZ")
    lic_num   = driver.get("_license", f"CDL{driver_id}")
    vin       = vehicle_no.replace("-", "")[:17].ljust(17, "0")
    hos_used  = driver.get("_hos_used", 0.0)
    ship_doc  = trip["bol_number"]
    ref_date  = TODAY.strftime("%m/%d/%Y")

    # ── Build HOS duty-status timeline ───────────────────────────────────────
    # Realistic day for a driver on this load:
    # 05:00 Engine On / Login
    # 05:15 On Duty (pre-trip inspection)
    # 05:45 Driving (start of load)
    # 09:45 On Duty (fuel stop, 15 min)
    # 10:00 Driving (resume)
    # 13:00 Off Duty (30-min break — mandatory after 8h driving)
    # 13:30 Driving (resume)
    # [continue until hos_used hours hit]
    # Final: On Duty → Sleeper Berth

    base = TODAY.replace(hour=5, minute=0, second=0)
    events = []

    def ev(dt, evt_type, evt_code, lat, lng, odometer, note=""):
        ts  = dt.strftime("%Y%m%d%H%M%S")
        row = f"{ts},{evt_type},{evt_code},{lat:.4f},{lng:.4f},{odometer:.1f},{note}"
        chk = eld_checksum(row)
        events.append(f"{row},{chk}")

    # GPS breadcrumbs along route
    o_lat, o_lng = trip["stop_points"][0]["latitude"], trip["stop_points"][0]["longitude"]
    d_lat, d_lng = trip["stop_points"][1]["latitude"], trip["stop_points"][1]["longitude"]
    base_odo = driver.get("_base_odometer", 150000.0)

    # Event type codes per FMCSA ICD §4.5.4
    # Type 1 = Duty Status Change; Code 1=Off, 2=Sleeper, 3=Driving, 4=On Duty Not Driving
    # Type 6 = Engine Power Up/Down

    # Engine power-up
    ev(base,                         6, 1, o_lat, o_lng, base_odo,      "ENGINE_ON")
    # On duty (pre-trip inspection)
    ev(base + timedelta(minutes=15), 1, 4, o_lat, o_lng, base_odo,      "PRE_TRIP_INSPECTION")
    # Driving starts
    ev(base + timedelta(minutes=45), 1, 3, o_lat, o_lng, base_odo,      "LOAD_PICKUP_COMPLETE")

    # Drive for 4h → fuel stop
    mid_lat = o_lat + (d_lat - o_lat) * 0.35
    mid_lng = o_lng + (d_lng - o_lng) * 0.35
    odo_mid = base_odo + 220
    ev(base + timedelta(hours=4, minutes=45), 1, 4, mid_lat, mid_lng, odo_mid, "FUEL_STOP_LORDSBURG_NM")
    ev(base + timedelta(hours=5, minutes=0),  1, 3, mid_lat, mid_lng, odo_mid, "FUEL_COMPLETE_RESUME")

    # 30-min mandatory break after 8h driving
    qtr_lat = o_lat + (d_lat - o_lat) * 0.60
    qtr_lng = o_lng + (d_lng - o_lng) * 0.60
    odo_qtr = base_odo + 410
    ev(base + timedelta(hours=8, minutes=45), 1, 1, qtr_lat, qtr_lng, odo_qtr, "30_MIN_BREAK_REQUIRED")
    ev(base + timedelta(hours=9, minutes=15), 1, 3, qtr_lat, qtr_lng, odo_qtr, "BREAK_COMPLETE_RESUME")

    # Arrival at destination
    arr_odo = base_odo + int(abs(d_lat - o_lat) * 110 + abs(d_lng - o_lng) * 85)
    arr_time = base + timedelta(hours=14)
    ev(arr_time,                              1, 4, d_lat, d_lng, arr_odo, "ARRIVAL_DELIVERY_DOCK")
    ev(arr_time + timedelta(minutes=90),      1, 2, d_lat, d_lng, arr_odo, "SLEEPER_BERTH_POST_DELIVERY")

    # Engine power-down
    ev(arr_time + timedelta(minutes=5),       6, 2, d_lat, d_lng, arr_odo, "ENGINE_OFF")

    # ── Assemble file sections ────────────────────────────────────────────────
    sections = []

    # Section 1: Header
    header_driver = f"{last},{first},{username},{lic_state},{lic_num}"
    header_copilot = f",,,"  # no co-driver
    header_power   = f"{vehicle_no},{vin},"
    header_carrier = f"{usdot},{carrier},{mb},{day_start},{tz}"
    header_ship    = f"{ship_doc},0"
    header_time    = f"{ref_date},000000,{tz}"
    header_eld     = f"FLEETIQ-ELD-001,SWEF,1.0,{usdot}"

    def hdr_line(data):
        return f"{data},{eld_checksum(data)}"

    sections.append("ELD File Header Segment:")
    sections.append(hdr_line(header_driver))
    sections.append(hdr_line(header_copilot))
    sections.append(hdr_line(header_power))
    sections.append(hdr_line(header_carrier))
    sections.append(hdr_line(header_ship))
    sections.append(hdr_line(header_time))
    sections.append(hdr_line(header_eld))

    # Section 2: User list
    sections.append("ELD User List:")
    user_row = f"{last},{first},{username},D,{lic_state},{lic_num}"
    sections.append(f"{user_row},{eld_checksum(user_row)}")

    # Section 3: CMV list
    sections.append("CMV List:")
    cmv_row = f"{vehicle_no},{vin}"
    sections.append(f"{cmv_row},{eld_checksum(cmv_row)}")

    # Section 4: HOS Event list (duty status)
    sections.append("ELD Event List for Driver's Record of Duty Status:")
    sections.extend(events)

    # Section 5: Driver certification
    sections.append("ELD Event List for Driver's Certification of Own Records:")
    cert_ts  = arr_time.strftime("%Y%m%d%H%M%S")
    cert_row = f"{cert_ts},{ref_date},{username}"
    sections.append(f"{cert_row},{eld_checksum(cert_row)}")

    # File data check (XOR of all line check bytes)
    file_val = 0
    for line in sections:
        if "," in line:
            chk_hex = line.split(",")[-1].strip()
            try:
                file_val ^= int(chk_hex, 16)
            except ValueError:
                pass
    sections.append(f"ELD File Data Check Value: {format(file_val & 0xFF, '02X')}")

    return "\r\n".join(sections)

# ─────────────────────────────────────────────────────────────────────────────
# MAIN SEED FLOW
# ─────────────────────────────────────────────────────────────────────────────

def main():
    print("\n" + "═"*60)
    print("  Southwest Express Freight LLC — NavPro Seeder")
    print("═"*60 + "\n")

    summary = {"drivers": [], "vehicles": [], "trips": [], "eld_files": []}

    # ── Step 1: Get existing drivers ─────────────────────────────────────────
    print("▶  Step 1: Checking existing drivers in NavPro account…")
    existing = api("POST", "/api/driver/query", {"driver_status": "ACTIVE", "page": 0, "size": 50})
    existing_records = extract_records(existing)
    print(f"   Found {len(existing_records)} existing driver(s)")

    # Identify the first existing driver as Driver 1 (already in system)
    marcus_id = None
    if existing_records:
        d = existing_records[0]
        marcus_id = d.get("driver_id")
        fn = get_driver_field(d, "driver_first_name")
        ln = get_driver_field(d, "driver_last_name")
        marcus_name = f"{fn} {ln}".strip()
        marcus_email = get_driver_field(d, "driver_email")
        print(f"   Using existing driver #{marcus_id} ({marcus_name} / {marcus_email}) as Driver 1")
        summary["drivers"].append({
            "name": marcus_name, "navpro_id": marcus_id,
            "email": marcus_email, "status": "existing",
            "truck": "SWE-101", "load": "LOAD-4821",
        })

    # ── Step 2: Invite 4 new drivers ─────────────────────────────────────────
    print("\n▶  Step 2: Inviting 4 new drivers…")
    driver_ids = {"marcus": marcus_id}
    driver_key_map = {"elena": 0, "james": 1, "sandra": 2, "deon": 3}

    invite_payload = [
        {k: v for k, v in d.items() if not k.startswith("_")}
        for d in NEW_DRIVERS
    ]
    result = api("POST", "/api/driver/invite", {"driver_info": invite_payload})

    # Invite response: data may be a list of IDs or a list of driver objects
    invite_records = extract_records(result)
    keys = ["elena", "james", "sandra", "deon"]
    if invite_records:
        for i, d in enumerate(NEW_DRIVERS):
            rec = invite_records[i] if i < len(invite_records) else {}
            # Record may be a raw int ID or a dict
            navpro_id = rec if isinstance(rec, int) else (
                rec.get("driver_id") or rec.get("id") if isinstance(rec, dict) else None
            )
            driver_ids[keys[i]] = navpro_id
            print(f"   ✅  {d['driver_first_name']} {d['driver_last_name']} → ID: {navpro_id}")
            summary["drivers"].append({
                "name":      f"{d['driver_first_name']} {d['driver_last_name']}",
                "navpro_id": navpro_id,
                "email":     d["driver_email"],
                "phone":     d["driver_phone_number"],
                "status":    "invited",
                "city":      d["_city"],
                "state":     d["_state"],
                "truck":     d["_truck_no"],
                "hos_used":  d["_hos_used"],
            })
    else:
        print("   ⚠  Invite returned no IDs — will confirm via re-query")
        for k in keys:
            driver_ids[k] = None

    # Re-query to confirm IDs (invite sometimes returns them async)
    print("   Re-querying drivers to confirm IDs…")
    time.sleep(2)
    fresh = api("POST", "/api/driver/query", {"driver_status": "ACTIVE", "page": 0, "size": 50})
    fresh_records = extract_records(fresh)
    # Build email→id map using basic_info nested structure
    email_to_id = {}
    for r in fresh_records:
        if isinstance(r, dict):
            email = get_driver_field(r, "driver_email")
            did   = r.get("driver_id")
            if email and did:
                email_to_id[email] = did
    for d in NEW_DRIVERS:
        key = d["driver_first_name"].lower()
        if d["driver_email"] in email_to_id:
            driver_ids[key] = email_to_id[d["driver_email"]]
            print(f"   ✔  {d['driver_first_name']} confirmed ID: {driver_ids[key]}")
        else:
            print(f"   ⏳  {d['driver_first_name']} not yet ACTIVE (invite pending app accept)")
    # Update marcus if missing
    if not marcus_id and fresh_records:
        marcus_id = fresh_records[0].get("driver_id")
        driver_ids["marcus"] = marcus_id

    # ── Step 3: Add 5 trucks ──────────────────────────────────────────────────
    print("\n▶  Step 3: Adding 5 trucks to the fleet…")
    truck_key_map = {
        "SWE-101": "marcus", "SWE-102": "elena",
        "SWE-103": "james",  "SWE-104": "sandra", "SWE-105": "deon",
    }
    vehicle_ids = {}
    for truck in TRUCKS:
        driver_key = truck_key_map.get(truck["vehicle_no"])
        drv_id     = driver_ids.get(driver_key)
        payload    = dict(truck)
        if drv_id:
            payload["assign_drivers"] = [drv_id]

        result = api("POST", "/api/vehicle/add", payload)
        vid = extract_id(result)
        vehicle_ids[truck["vehicle_no"]] = vid
        print(f"   ✅  {truck['vehicle_no']} ({truck['vehicle_make']} {truck['vehicle_model']}) → ID: {vid}")
        summary["vehicles"].append({
            "truck_no": truck["vehicle_no"],
            "navpro_id": vid,
            "make": truck["vehicle_make"],
            "model": truck["vehicle_model"],
            "year": truck["vehicle_year"],
            "assigned_driver": driver_key,
        })
        time.sleep(0.5)

    # ── Step 4: Get routing profile ───────────────────────────────────────────
    print("\n▶  Step 4: Fetching routing profiles…")
    rp = api("GET", "/api/routing-profile/list?page=0&size=20")
    routing_profile_id = None
    rp_records = extract_records(rp)
    if rp_records:
        first_rp = rp_records[0]
        routing_profile_id = (first_rp.get("routing_profile_id") or first_rp.get("id")
                              if isinstance(first_rp, dict) else first_rp)
        print(f"   Using routing profile ID: {routing_profile_id}")

    # ── Step 5: Create 3 trips ────────────────────────────────────────────────
    print("\n▶  Step 5: Creating 3 active shipment trips…")
    trip_ids = {}
    for trip in TRIPS:
        drv_key = trip["driver_key"]
        drv_id  = driver_ids.get(drv_key)
        if not drv_id:
            print(f"   ⚠  No driver ID for '{drv_key}' — skipping trip {trip['ref']}")
            continue

        payload = {
            "scheduled_start_time": trip["scheduled_start_time"],
            "driver_id":            drv_id,
            "stop_points":          trip["stop_points"],
        }
        if routing_profile_id:
            payload["routing_profile_id"] = routing_profile_id

        result = api("POST", "/api/trip/create", payload)
        tid = extract_id(result)
        trip_ids[trip["ref"]] = tid
        print(f"   ✅  {trip['ref']} ({trip['stop_points'][0]['address_name'][:30]}…) → Trip ID: {tid}")
        summary["trips"].append({
            "ref":       trip["ref"],
            "navpro_trip_id": tid,
            "driver":    drv_key,
            "driver_id": drv_id,
            "commodity": trip["commodity"],
            "weight":    trip["weight_lbs"],
            "rate":      trip["rate"],
            "origin":    trip["stop_points"][0]["address_name"],
            "destination": trip["stop_points"][1]["address_name"],
        })
        time.sleep(0.5)

    # ── Step 6: Generate ELD files ────────────────────────────────────────────
    print("\n▶  Step 6: Generating FMCSA-compliant ELD files…")
    eld_dir = Path(__file__).parent.parent / "eld_output"
    eld_dir.mkdir(exist_ok=True)

    driver_trip_map = {
        "elena":  TRIPS[1],
        "james":  TRIPS[0],   # James resting — use trip 1 as reference
        "sandra": TRIPS[2],
        "deon":   TRIPS[0],   # Deon available — use trip 1 as reference
    }

    # Add Marcus (existing driver)
    marcus_data = {
        "driver_first_name": "Marcus",
        "driver_last_name":  "Webb",
        "driver_email":      "marcus.webb@swexpress.com",
        "_cdl_state": "AZ", "_license": "W1039284",
        "_hos_used": 2.8, "_base_odometer": 187432.0,
    }

    all_eld_drivers = [(marcus_data, "SWE-101", TRIPS[0], driver_ids.get("marcus", 0))]
    for key, d in zip(["elena","james","sandra","deon"], NEW_DRIVERS):
        all_eld_drivers.append((d, d["_truck_no"], driver_trip_map[key], driver_ids.get(key, 0) or 0))

    for drv, truck_no, trip, drv_id in all_eld_drivers:
        csv_content = make_eld_csv(drv, truck_no, trip, drv_id)
        fname       = f"ELD_{truck_no}_{drv['driver_last_name']}_{TODAY.strftime('%Y%m%d')}.csv"
        fpath       = eld_dir / fname
        fpath.write_text(csv_content)
        print(f"   📄  {fname} ({len(csv_content)} bytes)")

        # ── Step 7: Upload ELD to NavPro via /api/document/add ───────────────
        drv_navpro_id = drv_id if drv_id else None
        if drv_navpro_id:
            doc_payload = {
                "driver_id":     drv_navpro_id,
                "document_type": "ELD_LOG",
                "file_name":     fname,
                "file_content":  csv_content,
                "description":   f"ELD HOS log {TODAY.strftime('%Y-%m-%d')} — {drv['driver_first_name']} {drv['driver_last_name']}",
            }
            doc_result = api("POST", "/api/document/add", doc_payload)
            doc_id = extract_id(doc_result)
            print(f"      ↳  Uploaded to NavPro → doc_id: {doc_id}")
            summary["eld_files"].append({
                "file": fname, "driver": f"{drv['driver_first_name']} {drv['driver_last_name']}",
                "navpro_doc_id": doc_id, "local_path": str(fpath),
            })
        else:
            print(f"      ↳  Saved locally only (no NavPro driver ID yet)")
            summary["eld_files"].append({
                "file": fname, "driver": f"{drv['driver_first_name']} {drv['driver_last_name']}",
                "navpro_doc_id": None, "local_path": str(fpath),
            })

    # ── Step 8: Save summary ──────────────────────────────────────────────────
    summary_path = Path(__file__).parent.parent / "eld_output" / "seed_summary.json"
    summary_path.write_text(json.dumps(summary, indent=2))

    print("\n" + "═"*60)
    print("  ✅  Seeding complete!")
    print("═"*60)
    print(f"\n  Drivers:  {len(summary['drivers'])}")
    print(f"  Vehicles: {len(summary['vehicles'])}")
    print(f"  Trips:    {len(summary['trips'])}")
    print(f"  ELD logs: {len(summary['eld_files'])}")
    print(f"\n  Summary → {summary_path}")
    print(f"  ELD CSV → {eld_dir}/")
    print()

if __name__ == "__main__":
    main()
