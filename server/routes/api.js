const { getDb } = require("../config/db");

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

async function getMembershipPlans(response) {
  try {
    const db = await getDb();
    const plans = await db
      .collection("membershipPlans")
      .find({ active: { $ne: false } })
      .sort({ sortOrder: 1, name: 1 })
      .project({ _id: 0 })
      .toArray();

    sendJson(response, 200, plans);
  } catch (error) {
    console.error("Membership plans API error:", error);
    sendJson(response, 500, { message: "Unable to load membership plans." });
  }
}

async function getTrainers(response) {
  try {
    const db = await getDb();
    const trainers = await db
      .collection("trainers")
      .find({ active: { $ne: false } })
      .sort({ sortOrder: 1, name: 1 })
      .project({ _id: 0 })
      .toArray();

    sendJson(response, 200, trainers);
  } catch (error) {
    console.error("Trainers API error:", error);
    sendJson(response, 500, { message: "Unable to load trainers." });
  }
}

async function getClassSchedule(response) {
  try {
    const db = await getDb();
    const schedule = await db
      .collection("classSchedule")
      .find({ active: { $ne: false } })
      .sort({ weekday: 1 })
      .project({ _id: 0 })
      .toArray();

    sendJson(response, 200, schedule);
  } catch (error) {
    console.error("Class schedule API error:", error);
    sendJson(response, 500, { message: "Unable to load class schedule." });
  }
}

async function getSiteSettings(response) {
  try {
    const db = await getDb();
    const settings = await db
      .collection("siteSettings")
      .findOne({ key: "site", active: { $ne: false } }, { projection: { _id: 0 } });

    sendJson(response, 200, settings || {});
  } catch (error) {
    console.error("Site settings API error:", error);
    sendJson(response, 500, { message: "Unable to load site settings." });
  }
}

function handleApiRequest(request, response) {
  if (request.method === "GET" && request.url === "/api/membership-plans") {
    getMembershipPlans(response);
    return true;
  }

  if (request.method === "GET" && request.url === "/api/trainers") {
    getTrainers(response);
    return true;
  }

  if (request.method === "GET" && request.url === "/api/class-schedule") {
    getClassSchedule(response);
    return true;
  }

  if (request.method === "GET" && request.url === "/api/site-settings") {
    getSiteSettings(response);
    return true;
  }

  if (request.url.startsWith("/api/")) {
    sendJson(response, 404, { message: "API route not found." });
    return true;
  }

  return false;
}

module.exports = {
  handleApiRequest,
  sendJson,
};
