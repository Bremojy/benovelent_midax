const bcrypt = require("bcryptjs");

const Member = require("../models/Member");

exports.getDashboard = async (req, res) => {

    try {

        const member = await Member.findById(req.user._id)
            .select("-password")
            .lean();

        if (!member) {

            return res.status(404).json({

                success:false,

                message:"Member not found."

            });

        }

        res.json({

            success:true,

            dashboard:{

                member,

                statistics:{

                    totalContribution:
                        member.monthlyContribution,

                    unreadNotifications:
                        member.unreadNotifications || 0,

                    unreadMessages:
                        member.unreadMessages || 0,

                    activeStatus:
                        member.status,

                    online:
                        member.online

                },

                quickLinks:[

                    "Profile",

                    "Messages",

                    "News",

                    "Polls",

                    "Finance"

                ]

            }

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