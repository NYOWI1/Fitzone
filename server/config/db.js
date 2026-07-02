const { MongoClient } = require("mongodb");
const loadEnvFile = require("./env");

loadEnvFile();

let clientPromise;

function getMongoClient() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is missing. Add it to your .env file.");
  }

  if (!clientPromise) {
    const client = new MongoClient(uri);
    clientPromise = client.connect();
  }

  return clientPromise;
}

async function getDb() {
  const client = await getMongoClient();
  return client.db(process.env.MONGODB_DB_NAME || "fitzone");
}

module.exports = {
  getDb,
};
