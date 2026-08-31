const { getDb } = require("../src/config/db");
const defaultSiteSettings = require("../src/data/defaultSiteSettings");

async function seedSiteSettings() {
  const db = await getDb();
  const collection = db.collection("siteSettings");

  await collection.createIndex({ key: 1 }, { unique: true });

  const result = await collection.updateOne(
    { key: defaultSiteSettings.key },
    {
      $set: {
        ...defaultSiteSettings,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );

  console.log(
    `Seeded site settings: ${result.upsertedCount} inserted, ${result.modifiedCount} updated.`,
  );
}

seedSiteSettings()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
