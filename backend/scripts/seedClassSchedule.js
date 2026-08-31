const { getDb } = require("../src/config/db");
const defaultClassSchedule = require("../src/data/defaultClassSchedule");

async function seedClassSchedule() {
  const db = await getDb();
  const collection = db.collection("classSchedule");

  await collection.createIndex({ weekday: 1 }, { unique: true });

  const operations = defaultClassSchedule.map((daySchedule) => ({
    updateOne: {
      filter: { weekday: daySchedule.weekday },
      update: {
        $set: {
          ...daySchedule,
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
    `Seeded class schedule: ${result.upsertedCount} inserted, ${result.modifiedCount} updated.`,
  );
}

seedClassSchedule()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
