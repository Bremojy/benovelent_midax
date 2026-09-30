const SystemSettings = require("../models/SystemSettings");

const id = "011_remove_legacy_unverified_mpesa_defaults";
const LEGACY_PAYBILL = "247247";
const LEGACY_ACCOUNT = "0650186528835";

module.exports = {
  id,
  async run() {
    const result = await SystemSettings.updateOne(
      {
        singletonKey: "primary",
        $or: [
          { "mpesa.manualPaybill": LEGACY_PAYBILL },
          { "mpesa.manualAccountReference": LEGACY_ACCOUNT },
        ],
      },
      {
        $set: {
          "mpesa.manualPaybill": "",
          "mpesa.manualAccountReference": "",
          "mpesa.manualPaymentEnabled": false,
        },
      },
    );

    if (result.modifiedCount) {
      console.warn(`[migration] Removed legacy unverified M-PESA manual collection defaults from ${result.modifiedCount} system-settings record.`);
    }
  },
};
