const SystemSettings = require("../models/SystemSettings");
const redisCache = require("./redisCache");

const SETTINGS_KEY = "system:settings";

const SAFE_PUBLIC_PROJECTION = [
  "organizationName", "displayName", "logo", "favicon", "email", "phone", "address", "location", "officeHours", "socialChannels",
  "website", "scheme", "support", "mpesa", "branding", "homepage", "notificationReadiness", "featureToggles", "updatedAt", "updatedBy",
].join(" ");

const DEFAULTS = {
  singletonKey: "primary",
  organizationName: "Benevolent MIDAX",
  displayName: "Benevolent MIDAX",
  email: "",
  phone: "",
  address: "",
  location: "",
  officeHours: "",
  socialChannels: { whatsapp: "", instagram: "", facebook: "", x: "", website: "" },
  website: { siteTitle: "Benevolent MIDAX", subtitle: "", seoDescription: "", footer: "", publicContactInformation: "", visibility: { home: true, about: true, services: true, news: true, events: true, resources: true, gallery: true, constitution: true, contact: true } },
  scheme: { monthlyContribution: null, gracePeriodDays: null, minimumBookBalance: null, maintenanceMode: false },
  support: { funeral: { enabled: null }, medical: { enabled: null }, education: { enabled: null } },
  mpesa: { manualPaybill: "", manualAccountReference: "", displayLabel: "M-PESA", manualPaymentEnabled: false, stkEnabled: false, environment: "production", operationalShortcode: "", operationalStatus: "unknown" },
  branding: { accentColor: "", secondaryColor: "", logoUrl: "", faviconUrl: "" },
  homepage: { showCarousel: true, showLeaders: true, showPolicies: true },
  notificationReadiness: { browserPushEnabled: false, incomingCallPushEnabled: false },
  featureToggles: {},
};

async function getSystemSettings({ refresh = false } = {}) {
  if (!refresh) {
    const cached = await redisCache.getJson(SETTINGS_KEY);
    if (cached) return cached;
  }
  const doc = await SystemSettings.findOne({ singletonKey: "primary" }).select(SAFE_PUBLIC_PROJECTION).lean();
  if (!doc) return null;
  await redisCache.setJson(SETTINGS_KEY, doc, 120);
  return doc;
}

function invalidateSystemSettings() {
  return redisCache.invalidateMany([SETTINGS_KEY, "public:website:settings", "assistant:public", "assistant:context:public", "assistant:context:member", "assistant:context:admin", "assistant:context:superadmin"]);
}

function toPublicConfig(settings) {
  if (!settings) return null;
  return {
    organization: {
      name: settings.displayName || settings.organizationName || "",
      legalName: settings.organizationName || "",
      email: settings.email || "",
      phone: settings.phone || "",
      address: settings.address || "",
      location: settings.location || "",
      officeHours: settings.officeHours || "",
      socialChannels: settings.socialChannels || {},
      logo: settings.logo || settings.branding?.logoUrl || "",
      favicon: settings.favicon || settings.branding?.faviconUrl || "",
    },
    website: settings.website || {},
    scheme: settings.scheme || {},
    support: settings.support || {},
    mpesa: {
      manualPaybill: settings.mpesa?.manualPaymentEnabled ? (settings.mpesa.manualPaybill || "") : "",
      manualAccountReference: settings.mpesa?.manualPaymentEnabled ? (settings.mpesa.manualAccountReference || "") : "",
      displayLabel: settings.mpesa?.displayLabel || "M-PESA",
      manualPaymentEnabled: Boolean(settings.mpesa?.manualPaymentEnabled),
      stkEnabled: Boolean(settings.mpesa?.stkEnabled),
      environment: settings.mpesa?.environment || "production",
      operationalShortcode: settings.mpesa?.operationalShortcode || "",
      operationalStatus: settings.mpesa?.operationalStatus || "unknown",
    },
    branding: settings.branding || {},
    homepage: settings.homepage || {},
    notificationReadiness: settings.notificationReadiness || {},
    featureToggles: settings.featureToggles || {},
    updatedAt: settings.updatedAt || null,
  };
}

module.exports = { SETTINGS_KEY, DEFAULTS, getSystemSettings, invalidateSystemSettings, toPublicConfig };
