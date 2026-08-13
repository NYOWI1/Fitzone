# FitZone

React + Vite frontend with a small Node API backed by MongoDB Atlas. Authentication and member records come from Clerk, payments use Stripe sandbox, and editable app content is loaded from MongoDB collections.

## Project Structure

```txt
src/
  app/                  App shell, route helpers, provider config, and Vite entry point
  assets/               Static images and media
  features/             Feature modules and page-level React components
    admin-panel/        Admin dashboard, separate admin login, and Clerk role guard
      pages/            Admin login and one folder per admin dashboard page
    auth/               Member login and sign-up flows
    home/               Public home page
    membership-flow/    Choose-plan and Stripe checkout flow
    trainer-detail/     Trainer profile pages
    user-dashboard/     Member dashboard
  shared/               Cross-feature helpers
    api/                Frontend API client functions
    schedule/           Frontend schedule date/filter helpers
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
  AdminPanel.jsx        Protected admin dashboard shell, sidebar, mobile nav, and page routing
  AdminPanel.css        Shared admin layout, form, modal, and responsive styles
  adminAuth.js          Clerk metadata role check for admin access
  adminPanelUtils.js    Shared admin formatting, filtering, KPI, and form helpers
  index.js              Admin feature exports
  components/
    AdminLoadingSkeleton.jsx  Shared loading skeletons for admin tables and cards
  pages/
    admin-login/
      AdminLoginPage.jsx  Separate Clerk login page for admins
    overview/
      OverviewPage.jsx    Dashboard summary page
    members/
      MembersPage.jsx     Member management page
    classes/
      ClassesPage.jsx     Class schedule management page
    trainers/
      TrainersPage.jsx    Trainer management page
    plans/
      PlansPage.jsx       Membership plan management page
    payments/
      PaymentsPage.jsx    Stripe payment and revenue page
    reports/
      ReportsPage.jsx     Analytics and reporting page
    settings/
      SettingsPage.jsx    Site and admin settings page
    crowd-detection/
      CrowdDetectionPage.jsx  Camera-based crowd detection page
    admin-placeholder/
      AdminPlaceholderPage.jsx  Placeholder component for unfinished admin pages
```

## Commands

```bash
npm run dev
npm run client:dev
npm run server:dev
npm run build
npm run format
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

## Admin Authentication

The admin panel uses a separate Clerk-based admin login page:

```txt
/admin/login
```

Opening `/admin` while signed out redirects directly to `/admin/login`. After login, `/admin` only renders for Clerk users with admin access in public metadata.

Add one of these values to the Clerk user's **Public metadata**:

```json
{
  "role": "admin"
}
```

The app also accepts:

```json
{
  "roles": ["admin"]
}
```

or:

```json
{
  "isAdmin": true
}
```

The regular `/login` page remains the member login flow and still checks membership payment access before sending users to `/dashboard`.

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
