const mongoose = require("mongoose");
const schema = new mongoose.Schema({ key: { type: String, unique: true }, version: String }, { timestamps: true });
module.exports = mongoose.models.PlatformMigrationMarker || mongoose.model("PlatformMigrationMarker", schema);
