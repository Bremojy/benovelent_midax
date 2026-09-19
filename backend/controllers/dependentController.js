const Dependent = require("../models/Dependent");
const DependentDocument = require("../models/DependentDocument");
const DependentEditRequest = require("../models/DependentEditRequest");
const Member = require("../models/Member");
const Admin = require("../models/Admin");
const SuperAdmin = require("../models/SuperAdmin");
const createNotification = require("../utils/createNotification");
const createAuditLog = require("../utils/createAuditLog");
const redisCache = require("../services/redisCache");
const { resolveStoredFileUrl } = require("../utils/uploadUrl");

const MEMBER_EDIT_FIELDS = ["fullName", "relationship", "gender", "dateOfBirth", "nationalId", "birthCertificateNumber", "phone", "email", "county", "address", "school", "admissionNumber", "educationLevel", "occupation", "employer", "medicalConditions", "isNextOfKin"];
const ADMIN_MODEL_FROM_ROLE = (role) => String(role || "").toLowerCase() === "superadmin" ? "SuperAdmin" : "Admin";

const validateChanges = (changes) => {
  const clean = {};
  for (const field of MEMBER_EDIT_FIELDS) if (changes?.[field] !== undefined) clean[field] = changes[field];
  if (clean.dateOfBirth && Number.isNaN(new Date(clean.dateOfBirth).getTime())) throw new Error("Date of birth is invalid.");
  if (clean.dateOfBirth && new Date(clean.dateOfBirth).getTime() > Date.now()) throw new Error("Date of birth cannot be in the future.");
  return clean;
};

async function notifyEditRequestTeam(request, req, message) {
  const [admins, superadmins] = await Promise.all([
    Admin.find({ status: "active" }).select("_id").lean(),
    SuperAdmin.find({ status: { $nin: ["inactive", "deleted"] } }).select("_id").lean(),
  ]);
  const senderModel = ADMIN_MODEL_FROM_ROLE(req.user?.role);
  const recipients = [...admins.map((x) => ({ id: x._id, model: "Admin", link: "/admin/members" })), ...superadmins.map((x) => ({ id: x._id, model: "SuperAdmin", link: "/superadmin/members" }))];
  await Promise.all(recipients.map((recipient) => createNotification({
    recipient: recipient.id,
    recipientModel: recipient.model,
    sender: req.user._id,
    senderModel,
    title: "Dependent edit request",
    message,
    type: "system",
    link: recipient.link,
    referenceId: request._id,
    referenceModel: "DependentEditRequest",
    metadata: { requestId: String(request._id), dependentId: String(request.dependent) },
  })));
}

exports.addDependent = async (req, res) => {
  try {
    const member = await Member.findById(req.user._id);
    if (!member) return res.status(404).json({ success: false, message: "Member not found." });
    const { fullName, relationship, gender, dateOfBirth, nationalId, birthCertificateNumber, phone, email, county, address, school, admissionNumber, educationLevel, occupation, employer, medicalConditions, isNextOfKin } = req.body || {};
    if (!fullName || !relationship || !gender || !dateOfBirth) return res.status(400).json({ success: false, message: "Full name, relationship, gender and date of birth are required." });
    if (new Date(dateOfBirth).getTime() > Date.now()) return res.status(400).json({ success: false, message: "Date of birth cannot be in the future." });
    const existing = await Dependent.findOne({ member: member._id, fullName: String(fullName).trim(), relationship, dateOfBirth });
    if (existing) return res.status(409).json({ success: false, message: "Dependent already exists." });
    const dependent = await Dependent.create({ member: member._id, fullName: String(fullName).trim(), relationship, gender, dateOfBirth, nationalId, birthCertificateNumber, phone, email, county, address, school, admissionNumber, educationLevel, occupation, employer, medicalConditions, isNextOfKin });
    await redisCache.invalidateMany([`member:${member._id}:dashboard`, `member:${member._id}:dependents`]);
    await createAuditLog({ user: member._id, userRole: "member", action: "CREATE", module: "Dependent", description: `Added dependent ${dependent.fullName}`, req });
    res.status(201).json({ success: true, message: "Dependent added successfully. You can now upload supporting documents.", dependent });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

exports.getDependents = async (req, res) => {
  try {
    const dependents = await Dependent.find({ member: req.user._id, active: true }).sort({ relationship: 1, fullName: 1 }).lean();
    const withDocs = await Promise.all(dependents.map(async (dependent) => ({ ...dependent, documents: await DependentDocument.find({ dependent: dependent._id }).sort({ createdAt: -1 }).lean() })));
    res.json({ success: true, total: withDocs.length, dependents: withDocs });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getDependent = async (req, res) => {
  try {
    const dependent = await Dependent.findById(req.params.id).lean();
    if (!dependent) return res.status(404).json({ success: false, message: "Dependent not found." });
    const role = String(req.user?.role || "").toLowerCase();
    if (role === "member" && String(dependent.member) !== String(req.user._id)) return res.status(403).json({ success: false, message: "Access denied." });
    const documents = await DependentDocument.find({ dependent: dependent._id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, dependent: { ...dependent, documents } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateDependent = async (req, res) => {
  try {
    const role = String(req.user?.role || "").toLowerCase();
    if (role === "member") return res.status(405).json({ success: false, code: "DEPENDENT_EDIT_REQUEST_REQUIRED", message: "Members cannot directly edit an existing dependent. Submit an edit request for Admin/SuperAdmin review." });
    if (!['admin', 'superadmin'].includes(role)) return res.status(403).json({ success: false, message: "Access denied." });
    const dependent = await Dependent.findById(req.params.id);
    if (!dependent) return res.status(404).json({ success: false, message: "Dependent not found." });
    const changes = validateChanges(req.body || {});
    const allowed = Object.keys(changes);
    if (!allowed.length) return res.status(400).json({ success: false, message: "No valid dependent changes were provided." });
    for (const field of allowed) dependent[field] = changes[field];
    dependent.verified = false;
    dependent.verifiedBy = null;
    dependent.verifiedAt = null;
    await dependent.save();
    await redisCache.invalidateMany([`member:${dependent.member}:dashboard`, `member:${dependent.member}:dependents`]);
    await createAuditLog({ user: req.user._id, userRole: role, action: "UPDATE", module: "Dependent", description: `Updated dependent ${dependent.fullName}`, req });
    res.json({ success: true, message: "Dependent updated successfully. It now requires verification.", dependent });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

exports.deleteDependent = async (req, res) => {
  try {
    const role = String(req.user?.role || "").toLowerCase();
    if (role === "member") return res.status(405).json({ success: false, code: "DEPENDENT_DELETE_FORBIDDEN", message: "Members cannot directly delete an existing dependent. Contact an Admin for a managed record change." });
    if (!['admin', 'superadmin'].includes(role)) return res.status(403).json({ success: false, message: "Access denied." });
    const dependent = await Dependent.findById(req.params.id);
    if (!dependent) return res.status(404).json({ success: false, message: "Dependent not found." });
    dependent.active = false;
    dependent.verified = false;
    await dependent.save();
    await redisCache.invalidateMany([`member:${dependent.member}:dashboard`, `member:${dependent.member}:dependents`]);
    await createAuditLog({ user: req.user._id, userRole: role, action: "ARCHIVE", module: "Dependent", description: `Archived dependent ${dependent.fullName}`, req });
    res.json({ success: true, message: "Dependent removed from the active record.", dependent });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.createEditRequest = async (req, res) => {
  try {
    const dependent = await Dependent.findOne({ _id: req.body?.dependentId, member: req.user._id, active: true });
    if (!dependent) return res.status(404).json({ success: false, message: "Dependent not found." });
    let requestedChanges = req.body?.requestedChanges || {};
    if (typeof requestedChanges === "string") {
      try { requestedChanges = JSON.parse(requestedChanges); }
      catch { return res.status(400).json({ success: false, message: "Requested changes must be valid JSON." }); }
    }
    const changes = validateChanges(requestedChanges);
    if (!Object.keys(changes).length) return res.status(400).json({ success: false, message: "Describe at least one change." });
    const reason = String(req.body?.reason || "").trim();
    if (!reason) return res.status(400).json({ success: false, message: "A reason for the requested change is required." });
    const open = await DependentEditRequest.findOne({ dependent: dependent._id, member: req.user._id, status: "pending" });
    if (open) return res.status(409).json({ success: false, code: "EDIT_REQUEST_ALREADY_PENDING", message: "An edit request for this dependent is already awaiting review." });
    const supportingFiles = (Array.isArray(req.files) ? req.files : []).map((file) => ({
      fileName: String(file.originalname || file.filename || "supporting-file").slice(0, 180),
      mimeType: String(file.mimetype || "application/octet-stream"),
      url: resolveStoredFileUrl(file, `/uploads/${req.uploadType || "dependent-edit-requests"}`),
      uploadedAt: new Date(),
    }));
    const request = await DependentEditRequest.create({ member: req.user._id, dependent: dependent._id, requestedChanges: changes, reason, supportingFiles });
    await notifyEditRequestTeam(request, req, `${req.user.fullName || "A member"} requested changes to dependent ${dependent.fullName}.`);
    await createAuditLog({ user: req.user._id, userRole: "member", action: "REQUEST_EDIT", module: "DependentEditRequest", description: `Requested changes to dependent ${dependent.fullName}`, req, metadata: { requestId: String(request._id), dependentId: String(dependent._id) } });
    res.status(201).json({ success: true, message: "Edit request submitted for review.", request });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

exports.getMyEditRequests = async (req, res) => {
  try { const requests = await DependentEditRequest.find({ member: req.user._id }).populate("dependent", "fullName relationship verified").sort({ createdAt: -1 }).lean(); res.json({ success: true, requests }); }
  catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getAdminEditRequests = async (req, res) => {
  try {
    const query = { status: req.query?.status || "pending" };
    if (req.query?.memberId) query.member = req.query.memberId;
    const requests = await DependentEditRequest.find(query).populate("member", "fullName memberNumber").populate("dependent", "fullName relationship").sort({ createdAt: -1 }).lean();
    res.json({ success: true, requests });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.reviewEditRequest = async (req, res) => {
  try {
    const request = await DependentEditRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: "Edit request not found." });
    if (request.status !== "pending") return res.status(409).json({ success: false, message: "This edit request has already been reviewed." });
    const decision = String(req.body?.decision || "").toLowerCase();
    if (!["approved", "rejected"].includes(decision)) return res.status(400).json({ success: false, message: "Choose approve or reject." });
    const reviewNotes = String(req.body?.reviewNotes || "").trim();
    if (decision === "approved") {
      const dependent = await Dependent.findById(request.dependent);
      if (!dependent || !dependent.active) return res.status(404).json({ success: false, message: "Dependent is no longer active." });
      const changes = validateChanges(request.requestedChanges || {});
      Object.entries(changes).forEach(([field, value]) => { dependent[field] = value; });
      dependent.verified = false; dependent.verifiedBy = null; dependent.verifiedAt = null;
      await dependent.save();
      await redisCache.invalidateMany([`member:${dependent.member}:dashboard`, `member:${dependent.member}:dependents`]);
    }
    request.status = decision; request.reviewer = req.user._id; request.reviewerModel = ADMIN_MODEL_FROM_ROLE(req.user.role); request.reviewNotes = reviewNotes; request.reviewedAt = new Date(); await request.save();
    await createNotification({ recipient: request.member, recipientModel: "Member", sender: req.user._id, senderModel: ADMIN_MODEL_FROM_ROLE(req.user.role), title: `Dependent edit request ${decision}`, message: decision === "approved" ? "Your dependent edit request was approved and the record was updated." : "Your dependent edit request was rejected." , type: "system", referenceId: request._id, referenceModel: "DependentEditRequest", link: "/member/dependents" });
    await createAuditLog({ user: req.user._id, userRole: String(req.user.role || "admin").toLowerCase(), action: decision.toUpperCase(), module: "DependentEditRequest", description: `${decision} dependent edit request ${request._id}`, req, metadata: { requestId: String(request._id) } });
    res.json({ success: true, message: `Dependent edit request ${decision}.`, request });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

exports.uploadDependentDocuments = async (req, res) => {
  try {
    const role = String(req.user?.role || "").toLowerCase();
    const dependent = await Dependent.findById(req.params.id);
    if (!dependent) return res.status(404).json({ success: false, message: "Dependent not found." });
    if (role === "member" && String(dependent.member) !== String(req.user._id)) return res.status(403).json({ success: false, message: "Access denied." });
    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) return res.status(400).json({ success: false, message: "Choose at least one document." });
    const uploadedByModel = role === "superadmin" ? "SuperAdmin" : role === "admin" ? "Admin" : "Member";
    const documents = await DependentDocument.insertMany(files.map((file) => ({ dependent: dependent._id, member: dependent.member, documentType: String(req.body?.documentType || "other"), filename: String(file.originalname || file.filename || "document").slice(0, 180), mimeType: String(file.mimetype || "application/octet-stream"), url: resolveStoredFileUrl(file, `/uploads/${req.uploadType || "dependent-documents"}`), uploadedBy: req.user._id, uploadedByModel })));
    await createAuditLog({ user: req.user._id, userRole: role, action: "UPLOAD", module: "DependentDocument", description: `Uploaded ${documents.length} dependent document(s)`, req, metadata: { dependentId: String(dependent._id) } });
    res.status(201).json({ success: true, message: `${documents.length} document(s) uploaded successfully.`, documents });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

exports.getDependentDocuments = async (req, res) => {
  try {
    const dependent = await Dependent.findById(req.params.id).select("member").lean();
    if (!dependent) return res.status(404).json({ success: false, message: "Dependent not found." });
    const role = String(req.user?.role || "").toLowerCase();
    if (role === "member" && String(dependent.member) !== String(req.user._id)) return res.status(403).json({ success: false, message: "Access denied." });
    const documents = await DependentDocument.find({ dependent: dependent._id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, documents });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.verifyDependentDocument = async (req, res) => {
  try {
    const document = await DependentDocument.findById(req.params.documentId);
    if (!document) return res.status(404).json({ success: false, message: "Document not found." });
    document.verificationStatus = String(req.body?.status || "").toLowerCase();
    if (!["verified", "rejected", "pending"].includes(document.verificationStatus)) return res.status(400).json({ success: false, message: "Invalid document verification status." });
    document.verifiedBy = document.verificationStatus === "pending" ? null : req.user._id; document.verifiedAt = document.verificationStatus === "pending" ? null : new Date();
    await document.save();
    res.json({ success: true, message: "Document verification status updated.", document });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

exports.deleteDependentDocument = async (req, res) => {
  try { const document = await DependentDocument.findById(req.params.documentId); if (!document) return res.status(404).json({ success:false,message:"Document not found." }); await document.deleteOne(); res.json({ success:true,message:"Document removed." }); }
  catch (error) { res.status(500).json({ success:false,message:error.message }); }
};

exports.verifyDependent = async (req, res) => {
  try {
    const dependent = await Dependent.findById(req.params.id);
    if (!dependent) return res.status(404).json({ success: false, message: "Dependent not found." });
    dependent.verified = true; dependent.verifiedBy = req.user._id; dependent.verifiedAt = new Date(); await dependent.save();
    await createNotification({ recipient: dependent.member, recipientModel: "Member", sender: req.user._id, senderModel: ADMIN_MODEL_FROM_ROLE(req.user.role), title: "Dependent verified", message: `${dependent.fullName} has been verified by an administrator.`, type: "system", referenceId: dependent._id, referenceModel: "Dependent", link: "/member/dependents" });
    await createAuditLog({ user: req.user._id, userRole: String(req.user.role || "admin").toLowerCase(), action: "VERIFY", module: "Dependent", description: `Verified dependent ${dependent.fullName}`, req });
    res.json({ success: true, message: "Dependent verified successfully.", dependent });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

exports.getAllDependents = async (req, res) => {
  try { const dependents = await Dependent.find({ active: true }).populate("member", "fullName memberNumber").sort({ createdAt: -1 }).lean(); res.json({ success:true,total:dependents.length,dependents }); }
  catch (error) { res.status(500).json({ success:false,message:error.message }); }
};

exports.getDependentsForMember = async (req, res) => {
  try { const member = await Member.findById(req.params.memberId).select("_id").lean(); if (!member) return res.status(404).json({success:false,message:"Member not found."}); const dependents = await Dependent.find({ member: member._id, active:true }).sort({createdAt:-1}).lean(); const docs=await DependentDocument.find({member:member._id}).sort({createdAt:-1}).lean(); const byDependent=new Map(); docs.forEach((d)=>{const key=String(d.dependent);if(!byDependent.has(key))byDependent.set(key,[]);byDependent.get(key).push(d);}); res.json({success:true,dependents:dependents.map(d=>({...d,documents:byDependent.get(String(d._id))||[]}))}); }
  catch (error) { res.status(500).json({success:false,message:error.message}); }
};
