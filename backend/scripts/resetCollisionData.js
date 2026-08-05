require("dotenv").config();
const mongoose = require("mongoose");

const models = [
  "Admin",
  "AuditLog",
  "Carousel",
  "ContactMessage",
  "Contribution",
  "Conversation",
  "Dependent",
  "EducationSupport",
  "Finance",
  "FuneralSupport",
  "Leader",
  "MedicalSupport",
  "Member",
  "Message",
  "News",
  "Notification",
  "Poll",
  "SuperAdmin",
  "SupportRequest",
  "SystemSettings",
  "Vote",
  "WebsiteContent",
];

async function main() {
  if (process.env.RESET_ALL_BENEVOLENT_DATA !== "true") {
    console.log("Set RESET_ALL_BENEVOLENT_DATA=true to run the wipe.");
    process.exit(0);
  }

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  let totalDeleted = 0;
  for (const modelName of models) {
    try {
      const Model = require(`../models/${modelName}`);
      const result = await Model.deleteMany({});
      totalDeleted += result.deletedCount || 0;
      console.log(`Deleted ${result.deletedCount || 0} from ${modelName}`);
    } catch (error) {
      console.warn(`Skipping ${modelName}: ${error.message}`);
    }
  }

  console.log(`Finished. Total documents deleted: ${totalDeleted}`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
