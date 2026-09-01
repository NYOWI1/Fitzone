const apiBaseUrl = String(import.meta.env.VITE_API_URL || '').replace(
  /\/$/,
  ''
);

function getApiUrl(path) {
  return `${apiBaseUrl}${path}`;
}

async function getErrorMessage(response, fallbackMessage) {
  try {
    const data = await response.json();
    return data?.message || data?.stripe?.error?.message || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

async function getJson(path, message) {
  const response = await fetch(getApiUrl(path));

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, message));
  }

  const data = await response.json();
  return data;
}

async function getObject(path, message) {
  const response = await fetch(getApiUrl(path));

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, message));
  }

  const data = await response.json();
  return data && !Array.isArray(data) ? data : {};
}

async function sendJson(path, method, payload, message) {
  const response = await fetch(getApiUrl(path), {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, message));
  }

  const data = await response.json();
  return data;
}

export function getMembershipPlans() {
  return getJson('/api/membership-plans', 'Unable to load membership plans.');
}

export function getAdminMembershipPlans() {
  return getJson(
    '/api/admin/membership-plans',
    'Unable to load membership plans.'
  );
}

export function getMembers() {
  return getJson('/api/members', 'Unable to load members.');
}

export function updateMemberAttendance(payload) {
  return sendJson(
    '/api/members/attendance',
    'PUT',
    payload,
    'Unable to update member attendance.'
  );
}

export function addMembershipPlan(payload) {
  return sendJson(
    '/api/membership-plans',
    'POST',
    payload,
    'Unable to add membership plan.'
  );
}

export function updateMembershipPlan(payload) {
  return sendJson(
    '/api/membership-plans',
    'PUT',
    payload,
    'Unable to update membership plan.'
  );
}

export function getPayments() {
  return getJson('/api/stripe/payments', 'Unable to load Stripe payments.');
}

export function getMemberPayments(email) {
  const params = new URLSearchParams({ email: email || '' });

  return getJson(
    `/api/member-payments?${params.toString()}`,
    'Unable to load your payment history.'
  );
}

export function createStripeBillingPortal(email) {
  return sendJson(
    '/api/stripe/billing-portal',
    'POST',
    { email },
    'Unable to open Stripe billing settings.'
  );
}

export function createStripePaymentIntent(payload) {
  return sendJson(
    '/api/stripe/payment-intents',
    'POST',
    payload,
    'Unable to create Stripe payment intent.'
  );
}

export function createStripeCardSubscription(payload) {
  return sendJson(
    '/api/stripe/subscriptions',
    'POST',
    payload,
    'Unable to create Stripe subscription.'
  );
}

export function getStripePaymentAccess(email, memberName = '') {
  const params = new URLSearchParams({
    email: email || '',
    memberName
  });

  return getObject(
    `/api/stripe/payment-access?${params.toString()}`,
    'Unable to verify Stripe payment access.'
  );
}

export function getStripeRevenueOverview() {
  return getObject(
    '/api/stripe/revenue-overview',
    'Unable to load Stripe revenue overview.'
  );
}

export function getTrainers() {
  return getJson('/api/trainers', 'Unable to load trainers.');
}

export function addTrainer(payload) {
  return sendJson('/api/trainers', 'POST', payload, 'Unable to add trainer.');
}

export function updateTrainer(payload) {
  return sendJson('/api/trainers', 'PUT', payload, 'Unable to update trainer.');
}

export function getTrainerBookings(email) {
  const params = new URLSearchParams({ email: email || '' });

  return getJson(
    `/api/trainer-bookings?${params.toString()}`,
    'Unable to load trainer bookings.'
  );
}

export function getAdminTrainerBookings() {
  return getJson('/api/admin/trainer-bookings', 'Unable to load PT bookings.');
}

export function updateTrainerBooking(payload) {
  return sendJson(
    '/api/trainer-bookings',
    'POST',
    payload,
    'Unable to update trainer booking.'
  );
}

export function getMemberProgress(email, memberId = '') {
  const params = new URLSearchParams({
    email: email || '',
    memberId: memberId || ''
  });

  return getObject(
    `/api/member-progress?${params.toString()}`,
    'Unable to load member progress.'
  );
}

export function getClassSchedule() {
  return getJson('/api/class-schedule', 'Unable to load class schedule.');
}

export function getClassBookings(email) {
  const params = new URLSearchParams({ email: email || '' });

  return getJson(
    `/api/class-bookings?${params.toString()}`,
    'Unable to load class bookings.'
  );
}

export function getClassBookingCounts() {
  return getObject(
    '/api/class-booking-counts',
    'Unable to load class booking counts.'
  );
}

export function toggleClassBooking(payload) {
  return sendJson(
    '/api/class-bookings',
    'POST',
    payload,
    'Unable to update class booking.'
  );
}

export function addClassScheduleItem(payload) {
  return sendJson(
    '/api/class-schedule/classes',
    'POST',
    payload,
    'Unable to add class.'
  );
}

export function updateClassScheduleItem(payload) {
  return sendJson(
    '/api/class-schedule/classes',
    'PUT',
    payload,
    'Unable to update class.'
  );
}

export function getSiteSettings() {
  return getObject('/api/site-settings', 'Unable to load site settings.');
}

export function updateSiteSettings(payload) {
  return sendJson(
    '/api/site-settings',
    'PUT',
    payload,
    'Unable to update site settings.'
  );
}

export function getCrowdStatus() {
  return getObject('/api/crowd-status', 'Unable to load live crowd status.');
}

export function updateCrowdStatus(payload) {
  return sendJson(
    '/api/crowd-status',
    'PUT',
    payload,
    'Unable to publish live crowd status.'
  );
}
