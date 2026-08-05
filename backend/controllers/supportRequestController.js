const SupportRequest = require("../models/SupportRequest");
const { resolveStoredFiles } = require("../utils/uploadUrl");

exports.create = async (req, res) => {
  try {
    const files = resolveStoredFiles(req.files || [], "/documents");
    const { supportType, description, requestedAmount } = req.body;

    if (!supportType || !description || Number(requestedAmount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Support type, description and a positive amount are required.",
      });
    }

    const item = await SupportRequest.create({
      member: req.user._id,
      supportType,
      description,
      requestedAmount: Number(requestedAmount),
      documents: files,
      timeline: [
        {
          status: "Pending",
          remarks: "Application submitted by member",
          updatedBy: req.user._id,
        },
      ],
    });

    return res.status(201).json({ success: true, request: item });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.mine = async (req, res) => {
  try {
    const requests = await SupportRequest.find({ member: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, requests });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.all = async (req, res) => {
  try {
    const requests = await SupportRequest.find()
      .populate(
        "member",
        "fullName memberNumber phone email profileImage passportPhoto nationalId gender maritalStatus physicalAddress siteStation customSiteStation nextOfKin emergencyContact acceptedConstitution acceptedPrivacyPolicy acceptedDeclaration profileCompletion profileCompleted status documents"
      )
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, requests });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const request = await SupportRequest.findById(req.params.id)
      .populate(
        "member",
        "fullName memberNumber phone email profileImage passportPhoto nationalId gender maritalStatus physicalAddress siteStation customSiteStation nextOfKin emergencyContact acceptedConstitution acceptedPrivacyPolicy acceptedDeclaration profileCompletion profileCompleted status documents"
      )
      .lean();

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Support request not found.",
      });
    }

    return res.json({ success: true, request });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const item = await SupportRequest.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Support request not found." });
    }

    const { status, approvedAmount, rejectionReason, remarks } = req.body;

    if (status) item.status = status;
    if (approvedAmount !== undefined) item.approvedAmount = Number(approvedAmount) || 0;
    if (rejectionReason !== undefined) item.rejectionReason = rejectionReason;
    if (remarks !== undefined) item.remarks = remarks;

    item.processedBy = req.user._id;
    item.timeline.push({
      status: item.status,
      remarks: remarks || rejectionReason || "Status updated",
      updatedBy: req.user._id,
    });

    await item.save();
    return res.json({ success: true, request: item });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const item = await SupportRequest.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Support request not found." });
    }

    await SupportRequest.deleteOne({ _id: item._id });

    return res.json({
      success: true,
      message: "Support request deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
