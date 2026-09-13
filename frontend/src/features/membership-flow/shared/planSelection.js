const selectedPlanStorageKey = 'fitzone:selected-plan';
const paidMembershipAccessStorageKey = 'fitzone:paid-membership-access';
const paidAccessDurationMs = 31 * 24 * 60 * 60 * 1000;
const recentPaymentConfirmationMs = 5 * 60 * 1000;

function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}

export function getPlanPriceValue(plan) {
  return Number(String(plan?.price || '').replace(/[^\d.]/g, '')) || 0;
}

export function getPlanMonthlyLabel(plan) {
  const price = getPlanPriceValue(plan);
  return price ? `฿${price.toLocaleString('en-US')}` : plan?.price || '฿0';
}

export function getPlanVariant(plan) {
  if (plan?.premium) {
    return 'premium';
  }

  if (plan?.popular) {
    return 'standard';
  }

  return 'basic';
}

export function getPlanCtaLabel(plan) {
  return `Choose ${plan?.name || 'Plan'}`;
}

export function saveSelectedPlan(plan) {
  window.localStorage.setItem(selectedPlanStorageKey, JSON.stringify(plan));
}

export function getSavedSelectedPlan() {
  try {
    return JSON.parse(
      window.localStorage.getItem(selectedPlanStorageKey) || 'null'
    );
  } catch {
    return null;
  }
}

export function savePaidMembershipAccess({
  email = '',
  memberName = '',
  paymentIntentId = '',
  plan = null,
  membershipAccess = null
}) {
  const memberEmail = normalizeEmail(email);

  if (!memberEmail) {
    return;
  }

  window.localStorage.setItem(
    paidMembershipAccessStorageKey,
    JSON.stringify({
      email: memberEmail,
      memberName,
      paid: true,
      paymentIntentId,
      planName: plan?.name || '',
      planSlug: plan?.slug || '',
      currentPeriodStart: membershipAccess?.currentPeriodStart || null,
      currentPeriodEnd: membershipAccess?.currentPeriodEnd || null,
      currentPeriodStartDate:
        membershipAccess?.currentPeriodStartDate || '',
      currentPeriodEndDate: membershipAccess?.currentPeriodEndDate || '',
      autoRenew: membershipAccess?.autoRenew,
      renewalPaymentConfirmed:
        membershipAccess?.renewalPaymentConfirmed,
      status: membershipAccess?.status || '',
      savedAt: Date.now(),
      expiresAt: Date.now() + paidAccessDurationMs
    })
  );
}

export function getSavedPaidMembershipAccess(email = '') {
  try {
    const access = JSON.parse(
      window.localStorage.getItem(paidMembershipAccessStorageKey) || 'null'
    );

    if (!access?.paid || access.email !== normalizeEmail(email)) {
      return null;
    }

    if (Number(access.expiresAt || 0) < Date.now()) {
      window.localStorage.removeItem(paidMembershipAccessStorageKey);
      return null;
    }

    return access;
  } catch {
    return null;
  }
}

export function clearPaidMembershipAccess(email = '') {
  const memberEmail = normalizeEmail(email);

  if (!memberEmail) {
    window.localStorage.removeItem(paidMembershipAccessStorageKey);
    return;
  }

  try {
    const access = JSON.parse(
      window.localStorage.getItem(paidMembershipAccessStorageKey) || 'null'
    );

    if (!access || access.email === memberEmail) {
      window.localStorage.removeItem(paidMembershipAccessStorageKey);
    }
  } catch {
    window.localStorage.removeItem(paidMembershipAccessStorageKey);
  }
}

export function hasRecentPaymentConfirmation(access, email = '') {
  const memberEmail = normalizeEmail(email);

  return Boolean(
    access?.paid &&
      access.paymentIntentId &&
      (!memberEmail || access.email === memberEmail) &&
      Date.now() - Number(access.savedAt || 0) <= recentPaymentConfirmationMs
  );
}

export function getPlanFromSelection(plans, slug) {
  const savedPlan = getSavedSelectedPlan();
  return (
    plans.find((plan) => plan.slug === slug) ||
    plans.find((plan) => plan.slug === savedPlan?.slug) ||
    plans.find((plan) => plan.popular || plan.slug === 'standard') ||
    plans[0] ||
    savedPlan
  );
}
