const Policy = require("../models/Policy");

module.exports = {
  id: "010_enable_education_policy",
  async run() {
    await Policy.updateOne(
      { slug: "education-policy" },
      {
        $setOnInsert: {
          name: "Education Policy",
          slug: "education-policy",
          category: "loan",
          description: "Education support for eligible dependants with an agreed repayment plan.",
          maxAmount: 20000,
          minAmount: 1000,
          interestRate: 10,
          repaymentEnabled: true,
          repaymentMonths: 12,
          communityAssistanceEnabled: true,
          applicationPath: "/member/support",
          order: 10,
        },
        $set: { enabled: true },
      },
      { upsert: true },
    );
  },
};
