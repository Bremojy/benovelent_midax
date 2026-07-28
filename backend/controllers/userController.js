const bcrypt = require("bcryptjs");

const Member = require("../models/Member");

/* ==========================================
   MEMBER DASHBOARD
========================================== */

exports.getDashboard = async (req, res) => {
  try {
    const member = await Member.findById(req.user._id).select("-password");

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    res.json({
      success: true,

      dashboard: {
        member,

        statistics: {
          totalContribution: member.monthlyContribution,
          notifications: member.unreadNotifications || 0,
          unreadMessages: member.unreadMessages || 0,
          claims: 0,
        },
      },
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to load dashboard",
    });

  }
};


/* ==========================================
   GET PROFILE
========================================== */

exports.getProfile = async (req, res) => {

  try {

    const member =
      await Member.findById(req.user._id)
        .select("-password");

    if (!member) {

      return res.status(404).json({
        success: false,
        message: "Member not found",
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
      message: "Failed to load profile",
    });

  }

};


/* ==========================================
   UPDATE PROFILE
========================================== */

exports.updateProfile = async (req, res) => {

  try {

    const updates = {
      fullName: req.body.fullName,
      phone: req.body.phone,
      email: req.body.email,
      bio: req.body.bio,
      profileImage: req.body.profileImage,
      department: req.body.department,
      position: req.body.position,
    };

    const member =
      await Member.findByIdAndUpdate(
        req.user._id,
        updates,
        {
          new: true,
          runValidators: true,
        }
      ).select("-password");

    res.json({
      success: true,
      message: "Profile updated successfully",
      member,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Profile update failed",
    });

  }

};


/* ==========================================
   CHANGE PASSWORD
========================================== */

exports.changePassword = async (req, res) => {

  try {

    const {
      currentPassword,
      newPassword,
    } = req.body;

    if (!currentPassword || !newPassword) {

      return res.status(400).json({
        success: false,
        message:
          "Current and new passwords are required.",
      });

    }

    const member =
      await Member.findById(req.user._id);

    const match =
      await bcrypt.compare(
        currentPassword,
        member.password
      );

    if (!match) {

      return res.status(400).json({
        success: false,
        message:
          "Current password is incorrect.",
      });

    }

    member.password =
      await bcrypt.hash(
        newPassword,
        10
      );

    await member.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Password update failed",
    });

  }

};


/* ==========================================
   MEMBER SUMMARY
========================================== */

exports.getSummary = async (req, res) => {

  try {

    const member =
      await Member.findById(req.user._id)
        .select("-password");

    res.json({

      success: true,

      summary: {

        memberNumber:
          member.memberNumber,

        fullName:
          member.fullName,

        contribution:
          member.monthlyContribution,

        status:
          member.status,

        online:
          member.online,

        lastSeen:
          member.lastSeen,

      },

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message:
        "Failed to fetch summary.",
    });

  }

};