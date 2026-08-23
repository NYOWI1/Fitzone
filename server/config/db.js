const loadEnvFile = require("./env");

loadEnvFile();

let clientPromise;
let MongoClient;
let dnsConfigured = false;
let warmupStarted = false;

function configureMongoDns() {
  if (dnsConfigured) {
    return;
  }

  const dnsServers = String(
    process.env.MONGODB_DNS_SERVERS || "1.1.1.1,8.8.8.8",
  )
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean);

  if (dnsServers.length > 0) {
    require("node:dns").setServers(dnsServers);
  }

  dnsConfigured = true;
}

function getMongoClient() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is missing. Add it to your .env file.");
  }

  if (!clientPromise) {
    configureMongoDns();

    if (!MongoClient) {
      ({ MongoClient } = require("mongodb"));
    }

    const client = new MongoClient(uri, {
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 20000,
    });
    clientPromise = client.connect();
  }

  return clientPromise;
}

async function getDb() {
  const client = await getMongoClient();
  return client.db(process.env.MONGODB_DB_NAME || "fitzone");
}

async function ensureMongoIndexes(db) {
  await Promise.allSettled([
    db.collection("membershipPlans").createIndex({ sortOrder: 1, name: 1 }),
    db.collection("trainers").createIndex({ sortOrder: 1, name: 1 }),
    db.collection("classSchedule").createIndex({ weekday: 1 }),
    db.collection("trainerBookings").createIndex(
      { trainerSlug: 1, sessionDate: 1, sessionTime: 1 },
      {
        unique: true,
        partialFilterExpression: { active: true },
      },
    ),
    db.collection("trainerBookings").createIndex({
      memberEmail: 1,
      sessionDate: 1,
      active: 1,
    }),
    db.collection("attendanceHistory").createIndex(
      { memberId: 1, attendanceDate: -1 },
      { unique: true },
    ),
  ]);
}

function warmMongoConnection() {
  if (warmupStarted || !process.env.MONGODB_URI) {
    return;
  }

  warmupStarted = true;
  setTimeout(() => {
    getDb()
      .then(async (db) => {
        await db.command({ ping: 1 });
        await ensureMongoIndexes(db);
        console.log("MongoDB connection ready.");
      })
      .catch((error) => {
        console.warn(`MongoDB warmup failed: ${error.message}`);
        warmupStarted = false;
      });
  }, 0);
}

module.exports = {
  getDb,
  warmMongoConnection,
};
