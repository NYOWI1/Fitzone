const { getDb } = require("../server/config/db");
const defaultTrainers = require("../server/data/defaultTrainers");

async function seedTrainers() {
  const db = await getDb();
  const collection = db.collection("trainers");

  await collection.createIndex({ slug: 1 }, { unique: true });

  const operations = defaultTrainers.map((trainer) => ({
    updateOne: {
      filter: { slug: trainer.slug },
      update: {
        $set: {
          ...trainer,
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

  console.log(
    `Seeded trainers: ${result.upsertedCount} inserted, ${result.modifiedCount} updated.`,
  );
}

seedTrainers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
