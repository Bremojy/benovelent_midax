const Policy = require("../models/Policy");

module.exports = {
  id: "005_align_policies_to_constitution",
  async run() {
    // The supplied November 2025 Benevolent Fund Scheme constitution defines
    // funeral and medical support. Education support is not an active
    // constitutional benefit, so any seeded education policy must not appear
    // as a live/public service until the constitution and official scheme
    // records are updated.
    await Policy.updateOne(
      { slug: "education-policy" },
      {
        $set: {
          enabled: false,
          order: 999,
        },
      },
    );
  },
};
