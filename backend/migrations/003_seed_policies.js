const Policy = require("../models/Policy");

module.exports = {
  id: "003_seed_policies",
  async run() {
    const defaults = [
      {
        name: "Education Policy",
        slug: "education-policy",
        category: "loan",
        description: "Education support for eligible dependants with an agreed repayment plan.",
        enabled: true,
        maxAmount: 20000,
        minAmount: 1000,
        interestRate: 10,
        repaymentEnabled: true,
        repaymentMonths: 12,
        communityAssistanceEnabled: true,
        applicationPath: "/member/support",
        order: 10,
      },
      {
        name: "Medical Support",
        slug: "medical-support",
        category: "support",
        description: "Medical assistance for eligible members and approved dependants.",
        enabled: true,
        maxAmount: 50000,
        minAmount: 0,
        interestRate: 0,
        repaymentEnabled: false,
        repaymentMonths: 12,
        communityAssistanceEnabled: true,
        applicationPath: "/member/support",
        order: 20,
      },
      {
        name: "Funeral Support",
        slug: "funeral-support",
        category: "support",
        description: "Funeral assistance according to the applicable scheme limits.",
        enabled: true,
        maxAmount: 100000,
        minAmount: 0,
        interestRate: 0,
        repaymentEnabled: false,
        repaymentMonths: 12,
        communityAssistanceEnabled: true,
        applicationPath: "/member/support",
        order: 30,
      },
    ];

    for (const policy of defaults) {
      await Policy.updateOne({ slug: policy.slug }, { $setOnInsert: policy }, { upsert: true });
    }
  },
};
