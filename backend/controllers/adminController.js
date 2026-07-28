const Member = require("../models/Member");

/* =====================================================
   ADMIN DASHBOARD
===================================================== */

exports.getDashboard = async (req, res) => {
  try {
    const [
      totalMembers,
      activeMembers,
      inactiveMembers,
      suspendedMembers,
      onlineMembers,
    ] = await Promise.all([
      Member.countDocuments(),
      Member.countDocuments({ status: "active" }),
      Member.countDocuments({ status: "inactive" }),
      Member.countDocuments({ status: "suspended" }),
      Member.countDocuments({ online: true }),
    ]);

    res.json({
      success: true,
      dashboard: {
        totalMembers,
        activeMembers,
        inactiveMembers,
        suspendedMembers,
        onlineMembers,
      },
    });

  } catch (error) {
    console.error("Dashboard Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load dashboard.",
    });
  }
};

/* =====================================================
   GET ALL MEMBERS
===================================================== */

exports.getMembers = async (req, res) => {
  try {
    const members = await Member.find()
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: members.length,
      members,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch members.",
    });
  }
};

/* =====================================================
   GET SINGLE MEMBER
===================================================== */

exports.getMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id)
      .select("-password");

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found.",
      });
    }

    res.json({
      success: true,
      member,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch member.",
    });
  }
};

/* =====================================================
   CREATE MEMBER
===================================================== */

exports.createMember = async (req, res) => {
  try {
    const member = await Member.create(req.body);

    res.status(201).json({
      success: true,
      message: "Member added successfully.",
      member,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to add member.",
    });
  }
};

/* =====================================================
   UPDATE MEMBER
===================================================== */

exports.updateMember = async (req, res) => {
  try {
    const member = await Member.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found.",
      });
    }

    res.json({
      success: true,
      message: "Member updated successfully.",
      member,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to update member.",
    });
  }
};

/* =====================================================
   DELETE MEMBER
===================================================== */

exports.deleteMember = async (req, res) => {
  try {
    const member = await Member.findByIdAndDelete(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found.",
      });
    }

    res.json({
      success: true,
      message: "Member deleted successfully.",
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to delete member.",
    });
  }
};