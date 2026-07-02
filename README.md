# FitZone

React + Vite frontend with a small Node API backed by MongoDB Atlas.

## Project Structure

```txt
src/
  app/                  App shell and Vite entry point
  assets/images/        Local image assets used by the UI
  data/                 Frontend schedule date/filter helpers
  features/             Page and feature-level React components
  lib/                  Shared frontend helpers and API clients

server/
  config/               Environment and MongoDB connection setup
  data/                 Seed data for Atlas collections
  routes/               API route handlers
  index.js              Node server entry point

scripts/                Local dev and database seed scripts
```

## Commands

```bash
npm run dev
npm run build
npm run seed:membership-plans
npm run seed:trainers
npm run seed:class-schedule
npm run seed:site-settings
npm run seed:all
```

## API Data

The frontend loads these resources from the Node API:

```txt
GET /api/membership-plans
GET /api/trainers
GET /api/class-schedule
GET /api/site-settings
```

The schedule is stored as a fixed Sunday-to-Saturday weekly pattern in Atlas. The frontend generates the visible dates for the current week and marks the current weekday as `Today`.

## Environment

Create a `.env` file in the project root:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/fitzone?retryWrites=true&w=majority
MONGODB_DB_NAME=fitzone
PORT=3001
```
