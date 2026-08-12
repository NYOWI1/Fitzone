const { getDb } = require("../config/db");
const defaultSiteSettings = require("../data/defaultSiteSettings");

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("Request body is too large."));
      }
    });

    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });

    request.on("error", reject);
  });
}

function isValidWeekday(weekday) {
  return Number.isInteger(weekday) && weekday >= 0 && weekday <= 6;
}

function isValidSchedulePeriod(period) {
  return period === "morning" || period === "evening";
}

function sanitizeClassItem(payload) {
  const name = String(payload.name || "").trim();
  const time = String(payload.time || "").trim();
  const duration = String(payload.duration || "").trim();
  const category = String(payload.category || "")
    .trim()
    .toUpperCase();
  const color = String(payload.color || "")
    .trim()
    .toLowerCase();
  const trainerIndex = Number(payload.trainerIndex);

  if (
    !name ||
    !time ||
    !duration ||
    !category ||
    !color ||
    !Number.isInteger(trainerIndex)
  ) {
    return null;
  }

  return {
    name,
    time,
    duration,
    trainerIndex,
    category,
    color,
  };
}

function makeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sanitizeStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function sanitizeTrainerStats(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((stat) => {
      if (!Array.isArray(stat)) {
        return null;
      }

      const statValue = String(stat[0] || "").trim();
      const label = String(stat[1] || "").trim();

      return statValue && label ? [statValue, label] : null;
    })
    .filter(Boolean);
}

function sanitizeTrainer(payload) {
  const name = String(payload.name || "").trim();
  const role = String(payload.role || "").trim();
  const imageKey = String(payload.imageKey || "trainer1").trim();
  const category = String(payload.category || "")
    .trim()
    .toUpperCase();
  const coach = String(payload.coach || "").trim();
  const bio = String(payload.bio || "").trim();
  const expertise = String(payload.expertise || "").trim();
  const sortOrder = Number(payload.sortOrder);
  const slug = makeSlug(payload.slug || name);

  if (
    !slug ||
    !name ||
    !role ||
    !category ||
    !coach ||
    !bio ||
    !expertise ||
    !Number.isFinite(sortOrder)
  ) {
    return null;
  }

  return {
    slug,
    name,
    role,
    imageKey,
    category,
    badge: String(payload.badge || "").trim(),
    coach,
    bio,
    expertise,
    stats: sanitizeTrainerStats(payload.stats),
    specialties: sanitizeStringArray(payload.specialties),
    sortOrder,
    active: payload.active !== false,
  };
}

function sanitizeMembershipPlan(payload) {
  const name = String(payload.name || "").trim();
  const price = String(payload.price || "").trim();
  const desc = String(payload.desc || "").trim();
  const title = String(payload.title || "").trim();
  const sortOrder = Number(payload.sortOrder);
  const slug = makeSlug(payload.slug || name);

  if (
    !slug ||
    !name ||
    !price ||
    !desc ||
    !title ||
    !Number.isFinite(sortOrder)
  ) {
    return null;
  }

  return {
    slug,
    name,
    price,
    desc,
    badge: payload.popular === true ? "MOST POPULAR" : "",
    popular: payload.popular === true,
    premium: false,
    title,
    features: sanitizeStringArray(payload.features),
    sortOrder,
    active: payload.active !== false,
  };
}

function sanitizeStripePaymentIntent(payload) {
  const amount = Number(payload.amount);
  const currency = String(payload.currency || "thb")
    .trim()
    .toLowerCase();
  const description = String(
    payload.description || "FitZone membership payment",
  ).trim();
  const plan = String(payload.plan || "").trim();
  const planSlug = makeSlug(payload.planSlug || plan);
  const member = String(payload.member || "FitZone Member").trim();
  const memberEmail = String(payload.memberEmail || "")
    .trim()
    .toLowerCase();
  const paymentMethodType = String(payload.paymentMethodType || "card")
    .trim()
    .toLowerCase();

  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !plan ||
    !memberEmail ||
    !["card", "promptpay"].includes(paymentMethodType)
  ) {
    return null;
  }

  return {
    amount: Math.round(amount),
    currency,
    description,
    plan,
    planSlug,
    member,
    memberEmail,
    paymentMethodType,
  };
}

function sanitizeEmail(value) {
  const email = String(value || "")
    .trim()
    .toLowerCase();

  if (!email || !email.includes("@")) {
    return "";
  }

  return email;
}

function normalizeComparableText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function mapStripePaymentIntent(paymentIntent) {
  const metadata = paymentIntent?.metadata || {};

  return {
    id: paymentIntent?.id || "",
    paid: paymentIntent?.status === "succeeded",
    status: paymentIntent?.status || "",
    amount: paymentIntent?.amount || 0,
    currency: paymentIntent?.currency || "thb",
    planName: metadata.plan || "",
    planSlug: metadata.plan_slug || makeSlug(metadata.plan || ""),
    memberEmail: metadata.member_email || "",
    created: paymentIntent?.created || null,
  };
}

function mapStripePaymentStatus(status) {
  if (status === "succeeded") {
    return "Paid";
  }

  if (status === "requires_payment_method" || status === "canceled") {
    return "Failed";
  }

  return "Pending";
}

function getStripePaymentMethod(paymentIntent, charge) {
  const methodType =
    charge?.payment_method_details?.type ||
    paymentIntent?.payment_method_types?.[0] ||
    "card";

  if (methodType === "promptpay") {
    return {
      method: "PromptPay QR",
      paymentType: "promptpay_qr",
      promptPay: {
        qrReference: paymentIntent.id,
      },
    };
  }

  const card = charge?.payment_method_details?.card || {};

  return {
    method: "Credit Card",
    paymentType: "credit_card",
    card: {
      brand: card.brand || "",
      last4: card.last4 || "",
      authorizationCode:
        charge?.payment_method_details?.card?.network_transaction_id || "",
    },
  };
}

async function mapStripePaymentIntentToAdminPayment(paymentIntent) {
  const metadata = paymentIntent.metadata || {};
  const charge = paymentIntent.latest_charge
    ? await getStripeCharge(paymentIntent.latest_charge).catch((error) => {
        console.error("Stripe payment charge lookup error:", error.message);
        return null;
      })
    : null;
  const paymentMethod = getStripePaymentMethod(paymentIntent, charge);

  return {
    invoice: paymentIntent.id,
    member:
      metadata.member ||
      charge?.billing_details?.name ||
      metadata.member_email ||
      "Stripe Customer",
    plan: metadata.plan || "Membership",
    amount: getStripeAmountValue(paymentIntent),
    currency: String(paymentIntent.currency || "thb").toUpperCase(),
    status: mapStripePaymentStatus(paymentIntent.status),
    date: paymentIntent.created
      ? new Date(paymentIntent.created * 1000).toISOString().slice(0, 10)
      : "",
    stripeStatus: paymentIntent.status,
    stripePaymentIntentId: paymentIntent.id,
    ...paymentMethod,
  };
}

function getStripeAmountValue(paymentIntent) {
  return (
    Number(paymentIntent?.amount_received || paymentIntent?.amount || 0) / 100
  );
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getStripeRevenueMonths() {
  const now = new Date();

  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);

    return {
      key: getMonthKey(date),
      label: date.toLocaleString("en-US", { month: "short" }),
      start: date,
    };
  });
}

function getPaymentIntentEmail(paymentIntent) {
  const metadata = paymentIntent?.metadata || {};
  return sanitizeEmail(metadata.member_email || paymentIntent?.receipt_email);
}

function paymentIntentMatchesEmail(paymentIntent, memberEmail) {
  return getPaymentIntentEmail(paymentIntent) === memberEmail;
}

function paymentIntentMatchesMemberName(paymentIntent, memberName) {
  const metadataMember = normalizeComparableText(
    paymentIntent?.metadata?.member,
  );
  const comparableName = normalizeComparableText(memberName);

  return Boolean(
    comparableName && metadataMember && metadataMember === comparableName,
  );
}

function getPriceValue(plan) {
  return Number(String(plan?.price || "").replace(/[^\d.]/g, "")) || 0;
}

async function inferPlanFromAmount(amount) {
  try {
    const db = await getDb();
    const plans = await getMembershipPlanDocuments(db);
    const plan = plans.find((item) => {
      const price = getPriceValue(item);

      return Math.round(price * 100) === amount || Math.round(price) === amount;
    });

    if (!plan) {
      return null;
    }

    return {
      planName: plan.name,
      planSlug: plan.slug,
    };
  } catch (error) {
    console.error("Stripe plan inference error:", error);
    return null;
  }
}

async function getStripeProduct(product) {
  if (!product || typeof product !== "string") {
    return product || null;
  }

  return fetchStripeJson(`/v1/products/${encodeURIComponent(product)}`).catch(
    (error) => {
      console.error("Stripe product lookup error:", error.message);
      return null;
    },
  );
}

async function getPlanFromStripePrice(price) {
  if (!price) {
    return null;
  }

  const product = await getStripeProduct(price.product);
  const metadataPlan =
    price.metadata?.plan ||
    price.metadata?.plan_name ||
    product?.metadata?.plan ||
    product?.metadata?.plan_name;
  const namedPlan =
    metadataPlan || price.nickname || product?.name || price.lookup_key || "";
  const inferredPlan = await inferPlanFromAmount(
    Number(price.unit_amount || price.unit_amount_decimal || 0),
  );

  if (inferredPlan) {
    return inferredPlan;
  }

  if (!namedPlan) {
    return null;
  }

  return {
    planName: String(namedPlan)
      .replace(/\s+membership$/i, "")
      .trim(),
    planSlug: makeSlug(namedPlan),
  };
}

async function mapStripePaymentAccess(paymentIntent, memberEmail) {
  const access = mapStripePaymentIntent(paymentIntent);

  if (!access.planName) {
    const inferredPlan = await inferPlanFromAmount(access.amount);

    if (inferredPlan) {
      access.planName = inferredPlan.planName;
      access.planSlug = inferredPlan.planSlug;
    }
  }

  return {
    ...access,
    memberEmail: access.memberEmail || memberEmail,
  };
}

async function findStripePaymentByMetadata(memberEmail) {
  try {
    const params = new URLSearchParams({
      query: `metadata['member_email']:'${memberEmail}' AND status:'succeeded'`,
      limit: "1",
    });
    const searchResult = await fetchStripeJson(
      `/v1/payment_intents/search?${params.toString()}`,
    );

    return searchResult.data?.[0] || null;
  } catch (error) {
    console.error("Stripe metadata payment search error:", error.message);
    return null;
  }
}

async function getStripeCharge(chargeId) {
  if (!chargeId || typeof chargeId !== "string") {
    return null;
  }

  return fetchStripeJson(`/v1/charges/${encodeURIComponent(chargeId)}`);
}

function chooseBestStripePaymentIntent(paymentIntents) {
  return (
    [...paymentIntents].sort((left, right) => {
      const amountDifference = (right.amount || 0) - (left.amount || 0);

      if (amountDifference !== 0) {
        return amountDifference;
      }

      return (right.created || 0) - (left.created || 0);
    })[0] || null
  );
}

async function findRecentStripePaymentByMember(memberEmail, memberName = "") {
  const params = new URLSearchParams({ limit: "100" });
  const paymentIntents = await fetchStripeJson(
    `/v1/payment_intents?${params.toString()}`,
  );
  const matches = [];

  for (const paymentIntent of paymentIntents.data || []) {
    if (paymentIntent.status !== "succeeded") {
      continue;
    }

    if (
      paymentIntentMatchesEmail(paymentIntent, memberEmail) ||
      paymentIntentMatchesMemberName(paymentIntent, memberName)
    ) {
      matches.push(paymentIntent);
      continue;
    }

    const charge = await getStripeCharge(paymentIntent.latest_charge).catch(
      (error) => {
        console.error("Stripe charge lookup error:", error.message);
        return null;
      },
    );
    const chargeEmail = sanitizeEmail(
      charge?.billing_details?.email || charge?.receipt_email,
    );

    if (chargeEmail === memberEmail) {
      matches.push(paymentIntent);
    }
  }

  return chooseBestStripePaymentIntent(matches);
}

async function findStripeCustomerByEmail(memberEmail) {
  try {
    const params = new URLSearchParams({
      query: `email:'${memberEmail}'`,
      limit: "1",
    });
    const searchResult = await fetchStripeJson(
      `/v1/customers/search?${params.toString()}`,
    );

    if (searchResult.data?.[0]) {
      return searchResult.data[0];
    }
  } catch (error) {
    console.error("Stripe customer search error:", error.message);
  }

  const params = new URLSearchParams({
    email: memberEmail,
    limit: "1",
  });
  const listResult = await fetchStripeJson(
    `/v1/customers?${params.toString()}`,
  ).catch((error) => {
    console.error("Stripe customer list error:", error.message);
    return null;
  });

  return listResult?.data?.[0] || null;
}

async function findStripeSubscriptionByEmail(memberEmail) {
  const customer = await findStripeCustomerByEmail(memberEmail);

  if (!customer?.id) {
    return null;
  }

  const params = new URLSearchParams({
    customer: customer.id,
    status: "all",
    limit: "10",
  });
  params.append("expand[]", "data.items.data.price.product");

  const subscriptions = await fetchStripeJson(
    `/v1/subscriptions?${params.toString()}`,
  ).catch((error) => {
    console.error("Stripe subscriptions lookup error:", error.message);
    return null;
  });
  const usableSubscriptions = (subscriptions?.data || [])
    .filter((subscription) =>
      ["active", "trialing", "past_due"].includes(subscription.status),
    )
    .sort((left, right) => (right.created || 0) - (left.created || 0));

  return usableSubscriptions[0] || null;
}

async function mapStripeSubscriptionAccess(subscription, memberEmail) {
  const item = subscription?.items?.data?.[0] || null;
  const price = item?.price || null;
  const plan = await getPlanFromStripePrice(price);

  return {
    id: subscription?.id || "",
    paid: ["active", "trialing", "past_due"].includes(subscription?.status),
    status: subscription?.status || "",
    amount: Number(price?.unit_amount || price?.unit_amount_decimal || 0),
    currency: price?.currency || "thb",
    planName: plan?.planName || "",
    planSlug: plan?.planSlug || "",
    memberEmail,
    created: subscription?.created || null,
    currentPeriodEnd: subscription?.current_period_end || null,
  };
}

async function fetchStripeJson(path, { method = "GET", params } = {}) {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  const response = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const data = await response.json();

  if (!response.ok) {
    const message = data?.error?.message || "Stripe request failed.";
    const error = new Error(message);
    error.statusCode = response.status;
    error.stripe = data;
    throw error;
  }

  return data;
}

async function fetchClerkJson(path, options = {}) {
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is not configured.");
  }

  const response = await fetch(`https://api.clerk.com${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.errors?.[0]?.message || data?.message || "Clerk request failed.";
    const error = new Error(message);
    error.statusCode = response.status;
    error.clerk = data;
    throw error;
  }

  return data;
}

function getClerkPrimaryEmail(user) {
  const primaryEmail =
    (user.email_addresses || []).find(
      (email) => email.id === user.primary_email_address_id,
    ) || user.email_addresses?.[0];

  return primaryEmail?.email_address || "";
}

function getClerkPrimaryPhone(user) {
  const primaryPhone =
    (user.phone_numbers || []).find(
      (phone) => phone.id === user.primary_phone_number_id,
    ) || user.phone_numbers?.[0];

  return primaryPhone?.phone_number || "";
}

function formatIsoDate(timestamp) {
  if (!timestamp) {
    return "";
  }

  return new Date(timestamp).toISOString().slice(0, 10);
}

function addDaysToIsoDate(timestamp, days) {
  if (!timestamp) {
    return "";
  }

  const date = new Date(timestamp);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getClerkMetadataPlan(user) {
  return (
    user.private_metadata?.plan ??
    user.public_metadata?.plan ??
    user.unsafe_metadata?.plan ??
    ""
  );
}

function getClerkMetadataVisits(user) {
  return Number(
    user.private_metadata?.visits ??
      user.public_metadata?.visits ??
      user.unsafe_metadata?.visits ??
      0,
  );
}

function getClerkMetadataAttendanceDate(user) {
  return String(
    user.private_metadata?.attendanceDate ??
      user.public_metadata?.attendanceDate ??
      user.unsafe_metadata?.attendanceDate ??
      "",
  );
}

function getClerkMetadataTodayVisits(user) {
  return Number(
    user.private_metadata?.todayVisits ??
      user.public_metadata?.todayVisits ??
      user.unsafe_metadata?.todayVisits ??
      0,
  );
}

function getClerkMemberStatus(user, paymentAccess) {
  if (user.banned || user.locked) {
    return "Frozen";
  }

  return paymentAccess?.paid ? "Active" : "Pending";
}

async function getStripePaymentAccessForEmail(memberEmail, memberName = "") {
  if (!memberEmail) {
    return {
      paid: false,
      planName: "",
      planSlug: "",
      memberEmail,
    };
  }

  const subscription = await findStripeSubscriptionByEmail(memberEmail);

  if (subscription) {
    return mapStripeSubscriptionAccess(subscription, memberEmail);
  }

  const paymentIntent =
    (await findRecentStripePaymentByMember(memberEmail, memberName)) ||
    (await findStripePaymentByMetadata(memberEmail));

  if (!paymentIntent) {
    return {
      paid: false,
      planName: "",
      planSlug: "",
      memberEmail,
    };
  }

  return mapStripePaymentAccess(paymentIntent, memberEmail);
}

async function mapClerkUserToMember(user, index) {
  const email = sanitizeEmail(getClerkPrimaryEmail(user));
  const name =
    [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
    user.username ||
    email ||
    "Clerk Member";
  const paymentAccess = await getStripePaymentAccessForEmail(email, name);
  const metadataPlan = getClerkMetadataPlan(user);
  const plan = paymentAccess.planName || metadataPlan || "Unpaid";

  return {
    memberId: user.id,
    name,
    email,
    phone: getClerkPrimaryPhone(user),
    plan,
    planSlug: paymentAccess.planSlug || makeSlug(plan),
    status: getClerkMemberStatus(user, paymentAccess),
    joined: formatIsoDate(user.created_at),
    renewal: paymentAccess.currentPeriodEnd
      ? formatIsoDate(paymentAccess.currentPeriodEnd * 1000)
      : paymentAccess.paid
        ? addDaysToIsoDate((paymentAccess.created || 0) * 1000, 30)
        : "",
    visits: getClerkMetadataVisits(user),
    todayVisits: getClerkMetadataTodayVisits(user),
    attendanceDate: getClerkMetadataAttendanceDate(user),
    tone: ["blue", "red", "yellow", "green"][index % 4],
    clerkUserId: user.id,
    lastSignIn: formatIsoDate(user.last_sign_in_at),
  };
}

async function getClerkMemberDocuments() {
  const params = new URLSearchParams({
    limit: "100",
    order_by: "-created_at",
  });
  const users = await fetchClerkJson(`/v1/users?${params.toString()}`);
  const userList = Array.isArray(users) ? users : users.data || [];

  return Promise.all(userList.map(mapClerkUserToMember));
}

async function getAttendanceHistoryByMember(db, memberIds) {
  if (!memberIds.length) {
    return new Map();
  }

  const records = await db
    .collection("attendanceHistory")
    .find({ memberId: { $in: memberIds } })
    .sort({ attendanceDate: -1 })
    .toArray();

  return records.reduce((historyByMember, record) => {
    const memberHistory = historyByMember.get(record.memberId) || [];

    memberHistory.push({
      attendanceDate: record.attendanceDate,
      visits: Number(record.visits || 0),
    });
    historyByMember.set(record.memberId, memberHistory);

    return historyByMember;
  }, new Map());
}

async function updateMemberAttendance(request, response) {
  try {
    const payload = await readJsonBody(request);
    const memberId = String(payload.memberId || "").trim();
    const visits = Number(payload.visits);
    const todayVisits = Number(payload.todayVisits ?? visits);
    const attendanceDate = String(
      payload.attendanceDate || new Date().toISOString().slice(0, 10),
    ).trim();

    if (
      !memberId ||
      !Number.isInteger(visits) ||
      visits < 0 ||
      !Number.isInteger(todayVisits) ||
      todayVisits < 0 ||
      !attendanceDate
    ) {
      sendJson(response, 400, {
        message: "A valid member and attendance count are required.",
      });
      return;
    }

    const updatedUser = await fetchClerkJson(
      `/v1/users/${encodeURIComponent(memberId)}/metadata`,
      {
        method: "PATCH",
        body: {
          private_metadata: {
            visits,
            todayVisits,
            attendanceDate,
          },
        },
      },
    );

    const db = await getDb();

    if (todayVisits > 0) {
      await db.collection("attendanceHistory").updateOne(
        {
          memberId,
          attendanceDate,
        },
        {
          $set: {
            memberId,
            attendanceDate,
            visits: todayVisits,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );
    } else {
      await db.collection("attendanceHistory").deleteOne({
        memberId,
        attendanceDate,
      });
    }

    sendJson(response, 200, {
      memberId: updatedUser.id || memberId,
      visits: getClerkMetadataVisits(updatedUser),
      todayVisits: getClerkMetadataTodayVisits(updatedUser),
      attendanceDate: getClerkMetadataAttendanceDate(updatedUser),
    });
  } catch (error) {
    console.error("Update member attendance API error:", error);
    sendJson(response, error.statusCode || 500, {
      message: error.message || "Unable to update member attendance.",
      clerk: error.clerk,
    });
  }
}

async function createStripePaymentIntent(request, response) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      sendJson(response, 500, {
        message: "STRIPE_SECRET_KEY is not configured.",
      });
      return;
    }

    const body = await readJsonBody(request);
    const paymentIntent = sanitizeStripePaymentIntent(body || {});

    if (!paymentIntent) {
      sendJson(response, 400, {
        message: "Invalid Stripe payment intent payload.",
      });
      return;
    }

    const params = new URLSearchParams({
      amount: String(paymentIntent.amount),
      currency: paymentIntent.currency,
      description: paymentIntent.description,
      receipt_email: paymentIntent.memberEmail,
      "payment_method_types[]": paymentIntent.paymentMethodType,
      "metadata[plan]": paymentIntent.plan,
      "metadata[plan_slug]": paymentIntent.planSlug,
      "metadata[member]": paymentIntent.member,
      "metadata[member_email]": paymentIntent.memberEmail,
    });

    const stripeResponse = await fetch(
      "https://api.stripe.com/v1/payment_intents",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      },
    );

    const stripePaymentIntent = await stripeResponse.json();

    if (!stripeResponse.ok) {
      sendJson(response, stripeResponse.status, {
        message:
          stripePaymentIntent.error?.message ||
          "Stripe payment intent creation failed.",
        stripe: stripePaymentIntent,
      });
      return;
    }

    sendJson(response, 200, {
      id: stripePaymentIntent.id,
      status: stripePaymentIntent.status,
      amount: stripePaymentIntent.amount,
      currency: stripePaymentIntent.currency,
      clientSecret: stripePaymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Stripe PaymentIntent API error:", error);
    sendJson(response, 500, {
      message: error.message
        ? `Unable to create Stripe payment intent: ${error.message}`
        : "Unable to create Stripe payment intent.",
    });
  }
}

async function getStripePaymentAccess(request, response) {
  try {
    const requestUrl = new URL(request.url, "http://localhost");
    const memberEmail = sanitizeEmail(requestUrl.searchParams.get("email"));
    const memberName = String(
      requestUrl.searchParams.get("memberName") || "",
    ).trim();

    if (!memberEmail) {
      sendJson(response, 400, { message: "A valid member email is required." });
      return;
    }

    const paymentIntent =
      (await findRecentStripePaymentByMember(memberEmail, memberName)) ||
      (await findStripePaymentByMetadata(memberEmail));

    if (!paymentIntent) {
      sendJson(response, 200, {
        paid: false,
        planName: "",
        planSlug: "",
        memberEmail,
      });
      return;
    }

    sendJson(
      response,
      200,
      await mapStripePaymentAccess(paymentIntent, memberEmail),
    );
  } catch (error) {
    console.error("Stripe payment access API error:", error);
    sendJson(response, error.statusCode || 500, {
      message: error.message || "Unable to verify Stripe payment access.",
      stripe: error.stripe,
    });
  }
}

async function getStripeRevenueOverview(response) {
  try {
    const months = getStripeRevenueMonths();
    const firstMonthStart = Math.floor(months[0].start.getTime() / 1000);
    const totalsByMonth = months.reduce(
      (totals, month) => ({
        ...totals,
        [month.key]: 0,
      }),
      {},
    );
    let paidInvoiceCount = 0;
    let hasMore = true;
    let startingAfter = "";

    while (hasMore) {
      const params = new URLSearchParams({
        limit: "100",
        "created[gte]": String(firstMonthStart),
      });

      if (startingAfter) {
        params.set("starting_after", startingAfter);
      }

      const stripeResponse = await fetchStripeJson(
        `/v1/payment_intents?${params.toString()}`,
      );
      const paymentIntents = stripeResponse.data || [];

      paymentIntents.forEach((paymentIntent) => {
        if (paymentIntent.status !== "succeeded") {
          return;
        }

        const createdDate = new Date((paymentIntent.created || 0) * 1000);
        const monthKey = getMonthKey(createdDate);

        if (totalsByMonth[monthKey] === undefined) {
          return;
        }

        paidInvoiceCount += 1;
        totalsByMonth[monthKey] += getStripeAmountValue(paymentIntent);
      });

      hasMore = stripeResponse.has_more === true && paymentIntents.length > 0;
      startingAfter = paymentIntents[paymentIntents.length - 1]?.id || "";
    }

    const currentMonthKey = getMonthKey(new Date());
    const revenueBars = months.map((month) => ({
      month: month.label,
      total: Math.round(totalsByMonth[month.key]),
    }));

    sendJson(response, 200, {
      monthlyRevenue: Math.round(totalsByMonth[currentMonthKey] || 0),
      paidInvoiceCount,
      revenueBars,
      source: "stripe",
    });
  } catch (error) {
    console.error("Stripe revenue overview API error:", error);
    sendJson(response, error.statusCode || 500, {
      message: error.message || "Unable to load Stripe revenue overview.",
      stripe: error.stripe,
    });
  }
}

async function getClassScheduleDocuments(db) {
  return db
    .collection("classSchedule")
    .find({ active: { $ne: false } })
    .sort({ weekday: 1 })
    .project({ _id: 0 })
    .toArray();
}

async function getMembershipPlanDocuments(db, options = {}) {
  const query = options.includeInactive ? {} : { active: { $ne: false } };

  return db
    .collection("membershipPlans")
    .find(query)
    .sort({ sortOrder: 1, name: 1 })
    .project({ _id: 0 })
    .toArray();
}

async function getTrainerDocuments(db) {
  return db
    .collection("trainers")
    .find({ active: { $ne: false } })
    .sort({ sortOrder: 1, name: 1 })
    .project({ _id: 0 })
    .toArray();
}

async function getMembershipPlans(response) {
  try {
    const db = await getDb();
    const plans = await getMembershipPlanDocuments(db);

    sendJson(response, 200, plans);
  } catch (error) {
    console.error("Membership plans API error:", error);
    sendJson(response, 500, { message: "Unable to load membership plans." });
  }
}

async function getAdminMembershipPlans(response) {
  try {
    const db = await getDb();
    const plans = await getMembershipPlanDocuments(db, {
      includeInactive: true,
    });

    sendJson(response, 200, plans);
  } catch (error) {
    console.error("Admin membership plans API error:", error);
    sendJson(response, 500, { message: "Unable to load membership plans." });
  }
}

async function getMembers(response) {
  try {
    const db = await getDb();
    const members = await getClerkMemberDocuments();
    const memberIds = members
      .map((member) => member.memberId || member.clerkUserId)
      .filter(Boolean);
    const attendanceHistoryByMember = await getAttendanceHistoryByMember(
      db,
      memberIds,
    );
    const membersWithAttendanceHistory = members.map((member) => ({
      ...member,
      attendanceHistory:
        attendanceHistoryByMember.get(member.memberId || member.clerkUserId) ||
        [],
    }));

    sendJson(response, 200, membersWithAttendanceHistory);
  } catch (error) {
    console.error("Clerk members API error:", error);
    sendJson(response, error.statusCode || 500, {
      message: error.message || "Unable to load members from Clerk.",
      clerk: error.clerk,
    });
  }
}

async function getStripePayments(response) {
  try {
    const params = new URLSearchParams({ limit: "100" });
    const stripeResponse = await fetchStripeJson(
      `/v1/payment_intents?${params.toString()}`,
    );
    const paymentIntents = stripeResponse.data || [];
    const payments = await Promise.all(
      paymentIntents.map(mapStripePaymentIntentToAdminPayment),
    );

    sendJson(response, 200, payments);
  } catch (error) {
    console.error("Stripe payments API error:", error);
    sendJson(response, error.statusCode || 500, {
      message: error.message || "Unable to load Stripe payments.",
      stripe: error.stripe,
    });
  }
}

async function addMembershipPlan(request, response) {
  try {
    const body = await readJsonBody(request);
    const plan = sanitizeMembershipPlan(body.plan || {});

    if (!plan) {
      sendJson(response, 400, { message: "Invalid membership plan payload." });
      return;
    }

    const db = await getDb();
    const existingPlan = await db
      .collection("membershipPlans")
      .findOne({ slug: plan.slug });

    if (existingPlan) {
      sendJson(response, 409, {
        message: "A membership plan with this slug already exists.",
      });
      return;
    }

    await db.collection("membershipPlans").insertOne({
      ...plan,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    sendJson(
      response,
      200,
      await getMembershipPlanDocuments(db, { includeInactive: true }),
    );
  } catch (error) {
    console.error("Add membership plan API error:", error);
    sendJson(response, 500, { message: "Unable to add membership plan." });
  }
}

async function updateMembershipPlan(request, response) {
  try {
    const body = await readJsonBody(request);
    const originalSlug = makeSlug(body.originalSlug);
    const plan = sanitizeMembershipPlan(body.plan || {});

    if (!originalSlug || !plan) {
      sendJson(response, 400, { message: "Invalid membership plan payload." });
      return;
    }

    const db = await getDb();

    if (plan.slug !== originalSlug) {
      const existingPlan = await db
        .collection("membershipPlans")
        .findOne({ slug: plan.slug });

      if (existingPlan) {
        sendJson(response, 409, {
          message: "A membership plan with this slug already exists.",
        });
        return;
      }
    }

    const result = await db.collection("membershipPlans").updateOne(
      { slug: originalSlug },
      {
        $set: {
          ...plan,
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      sendJson(response, 404, { message: "Membership plan was not found." });
      return;
    }

    sendJson(
      response,
      200,
      await getMembershipPlanDocuments(db, { includeInactive: true }),
    );
  } catch (error) {
    console.error("Update membership plan API error:", error);
    sendJson(response, 500, { message: "Unable to update membership plan." });
  }
}

async function getTrainers(response) {
  try {
    const db = await getDb();
    const trainers = await getTrainerDocuments(db);

    sendJson(response, 200, trainers);
  } catch (error) {
    console.error("Trainers API error:", error);
    sendJson(response, 500, { message: "Unable to load trainers." });
  }
}

async function addTrainer(request, response) {
  try {
    const body = await readJsonBody(request);
    const trainer = sanitizeTrainer(body.trainer || {});

    if (!trainer) {
      sendJson(response, 400, { message: "Invalid trainer payload." });
      return;
    }

    const db = await getDb();
    const existingTrainer = await db
      .collection("trainers")
      .findOne({ slug: trainer.slug });

    if (existingTrainer) {
      sendJson(response, 409, {
        message: "A trainer with this slug already exists.",
      });
      return;
    }

    await db.collection("trainers").insertOne({
      ...trainer,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    sendJson(response, 200, await getTrainerDocuments(db));
  } catch (error) {
    console.error("Add trainer API error:", error);
    sendJson(response, 500, { message: "Unable to add trainer." });
  }
}

async function updateTrainer(request, response) {
  try {
    const body = await readJsonBody(request);
    const originalSlug = makeSlug(body.originalSlug);
    const trainer = sanitizeTrainer(body.trainer || {});

    if (!originalSlug || !trainer) {
      sendJson(response, 400, { message: "Invalid trainer payload." });
      return;
    }

    const db = await getDb();

    if (trainer.slug !== originalSlug) {
      const existingTrainer = await db
        .collection("trainers")
        .findOne({ slug: trainer.slug });

      if (existingTrainer) {
        sendJson(response, 409, {
          message: "A trainer with this slug already exists.",
        });
        return;
      }
    }

    const result = await db.collection("trainers").updateOne(
      { slug: originalSlug },
      {
        $set: {
          ...trainer,
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      sendJson(response, 404, { message: "Trainer was not found." });
      return;
    }

    sendJson(response, 200, await getTrainerDocuments(db));
  } catch (error) {
    console.error("Update trainer API error:", error);
    sendJson(response, 500, { message: "Unable to update trainer." });
  }
}

async function getClassSchedule(response) {
  try {
    const db = await getDb();
    const schedule = await getClassScheduleDocuments(db);

    sendJson(response, 200, schedule);
  } catch (error) {
    console.error("Class schedule API error:", error);
    sendJson(response, 500, { message: "Unable to load class schedule." });
  }
}

async function addClassScheduleItem(request, response) {
  try {
    const body = await readJsonBody(request);
    const weekday = Number(body.weekday);
    const period = body.period;
    const classItem = sanitizeClassItem(body.classItem || {});

    if (
      !isValidWeekday(weekday) ||
      !isValidSchedulePeriod(period) ||
      !classItem
    ) {
      sendJson(response, 400, { message: "Invalid class schedule payload." });
      return;
    }

    const db = await getDb();
    const result = await db.collection("classSchedule").updateOne(
      { weekday, active: { $ne: false } },
      {
        $push: { [period]: classItem },
        $set: { updatedAt: new Date() },
      },
    );

    if (result.matchedCount === 0) {
      sendJson(response, 404, { message: "Schedule day was not found." });
      return;
    }

    sendJson(response, 200, await getClassScheduleDocuments(db));
  } catch (error) {
    console.error("Add class schedule API error:", error);
    sendJson(response, 500, { message: "Unable to add class." });
  }
}

async function updateClassScheduleItem(request, response) {
  try {
    const body = await readJsonBody(request);
    const weekday = Number(body.weekday);
    const period = body.period;
    const index = Number(body.index);
    const classItem = sanitizeClassItem(body.classItem || {});

    if (
      !isValidWeekday(weekday) ||
      !isValidSchedulePeriod(period) ||
      !Number.isInteger(index) ||
      index < 0 ||
      !classItem
    ) {
      sendJson(response, 400, { message: "Invalid class schedule payload." });
      return;
    }

    const db = await getDb();
    const result = await db.collection("classSchedule").updateOne(
      {
        weekday,
        active: { $ne: false },
        [`${period}.${index}`]: { $exists: true },
      },
      {
        $set: {
          [`${period}.${index}`]: classItem,
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      sendJson(response, 404, { message: "Class was not found." });
      return;
    }

    sendJson(response, 200, await getClassScheduleDocuments(db));
  } catch (error) {
    console.error("Update class schedule API error:", error);
    sendJson(response, 500, { message: "Unable to update class." });
  }
}

async function getSiteSettings(response) {
  try {
    const db = await getDb();
    const settings = await db
      .collection("siteSettings")
      .findOne(
        { key: "site", active: { $ne: false } },
        { projection: { _id: 0 } },
      );

    sendJson(response, 200, settings || {});
  } catch (error) {
    console.error("Site settings API error:", error);
    sendJson(response, 500, { message: "Unable to load site settings." });
  }
}

function sanitizeSiteSettings(payload, existing = {}) {
  const merged = {
    ...defaultSiteSettings,
    ...existing,
    ...payload,
    brand: {
      ...defaultSiteSettings.brand,
      ...(existing.brand || {}),
      ...(payload.brand || {}),
    },
    contact: {
      ...defaultSiteSettings.contact,
      ...(existing.contact || {}),
      ...(payload.contact || {}),
    },
  };
  const openingHours = sanitizeStringArray(
    payload.openingHours ??
      existing.openingHours ??
      defaultSiteSettings.openingHours,
  );
  const quickLinks = sanitizeStringArray(
    payload.quickLinks ?? existing.quickLinks ?? defaultSiteSettings.quickLinks,
  );
  const socials = sanitizeStringArray(
    payload.socials ?? existing.socials ?? defaultSiteSettings.socials,
  );
  const brandName = String(merged.brand.name || "").trim();
  const brandDescription = String(merged.brand.description || "").trim();
  const location = String(merged.contact.location || "").trim();
  const phone = String(merged.contact.phone || "").trim();
  const email = String(merged.contact.email || "").trim();
  const copyright = String(merged.copyright || "").trim();

  if (
    !brandName ||
    !brandDescription ||
    !location ||
    !phone ||
    !email ||
    !openingHours.length
  ) {
    return null;
  }

  return {
    key: "site",
    brand: {
      name: brandName,
      description: brandDescription,
    },
    quickLinks,
    contact: {
      location,
      phone,
      email,
    },
    openingHours,
    socials,
    copyright,
    active: true,
  };
}

async function updateSiteSettings(request, response) {
  try {
    const body = await readJsonBody(request);
    const db = await getDb();
    const existing = await db
      .collection("siteSettings")
      .findOne(
        { key: "site", active: { $ne: false } },
        { projection: { _id: 0 } },
      );
    const settings = sanitizeSiteSettings(
      body.settings || body,
      existing || {},
    );

    if (!settings) {
      sendJson(response, 400, { message: "Invalid site settings payload." });
      return;
    }

    const nextSettings = {
      ...settings,
      updatedAt: new Date(),
    };

    await db
      .collection("siteSettings")
      .updateOne(
        { key: "site" },
        { $set: nextSettings, $setOnInsert: { createdAt: new Date() } },
        { upsert: true },
      );

    sendJson(response, 200, nextSettings);
  } catch (error) {
    console.error("Update site settings API error:", error);
    sendJson(response, 500, { message: "Unable to update site settings." });
  }
}

function handleApiRequest(request, response) {
  if (request.method === "GET" && request.url === "/api/members") {
    getMembers(response);
    return true;
  }

  if (request.method === "PUT" && request.url === "/api/members/attendance") {
    updateMemberAttendance(request, response);
    return true;
  }

  if (request.method === "GET" && request.url === "/api/membership-plans") {
    getMembershipPlans(response);
    return true;
  }

  if (
    request.method === "GET" &&
    request.url === "/api/admin/membership-plans"
  ) {
    getAdminMembershipPlans(response);
    return true;
  }

  if (request.method === "GET" && request.url === "/api/stripe/payments") {
    getStripePayments(response);
    return true;
  }

  if (
    request.method === "POST" &&
    request.url === "/api/stripe/payment-intents"
  ) {
    createStripePaymentIntent(request, response);
    return true;
  }

  if (
    request.method === "GET" &&
    request.url === "/api/stripe/revenue-overview"
  ) {
    getStripeRevenueOverview(response);
    return true;
  }

  if (
    request.method === "GET" &&
    request.url.startsWith("/api/stripe/payment-access")
  ) {
    getStripePaymentAccess(request, response);
    return true;
  }

  if (request.method === "POST" && request.url === "/api/membership-plans") {
    addMembershipPlan(request, response);
    return true;
  }

  if (request.method === "PUT" && request.url === "/api/membership-plans") {
    updateMembershipPlan(request, response);
    return true;
  }

  if (request.method === "GET" && request.url === "/api/trainers") {
    getTrainers(response);
    return true;
  }

  if (request.method === "POST" && request.url === "/api/trainers") {
    addTrainer(request, response);
    return true;
  }

  if (request.method === "PUT" && request.url === "/api/trainers") {
    updateTrainer(request, response);
    return true;
  }

  if (request.method === "GET" && request.url === "/api/class-schedule") {
    getClassSchedule(response);
    return true;
  }

  if (
    request.method === "POST" &&
    request.url === "/api/class-schedule/classes"
  ) {
    addClassScheduleItem(request, response);
    return true;
  }

  if (
    request.method === "PUT" &&
    request.url === "/api/class-schedule/classes"
  ) {
    updateClassScheduleItem(request, response);
    return true;
  }

  if (request.method === "GET" && request.url === "/api/site-settings") {
    getSiteSettings(response);
    return true;
  }

  if (request.method === "PUT" && request.url === "/api/site-settings") {
    updateSiteSettings(request, response);
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
