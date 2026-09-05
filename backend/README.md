# Personal Safety Agent — 24/7 Autonomous Backend Safety Engine

## Overview
This backend service runs independently 24/7 to provide continuous safety monitoring for Personal Safety Agent on iOS.

Key capabilities:
- **Device Location Ingestion**: Receives adaptive GPS updates from iPhone (`/api/device/location`).
- **Autonomous Threat Engine**: Continuous background cycle evaluating tactical threats against user coordinates.
- **Dynamic Threat Recalculation**: Re-evaluates distance and risk dynamically when user location changes (e.g. driving closer to a drone or missile vector).
- **APNs Dispatch**: Apple Push Notifications with Critical Alerts (`danger_alarm.wav` custom sound) and Standard Alert fallback.
- **Location Failsafe**: Retains last known coordinates with stale/warning status, never dropping monitoring silently.

---

## Environment Variables
Create a `.env` file in `backend/`:

```env
PORT=3001
NODE_ENV=production

# Apple Push Notification service (APNs)
APNS_KEY_ID=YOUR_KEY_ID
APNS_TEAM_ID=YOUR_TEAM_ID
APNS_BUNDLE_ID=com.personalsafety.agent
APNS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
APNS_PRODUCTION=true
```

*(Note: If APNs keys are omitted, the engine automatically operates in Mock mode for local testing).*

---

## Running Locally

```bash
cd backend
npm install
npm run dev
```

Run tests:
```bash
npm test
```

---

## Production Deployment Options

### Option 1: Docker
```bash
docker build -t personal-safety-backend .
docker run -p 3001:3001 --env-file .env personal-safety-backend
```

### Option 2: Render / Railway / Fly.io
Deploy this repository pointing to the `backend/` directory with `npm start`.
