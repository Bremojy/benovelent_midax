const mongoose = require("mongoose");

const websiteContentSchema = new mongoose.Schema(
  {
    section: {
      type: String,
      required: true,
      unique: true,
      enum: [
        "home",
        "about",
        "services",
        "contact",
        "footer",
        "settings",
        "gallery",
        "privacy-policy",
        "terms-conditions",
        "disclaimer"
      ]
    },

    title: {
      type: String,
      default: ""
    },

    subtitle: {
      type: String,
      default: ""
    },

    description: {
      type: String,
      default: ""
    },

    content: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    images: [{
      type: String
    }],

    published: {
      type: Boolean,
      default: true
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin"
    }

  },
  {
    timestamps: true
  }
);

websiteContentSchema.index({ section: 1 });

module.exports =
  mongoose.models.WebsiteContent ||
  mongoose.model(
    "WebsiteContent",
    websiteContentSchema
  );
