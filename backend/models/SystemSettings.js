const mongoose = require("mongoose");

const visibilitySchema = new mongoose.Schema({ home:Boolean, about:Boolean, services:Boolean, news:Boolean, events:Boolean, resources:Boolean, gallery:Boolean, constitution:Boolean, contact:Boolean }, { _id:false });
const socialSchema = new mongoose.Schema({ whatsapp:String, instagram:String, facebook:String, x:String, website:String }, { _id:false });
const websiteSchema = new mongoose.Schema({ siteTitle:String, subtitle:String, seoDescription:String, footer:String, publicContactInformation:String, visibility:{ type:visibilitySchema, default:()=>({}) } }, { _id:false });
const schemeSchema = new mongoose.Schema({ monthlyContribution:{type:Number,min:0,default:null}, gracePeriodDays:{type:Number,min:0,default:null}, minimumBookBalance:{type:Number,min:0,default:null}, maintenanceMode:{type:Boolean,default:false} }, {_id:false});
const supportFlagSchema = new mongoose.Schema({ enabled:{type:Boolean,default:null} }, {_id:false});
const supportSchema = new mongoose.Schema({ funeral:{type:supportFlagSchema,default:()=>({})}, medical:{type:supportFlagSchema,default:()=>({})}, education:{type:supportFlagSchema,default:()=>({})} }, {_id:false});
const mpesaSchema = new mongoose.Schema({ manualPaybill:{type:String,default:""}, manualAccountReference:{type:String,default:""}, displayLabel:{type:String,default:"M-PESA"}, manualPaymentEnabled:{type:Boolean,default:false}, stkEnabled:{type:Boolean,default:false}, environment:{type:String,enum:["sandbox","production","unknown"],default:"production"}, operationalShortcode:{type:String,default:""}, operationalStatus:{type:String,enum:["unknown","ready","not-configured","degraded"],default:"unknown"} }, {_id:false});
const brandingSchema = new mongoose.Schema({ accentColor:{type:String,default:""}, secondaryColor:{type:String,default:""}, logoUrl:{type:String,default:""}, faviconUrl:{type:String,default:""} }, {_id:false});
const homepageSchema = new mongoose.Schema({ showCarousel:{type:Boolean,default:true}, showLeaders:{type:Boolean,default:true}, showPolicies:{type:Boolean,default:true} }, {_id:false});
const notificationReadinessSchema = new mongoose.Schema({ browserPushEnabled:{type:Boolean,default:false}, incomingCallPushEnabled:{type:Boolean,default:false} }, {_id:false});

const systemSettingsSchema = new mongoose.Schema({
  singletonKey:{type:String,unique:true,required:true,default:"primary",immutable:true},
  organizationName:{type:String,trim:true,default:""}, displayName:{type:String,trim:true,default:""},
  logo:{type:String,default:""}, favicon:{type:String,default:""}, email:{type:String,trim:true,default:""}, phone:{type:String,trim:true,default:""}, address:{type:String,trim:true,default:""}, location:{type:String,trim:true,default:""}, officeHours:{type:String,trim:true,default:""}, socialChannels:{type:socialSchema,default:()=>({})},
  website:{type:websiteSchema,default:()=>({})}, scheme:{type:schemeSchema,default:()=>({})}, support:{type:supportSchema,default:()=>({})}, mpesa:{type:mpesaSchema,default:()=>({})}, branding:{type:brandingSchema,default:()=>({})}, homepage:{type:homepageSchema,default:()=>({})}, notificationReadiness:{type:notificationReadinessSchema,default:()=>({})}, featureToggles:{type:mongoose.Schema.Types.Mixed,default:{}},
  updatedBy:{type:mongoose.Schema.Types.ObjectId,default:null,refPath:"updatedByModel"}, updatedByModel:{type:String,enum:["SuperAdmin","Admin","Member"],default:null},
}, {timestamps:true, minimize:false});

module.exports = mongoose.models.SystemSettings || mongoose.model("SystemSettings", systemSettingsSchema);
