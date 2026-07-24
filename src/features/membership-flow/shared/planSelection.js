const selectedPlanStorageKey = "fitzone:selected-plan";

export function getPlanPriceValue(plan) {
  return Number(String(plan?.price || "").replace(/[^\d.]/g, "")) || 0;
}

export function getPlanMonthlyLabel(plan) {
  const price = getPlanPriceValue(plan);
  return price ? `฿${price.toLocaleString("en-US")}` : plan?.price || "฿0";
}

export function getPlanVariant(plan) {
  if (plan?.premium) {
    return "premium";
  }

  if (plan?.popular || plan?.badge) {
    return "standard";
  }

  return "basic";
}

export function getPlanCtaLabel(plan) {
  return `Choose ${plan?.name || "Plan"}`;
}

export function saveSelectedPlan(plan) {
  window.localStorage.setItem(selectedPlanStorageKey, JSON.stringify(plan));
}

export function getSavedSelectedPlan() {
  try {
    return JSON.parse(
      window.localStorage.getItem(selectedPlanStorageKey) || "null",
    );
  } catch {
    return null;
  }
}

export function getPlanFromSelection(plans, slug) {
  const savedPlan = getSavedSelectedPlan();
  return (
    plans.find((plan) => plan.slug === slug) ||
    plans.find((plan) => plan.slug === savedPlan?.slug) ||
    plans.find((plan) => plan.popular || plan.slug === "standard") ||
    plans[0] ||
    savedPlan
  );
}
