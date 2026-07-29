const bcrypt = require("bcryptjs");
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
      verifiedMembers,
    ] = await Promise.all([
      Member.countDocuments({ isDeleted: false }),
      Member.countDocuments({ status: "active", isDeleted: false }),
      Member.countDocuments({ status: "inactive", isDeleted: false }),
      Member.countDocuments({ status: "suspended", isDeleted: false }),
      Member.countDocuments({ online: true, isDeleted: false }),
      Member.countDocuments({ verified: true, isDeleted: false }),
    ]);

    res.json({
      success: true,
      dashboard: {
        totalMembers,
        activeMembers,
        inactiveMembers,
        suspendedMembers,
        onlineMembers,
        verifiedMembers,
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

/* =====================================================
   GET ALL MEMBERS
===================================================== */

exports.getMembers = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search || "";

    const query = {
      isDeleted: false,
      $or: [
        { fullName: { $regex: search, $options: "i" } },
        { memberNumber: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ],
    };

    const total = await Member.countDocuments(query);

    const members = await Member.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      count: members.length,
      members,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
   GET SINGLE MEMBER
===================================================== */

exports.getMember = async (req, res) => {
  try {
    const member = await Member.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).select("-password");

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
      message: error.message,
    });
  }
};

/* =====================================================
   CREATE MEMBER
===================================================== */

exports.createMember = async (req, res) => {
  try {
    const {
      memberNumber,
      fullName,
      username,
      phone,
      email,
      department,
      position,
      monthlyContribution,
    } = req.body;

    if (!memberNumber || !fullName || !phone) {
      return res.status(400).json({
        success: false,
        message: "Member Number, Full Name and Phone are required.",
      });
    }

    const existing = await Member.findOne({
      $or: [
        { memberNumber },
        { email: email || null },
        { username: username || null },
      ],
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Member already exists.",
      });
    }

    // Temporary password
    const tempPassword = "MIDAX@123";

    const password = await bcrypt.hash(tempPassword, 10);

    const member = await Member.create({
      memberNumber,
      fullName,
      username,
      phone,
      email,
      department,
      position,
      monthlyContribution: monthlyContribution || 0,
      password,
      role: "member",
      mustChangePassword: true,
    });

    res.status(201).json({
      success: true,
      message: "Member created successfully.",
      temporaryPassword: tempPassword,
      member,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
   UPDATE MEMBER
===================================================== */

exports.updateMember = async (req, res) => {
  try {
    const member = await Member.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found.",
      });
    }

    // Prevent duplicate email
    if (
      req.body.email &&
      req.body.email !== member.email
    ) {
      const existingEmail = await Member.findOne({
        email: req.body.email,
        _id: { $ne: member._id },
      });

      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "Email already exists.",
        });
      }
    }

    // Prevent duplicate username
    if (
      req.body.username &&
      req.body.username !== member.username
    ) {
      const existingUsername = await Member.findOne({
        username: req.body.username,
        _id: { $ne: member._id },
      });

      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: "Username already exists.",
        });
      }
    }

    member.fullName =
      req.body.fullName ?? member.fullName;

    member.username =
      req.body.username ?? member.username;

    member.phone =
      req.body.phone ?? member.phone;

    member.email =
      req.body.email ?? member.email;

    member.department =
      req.body.department ?? member.department;

    member.position =
      req.body.position ?? member.position;

    member.monthlyContribution =
      req.body.monthlyContribution ??
      member.monthlyContribution;

    member.status =
      req.body.status ?? member.status;

    member.notes =
      req.body.notes ?? member.notes;

    await member.save();

    res.json({
      success: true,
      message: "Member updated successfully.",
      member,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


/* =====================================================
   SUSPEND MEMBER
===================================================== */

exports.suspendMember = async (req, res) => {

  try {

    const member = await Member.findById(req.params.id);

    if (!member) {

      return res.status(404).json({
        success:false,
        message:"Member not found."
      });

    }

    member.status = "suspended";
    member.online = false;

    await member.save();

    res.json({

      success:true,

      message:"Member suspended successfully.",

      member

    });

  } catch(error){

    res.status(500).json({

      success:false,

      message:error.message

    });

  }

};

/* =====================================================
   ACTIVATE MEMBER
===================================================== */

exports.activateMember = async (req,res)=>{

  try{

    const member =
      await Member.findById(req.params.id);

    if(!member){

      return res.status(404).json({

        success:false,

        message:"Member not found."

      });

    }

    member.status="active";

    await member.save();

    res.json({

      success:true,

      message:"Member activated successfully.",

      member

    });

  }

  catch(error){

    res.status(500).json({

      success:false,

      message:error.message

    });

  }

};

/* =====================================================
   SOFT DELETE MEMBER
===================================================== */

exports.deleteMember = async (req,res)=>{

  try{

    const member =
      await Member.findById(req.params.id);

    if(!member){

      return res.status(404).json({

        success:false,

        message:"Member not found."

      });

    }

    member.isDeleted = true;

    member.online = false;

    await member.save();

    res.json({

      success:true,

      message:"Member deleted successfully."

    });

  }

  catch(error){

    res.status(500).json({

      success:false,

      message:error.message

    });

  }

};

/* =====================================================
   RESTORE MEMBER
===================================================== */

exports.restoreMember = async (req,res)=>{

  try{

    const member =
      await Member.findById(req.params.id);

    if(!member){

      return res.status(404).json({

        success:false,

        message:"Member not found."

      });

    }

    member.isDeleted = false;

    member.status = "active";

    await member.save();

    res.json({

      success:true,

      message:"Member restored successfully.",

      member

    });

  }

  catch(error){

    res.status(500).json({

      success:false,

      message:error.message

    });

  }

};

/* =====================================================
   RESET MEMBER PASSWORD
===================================================== */

exports.resetPassword = async (req,res)=>{

  try{

    const member =
      await Member.findById(req.params.id);

    if(!member){

      return res.status(404).json({

        success:false,

        message:"Member not found."

      });

    }

    const temporaryPassword = "MIDAX@123";

    member.password =
      await bcrypt.hash(
        temporaryPassword,
        10
      );

    member.mustChangePassword = true;

    await member.save();

    res.json({

      success:true,

      message:"Password reset successfully.",

      temporaryPassword

    });

  }

  catch(error){

    res.status(500).json({

      success:false,

      message:error.message

    });

  }

};

/* =====================================================
   RECENT MEMBERS
===================================================== */

exports.getRecentMembers = async (req, res) => {
  try {

    const members = await Member.find({
      isDeleted: false
    })
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      count: members.length,
      members,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

/* =====================================================
   MEMBER STATISTICS
===================================================== */

exports.getStatistics = async (req, res) => {

  try {

    const [
      totalMembers,
      activeMembers,
      inactiveMembers,
      suspendedMembers,
      onlineMembers,
      verifiedMembers,
      deletedMembers,
    ] = await Promise.all([

      Member.countDocuments({ isDeleted: false }),

      Member.countDocuments({
        status: "active",
        isDeleted: false,
      }),

      Member.countDocuments({
        status: "inactive",
        isDeleted: false,
      }),

      Member.countDocuments({
        status: "suspended",
        isDeleted: false,
      }),

      Member.countDocuments({
        online: true,
        isDeleted: false,
      }),

      Member.countDocuments({
        verified: true,
        isDeleted: false,
      }),

      Member.countDocuments({
        isDeleted: true,
      }),

    ]);

    res.json({

      success: true,

      statistics: {

        totalMembers,

        activeMembers,

        inactiveMembers,

        suspendedMembers,

        onlineMembers,

        verifiedMembers,

        deletedMembers,

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

/* =====================================================
   FILTER MEMBERS
===================================================== */

exports.filterMembers = async (req, res) => {

  try {

    const {

      status,

      department,

      verified,

      online,

    } = req.query;

    const query = {
      isDeleted: false,
    };

    if (status) query.status = status;

    if (department) query.department = department;

    if (verified !== undefined)
      query.verified = verified === "true";

    if (online !== undefined)
      query.online = online === "true";

    const members = await Member.find(query)
      .select("-password")
      .sort({ fullName: 1 })
      .lean();

    res.json({

      success: true,

      count: members.length,

      members,

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({

      success: false,

      message: error.message,

    });

  }

};

/* =====================================================
   MONTHLY REGISTRATION REPORT
===================================================== */

exports.monthlyRegistrations = async (req, res) => {

  try {

    const report = await Member.aggregate([

      {
        $match: {
          isDeleted: false,
        },
      },

      {
        $group: {

          _id: {

            year: {
              $year: "$createdAt",
            },

            month: {
              $month: "$createdAt",
            },

          },

          total: {
            $sum: 1,
          },

        },

      },

      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },

    ]);

    res.json({

      success: true,

      report,

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({

      success: false,

      message: error.message,

    });

  }

};

/* =====================================================
   CONTRIBUTION SUMMARY
===================================================== */

exports.contributionSummary = async (req, res) => {

  try {

    const summary = await Member.aggregate([

      {
        $match: {
          isDeleted: false,
        },
      },

      {
        $group: {

          _id: null,

          totalContribution: {
            $sum: "$monthlyContribution",
          },

          averageContribution: {
            $avg: "$monthlyContribution",
          },

          highestContribution: {
            $max: "$monthlyContribution",
          },

          lowestContribution: {
            $min: "$monthlyContribution",
          },

        },

      },

    ]);

    res.json({

      success: true,

      summary:
        summary[0] || {},

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({

      success: false,

      message: error.message,

    });

  }

};

