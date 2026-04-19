# FleetIQ - NavPro Dispatch Intelligence

AI-powered trucking operations prototype for smart dispatch, cost intelligence, compliance guardrails, and driver handoff workflows.

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | Next.js 15 App Router, React, Tailwind CSS |
| Backend | Next.js API routes |
| Database | Prisma with local SQLite demo database |
| AI | Grok / xAI chat completions with deterministic fallback rules |
| Fleet API | Trucker Path NavPro mock-safe client |

## Quick Start

```bash
npm install
npm run dev
```

Open:

- Landing page: `http://localhost:3000`
- Login role selector: `http://localhost:3000/login`
- Admin login: `http://localhost:3000/login/admin`
- Driver login: `http://localhost:3000/login/driver`
- Dispatcher/Admin dashboard: `http://localhost:3000/dashboard`
- Driver mobile workflow: `http://localhost:3000/driver`

`/dashboard` is protected for admin users only. `/driver` is protected for driver users only.

## Environment

Copy `.env.example` to `.env` and set the values you need.

```env
DATABASE_URL="file:./dev.db"

GROK_API_KEY="xai-..."
GROK_MODEL="grok-2-latest"
GROK_API_URL="https://api.x.ai/v1/chat/completions"

TRUCKERPATH_API_URL="https://navpro.truckerpath.com"
TRUCKERPATH_API_KEY="your-navpro-api-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

The app works without a Grok key by using the same deterministic scoring and cost fallback logic.

## Core Screens

- Landing page with branded truck loader, SaaS hero, value cards, workflow, previews, and CTA.
- Dispatcher/Admin dashboard with sidebar navigation, KPI cards, load board, AI driver ranking, profitability predictor, AI dispatch copilot, document intelligence, cost intelligence, compliance alerts, route preview, and assignment flow.
- Driver mobile dashboard with assigned trip, route progress, HOS clock, AI trip copilot, fuel/parking/rest recommendations, map-style stop planning, smart document reminders, AI document summaries, status timeline, and document uploads for BOL, POD, fuel receipt, and other trip docs.

## Product Intelligence Modules

- Profitability Predictor: compares the selected load across multiple drivers with revenue, fuel, deadhead, driver cost, tolls, buffer, total cost, net margin, margin percentage, and Accept/Review/Reject output.
- AI Dispatch Copilot: answers operational questions using current loads, driver readiness, HOS, profitability calculations, and compliance alerts. Suggested prompts are included for demo flow.
- Parking and Fuel Recommendation Engine: gives drivers fuel, parking, and rest stop recommendations with distance ahead, deviation, HOS fit, parking likelihood, savings, and a route-style map.
- Smart Document Reminder and Intelligence: prompts drivers for BOL after pickup, fuel receipt after refueling, and POD after delivery. Upload actions generate structured AI-style summaries for dispatch and billing.

## Demo Login Accounts

Admin users use the admin login flow at `/login/admin`.

| User | Email | Username | Password | Role |
| --- | --- | --- | --- | --- |
| Elena Brooks | `owner@fleetiq.demo` | `fleet-owner` | `navpro-demo` | Fleet Owner |
| Maria Santos | `dispatcher@fleetiq.demo` | `dispatcher` | `navpro-demo` | Dispatcher |
| Priya Mehta | `safety@fleetiq.demo` | `safety-manager` | `navpro-demo` | Safety Manager |
| Marcus Reed | `ops@fleetiq.demo` | `operations` | `navpro-demo` | Operations Manager |

Driver users use the driver login flow at `/login/driver`.

| User | Email | Username | Password | Demo Truck |
| --- | --- | --- | --- | --- |
| John Miller | `john@fleetiq.demo` | `driver-john` | `driver-demo` | TP-201 |
| Alex Rivera | `alex@fleetiq.demo` | `driver-alex` | `driver-demo` | TP-217 |
| Michael Chen | `michael@fleetiq.demo` | `driver-michael` | `driver-demo` | TP-221 |
| Sarah Coleman | `sarah@fleetiq.demo` | `driver-sarah` | `driver-demo` | TP-233 |
| David Okafor | `david@fleetiq.demo` | `driver-david` | `driver-demo` | TP-249 |

Both login screens include quick-fill demo buttons.

## API Routes

### `GET /api/drivers`

Returns all drivers. Add `?loadId=<id>` to score drivers against a selected load.

### `GET /api/loads`

Returns all loads with assignment status.

### `POST /api/assign`

Assigns a driver to a pending load, writes the assignment, updates driver/load status, and triggers the NavPro check-call mock.

```json
{
  "driverId": "...",
  "loadId": "...",
  "aiScore": 94,
  "aiReasoning": "...",
  "fuelPrice": 4.2,
  "driverPayPerHour": 28
}
```

### `POST /api/cost`

Returns revenue, fuel cost, deadhead cost, driver pay, toll estimate, net margin, margin percentage, and Grok/fallback verdict.

### `GET /api/alerts`

Returns unresolved compliance alerts. `PATCH` with `{ "alertId": "..." }` resolves an alert.

## Scoring Logic

When a dispatcher selects a load, FleetIQ:

1. Computes deadhead miles from driver GPS to pickup.
2. Gets mocked NavPro route hours, weigh station, toll, and bridge-risk signals.
3. Scores HOS feasibility, deadhead, on-time history, and compliance fit.
4. Uses Grok for dispatcher-facing explanations when `GROK_API_KEY` is configured.
5. Falls back to deterministic scoring when Grok is unavailable.

## Demo Data

The project includes a local Prisma demo database with mock loads, drivers, alerts, and route-safe NavPro fallback responses.

Useful commands:

```bash
npm run db:generate
npm run db:push
npm run db:seed
npm run lint
npm run build
```
