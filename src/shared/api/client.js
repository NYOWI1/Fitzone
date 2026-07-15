async function getErrorMessage(response, fallbackMessage) {
  try {
    const data = await response.json();
    return data?.message || data?.stripe?.error?.message || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

async function getJson(path, message) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, message));
  }

  const data = await response.json();
  return data;
}

async function getObject(path, message) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, message));
  }

  const data = await response.json();
  return data && !Array.isArray(data) ? data : {};
}

async function sendJson(path, method, payload, message) {
  const response = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, message));
  }

  const data = await response.json();
  return data;
}

export function getMembershipPlans() {
  return getJson("/api/membership-plans", "Unable to load membership plans.");
}

export function getMembers() {
  return getJson("/api/members", "Unable to load members.");
}

export function updateMemberAttendance(payload) {
  return sendJson("/api/members/attendance", "PUT", payload, "Unable to update member attendance.");
}

export function addMembershipPlan(payload) {
  return sendJson("/api/membership-plans", "POST", payload, "Unable to add membership plan.");
}

export function updateMembershipPlan(payload) {
  return sendJson("/api/membership-plans", "PUT", payload, "Unable to update membership plan.");
}

export function getPayments() {
  return getJson("/api/stripe/payments", "Unable to load Stripe payments.");
}

export function createStripePaymentIntent(payload) {
  return sendJson("/api/stripe/payment-intents", "POST", payload, "Unable to create Stripe payment intent.");
}

export function getStripePaymentAccess(email, memberName = "") {
  const params = new URLSearchParams({
    email: email || "",
    memberName,
  });

  return getObject(`/api/stripe/payment-access?${params.toString()}`, "Unable to verify Stripe payment access.");
}

export function getStripeRevenueOverview() {
  return getObject("/api/stripe/revenue-overview", "Unable to load Stripe revenue overview.");
}

export function getTrainers() {
  return getJson("/api/trainers", "Unable to load trainers.");
}

export function addTrainer(payload) {
  return sendJson("/api/trainers", "POST", payload, "Unable to add trainer.");
}

export function updateTrainer(payload) {
  return sendJson("/api/trainers", "PUT", payload, "Unable to update trainer.");
}

export function getClassSchedule() {
  return getJson("/api/class-schedule", "Unable to load class schedule.");
}

export function addClassScheduleItem(payload) {
  return sendJson("/api/class-schedule/classes", "POST", payload, "Unable to add class.");
}

export function updateClassScheduleItem(payload) {
  return sendJson("/api/class-schedule/classes", "PUT", payload, "Unable to update class.");
}

export function getSiteSettings() {
  return getObject("/api/site-settings", "Unable to load site settings.");
}

export function updateSiteSettings(payload) {
  return sendJson("/api/site-settings", "PUT", payload, "Unable to update site settings.");
}
