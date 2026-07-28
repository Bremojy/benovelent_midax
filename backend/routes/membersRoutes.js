const express = require("express");

const Member = require("../models/Member");

const auth = require("../middleware/auth");
const roleAuth = require("../middleware/roleAuth");

const router = express.Router();

/* ===================================================
   ADMIN ROUTES
=================================================== */

// ========================================
// GET ALL MEMBERS
// Admin Only
// ========================================

router.get(
  "/",
  auth,
  roleAuth("admin", "superadmin"),
  async (req, res) => {
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
        message: "Failed to fetch members",
      });
    }
  }
);

// ========================================
// GET MEMBER BY ID
// Admin Only
// ========================================

router.get(
  "/:id",
  auth,
  roleAuth("admin", "superadmin"),
  async (req, res) => {
    try {
      const member = await Member.findById(req.params.id)
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
        message: "Failed to fetch member",
      });

    }
  }
);

// ========================================
// CREATE MEMBER
// Admin Only
// ========================================

router.post(
  "/",
  auth,
  roleAuth("admin", "superadmin"),
  async (req, res) => {

    try {

      const member = await Member.create(req.body);

      res.status(201).json({
        success: true,
        message: "Member created successfully",
        member,
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        message: "Failed to create member",
      });

    }
  }
);

// ========================================
// UPDATE MEMBER
// Admin Only
// ========================================

router.put(
  "/:id",
  auth,
  roleAuth("admin", "superadmin"),
  async (req, res) => {

    try {

      const member =
        await Member.findByIdAndUpdate(
          req.params.id,
          req.body,
          {
            new: true,
            runValidators: true,
          }
        );

      if (!member) {

        return res.status(404).json({
          success: false,
          message: "Member not found",
        });

      }

      res.json({
        success: true,
        message: "Member updated successfully",
        member,
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        message: "Failed to update member",
      });

    }

  }
);

// ========================================
// DELETE MEMBER
// Admin Only
// ========================================

router.delete(
  "/:id",
  auth,
  roleAuth("admin", "superadmin"),
  async (req, res) => {

    try {

      const member =
        await Member.findByIdAndDelete(
          req.params.id
        );

      if (!member) {

        return res.status(404).json({
          success: false,
          message: "Member not found",
        });

      }

      res.json({
        success: true,
        message: "Member deleted successfully",
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        message: "Failed to delete member",
      });

    }

  }
);

/* ===================================================
   MEMBER ROUTES
=================================================== */

// ========================================
// GET MY PROFILE
// ========================================

router.get(
  "/profile/me",
  auth,
  roleAuth("member", "admin", "superadmin"),
  async (req, res) => {

    res.json({
      success: true,
      user: req.user,
    });

  }
);

// ========================================
// UPDATE MY PROFILE
// ========================================

router.put(
  "/profile/me",
  auth,
  roleAuth("member", "admin", "superadmin"),
  async (req, res) => {

    try {

      const updates = {
        fullName: req.body.fullName,
        phone: req.body.phone,
        email: req.body.email,
        bio: req.body.bio,
        profileImage: req.body.profileImage,
      };

      const member =
        await Member.findByIdAndUpdate(
          req.user._id,
          updates,
          {
            new: true,
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
        message: "Failed to update profile",
      });

    }

  }
);

module.exports = router;