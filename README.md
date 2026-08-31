# FitZone

FitZone is a monorepo containing a React/Vite frontend and a Node/MongoDB API.
The frontend is deployable to Vercel and the backend is deployable to Render
from the same Git repository.

## Structure

```txt
frontend/                  Vercel project root
  src/                     React application
  public/                  Public assets and ONNX crowd model
  package.json             Frontend dependencies and scripts
  vercel.json              Vercel SPA configuration

backend/                   Render service root
  src/
    config/                Environment and MongoDB setup
    data/                  Defaults and ignored local development fallbacks
    routes/                API route handlers
    index.js               API entry point
  scripts/                 Seed and smoke-test scripts
  package.json             Backend dependencies and scripts

scripts/dev.mjs            Starts both packages for local development
render.yaml                Render Blueprint configuration
package.json               Local monorepo commands
```

## Local Development

Install dependencies once from the repository root:

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run client:dev
npm run server:dev
npm run build
npm run api:smoke
npm run seed:all
```

The root `.env` file is still supported for local development. Alternatively,
use `frontend/.env` and `backend/.env` based on each package's `.env.example`.

## Deploy Frontend To Vercel

1. Import this Git repository as a Vercel project.
2. Set **Root Directory** to `frontend`.
3. Keep the detected Vite build settings (`npm run build`, output `dist`).
4. Add these environment variables:

```env
VITE_API_URL=https://your-fitzone-api.onrender.com
VITE_CLERK_PUBLISHABLE_KEY=pk_live_or_test_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_or_test_...
```

Do not put MongoDB, Clerk secret, or Stripe secret keys in Vercel frontend
variables.

## Deploy Backend To Render

Use the root `render.yaml` Blueprint, or create a Web Service manually with:

```txt
Root Directory: backend
Build Command: npm ci
Start Command: npm start
Health Check Path: /api/health
```

Set the Render environment variables from `backend/.env.example`. Set
`CORS_ORIGINS` to the exact Vercel URL. Multiple origins can be comma-separated:

```env
CORS_ORIGINS=https://fitzone.vercel.app,https://www.example.com
```

After Render provides the backend URL, update `VITE_API_URL` in Vercel and
redeploy the frontend.

## External Services

- MongoDB stores schedules, plans, trainers, settings, attendance, and bookings.
- Clerk is the source of truth for authentication and members.
- Stripe is the source of truth for subscriptions and payments.
- The ONNX crowd-detection model remains in `frontend/public/models` because it
  runs in the browser.
