# FitZone

React + Vite frontend with a small Node API backed by MongoDB Atlas. Authentication and member records come from Clerk, payments use Stripe sandbox, and editable app content is loaded from MongoDB collections.

## Project Structure

```txt
src/
  app/                  App shell, route helpers, provider config, and Vite entry point
  assets/               Static images and media
  data/                 Frontend schedule date/filter helpers
  features/             Feature modules and page-level React components
    admin-panel/        Admin dashboard shell, shared admin helpers, and page folders
      pages/            One folder per admin page, with matching JSX and CSS
    auth/               Login and sign-up flows
    home/               Public home page
    membership-flow/    Choose-plan and Stripe checkout flow
    trainer-detail/     Trainer profile pages
    user-dashboard/     Member dashboard
  shared/               Cross-feature helpers
    api/                Frontend API client functions
    trainers/           Shared trainer presentation helpers

server/
  config/               Environment and MongoDB connection setup
  data/                 Seed data for MongoDB collections, excluding Clerk members and Stripe payments
  routes/               API route handlers
  index.js              Node server entry point

scripts/                Local dev and database seed scripts
```

Feature modules own their page components and styles. Cross-feature logic belongs in `src/shared`, and app-wide bootstrapping belongs in `src/app`.

Admin pages follow this structure:

```txt
src/features/admin-panel/
  AdminPanel.jsx        Sidebar, mobile nav, and admin page routing
  AdminPanel.css        Shared admin layout, form, modal, and responsive styles
  adminPanelUtils.js    Shared admin formatting, filtering, KPI, and form helpers
  pages/
    overview/
      OverviewPage.jsx
      OverviewPage.css
    members/
      MembersPage.jsx
      MembersPage.css
    classes/
      ClassesPage.jsx
      ClassesPage.css
    trainers/
      TrainersPage.jsx
      TrainersPage.css
    plans/
      PlansPage.jsx
      PlansPage.css
    payments/
      PaymentsPage.jsx
      PaymentsPage.css
    reports/
      ReportsPage.jsx
      ReportsPage.css
    settings/
      SettingsPage.jsx
      SettingsPage.css
    crowd-detection/
      CrowdDetectionPage.jsx
    admin-placeholder/
      AdminPlaceholderPage.jsx
      AdminPlaceholderPage.css
```

## Commands

```bash
npm run dev
npm run client:dev
npm run server:dev
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
PUT /api/site-settings
GET /api/members
GET /api/stripe/payments
GET /api/stripe/revenue-overview
GET /api/stripe/payment-access
POST /api/stripe/payment-intents
```

MongoDB stores membership plans, trainers, class schedules, and site settings. Members are loaded from Clerk. Payments are loaded from Stripe PaymentIntents, so this project does not keep a separate MongoDB payment seed or payment collection flow for the admin payment table.

The schedule is stored as a fixed Sunday-to-Saturday weekly pattern in MongoDB. The frontend generates the visible dates for the current week and marks the current weekday as `Today`.

## Environment

Create a `.env` file in the project root:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/fitzone?retryWrites=true&w=majority
MONGODB_DB_NAME=fitzone
PORT=3001
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

Restart the dev server after changing `.env`.

## Stripe Sandbox

The payment page uses Stripe.js Elements in the browser and a server-created PaymentIntent. FitZone does not store raw card numbers or CVC values.

Use this Stripe test card for card payments:

```txt
Card number: 4242 4242 4242 4242
Expiry date: Any future date
CVC: Any 3 digits
ZIP: Any 5 digits, if requested
```

PromptPay uses Stripe sandbox PromptPay PaymentIntents and returns a QR code through Stripe.js when the account/payment method is enabled in Stripe.

## Seed Data

Seed files under `server/data` are only for initial MongoDB content and reset workflows. Runtime data comes from the API and database.

Keep these seed groups:

```txt
membershipPlans
trainers
classSchedule
siteSettings
```

Members are intentionally not seeded because Clerk is the source of truth for users and member status.

Payments are intentionally not seeded because Stripe is the source of truth for payment status, card details, PromptPay QR status, and revenue reporting.

## Cleanup Notes

The current structure removes older duplicate paths:

```txt
src/lib/api.js              replaced by src/shared/api/client.js
src/lib/trainerImages.js    replaced by src/shared/trainers/trainerImages.js
Mongo payment seed files    removed; Stripe PaymentIntents are used instead
```

Admin page JSX and CSS files are grouped together by page to keep review scope small.
