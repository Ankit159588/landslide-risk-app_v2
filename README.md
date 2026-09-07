# Terra Watch v3 — Landslide Risk Prediction (MERN)

Full web app around your existing lat/lng ML model: rotating-token JWT auth
with Redis-enforced single-session login, OTP login/register via nodemailer,
a Leaflet map with place-name autocomplete and a red/orange/green risk
heatmap around the selected point, dual-mode model calling (your own server,
or a third-party API-key service), and automatic email alerts to district
authorities when a location comes back disaster-prone.

## What's new in v3

- **Autocomplete search** on the map (`LocationSearch.jsx`) via OpenStreetMap
  Nominatim - type a place name, pick from suggestions, map jumps there.
- **Risk heatmap** — after analyzing a point, a 5×5 grid of nearby points is
  sampled and drawn as colored circles (red = high, orange = moderate,
  green = low), so you see susceptibility across the area, not just one dot.
- **Redis-backed single active session** — logging in on a new device
  revokes the previous session's refresh tokens immediately (`SINGLE_SESSION_LOGIN=true`).
  Logout/logout-all also clear the Redis session pointer instantly.
- **Dual ML mode** via `ML_MODE=direct` (your own model server, no auth) or
  `ML_MODE=apikey` (a third-party API called with an `x-api-key` header) —
  flip with one env var, no code changes. `USE_MOCK_ML=true` still overrides
  both for demos.
- **Safety recommendations** ("what to do about it") shown under every
  result, tailored to whether the point came back prone or not.

## Structure

```
backend/    Express + MongoDB + Redis API (auth, dual-mode prediction, grid heatmap, authority alerts)
frontend/   React (Vite) + Tailwind + react-leaflet
```

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env   # fill in your real values
npm run dev
```

You'll need a Redis instance for session enforcement. Locally: `docker run -p 6379:6379 redis` or `brew install redis && redis-server`. If Redis is unreachable the app still runs — it just falls back to Mongo-only refresh rotation and logs a warning (single-session enforcement is skipped in that case).

Key `.env` values you must set:
- `MONGO_URI` — your MongoDB connection string
- `REDIS_URL` — e.g. `redis://127.0.0.1:6379`; set `SINGLE_SESSION_LOGIN=false` to disable the one-device-at-a-time behavior
- `ACCESS_TOKEN_SECRET` / `REFRESH_TOKEN_SECRET` — two different long random strings
- `SMTP_*` and `EMAIL_FROM` — nodemailer credentials (Gmail: use an **App Password**, not your login password)
- `USE_MOCK_ML=true` — for a demo with no real model deployed (see below)
- `ML_MODE=direct` + `ML_MODEL_URL`, **or** `ML_MODE=apikey` + `EXTERNAL_ML_API_URL` / `EXTERNAL_ML_API_KEY` — only used once `USE_MOCK_ML=false`
- `DISASTER_ALERT_THRESHOLD` — only used if your model returns a probability

### Demoing without a real model

Set `USE_MOCK_ML=true` (already the default in `.env.example`). Every prediction — both the single-point call and the heatmap grid — will use a deterministic mock derived from the coordinates themselves, so the same location always gives the same result and it looks intentional in front of judges. Flip it to `false` once your model (or third-party API) is reachable.

### Registering authority emails for alerts

Alerts are matched to a location by a simple lat/lng bounding box per
district. Seed some with the admin-only endpoint (create a user, then flip
their `role` to `"admin"` directly in MongoDB, or write a seed script):

```
POST /api/authorities
Authorization: Bearer <admin access token>
{
  "district": "Sonitpur",
  "state": "Assam",
  "minLat": 26.5, "maxLat": 27.2,
  "minLng": 92.5, "maxLng": 93.5,
  "emails": ["dc.sonitpur@example.gov.in"]
}
```

Any prediction whose coordinates fall inside a district's box, and whose
result is "prone" (past the probability threshold if your model returns
one), emails everyone in that district's `emails` list automatically.

## 2. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env   # point VITE_API_URL at your backend
npm run dev
```

Visit `http://localhost:5173`.

## How the auth actually works

**Rotating refresh tokens.** On login/register/OTP-verify, the server issues
a short-lived access token (returned in the JSON body, kept only in memory
on the frontend) and a longer-lived refresh token (set as an `httpOnly`,
`sameSite=strict` cookie scoped to `/api/auth`, so client-side JS never
touches it — mitigates XSS token theft).

Every time the refresh token is used (`POST /api/auth/refresh`), it is
immediately invalidated and replaced with a new one from the same "family."
If a refresh token is ever reused after being replaced (a sign it was
stolen and both the attacker and the real user tried to use it), the entire
token family is revoked server-side and the user is forced to log in again.

**Single active session (Redis).** With `SINGLE_SESSION_LOGIN=true`, Redis
holds a `session:<userId>` key pointing at the currently valid token
family. A fresh login looks up that key, revokes every Mongo refresh-token
document for the old family, and overwrites the Redis key with the new one
— so the previous device is logged out on its next request. Logout clears
the key outright, so it takes effect immediately rather than waiting for
the access token to expire.

The frontend's axios instance (`src/api/axiosInstance.js`) automatically
catches `401`s, calls `/auth/refresh` once (queueing any other in-flight
requests), and retries — so a page reload or an expired 15-minute access
token is invisible to the user as long as their refresh token is still
valid.

**OTP.** Register and passwordless login both go through
`nodemailer`-sent 6-digit codes, hashed at rest, expiring in
`OTP_EXPIRY_MINUTES`, with attempt limits and rate limiting on the
request endpoints. Registration doesn't create the `User` document until
the OTP is verified, so unverified signups don't linger in your database.

## How the heatmap works

`POST /api/predict/grid` samples a small lat/lng grid (default 5×5,
configurable radius up to 25km) around the point you selected, running each
cell through the same `runModel()` function as the single-point predict
endpoint, in parallel. The frontend colors each cell red/orange/green by
probability (or by the raw binary prediction if your model doesn't return a
confidence score) and overlays them on the map as translucent circles.

## What you still need to plug in

- Your actual ML model service behind `ML_MODEL_URL` (direct mode) or a
  real third-party API + key (apikey mode) — the backend already normalizes
  either response shape. Turn off `USE_MOCK_ML` once it's wired up.
- Real authority contact data (see above).
- A Redis instance for production (Upstash, Redis Cloud, etc.) if you
  outgrow a local one.
- A production SMTP provider if you outgrow Gmail's sending limits.
# landslide-risk-app_v2
