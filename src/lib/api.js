async function getJson(path, message) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(message);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

async function getObject(path, message) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(message);
  }

  const data = await response.json();
  return data && !Array.isArray(data) ? data : {};
}

export function getMembershipPlans() {
  return getJson("/api/membership-plans", "Unable to load membership plans.");
}

export function getTrainers() {
  return getJson("/api/trainers", "Unable to load trainers.");
}

export function getClassSchedule() {
  return getJson("/api/class-schedule", "Unable to load class schedule.");
}

export function getSiteSettings() {
  return getObject("/api/site-settings", "Unable to load site settings.");
}
