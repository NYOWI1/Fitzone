const baseUrl = process.env.API_BASE_URL || "http://127.0.0.1:3001";

const checks = [
  ["GET", "/api/membership-plans", 200],
  ["GET", "/api/admin/membership-plans", 401],
  ["GET", "/api/trainers", 200],
  ["GET", "/api/admin/trainer-bookings", 401],
  ["GET", "/api/class-schedule", 200],
  ["GET", "/api/site-settings", 200],
  ["GET", "/api/members", 401],
  ["GET", "/api/stripe/payments", 401],
  ["GET", "/api/stripe/revenue-overview", 401],
  ["GET", "/api/stripe/payment-access?email=not-an-email", 401],
  ["GET", "/api/does-not-exist", 401],
  ["POST", "/api/stripe/payment-intents", 401, {}],
  ["POST", "/api/stripe/subscriptions", 401, {}],
  ["POST", "/api/membership-plans", 401, {}],
  ["PUT", "/api/membership-plans", 401, {}],
  ["POST", "/api/trainers", 401, {}],
  ["PUT", "/api/trainers", 401, {}],
  ["POST", "/api/class-schedule/classes", 401, {}],
  ["PUT", "/api/class-schedule/classes", 401, {}],
  ["PUT", "/api/site-settings", 401, {}],
  ["PUT", "/api/members/attendance", 401, {}],
];

async function runCheck([method, path, expectedStatus, payload]) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers:
      payload === undefined ? undefined : { "Content-Type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const ok = response.status === expectedStatus;

  return {
    expectedStatus,
    method,
    ok,
    path,
    status: response.status,
  };
}

async function main() {
  const results = [];

  for (const check of checks) {
    try {
      results.push(await runCheck(check));
    } catch (error) {
      results.push({
        expectedStatus: check[2],
        method: check[0],
        ok: false,
        path: check[1],
        status: "ERR",
        error: error.message,
      });
    }
  }

  results.forEach((result) => {
    const status = result.ok ? "PASS" : "FAIL";
    const detail = result.error ? ` ${result.error}` : "";

    console.log(
      `${status} ${result.method} ${result.path} expected ${result.expectedStatus}, got ${result.status}${detail}`,
    );
  });

  if (results.some((result) => !result.ok)) {
    process.exit(1);
  }
}

main();
