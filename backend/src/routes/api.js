const { getDb } = require("../config/db");
const defaultClassSchedule = require("../data/defaultClassSchedule");
const defaultMembershipPlans = require("../data/defaultMembershipPlans");
const defaultSiteSettings = require("../data/defaultSiteSettings");
const defaultTrainers = require("../data/defaultTrainers");

const localClassBookingsPath = require("node:path").join(
  __dirname,
  "../data/local-class-bookings.json",
);
const localDbPaths = {
  classSchedule: require("node:path").join(
    __dirname,
    "../data/local-class-schedule.json",
  ),
  membershipPlans: require("node:path").join(
    __dirname,
    "../data/local-membership-plans.json",
  ),
  attendanceHistory: require("node:path").join(
    __dirname,
    "../data/local-attendance-history.json",
  ),
  members: require("node:path").join(
    __dirname,
    "../data/local-members.json",
  ),
  siteSettings: require("node:path").join(
    __dirname,
    "../data/local-site-settings.json",
  ),
  trainers: require("node:path").join(
    __dirname,
    "../data/local-trainers.json",
  ),
  trainerBookings: require("node:path").join(
    __dirname,
    "../data/local-trainer-bookings.json",
  ),
};
const localDbDefaults = {
  classSchedule: defaultClassSchedule,
  crowdStatus: {
    active: false,
    peopleCount: 0,
    capacity: 70,
    capacityPercent: 0,
    label: "Offline",
    tone: "yellow",
    updatedAt: null,
  },
  membershipPlans: defaultMembershipPlans,
  attendanceHistory: [],
  members: [
    {
      memberId: "local-member-kaung-zaw-hein",
      name: "Kaung Zaw Hein",
      email: "kaungzawhein972@gmail.com",
      phone: "",
      plan: "Standard",
      planSlug: "standard",
      status: "Active",
      joined: "2026-08-08",
      renewal: "2026-09-08",
      visits: 2,
      todayVisits: 0,
      attendanceDate: "",
      tone: "yellow",
      clerkUserId: "local-member-kaung-zaw-hein",
      lastSignIn: "",
    },
    {
      memberId: "local-member-myo-thant-naing",
      name: "Myo Thant Naing",
      email: "myothantnaing@gmail.com",
      phone: "",
      plan: "Premium",
      planSlug: "premium",
      status: "Active",
      joined: "2026-08-08",
      renewal: "2026-09-08",
      visits: 3,
      todayVisits: 0,
      attendanceDate: "",
      tone: "red",
      clerkUserId: "local-member-myo-thant-naing",
      lastSignIn: "",
    },
  ],
  siteSettings: defaultSiteSettings,
  trainers: defaultTrainers,
  trainerBookings: [],
};

const ADMIN_ROLE = "admin";
const MEMBERSHIP_PERIOD_SECONDS = 30 * 24 * 60 * 60;
const STANDARD_CLASS_BOOKING_LIMIT = 3;
const TRAINER_BOOKING_LIMITS = {
  basic: 0,
  standard: 2,
  premium: 4,
};
const PUBLIC_API_TIMEOUT_MS = 3000;
const USER_ACTION_API_TIMEOUT_MS = 1500;
const DB_READ_CACHE_TTL_MS = 30_000;
const CROWD_STATUS_FRESHNESS_MS = 12_000;
const dbReadCache = new Map();
let liveCrowdStatus = structuredClone(localDbDefaults.crowdStatus);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

function getDbWithTimeout(ms = USER_ACTION_API_TIMEOUT_MS) {
  return withTimeout(getDb(), ms, "Database connection timed out.");
}

async function getCachedDbRead(cacheKey, loader, ttl = DB_READ_CACHE_TTL_MS) {
  const cachedValue = dbReadCache.get(cacheKey);

  if (cachedValue && Date.now() - cachedValue.createdAt < ttl) {
    return structuredClone(cachedValue.value);
  }

  const value = await loader();
  dbReadCache.set(cacheKey, {
    createdAt: Date.now(),
    value: structuredClone(value),
  });

  return value;
}

function clearDbReadCache(...cacheKeys) {
  if (cacheKeys.length === 0) {
    dbReadCache.clear();
    return;
  }

  cacheKeys.forEach((cacheKey) => dbReadCache.delete(cacheKey));
}

function isMongoDisabledError(error) {
  return String(error?.message || "").startsWith("MongoDB is disabled");
}

function logApiError(label, error) {
  if (isMongoDisabledError(error)) {
    console.warn(`${label}: MongoDB disabled; using local fallback data.`);
    return;
  }

  if (
    error?.statusCode === 401 ||
    error?.statusCode === 403 ||
    error?.statusCode === 404
  ) {
    console.warn(
      `${label}: external service unavailable; using local fallback data.`,
    );
    return;
  }

  console.error(`${label}:`, error);
}

function readLocalClassBookings() {
  try {
    const rawBookings = require("node:fs").readFileSync(
      localClassBookingsPath,
      "utf8",
    );
    const bookings = JSON.parse(rawBookings);

    return Array.isArray(bookings) ? bookings : [];
  } catch {
    return [];
  }
}

function writeLocalClassBookings(bookings) {
  require("node:fs").writeFileSync(
    localClassBookingsPath,
    `${JSON.stringify(bookings, null, 2)}\n`,
  );
}

function readLocalCollection(collectionName) {
  const filePath = localDbPaths[collectionName];

  try {
    const rawValue = require("node:fs").readFileSync(filePath, "utf8");
    const parsedValue = JSON.parse(rawValue);

    return parsedValue;
  } catch {
    return structuredClone(localDbDefaults[collectionName]);
  }
}

function writeLocalCollection(collectionName, value) {
  require("node:fs").writeFileSync(
    localDbPaths[collectionName],
    `${JSON.stringify(value, null, 2)}\n`,
  );
}

function getLocalMembershipPlans(options = {}) {
  const plans = readLocalCollection("membershipPlans");

  return (
    options.includeInactive
      ? plans
      : plans.filter((plan) => plan.active !== false)
  ).sort((firstPlan, secondPlan) => {
    const sortDelta =
      Number(firstPlan.sortOrder || 0) - Number(secondPlan.sortOrder || 0);
    return (
      sortDelta || String(firstPlan.name).localeCompare(String(secondPlan.name))
    );
  });
}

function getLocalTrainers() {
  return readLocalCollection("trainers")
    .filter((trainer) => trainer.active !== false)
    .sort((firstTrainer, secondTrainer) => {
      const sortDelta =
        Number(firstTrainer.sortOrder || 0) -
        Number(secondTrainer.sortOrder || 0);
      return (
        sortDelta ||
        String(firstTrainer.name).localeCompare(String(secondTrainer.name))
      );
    });
}

function getLocalClassSchedule() {
  return readLocalCollection("classSchedule")
    .filter((daySchedule) => daySchedule.active !== false)
    .sort(
      (firstDay, secondDay) =>
        Number(firstDay.weekday) - Number(secondDay.weekday),
    );
}

function getLocalSiteSettings() {
  return readLocalCollection("siteSettings") || defaultSiteSettings;
}

function getLocalMembers() {
  const members = readLocalCollection("members");
  const attendanceHistory = readLocalCollection("attendanceHistory");

  return members.map((member, index) => {
    const memberId = member.memberId || member.clerkUserId || member.email;

    return {
      ...member,
      memberId,
      clerkUserId: member.clerkUserId || memberId,
      tone: member.tone || ["blue", "red", "yellow", "green"][index % 4],
      attendanceHistory: attendanceHistory
        .filter((record) => record.memberId === memberId)
        .sort((firstRecord, secondRecord) =>
          String(secondRecord.attendanceDate).localeCompare(
            String(firstRecord.attendanceDate),
          ),
        )
        .map((record) => ({
          attendanceDate: record.attendanceDate,
          visits: Number(record.visits || 0),
        })),
    };
  });
}

function getLocalAttendanceHistoryByMember(memberIds) {
  const memberIdSet = new Set(memberIds);
  const attendanceHistory = readLocalCollection("attendanceHistory")
    .filter((record) => memberIdSet.has(record.memberId))
    .sort((firstRecord, secondRecord) =>
      String(secondRecord.attendanceDate).localeCompare(
        String(firstRecord.attendanceDate),
      ),
    );

  return attendanceHistory.reduce((historyByMember, record) => {
    const memberHistory = historyByMember.get(record.memberId) || [];

    memberHistory.push({
      attendanceDate: record.attendanceDate,
      visits: Number(record.visits || 0),
    });
    historyByMember.set(record.memberId, memberHistory);

    return historyByMember;
  }, new Map());
}

function updateLocalMemberAttendance({
  memberId,
  visits,
  todayVisits,
  attendanceDate,
}) {
  const members = readLocalCollection("members");
  const memberIndex = members.findIndex(
    (member) =>
      member.memberId === memberId ||
      member.clerkUserId === memberId ||
      member.email === memberId,
  );

  if (memberIndex < 0) {
    return null;
  }

  const resolvedMemberId =
    members[memberIndex].memberId ||
    members[memberIndex].clerkUserId ||
    memberId;
  const nextMembers = [...members];
  nextMembers[memberIndex] = {
    ...nextMembers[memberIndex],
    memberId: resolvedMemberId,
    clerkUserId: nextMembers[memberIndex].clerkUserId || resolvedMemberId,
    visits,
    todayVisits,
    attendanceDate,
  };
  writeLocalCollection("members", nextMembers);
  clearDbReadCache();

  const attendanceHistory = readLocalCollection("attendanceHistory");
  const remainingHistory = attendanceHistory.filter(
    (record) =>
      record.memberId !== resolvedMemberId ||
      record.attendanceDate !== attendanceDate,
  );
  const nextHistory =
    todayVisits > 0
      ? [
          ...remainingHistory,
          {
            memberId: resolvedMemberId,
            attendanceDate,
            visits: todayVisits,
            updatedAt: new Date().toISOString(),
          },
        ]
      : remainingHistory;
  writeLocalCollection("attendanceHistory", nextHistory);
  clearDbReadCache();

  return {
    memberId: resolvedMemberId,
    visits,
    todayVisits,
    attendanceDate,
  };
}

function getActiveBookingsForMember(bookings, memberEmail) {
  return bookings
    .filter(
      (booking) =>
        booking.memberEmail === memberEmail && booking.active !== false,
    )
    .sort((firstBooking, secondBooking) =>
      `${firstBooking.classDate} ${firstBooking.classTime}`.localeCompare(
        `${secondBooking.classDate} ${secondBooking.classTime}`,
      ),
    )
    .map(
      ({ active, createdAt, updatedAt, cancelledAt, ...booking }) => booking,
    );
}

function getBookingCountsByClassId(bookings) {
  return bookings.reduce((counts, booking) => {
    if (booking.active === false) {
      return counts;
    }

    counts[booking.classId] = (counts[booking.classId] || 0) + 1;
    return counts;
  }, {});
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
  const capacity = Number(payload.capacity);

  if (
    !name ||
    !time ||
    !duration ||
    !category ||
    !color ||
    !Number.isInteger(trainerIndex) ||
    !Number.isInteger(capacity) ||
    capacity < 1
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
    capacity,
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

function hasAdminRoleValue(value) {
  if (Array.isArray(value)) {
    return value.includes(ADMIN_ROLE);
  }

  return value === ADMIN_ROLE;
}

function isClerkAdminUser(user) {
  const metadata = user.public_metadata || user.publicMetadata || {};

  return (
    metadata.isAdmin === true ||
    hasAdminRoleValue(metadata.role) ||
    hasAdminRoleValue(metadata.roles)
  );
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

function sanitizeStripeSubscription(payload) {
  const subscription = sanitizeStripePaymentIntent({
    ...payload,
    paymentMethodType: "card",
  });

  if (!subscription) {
    return null;
  }

  return subscription;
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

function sanitizeClassBooking(payload) {
  const memberEmail = sanitizeEmail(payload.memberEmail);
  const memberName = String(payload.memberName || "Member").trim();
  const classId = String(payload.classId || "").trim();
  const className = String(payload.className || "").trim();
  const classTime = String(payload.classTime || "").trim();
  const classDate = String(payload.classDate || "").trim();
  const trainerName = String(payload.trainerName || "").trim();
  const category = String(payload.category || "")
    .trim()
    .toUpperCase();
  const capacity = Number(payload.capacity);

  if (
    !memberEmail ||
    !classId ||
    !className ||
    !classTime ||
    !classDate ||
    !Number.isInteger(capacity) ||
    capacity < 1
  ) {
    return null;
  }

  return {
    memberEmail,
    memberName: memberName || "Member",
    classId,
    className,
    classTime,
    classDate,
    trainerName,
    category,
    capacity,
  };
}

function sanitizeTrainerBooking(payload) {
  const memberEmail = sanitizeEmail(payload.memberEmail);
  const memberName = String(payload.memberName || "Member").trim();
  const trainerSlug = makeSlug(payload.trainerSlug);
  const trainerName = String(payload.trainerName || "").trim();
  const sessionDate = String(payload.sessionDate || "").trim();
  const sessionTime = String(payload.sessionTime || "").trim();
  const action = payload.action === "cancel" ? "cancel" : "book";

  if (
    !memberEmail ||
    !trainerSlug ||
    !trainerName ||
    !/^\d{4}-\d{2}-\d{2}$/.test(sessionDate) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(sessionTime)
  ) {
    return null;
  }

  return {
    action,
    memberEmail,
    memberName: memberName || "Member",
    trainerSlug,
    trainerName,
    sessionDate,
    sessionTime,
  };
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
      funding: card.funding || "",
      expMonth: card.exp_month || null,
      expYear: card.exp_year || null,
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
  const localPlan = getLocalMembershipPlans({ includeInactive: true }).find(
    (item) => {
      const price = getPriceValue(item);

      return Math.round(price * 100) === amount || Math.round(price) === amount;
    },
  );

  if (localPlan) {
    return {
      planName: localPlan.name,
      planSlug: localPlan.slug,
    };
  }

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
    logApiError("Stripe plan inference error", error);
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
  const currentPeriodEnd = access.created
    ? access.created + MEMBERSHIP_PERIOD_SECONDS
    : null;
  const isCurrentPeriodActive = currentPeriodEnd
    ? currentPeriodEnd > Math.floor(Date.now() / 1000)
    : access.paid;

  if (!access.planName) {
    const inferredPlan = await inferPlanFromAmount(access.amount);

    if (inferredPlan) {
      access.planName = inferredPlan.planName;
      access.planSlug = inferredPlan.planSlug;
    }
  }

  return {
    ...access,
    hasPaymentHistory: true,
    paid: access.paid && isCurrentPeriodActive,
    memberEmail: access.memberEmail || memberEmail,
    currentPeriodStart: access.created || null,
    currentPeriodEnd,
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

async function findOrCreateStripeCustomer({ memberEmail, memberName }) {
  const existingCustomer = await findStripeCustomerByEmail(memberEmail);

  if (existingCustomer?.id) {
    return existingCustomer;
  }

  const params = new URLSearchParams({
    email: memberEmail,
    name: memberName || memberEmail,
    "metadata[member_email]": memberEmail,
  });

  return fetchStripeJson("/v1/customers", {
    method: "POST",
    params,
  });
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
  params.append("expand[]", "data.items.data.price");

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
  const currentPeriodStart =
    subscription?.current_period_start ||
    item?.current_period_start ||
    subscription?.created ||
    null;
  const currentPeriodEnd =
    subscription?.current_period_end ||
    item?.current_period_end ||
    (currentPeriodStart
      ? currentPeriodStart + MEMBERSHIP_PERIOD_SECONDS
      : null);

  return {
    id: subscription?.id || "",
    hasPaymentHistory: true,
    paid: ["active", "trialing", "past_due"].includes(subscription?.status),
    status: subscription?.status || "",
    amount: Number(price?.unit_amount || price?.unit_amount_decimal || 0),
    currency: price?.currency || "thb",
    planName: plan?.planName || "",
    planSlug: plan?.planSlug || "",
    memberEmail,
    created: subscription?.created || null,
    currentPeriodStart,
    currentPeriodEnd,
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
      hasPaymentHistory: false,
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
      hasPaymentHistory: false,
      planName: "",
      planSlug: "",
      memberEmail,
    };
  }

  return mapStripePaymentAccess(paymentIntent, memberEmail);
}

function getLocalBookingMembershipAccess(memberEmail) {
  const member = readLocalCollection("members").find(
    (item) => sanitizeEmail(item.email) === memberEmail,
  );

  if (!member) {
    return null;
  }

  return {
    paid: String(member.status || "").toLowerCase() === "active",
    planName: member.plan || "",
    planSlug: makeSlug(member.planSlug || member.plan),
    memberEmail,
    currentPeriodStartDate: member.joined || "",
    currentPeriodEndDate: member.renewal || "",
  };
}

async function getClassBookingMembershipAccess(memberEmail, memberName) {
  const cacheKey = `class-booking-membership:${memberEmail}`;

  try {
    const stripeAccess = await getCachedDbRead(
      cacheKey,
      () => getStripePaymentAccessForEmail(memberEmail, memberName),
      60_000,
    );

    if (stripeAccess.paid || stripeAccess.hasPaymentHistory) {
      return stripeAccess;
    }
  } catch (error) {
    logApiError("Class booking membership lookup error", error);
  }

  return (
    getLocalBookingMembershipAccess(memberEmail) || {
      paid: false,
      planName: "",
      planSlug: "",
      memberEmail,
    }
  );
}

function getClassBookingPeriod(access) {
  const startDate =
    access.currentPeriodStartDate ||
    formatIsoDate(access.currentPeriodStart * 1000);
  const endDate =
    access.currentPeriodEndDate ||
    formatIsoDate(access.currentPeriodEnd * 1000);

  return { startDate, endDate };
}

function getClassBookingRuleError(access, booking, periodBookingCount) {
  if (!access?.paid) {
    return "An active membership is required to book classes.";
  }

  const planSlug = makeSlug(access.planSlug || access.planName);

  if (planSlug === "basic") {
    return "Basic membership does not include class bookings.";
  }

  if (planSlug === "premium") {
    return "";
  }

  if (planSlug !== "standard") {
    return "Your membership plan does not include class booking access.";
  }

  const { startDate, endDate } = getClassBookingPeriod(access);

  if (
    !startDate ||
    !endDate ||
    booking.classDate < startDate ||
    booking.classDate >= endDate
  ) {
    return "This class is outside your current membership month.";
  }

  if (periodBookingCount >= STANDARD_CLASS_BOOKING_LIMIT) {
    return "Standard membership includes 3 class bookings per membership month.";
  }

  return "";
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
  const userList = (Array.isArray(users) ? users : users.data || []).filter(
    (user) => !isClerkAdminUser(user),
  );

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
  let memberId = "";
  let visits = 0;
  let todayVisits = 0;
  let attendanceDate = "";

  try {
    const payload = await readJsonBody(request);
    memberId = String(payload.memberId || "").trim();
    visits = Number(payload.visits);
    todayVisits = Number(payload.todayVisits ?? visits);
    attendanceDate = String(
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
    clearDbReadCache();

    sendJson(response, 200, {
      memberId: updatedUser.id || memberId,
      visits: getClerkMetadataVisits(updatedUser),
      todayVisits: getClerkMetadataTodayVisits(updatedUser),
      attendanceDate: getClerkMetadataAttendanceDate(updatedUser),
    });
  } catch (error) {
    logApiError("Update member attendance API error", error);

    if (memberId && attendanceDate) {
      const localAttendance = updateLocalMemberAttendance({
        memberId,
        visits,
        todayVisits,
        attendanceDate,
      });

      if (localAttendance) {
        sendJson(response, 200, localAttendance);
        return;
      }
    }

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

async function createStripeMembershipProduct(subscription) {
  const params = new URLSearchParams({
    name: `FitZone ${subscription.plan} Membership`,
    "metadata[plan]": subscription.plan,
    "metadata[plan_slug]": subscription.planSlug,
  });

  return fetchStripeJson("/v1/products", {
    method: "POST",
    params,
  });
}

async function createStripeSubscription(request, response) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      sendJson(response, 500, {
        message: "STRIPE_SECRET_KEY is not configured.",
      });
      return;
    }

    const body = await readJsonBody(request);
    const subscription = sanitizeStripeSubscription(body || {});

    if (!subscription) {
      sendJson(response, 400, {
        message: "Invalid Stripe subscription payload.",
      });
      return;
    }

    const customer = await findOrCreateStripeCustomer({
      memberEmail: subscription.memberEmail,
      memberName: subscription.member,
    });
    const product = await createStripeMembershipProduct(subscription);

    const params = new URLSearchParams({
      customer: customer.id,
      payment_behavior: "default_incomplete",
      "payment_settings[payment_method_types][]": "card",
      "payment_settings[save_default_payment_method]": "on_subscription",
      "items[0][price_data][currency]": subscription.currency,
      "items[0][price_data][unit_amount]": String(subscription.amount),
      "items[0][price_data][recurring][interval]": "month",
      "items[0][price_data][product]": product.id,
      "metadata[plan]": subscription.plan,
      "metadata[plan_slug]": subscription.planSlug,
      "metadata[member]": subscription.member,
      "metadata[member_email]": subscription.memberEmail,
      "expand[0]": "latest_invoice.payment_intent",
      "expand[1]": "latest_invoice.confirmation_secret",
      "expand[2]": "pending_setup_intent",
    });

    const stripeSubscription = await fetchStripeJson("/v1/subscriptions", {
      method: "POST",
      params,
    });
    const invoice = stripeSubscription.latest_invoice;
    const paymentIntent = stripeSubscription.latest_invoice?.payment_intent;
    const confirmationSecret = invoice?.confirmation_secret;
    const setupIntent = stripeSubscription.pending_setup_intent;
    const clientSecret =
      paymentIntent?.client_secret ||
      confirmationSecret?.client_secret ||
      setupIntent?.client_secret ||
      "";
    const intentType = setupIntent?.client_secret ? "setup" : "payment";

    if (!clientSecret) {
      sendJson(response, 502, {
        message: "Stripe did not return a subscription client secret.",
        stripe: stripeSubscription,
      });
      return;
    }

    sendJson(response, 200, {
      id: stripeSubscription.id,
      status: stripeSubscription.status,
      customerId: customer.id,
      currentPeriodEnd: stripeSubscription.current_period_end || null,
      intentType,
      paymentIntentId: paymentIntent?.id || confirmationSecret?.id || "",
      paymentIntentStatus: paymentIntent?.status || "",
      clientSecret,
    });
  } catch (error) {
    console.error("Stripe subscription API error:", error);
    sendJson(response, error.statusCode || 500, {
      message: error.message
        ? `Unable to create Stripe subscription: ${error.message}`
        : "Unable to create Stripe subscription.",
      stripe: error.stripe,
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

    sendJson(
      response,
      200,
      await getStripePaymentAccessForEmail(memberEmail, memberName),
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
    logApiError("Stripe revenue overview API error", error);
    const months = getStripeRevenueMonths();

    sendJson(response, 200, {
      monthlyRevenue: 0,
      paidInvoiceCount: 0,
      revenueBars: months.map((month) => ({
        month: month.label,
        total: 0,
      })),
      source: "local",
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
    const plans = await getCachedDbRead("membershipPlans:active", async () => {
      const db = await withTimeout(
        getDb(),
        PUBLIC_API_TIMEOUT_MS,
        "Membership plans database connection timed out.",
      );
      return getMembershipPlanDocuments(db);
    });

    sendJson(response, 200, plans);
  } catch (error) {
    logApiError("Membership plans API error", error);
    sendJson(response, 200, getLocalMembershipPlans());
  }
}

async function getAdminMembershipPlans(response) {
  try {
    const plans = await getCachedDbRead("membershipPlans:admin", async () => {
      const db = await getDb();
      return getMembershipPlanDocuments(db, {
        includeInactive: true,
      });
    });

    sendJson(response, 200, plans);
  } catch (error) {
    logApiError("Admin membership plans API error", error);
    sendJson(response, 200, getLocalMembershipPlans({ includeInactive: true }));
  }
}

async function getMembers(response) {
  try {
    const members = await withTimeout(
      getClerkMemberDocuments(),
      PUBLIC_API_TIMEOUT_MS,
      "Clerk members request timed out.",
    );
    const memberIds = members
      .map((member) => member.memberId || member.clerkUserId)
      .filter(Boolean);
    let attendanceHistoryByMember = new Map();

    try {
      const attendanceCacheKey = `attendanceHistory:${memberIds.sort().join(",")}`;
      attendanceHistoryByMember = await getCachedDbRead(
        attendanceCacheKey,
        async () => {
          const db = await getDb();
          return getAttendanceHistoryByMember(db, memberIds);
        },
        10_000,
      );
    } catch (attendanceError) {
      logApiError("Member attendance history API error", attendanceError);
      attendanceHistoryByMember = getLocalAttendanceHistoryByMember(memberIds);
    }

    const membersWithAttendanceHistory = members.map((member) => ({
      ...member,
      attendanceHistory:
        attendanceHistoryByMember.get(member.memberId || member.clerkUserId) ||
        [],
    }));

    sendJson(response, 200, membersWithAttendanceHistory);
  } catch (error) {
    logApiError("Clerk members API error", error);
    sendJson(response, 200, getLocalMembers());
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
    logApiError("Stripe payments API error", error);
    sendJson(response, 200, []);
  }
}

async function getMemberStripePayments(request, response) {
  const requestUrl = new URL(request.url, "http://localhost");
  const memberEmail = sanitizeEmail(requestUrl.searchParams.get("email"));

  if (!memberEmail) {
    sendJson(response, 400, { message: "A valid member email is required." });
    return;
  }

  try {
    const params = new URLSearchParams({ limit: "100" });
    const stripeResponse = await fetchStripeJson(
      `/v1/payment_intents?${params.toString()}`,
    );
    const matchingPaymentIntents = [];

    for (const paymentIntent of stripeResponse.data || []) {
      if (paymentIntentMatchesEmail(paymentIntent, memberEmail)) {
        matchingPaymentIntents.push(paymentIntent);
        continue;
      }

      const charge = paymentIntent.latest_charge
        ? await getStripeCharge(paymentIntent.latest_charge).catch(() => null)
        : null;
      const chargeEmail = sanitizeEmail(
        charge?.billing_details?.email || charge?.receipt_email,
      );

      if (chargeEmail === memberEmail) {
        matchingPaymentIntents.push(paymentIntent);
      }
    }

    const payments = await Promise.all(
      matchingPaymentIntents.map(mapStripePaymentIntentToAdminPayment),
    );

    payments.sort((left, right) => String(right.date).localeCompare(left.date));
    sendJson(response, 200, payments);
  } catch (error) {
    logApiError("Member Stripe payments API error", error);
    sendJson(response, 200, []);
  }
}

async function createStripeBillingPortalSession(request, response) {
  try {
    const body = await readJsonBody(request);
    const memberEmail = sanitizeEmail(body?.email);

    if (!memberEmail) {
      sendJson(response, 400, { message: "A valid member email is required." });
      return;
    }

    const customer = await findStripeCustomerByEmail(memberEmail);

    if (!customer?.id) {
      sendJson(response, 404, {
        message: "No Stripe customer was found for this account.",
      });
      return;
    }

    const host = request.headers.host || "localhost:5173";
    const protocol = request.headers["x-forwarded-proto"] || "http";
    const params = new URLSearchParams({
      customer: customer.id,
      return_url: `${protocol}://${host}/dashboard#Payments`,
    });
    const session = await fetchStripeJson("/v1/billing_portal/sessions", {
      method: "POST",
      params,
    });

    sendJson(response, 200, { url: session.url || "" });
  } catch (error) {
    logApiError("Stripe billing portal API error", error);
    sendJson(response, error.statusCode || 500, {
      message: error.message || "Unable to open Stripe billing settings.",
    });
  }
}

async function addMembershipPlan(request, response) {
  let plan = null;

  try {
    const body = await readJsonBody(request);
    plan = sanitizeMembershipPlan(body.plan || {});

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
    clearDbReadCache("membershipPlans:active", "membershipPlans:admin");

    sendJson(
      response,
      200,
      await getMembershipPlanDocuments(db, { includeInactive: true }),
    );
  } catch (error) {
    const plans = getLocalMembershipPlans({ includeInactive: true });

    if (plan) {
      if (plans.some((existingPlan) => existingPlan.slug === plan.slug)) {
        sendJson(response, 409, {
          message: "A membership plan with this slug already exists.",
        });
        return;
      }

      plans.push({
        ...plan,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      writeLocalCollection("membershipPlans", plans);
      sendJson(
        response,
        200,
        getLocalMembershipPlans({ includeInactive: true }),
      );
      return;
    }

    console.error("Add membership plan API error:", error);
    sendJson(response, 500, { message: "Unable to add membership plan." });
  }
}

async function updateMembershipPlan(request, response) {
  let originalSlug = "";
  let plan = null;

  try {
    const body = await readJsonBody(request);
    originalSlug = makeSlug(body.originalSlug);
    plan = sanitizeMembershipPlan(body.plan || {});

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
    clearDbReadCache("membershipPlans:active", "membershipPlans:admin");

    sendJson(
      response,
      200,
      await getMembershipPlanDocuments(db, { includeInactive: true }),
    );
  } catch (error) {
    const plans = getLocalMembershipPlans({ includeInactive: true });

    if (originalSlug && plan) {
      if (
        plan.slug !== originalSlug &&
        plans.some((existingPlan) => existingPlan.slug === plan.slug)
      ) {
        sendJson(response, 409, {
          message: "A membership plan with this slug already exists.",
        });
        return;
      }

      const planIndex = plans.findIndex(
        (existingPlan) => existingPlan.slug === originalSlug,
      );

      if (planIndex === -1) {
        sendJson(response, 404, { message: "Membership plan was not found." });
        return;
      }

      plans[planIndex] = {
        ...plans[planIndex],
        ...plan,
        updatedAt: new Date().toISOString(),
      };
      writeLocalCollection("membershipPlans", plans);
      sendJson(
        response,
        200,
        getLocalMembershipPlans({ includeInactive: true }),
      );
      return;
    }

    console.error("Update membership plan API error:", error);
    sendJson(response, 500, { message: "Unable to update membership plan." });
  }
}

async function getTrainers(response) {
  try {
    const trainers = await getCachedDbRead("trainers:active", async () => {
      const db = await withTimeout(
        getDb(),
        PUBLIC_API_TIMEOUT_MS,
        "Trainers database connection timed out.",
      );
      return getTrainerDocuments(db);
    });

    sendJson(response, 200, trainers);
  } catch (error) {
    logApiError("Trainers API error", error);
    sendJson(response, 200, getLocalTrainers());
  }
}

async function addTrainer(request, response) {
  let trainer = null;

  try {
    const body = await readJsonBody(request);
    trainer = sanitizeTrainer(body.trainer || {});

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
    clearDbReadCache("trainers:active");

    sendJson(response, 200, await getTrainerDocuments(db));
  } catch (error) {
    const trainers = readLocalCollection("trainers");

    if (trainer) {
      if (
        trainers.some(
          (existingTrainer) => existingTrainer.slug === trainer.slug,
        )
      ) {
        sendJson(response, 409, {
          message: "A trainer with this slug already exists.",
        });
        return;
      }

      trainers.push({
        ...trainer,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      writeLocalCollection("trainers", trainers);
      sendJson(response, 200, getLocalTrainers());
      return;
    }

    console.error("Add trainer API error:", error);
    sendJson(response, 500, { message: "Unable to add trainer." });
  }
}

async function updateTrainer(request, response) {
  let originalSlug = "";
  let trainer = null;

  try {
    const body = await readJsonBody(request);
    originalSlug = makeSlug(body.originalSlug);
    trainer = sanitizeTrainer(body.trainer || {});

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
    clearDbReadCache("trainers:active");

    sendJson(response, 200, await getTrainerDocuments(db));
  } catch (error) {
    const trainers = readLocalCollection("trainers");

    if (originalSlug && trainer) {
      if (
        trainer.slug !== originalSlug &&
        trainers.some(
          (existingTrainer) => existingTrainer.slug === trainer.slug,
        )
      ) {
        sendJson(response, 409, {
          message: "A trainer with this slug already exists.",
        });
        return;
      }

      const trainerIndex = trainers.findIndex(
        (existingTrainer) => existingTrainer.slug === originalSlug,
      );

      if (trainerIndex === -1) {
        sendJson(response, 404, { message: "Trainer was not found." });
        return;
      }

      trainers[trainerIndex] = {
        ...trainers[trainerIndex],
        ...trainer,
        updatedAt: new Date().toISOString(),
      };
      writeLocalCollection("trainers", trainers);
      sendJson(response, 200, getLocalTrainers());
      return;
    }

    console.error("Update trainer API error:", error);
    sendJson(response, 500, { message: "Unable to update trainer." });
  }
}

async function getClassSchedule(response) {
  try {
    const schedule = await getCachedDbRead("classSchedule:active", async () => {
      const db = await withTimeout(
        getDb(),
        PUBLIC_API_TIMEOUT_MS,
        "Class schedule database connection timed out.",
      );
      return getClassScheduleDocuments(db);
    });

    sendJson(response, 200, schedule);
  } catch (error) {
    logApiError("Class schedule API error", error);
    sendJson(response, 200, getLocalClassSchedule());
  }
}

function getActiveLocalTrainerBookings(memberEmail) {
  return readLocalCollection("trainerBookings")
    .filter(
      (booking) =>
        booking.memberEmail === memberEmail && booking.active !== false,
    )
    .sort((left, right) =>
      `${left.sessionDate} ${left.sessionTime}`.localeCompare(
        `${right.sessionDate} ${right.sessionTime}`,
      ),
    );
}

function getProgressStreak(attendanceHistory, todayIso) {
  const attendedDates = new Set(
    attendanceHistory
      .filter((record) => Number(record.visits || 0) > 0)
      .map((record) => record.attendanceDate),
  );
  const cursor = new Date(`${todayIso}T00:00:00`);

  if (!attendedDates.has(todayIso)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;

  while (attendedDates.has(formatIsoDate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function buildMemberProgress(
  attendanceHistory,
  classBookings,
  trainerBookings,
) {
  const now = new Date();
  const todayIso = formatIsoDate(now);
  const monthKey = todayIso.slice(0, 7);
  const monthlyAttendance = attendanceHistory.filter(
    (record) =>
      String(record.attendanceDate || "").startsWith(monthKey) &&
      Number(record.visits || 0) > 0,
  );
  const normalizedAttendance = [...attendanceHistory]
    .filter((record) => Number(record.visits || 0) > 0)
    .sort((left, right) =>
      String(right.attendanceDate).localeCompare(left.attendanceDate),
    )
    .map((record) => ({
      attendanceDate: record.attendanceDate,
      visits: Number(record.visits || 0),
    }));

  return {
    summary: {
      workoutStreak: getProgressStreak(attendanceHistory, todayIso),
      visitsThisMonth: monthlyAttendance.reduce(
        (total, record) => total + Number(record.visits || 0),
        0,
      ),
      activeDaysThisMonth: monthlyAttendance.length,
      classesBookedThisMonth: classBookings.filter(
        (booking) =>
          booking.active !== false &&
          String(booking.classDate || "").startsWith(monthKey),
      ).length,
      trainerSessionsThisMonth: trainerBookings.filter(
        (booking) =>
          booking.active !== false &&
          String(booking.sessionDate || "").startsWith(monthKey),
      ).length,
    },
    attendanceHistory: normalizedAttendance,
    recentAttendance: normalizedAttendance.slice(0, 5),
  };
}

async function getMemberProgress(request, response) {
  const requestUrl = new URL(request.url, "http://localhost");
  const memberEmail = sanitizeEmail(requestUrl.searchParams.get("email"));
  const requestedMemberId = String(
    requestUrl.searchParams.get("memberId") || "",
  ).trim();
  const localMember = readLocalCollection("members").find(
    (member) => sanitizeEmail(member.email) === memberEmail,
  );
  const memberId = requestedMemberId || localMember?.memberId || "";
  const memberIds = [
    requestedMemberId,
    localMember?.memberId,
    localMember?.clerkUserId,
  ].filter((value, index, values) => value && values.indexOf(value) === index);

  if (!memberEmail || !memberId) {
    sendJson(response, 400, {
      message: "A valid member email and member ID are required.",
    });
    return;
  }

  try {
    const db = await getDbWithTimeout();
    const [attendanceHistory, classBookings, trainerBookings] =
      await Promise.all([
        db
          .collection("attendanceHistory")
          .find({ memberId: { $in: memberIds } })
          .project({ _id: 0, attendanceDate: 1, visits: 1 })
          .toArray(),
        db
          .collection("classBookings")
          .find({ memberEmail, active: { $ne: false } })
          .project({ _id: 0, classDate: 1, active: 1 })
          .toArray(),
        db
          .collection("trainerBookings")
          .find({ memberEmail, active: { $ne: false } })
          .project({ _id: 0, sessionDate: 1, active: 1 })
          .toArray(),
      ]);
    sendJson(
      response,
      200,
      buildMemberProgress(attendanceHistory, classBookings, trainerBookings),
    );
  } catch (error) {
    logApiError("Member progress API error", error);
    const attendanceHistory = readLocalCollection("attendanceHistory").filter(
      (record) => memberIds.includes(record.memberId),
    );
    const classBookings = readLocalClassBookings().filter(
      (booking) => booking.memberEmail === memberEmail,
    );
    const trainerBookings = readLocalCollection("trainerBookings").filter(
      (booking) => booking.memberEmail === memberEmail,
    );
    sendJson(
      response,
      200,
      buildMemberProgress(attendanceHistory, classBookings, trainerBookings),
    );
  }
}

function getTrainerBookingLimit(access) {
  const planSlug = makeSlug(access?.planSlug || access?.planName);
  return TRAINER_BOOKING_LIMITS[planSlug] ?? 0;
}

function getTrainerBookingRuleError(access, booking, periodBookingCount) {
  if (!access?.paid) {
    return "An active membership is required to book trainer sessions.";
  }

  const limit = getTrainerBookingLimit(access);

  if (limit === 0) {
    return "Basic membership does not include personal trainer sessions.";
  }

  const { startDate, endDate } = getClassBookingPeriod(access);

  if (
    !startDate ||
    !endDate ||
    booking.sessionDate < startDate ||
    booking.sessionDate >= endDate
  ) {
    return "This session is outside your current membership month.";
  }

  if (periodBookingCount >= limit) {
    return `Your membership includes ${limit} trainer sessions per membership month.`;
  }

  return "";
}

async function getTrainerBookings(request, response) {
  const requestUrl = new URL(request.url, "http://localhost");
  const memberEmail = sanitizeEmail(requestUrl.searchParams.get("email"));

  if (!memberEmail) {
    sendJson(response, 400, { message: "A valid member email is required." });
    return;
  }

  try {
    const db = await getDbWithTimeout();
    const bookings = await db
      .collection("trainerBookings")
      .find({ memberEmail, active: { $ne: false } })
      .sort({ sessionDate: 1, sessionTime: 1 })
      .project({ _id: 0 })
      .toArray();
    sendJson(response, 200, bookings);
  } catch (error) {
    logApiError("Trainer bookings API error", error);
    sendJson(response, 200, getActiveLocalTrainerBookings(memberEmail));
  }
}

function updateLocalTrainerBooking(booking, membershipAccess) {
  const bookings = readLocalCollection("trainerBookings");
  const match = (storedBooking) =>
    storedBooking.memberEmail === booking.memberEmail &&
    storedBooking.trainerSlug === booking.trainerSlug &&
    storedBooking.sessionDate === booking.sessionDate &&
    storedBooking.sessionTime === booking.sessionTime;
  const existingIndex = bookings.findIndex(
    (storedBooking) => match(storedBooking) && storedBooking.active !== false,
  );

  if (booking.action === "cancel") {
    if (existingIndex !== -1) {
      bookings[existingIndex] = {
        ...bookings[existingIndex],
        active: false,
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      writeLocalCollection("trainerBookings", bookings);
    }
  } else {
    const { startDate, endDate } = getClassBookingPeriod(membershipAccess);
    const periodBookingCount = bookings.filter(
      (storedBooking) =>
        storedBooking.memberEmail === booking.memberEmail &&
        storedBooking.active !== false &&
        storedBooking.sessionDate >= startDate &&
        storedBooking.sessionDate < endDate,
    ).length;
    const ruleError = getTrainerBookingRuleError(
      membershipAccess,
      booking,
      periodBookingCount,
    );

    if (ruleError) {
      return { statusCode: 403, payload: { message: ruleError } };
    }

    const slotTaken = bookings.some(
      (storedBooking) =>
        storedBooking.trainerSlug === booking.trainerSlug &&
        storedBooking.sessionDate === booking.sessionDate &&
        storedBooking.sessionTime === booking.sessionTime &&
        storedBooking.active !== false,
    );

    if (slotTaken) {
      return {
        statusCode: 409,
        payload: { message: "This trainer time is already booked." },
      };
    }

    const reusableIndex = bookings.findIndex(match);
    const nextBooking = {
      ...booking,
      active: true,
      updatedAt: new Date().toISOString(),
    };

    delete nextBooking.action;

    if (reusableIndex === -1) {
      bookings.push({
        ...nextBooking,
        createdAt: new Date().toISOString(),
      });
    } else {
      bookings[reusableIndex] = {
        ...bookings[reusableIndex],
        ...nextBooking,
        cancelledAt: null,
      };
    }
    writeLocalCollection("trainerBookings", bookings);
  }

  const activeBookings = getActiveLocalTrainerBookings(booking.memberEmail);
  const limit = getTrainerBookingLimit(membershipAccess);

  return {
    statusCode: 200,
    payload: {
      bookings: activeBookings,
      limit,
    },
  };
}

async function updateTrainerBooking(request, response) {
  let booking = null;
  let membershipAccess = null;

  try {
    booking = sanitizeTrainerBooking(await readJsonBody(request));

    if (!booking) {
      sendJson(response, 400, { message: "Invalid trainer booking payload." });
      return;
    }

    membershipAccess = await getClassBookingMembershipAccess(
      booking.memberEmail,
      booking.memberName,
    );
    const db = await getDbWithTimeout();
    const collection = db.collection("trainerBookings");
    const bookingKey = {
      memberEmail: booking.memberEmail,
      trainerSlug: booking.trainerSlug,
      sessionDate: booking.sessionDate,
      sessionTime: booking.sessionTime,
    };

    if (booking.action === "cancel") {
      await collection.updateOne(bookingKey, {
        $set: {
          active: false,
          cancelledAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } else {
      const { startDate, endDate } = getClassBookingPeriod(membershipAccess);
      const periodBookingCount = await collection.countDocuments({
        memberEmail: booking.memberEmail,
        active: { $ne: false },
        sessionDate: { $gte: startDate, $lt: endDate },
      });
      const ruleError = getTrainerBookingRuleError(
        membershipAccess,
        booking,
        periodBookingCount,
      );

      if (ruleError) {
        sendJson(response, 403, { message: ruleError });
        return;
      }

      const slotTaken = await collection.findOne({
        trainerSlug: booking.trainerSlug,
        sessionDate: booking.sessionDate,
        sessionTime: booking.sessionTime,
        active: { $ne: false },
      });

      if (slotTaken) {
        sendJson(response, 409, {
          message: "This trainer time is already booked.",
        });
        return;
      }

      const { action, ...bookingDocument } = booking;
      await collection.updateOne(
        bookingKey,
        {
          $set: {
            ...bookingDocument,
            active: true,
            cancelledAt: null,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true },
      );
    }

    const bookings = await collection
      .find({ memberEmail: booking.memberEmail, active: { $ne: false } })
      .sort({ sessionDate: 1, sessionTime: 1 })
      .project({ _id: 0 })
      .toArray();
    sendJson(response, 200, {
      bookings,
      limit: getTrainerBookingLimit(membershipAccess),
    });
  } catch (error) {
    if (error?.code === 11000) {
      sendJson(response, 409, {
        message: "This trainer time is already booked.",
      });
      return;
    }

    if (booking) {
      logApiError("Update trainer booking API error", error);
      membershipAccess =
        membershipAccess ||
        (await getClassBookingMembershipAccess(
          booking.memberEmail,
          booking.memberName,
        ));
      const result = updateLocalTrainerBooking(booking, membershipAccess);
      sendJson(response, result.statusCode, result.payload);
      return;
    }

    console.error("Update trainer booking API error:", error);
    sendJson(response, 500, { message: "Unable to update trainer booking." });
  }
}

async function getClassBookings(request, response) {
  try {
    const requestUrl = new URL(request.url, "http://localhost");
    const memberEmail = sanitizeEmail(requestUrl.searchParams.get("email"));

    if (!memberEmail) {
      sendJson(response, 400, { message: "A valid member email is required." });
      return;
    }

    const db = await getDbWithTimeout();
    const bookings = await db
      .collection("classBookings")
      .find({ memberEmail, active: { $ne: false } })
      .sort({ classDate: 1, classTime: 1 })
      .project({ _id: 0 })
      .toArray();

    sendJson(response, 200, bookings);
  } catch (error) {
    logApiError("Class bookings API error", error);
    const requestUrl = new URL(request.url, "http://localhost");
    const memberEmail = sanitizeEmail(requestUrl.searchParams.get("email"));

    sendJson(
      response,
      200,
      memberEmail
        ? getActiveBookingsForMember(readLocalClassBookings(), memberEmail)
        : [],
    );
  }
}

async function getClassBookingCounts(response) {
  try {
    const db = await getDbWithTimeout();
    const bookingCounts = await db
      .collection("classBookings")
      .aggregate([
        { $match: { active: { $ne: false } } },
        { $group: { _id: "$classId", count: { $sum: 1 } } },
      ])
      .toArray();
    const countsByClassId = bookingCounts.reduce((counts, bookingCount) => {
      counts[bookingCount._id] = bookingCount.count;
      return counts;
    }, {});

    sendJson(response, 200, countsByClassId);
  } catch (error) {
    logApiError("Class booking counts API error", error);
    sendJson(
      response,
      200,
      getBookingCountsByClassId(readLocalClassBookings()),
    );
  }
}

function toggleLocalClassBooking(booking, membershipAccess) {
  const bookings = readLocalClassBookings();
  const existingIndex = bookings.findIndex(
    (storedBooking) =>
      storedBooking.memberEmail === booking.memberEmail &&
      storedBooking.classId === booking.classId &&
      storedBooking.active !== false,
  );

  if (existingIndex !== -1) {
    bookings[existingIndex] = {
      ...bookings[existingIndex],
      active: false,
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } else {
    const { startDate, endDate } = getClassBookingPeriod(membershipAccess);
    const periodBookingCount = bookings.filter(
      (storedBooking) =>
        storedBooking.memberEmail === booking.memberEmail &&
        storedBooking.active !== false &&
        storedBooking.classDate >= startDate &&
        storedBooking.classDate < endDate,
    ).length;
    const bookingRuleError = getClassBookingRuleError(
      membershipAccess,
      booking,
      periodBookingCount,
    );

    if (bookingRuleError) {
      return {
        statusCode: 403,
        payload: { message: bookingRuleError },
      };
    }

    const activeBookingCount = bookings.filter(
      (storedBooking) =>
        storedBooking.classId === booking.classId &&
        storedBooking.active !== false,
    ).length;

    if (activeBookingCount >= booking.capacity) {
      return {
        statusCode: 409,
        payload: { message: "This class is full." },
      };
    }

    bookings.push({
      ...booking,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  writeLocalClassBookings(bookings);

  return {
    statusCode: 200,
    payload: {
      booked: existingIndex === -1,
      bookings: getActiveBookingsForMember(bookings, booking.memberEmail),
      bookingCounts: getBookingCountsByClassId(bookings),
    },
  };
}

async function toggleClassBooking(request, response) {
  let booking = null;
  let membershipAccess = null;

  try {
    const body = await readJsonBody(request);
    booking = sanitizeClassBooking(body.booking || body);

    if (!booking) {
      sendJson(response, 400, { message: "Invalid class booking payload." });
      return;
    }

    const db = await getDbWithTimeout();
    const bookingsCollection = db.collection("classBookings");
    const existingBooking = await bookingsCollection.findOne({
      memberEmail: booking.memberEmail,
      classId: booking.classId,
      active: { $ne: false },
    });

    if (existingBooking) {
      await bookingsCollection.updateOne(
        { memberEmail: booking.memberEmail, classId: booking.classId },
        {
          $set: {
            active: false,
            cancelledAt: new Date(),
            updatedAt: new Date(),
          },
        },
      );
    } else {
      membershipAccess = await getClassBookingMembershipAccess(
        booking.memberEmail,
        booking.memberName,
      );
      const { startDate, endDate } = getClassBookingPeriod(membershipAccess);
      const periodBookingCount = await bookingsCollection.countDocuments({
        memberEmail: booking.memberEmail,
        active: { $ne: false },
        classDate: { $gte: startDate, $lt: endDate },
      });
      const bookingRuleError = getClassBookingRuleError(
        membershipAccess,
        booking,
        periodBookingCount,
      );

      if (bookingRuleError) {
        sendJson(response, 403, { message: bookingRuleError });
        return;
      }

      const activeBookingCount = await bookingsCollection.countDocuments({
        classId: booking.classId,
        active: { $ne: false },
      });

      if (activeBookingCount >= booking.capacity) {
        sendJson(response, 409, {
          message: "This class is full.",
        });
        return;
      }

      await bookingsCollection.updateOne(
        { memberEmail: booking.memberEmail, classId: booking.classId },
        {
          $set: {
            ...booking,
            active: true,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );
    }

    const bookings = await bookingsCollection
      .find({ memberEmail: booking.memberEmail, active: { $ne: false } })
      .sort({ classDate: 1, classTime: 1 })
      .project({ _id: 0 })
      .toArray();
    const bookingCounts = await bookingsCollection
      .aggregate([
        { $match: { active: { $ne: false } } },
        { $group: { _id: "$classId", count: { $sum: 1 } } },
      ])
      .toArray();
    const countsByClassId = bookingCounts.reduce((counts, bookingCount) => {
      counts[bookingCount._id] = bookingCount.count;
      return counts;
    }, {});

    sendJson(response, 200, {
      booked: !existingBooking,
      bookings,
      bookingCounts: countsByClassId,
    });
  } catch (error) {
    if (booking) {
      logApiError("Toggle class booking API error", error);
      membershipAccess =
        membershipAccess ||
        (await getClassBookingMembershipAccess(
          booking.memberEmail,
          booking.memberName,
        ));
      const result = toggleLocalClassBooking(booking, membershipAccess);
      sendJson(response, result.statusCode, result.payload);
      return;
    }

    console.error("Toggle class booking API error:", error);
    sendJson(response, 500, { message: "Unable to update class booking." });
  }
}

async function addClassScheduleItem(request, response) {
  let weekday = null;
  let period = "";
  let classItem = null;

  try {
    const body = await readJsonBody(request);
    weekday = Number(body.weekday);
    period = body.period;
    classItem = sanitizeClassItem(body.classItem || {});

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
    clearDbReadCache("classSchedule:active");

    sendJson(response, 200, await getClassScheduleDocuments(db));
  } catch (error) {
    const schedule = getLocalClassSchedule();

    if (isValidWeekday(weekday) && isValidSchedulePeriod(period) && classItem) {
      const dayIndex = schedule.findIndex(
        (daySchedule) => Number(daySchedule.weekday) === weekday,
      );

      if (dayIndex === -1) {
        sendJson(response, 404, { message: "Schedule day was not found." });
        return;
      }

      schedule[dayIndex] = {
        ...schedule[dayIndex],
        [period]: [...(schedule[dayIndex][period] || []), classItem],
        updatedAt: new Date().toISOString(),
      };
      writeLocalCollection("classSchedule", schedule);
      sendJson(response, 200, getLocalClassSchedule());
      return;
    }

    console.error("Add class schedule API error:", error);
    sendJson(response, 500, { message: "Unable to add class." });
  }
}

async function updateClassScheduleItem(request, response) {
  let weekday = null;
  let period = "";
  let nextPeriod = "";
  let index = null;
  let classItem = null;

  try {
    const body = await readJsonBody(request);
    weekday = Number(body.weekday);
    period = body.period;
    nextPeriod = body.nextPeriod || period;
    index = Number(body.index);
    classItem = sanitizeClassItem(body.classItem || {});

    if (
      !isValidWeekday(weekday) ||
      !isValidSchedulePeriod(period) ||
      !isValidSchedulePeriod(nextPeriod) ||
      !Number.isInteger(index) ||
      index < 0 ||
      !classItem
    ) {
      sendJson(response, 400, { message: "Invalid class schedule payload." });
      return;
    }

    const db = await getDb();
    const scheduleCollection = db.collection("classSchedule");

    if (period !== nextPeriod) {
      const scheduleDay = await scheduleCollection.findOne({
        weekday,
        active: { $ne: false },
        [`${period}.${index}`]: { $exists: true },
      });

      if (!scheduleDay) {
        sendJson(response, 404, { message: "Class was not found." });
        return;
      }

      const sourceClasses = [...(scheduleDay[period] || [])];
      const targetClasses = [...(scheduleDay[nextPeriod] || [])];
      sourceClasses.splice(index, 1);
      targetClasses.push(classItem);

      await scheduleCollection.updateOne(
        { weekday, active: { $ne: false } },
        {
          $set: {
            [period]: sourceClasses,
            [nextPeriod]: targetClasses,
            updatedAt: new Date(),
          },
        },
      );
      clearDbReadCache("classSchedule:active");

      sendJson(response, 200, await getClassScheduleDocuments(db));
      return;
    }

    const result = await scheduleCollection.updateOne(
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
    clearDbReadCache("classSchedule:active");

    sendJson(response, 200, await getClassScheduleDocuments(db));
  } catch (error) {
    const schedule = getLocalClassSchedule();

    if (
      isValidWeekday(weekday) &&
      isValidSchedulePeriod(period) &&
      isValidSchedulePeriod(nextPeriod) &&
      Number.isInteger(index) &&
      index >= 0 &&
      classItem
    ) {
      const dayIndex = schedule.findIndex(
        (daySchedule) => Number(daySchedule.weekday) === weekday,
      );
      const daySchedule = schedule[dayIndex];

      if (!daySchedule || !(daySchedule[period] || [])[index]) {
        sendJson(response, 404, { message: "Class was not found." });
        return;
      }

      const sourceClasses = [...(daySchedule[period] || [])];
      const targetClasses =
        period === nextPeriod
          ? sourceClasses
          : [...(daySchedule[nextPeriod] || [])];

      if (period === nextPeriod) {
        sourceClasses[index] = classItem;
      } else {
        sourceClasses.splice(index, 1);
        targetClasses.push(classItem);
      }

      schedule[dayIndex] = {
        ...daySchedule,
        [period]: sourceClasses,
        [nextPeriod]: targetClasses,
        updatedAt: new Date().toISOString(),
      };
      writeLocalCollection("classSchedule", schedule);
      sendJson(response, 200, getLocalClassSchedule());
      return;
    }

    console.error("Update class schedule API error:", error);
    sendJson(response, 500, { message: "Unable to update class." });
  }
}

async function getSiteSettings(response) {
  try {
    const settings = await getCachedDbRead("siteSettings:site", async () => {
      const db = await withTimeout(
        getDb(),
        PUBLIC_API_TIMEOUT_MS,
        "Site settings database connection timed out.",
      );
      return db
        .collection("siteSettings")
        .findOne(
          { key: "site", active: { $ne: false } },
          { projection: { _id: 0 } },
        );
    });

    sendJson(response, 200, settings || defaultSiteSettings);
  } catch (error) {
    logApiError("Site settings API error", error);
    sendJson(response, 200, getLocalSiteSettings());
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
  let settingsPayload = null;

  try {
    const body = await readJsonBody(request);
    settingsPayload = body.settings || body;

    if (!settingsPayload || Object.keys(settingsPayload).length === 0) {
      sendJson(response, 400, { message: "Invalid site settings payload." });
      return;
    }

    const db = await getDb();
    const existing = await db
      .collection("siteSettings")
      .findOne(
        { key: "site", active: { $ne: false } },
        { projection: { _id: 0 } },
      );
    const settings = sanitizeSiteSettings(settingsPayload, existing || {});

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
    clearDbReadCache("siteSettings:site");

    sendJson(response, 200, nextSettings);
  } catch (error) {
    const settings = sanitizeSiteSettings(
      settingsPayload || {},
      getLocalSiteSettings(),
    );

    if (settings) {
      const nextSettings = {
        ...settings,
        updatedAt: new Date().toISOString(),
      };

      writeLocalCollection("siteSettings", nextSettings);
      sendJson(response, 200, nextSettings);
      return;
    }

    console.error("Update site settings API error:", error);
    sendJson(response, 500, { message: "Unable to update site settings." });
  }
}

function normalizeCrowdStatus(payload = {}) {
  const peopleCount = Math.max(
    0,
    Math.min(10_000, Math.round(Number(payload.peopleCount) || 0)),
  );
  const capacity = Math.max(
    1,
    Math.min(10_000, Math.round(Number(payload.capacity) || 70)),
  );
  const normalMax = Math.max(0, Number(payload.normalMax) || 0);
  const moderateMax = Math.max(normalMax + 1, Number(payload.moderateMax) || 1);
  let label = "Normal";
  let tone = "green";

  if (peopleCount > moderateMax) {
    label = "Crowded";
    tone = "red";
  } else if (peopleCount > normalMax) {
    label = "Moderate";
    tone = "yellow";
  }

  return {
    active: payload.active === true,
    peopleCount,
    capacity,
    capacityPercent: Math.min(100, Math.round((peopleCount / capacity) * 100)),
    label,
    tone,
    updatedAt: new Date().toISOString(),
  };
}

function getCrowdStatus(response) {
  const updatedAt = Date.parse(liveCrowdStatus.updatedAt || "");
  const isFresh =
    Number.isFinite(updatedAt) &&
    Date.now() - updatedAt <= CROWD_STATUS_FRESHNESS_MS;

  sendJson(response, 200, {
    ...localDbDefaults.crowdStatus,
    ...liveCrowdStatus,
    active: liveCrowdStatus.active === true && isFresh,
    stale: !isFresh,
  });
}

async function updateCrowdStatus(request, response) {
  try {
    const status = normalizeCrowdStatus(await readJsonBody(request));
    liveCrowdStatus = status;
    sendJson(response, 200, status);
  } catch (error) {
    logApiError("Update crowd status API error", error);
    sendJson(response, 400, { message: "Invalid crowd status payload." });
  }
}

function handleApiRequest(request, response) {
  const requestPath = new URL(request.url, "http://localhost").pathname;

  if (request.method === "GET" && requestPath === "/api/health") {
    sendJson(response, 200, { status: "ok" });
    return true;
  }

  if (request.method === "GET" && requestPath === "/api/members") {
    getMembers(response);
    return true;
  }

  if (request.method === "PUT" && requestPath === "/api/members/attendance") {
    updateMemberAttendance(request, response);
    return true;
  }

  if (request.method === "GET" && requestPath === "/api/membership-plans") {
    getMembershipPlans(response);
    return true;
  }

  if (
    request.method === "GET" &&
    requestPath === "/api/admin/membership-plans"
  ) {
    getAdminMembershipPlans(response);
    return true;
  }

  if (request.method === "GET" && requestPath === "/api/stripe/payments") {
    getStripePayments(response);
    return true;
  }

  if (request.method === "GET" && requestPath === "/api/member-payments") {
    getMemberStripePayments(request, response);
    return true;
  }

  if (
    request.method === "POST" &&
    requestPath === "/api/stripe/billing-portal"
  ) {
    createStripeBillingPortalSession(request, response);
    return true;
  }

  if (
    request.method === "POST" &&
    requestPath === "/api/stripe/payment-intents"
  ) {
    createStripePaymentIntent(request, response);
    return true;
  }

  if (
    request.method === "POST" &&
    requestPath === "/api/stripe/subscriptions"
  ) {
    createStripeSubscription(request, response);
    return true;
  }

  if (
    request.method === "GET" &&
    requestPath === "/api/stripe/revenue-overview"
  ) {
    getStripeRevenueOverview(response);
    return true;
  }

  if (
    request.method === "GET" &&
    requestPath === "/api/stripe/payment-access"
  ) {
    getStripePaymentAccess(request, response);
    return true;
  }

  if (request.method === "POST" && requestPath === "/api/membership-plans") {
    addMembershipPlan(request, response);
    return true;
  }

  if (request.method === "PUT" && requestPath === "/api/membership-plans") {
    updateMembershipPlan(request, response);
    return true;
  }

  if (request.method === "GET" && requestPath === "/api/trainers") {
    getTrainers(response);
    return true;
  }

  if (request.method === "POST" && requestPath === "/api/trainers") {
    addTrainer(request, response);
    return true;
  }

  if (request.method === "PUT" && requestPath === "/api/trainers") {
    updateTrainer(request, response);
    return true;
  }

  if (request.method === "GET" && requestPath === "/api/trainer-bookings") {
    getTrainerBookings(request, response);
    return true;
  }

  if (request.method === "POST" && requestPath === "/api/trainer-bookings") {
    updateTrainerBooking(request, response);
    return true;
  }

  if (request.method === "GET" && requestPath === "/api/member-progress") {
    getMemberProgress(request, response);
    return true;
  }

  if (request.method === "GET" && requestPath === "/api/class-schedule") {
    getClassSchedule(response);
    return true;
  }

  if (request.method === "GET" && requestPath === "/api/class-booking-counts") {
    getClassBookingCounts(response);
    return true;
  }

  if (request.method === "GET" && requestPath === "/api/class-bookings") {
    getClassBookings(request, response);
    return true;
  }

  if (request.method === "POST" && requestPath === "/api/class-bookings") {
    toggleClassBooking(request, response);
    return true;
  }

  if (
    request.method === "POST" &&
    requestPath === "/api/class-schedule/classes"
  ) {
    addClassScheduleItem(request, response);
    return true;
  }

  if (
    request.method === "PUT" &&
    requestPath === "/api/class-schedule/classes"
  ) {
    updateClassScheduleItem(request, response);
    return true;
  }

  if (request.method === "GET" && requestPath === "/api/site-settings") {
    getSiteSettings(response);
    return true;
  }

  if (request.method === "PUT" && requestPath === "/api/site-settings") {
    updateSiteSettings(request, response);
    return true;
  }

  if (request.method === "GET" && requestPath === "/api/crowd-status") {
    getCrowdStatus(response);
    return true;
  }

  if (request.method === "PUT" && requestPath === "/api/crowd-status") {
    updateCrowdStatus(request, response);
    return true;
  }

  if (requestPath.startsWith("/api/")) {
    sendJson(response, 404, { message: "API route not found." });
    return true;
  }

  return false;
}

module.exports = {
  handleApiRequest,
  sendJson,
};
