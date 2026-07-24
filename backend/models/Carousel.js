const mongoose = require("mongoose");

const carouselSchema = new mongoose.Schema(
  {
    imageUrl: {
      type: String,
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    buttonText: {
      type: String,
      default: "Learn More",
    },

    buttonLink: {
      type: String,
      default: "/about",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Carousel",
  carouselSchema
);