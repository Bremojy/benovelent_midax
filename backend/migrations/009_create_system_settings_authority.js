const SystemSettings = require("../models/SystemSettings");
const WebsiteContent = require("../models/WebsiteContent");

const id = "009_create_system_settings_authority";

module.exports = { id, async run() {
  const existingWebsiteSettings = await WebsiteContent.findOne({ section: "settings" }).lean();
  const content = existingWebsiteSettings?.content || {};
  const manualPaybill = String(process.env.MPESA_MANUAL_PAYBILL || "247247").trim();
  const manualAccount = String(process.env.MPESA_MANUAL_ACCOUNT_NUMBER || "0650186528835").trim();
  const accentColor = String(content.themeColor || content.accentColor || "").trim();

  await SystemSettings.findOneAndUpdate(
    { singletonKey: "primary" },
    { $setOnInsert: {
      singletonKey: "primary",
      organizationName: "",
      displayName: "",
      email: "",
      phone: "",
      address: "",
      location: "",
      officeHours: "",
      website: { siteTitle: "", subtitle: "", seoDescription: "", footer: "", publicContactInformation: "", visibility: {} },
      scheme: { monthlyContribution: null, gracePeriodDays: null, minimumBookBalance: null, maintenanceMode: false },
      support: { funeral: { enabled: null }, medical: { enabled: null }, education: { enabled: null } },
      mpesa: {
        manualPaybill,
        manualAccountReference: manualAccount,
        displayLabel: "M-PESA",
        manualPaymentEnabled: Boolean(manualPaybill && manualAccount),
        stkEnabled: false,
        environment: String(process.env.MPESA_ENVIRONMENT || "production"),
        operationalShortcode: "",
        operationalStatus: "unknown",
      },
      branding: { accentColor, secondaryColor: "", logoUrl: "", faviconUrl: "" },
      homepage: { showCarousel: true, showLeaders: true, showPolicies: true },
      notificationReadiness: { browserPushEnabled: false, incomingCallPushEnabled: false },
      featureToggles: {},
    } },
    { upsert: true, returnDocument: "after" },
  );
} };
