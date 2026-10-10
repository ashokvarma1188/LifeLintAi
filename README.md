# LifeLink AI

An emergency-response platform that connects civilians with the nearest hospitals, police
stations, fire stations, pharmacies and blood donors. Six roles share one app. A civilian
presses SOS, and the nearest responders in range are alerted with a live location.

- **Live app:** https://lifelinkai-app.vercel.app
- **API:** https://lifelink-api-w738.onrender.com

## Features

**Emergencies**
- SOS by button, by voice ("help", "बचाओ", "సహాయం") or by shaking the phone, with a 5-second countdown so you can cancel.
- Nearest-responder matching with MongoDB geospatial queries (hospital, police, fire).
- Push notifications. Responders get new SOS alerts and civilians get status updates, even when the app is closed.
- SOS chat between the civilian and responders: text, scene photos and voice notes.
- Live responder tracking on the real road route, with driving time (OSRM).
- One-tap family alert over WhatsApp or SMS, with a no-login live tracking page.
- **Walk with me:** share a trip. A missed check-in triggers an "Are you safe?" prompt, then an optional police alert.

**Health**
- Medical ID with an emergency QR code (no-login page for responders) and an organ-donor pledge.
- Health records with vitals trend charts.
- Medicine reminders with a notification for each dose.
- Offline first-aid guide (14 guides) and an AI first-aid assistant with voice input and read-aloud.

**Blood and hospitals**
- Blood donation matched by compatibility and distance, with a 90-day rest period and donor badges.
- Hospitals publish live beds, ICU, ambulances and blood-bank stock per group. Civilians can filter by blood group.

**Platform**
- Six roles: civilian, hospital, police, fire station, pharmacy and admin. Admins approve organisation accounts.
- Admin analytics charts, audit log, announcements and support tickets.
- English, Hindi and Telugu.
- Installable PWA that works offline.

## Tech stack

| Part | Technology |
|------|------------|
| Frontend | React 19, Vite, React Router, Leaflet, Recharts, service worker (PWA) |
| Backend | Node.js 18+, Express 5, Mongoose 9, JWT auth, Helmet, rate limiting |
| Database | MongoDB Atlas (2dsphere geospatial indexes) |
| Services | Web Push (VAPID), OSRM routing, Google Gemini, Gmail API, Google Sign-In |
| Hosting | Vercel (client) and Render (server) |
| CI | GitHub Actions: API tests on every push, plus a keep-awake ping every 10 minutes |

## Project structure

```
client/                React app (Vite)
  src/pages/           one file per screen
  src/components/      shared UI (SOS countdown, chat, maps, ...)
  src/i18n/            English / Hindi / Telugu
  public/sw.js         service worker: offline cache + push notifications
server/
  app.js               Express app (routes, middleware)
  server.js            DB connection, listener, schedulers
  models/ controllers/ routes/ middleware/ utils/
  scripts/             admin, seed and demo-data scripts
  tests/               API tests (node:test + supertest + in-memory MongoDB)
.github/workflows/     CI (tests) and keep-awake
```

## Running locally

You need Node.js 18 or newer and a MongoDB connection string (a free MongoDB Atlas cluster works).

```bash
# 1. API
cd server
npm install
cp .env.example .env      # then fill in MONGO_URI and JWT_SECRET at least
npm run dev               # http://localhost:5000

# 2. Web app (in a second terminal)
cd client
npm install
cp .env.example .env      # VITE_API_URL=http://localhost:5000/api
npm run dev               # http://localhost:5173
```

Only `MONGO_URI` and `JWT_SECRET` are required. Without the other keys:
- Emails are skipped.
- The AI assistant is turned off.
- Google Sign-In is hidden.
- Push keys are derived from `JWT_SECRET`.

See [server/.env.example](server/.env.example) for every setting.

### Useful scripts (in `server/`)

| Command | What it does |
|---------|--------------|
| `npm run create-admin` | Creates the first admin account. There is no way to become admin from the website. |
| `node scripts/seedVijayawada.js` | Adds real Vijayawada-area hospitals, police, fire and pharmacy. |
| `node scripts/seedHospitals.js` | Adds Hyderabad hospitals. |
| `npm run demo:seed` | Adds presentation data: a civilian with SOS history, chat, health records, medicines, an organ pledge, donors and blood stock. Login: `ravi@demo.lifelink.app` / `Demo@12345`. |
| `npm run demo:reset` | Removes all of that demo data again. |
| `npm test` | Runs the API tests against an in-memory database. They never touch the real database or send email. |

## Tests

```bash
cd server
npm test
```

There are 23 tests covering:
- auth and roles
- SOS creation, matching, status flow and access rules
- SOS chat permissions and media
- donor rest periods
- medicine reminders and the scheduler
- QR Medical ID privacy
- blood stock validation
- Walk with me, including the automatic police alert

They also run on every push via GitHub Actions.

## Deployment

- **Client (Vercel):** root directory `client`. Set `VITE_API_URL` (the API URL ending in `/api`) and `VITE_GOOGLE_CLIENT_ID`.
- **Server (Render):** root directory `server`, start command `npm start`. Set the variables from `.env.example`, with `CLIENT_URL` set to the Vercel URL.
- **Keep-awake:** Render's free plan sleeps after 15 idle minutes. To stop that, the server pings its own public URL every 10 minutes (`server/utils/keepAwake.js`, which uses the `RENDER_EXTERNAL_URL` that Render sets). `.github/workflows/keep-awake.yml` is a backup ping. The first SOS is never slow, and medicine reminders go out on time.
