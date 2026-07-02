const { getDb } = require("../server/config/db");
const defaultMembershipPlans = require("../server/data/defaultMembershipPlans");

async function seedMembershipPlans() {
  const db = await getDb();
  const collection = db.collection("membershipPlans");

  await collection.createIndex({ slug: 1 }, { unique: true });

  const operations = defaultMembershipPlans.map((plan) => ({
    updateOne: {
      filter: { slug: plan.slug },
      update: {
        $set: {
          ...plan,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      upsert: true,
    },
  }));

  const result = await collection.bulkWrite(operations);

  console.log(`Seeded membership plans: ${result.upsertedCount} inserted, ${result.modifiedCount} updated.`);
}

seedMembershipPlans()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
