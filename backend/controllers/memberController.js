const bcrypt = require("bcryptjs");

const Member = require("../models/Member");const Contribution = require("../models/Contribution");
const News = require("../models/News");
const Message = require("../models/Message");   

exports.getDashboard = async (req, res) => {
  try {
    const member = await Member.findById(req.user._id)
      .select("-password")
      .lean();

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found.",
      });
    }

    // Contribution statistics
    const contributions = await Contribution.find({
      member: member._id,
    }).sort({ year: -1, month: -1 });

    const totalContributions = contributions.reduce(
      (sum, item) => sum + (item.paidAmount || 0),
      0
    );

    const latestContributions = contributions.slice(0, 5);

    // Latest published news
    const announcements = await News.find({
      status: "published",
      published: true,
    })
      .sort({ publishDate: -1 })
      .limit(5)
      .select("title category publishDate");

    // Unread messages
    const unreadMessages = await Message.countDocuments({
      deletedForEveryone: false,
      sender: { $ne: member._id },
      seenBy: { $ne: member._id },
    });

    res.json({
      success: true,

      dashboard: {
        member,

        statistics: {
          totalContributions,
          monthlyContribution: member.monthlyContribution,
          unreadMessages,
          membershipStatus: member.status,
          online: member.online,
        },

        announcements,

        recentContributions: latestContributions,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
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

        const member = await Member.findById(req.user._id);

        if (!member) {

            return res.status(404).json({
                success: false,
                message: "Member not found."
            });

        }

        // Prevent duplicate email
        if (
            req.body.email &&
            req.body.email !== member.email
        ) {

            const existingEmail =
                await Member.findOne({
                    email: req.body.email
                });

            if (existingEmail) {

                return res.status(400).json({

                    success:false,

                    message:"Email already exists."

                });

            }

        }

        // Members can only edit these fields

        member.fullName =
            req.body.fullName || member.fullName;

        member.phone =
            req.body.phone || member.phone;

        member.email =
            req.body.email || member.email;

        member.bio =
            req.body.bio || member.bio;

        member.profileImage =
            req.body.profileImage || member.profileImage;

        member.coverImage =
            req.body.coverImage || member.coverImage;

        member.lastSeen = new Date();

        await member.save();

        res.json({

            success:true,

            message:"Profile updated successfully.",

            member

        });

    }

    catch(error){

        console.error(error);

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};


/* ==========================================
   CHANGE PASSWORD
========================================== */



exports.getSummary = async (req,res)=>{

    try{

        const member = await Member.findById(req.user._id)
            .select("-password")
            .lean();

        if(!member){

            return res.status(404).json({

                success:false,

                message:"Member not found."

            });

        }

        res.json({

            success:true,

            summary:{

                memberNumber:member.memberNumber,

                fullName:member.fullName,

                username:member.username,

                email:member.email,

                phone:member.phone,

                contribution:member.monthlyContribution,

                status:member.status,

                online:member.online,

                verified:member.verified,

                joinDate:member.joinDate,

                lastSeen:member.lastSeen

            }

        });

    }

    catch(error){

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};


// ==========================================
// MEMBER SETTINGS
// ==========================================

exports.getSettings = async (req, res) => {
  try {

    const member = await Member.findById(req.user.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    res.json({
      success: true,
      settings: {
        notifications:
          member.notifications ?? true,

        emailNotifications:
          member.emailNotifications ?? true,

        darkMode:
          member.darkMode ?? false,

        language:
          member.language || "English",
      },
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });

  }
};



// ==========================================
// UPDATE SETTINGS
// ==========================================

exports.updateSettings = async (req, res) => {

  try {

    const member = await Member.findById(req.user.id);

    if (!member) {
      return res.status(404).json({
        success:false,
        message:"Member not found",
      });
    }

    member.notifications =
      req.body.notifications;

    member.emailNotifications =
      req.body.emailNotifications;

    member.darkMode =
      req.body.darkMode;

    member.language =
      req.body.language;

    await member.save();

    res.json({
      success:true,
      message:"Settings updated successfully.",
    });

  } catch(err){

    console.error(err);

    res.status(500).json({
      success:false,
      message:"Server Error",
    });

  }

};