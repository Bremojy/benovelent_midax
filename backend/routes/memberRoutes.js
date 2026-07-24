const express = require("express");

const Member = require("../models/Member");

const router = express.Router();


// ========================================
// GET ALL MEMBERS
// ========================================

router.get("/", async (req, res) => {
  try {
    const members = await Member.find()
      .sort({ createdAt: -1 });

    res.json(members);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch members",
    });
  }
});


// ========================================
// GET ONE MEMBER
// ========================================

router.get("/:id", async (req, res) => {
  try {
    const member = await Member.findById(
      req.params.id
    );

    if (!member) {
      return res.status(404).json({
        message: "Member not found",
      });
    }

    res.json(member);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch member",
    });
  }
});


// ========================================
// ADD MEMBER
// ========================================

router.post("/", async (req, res) => {
  try {
    const member = await Member.create(
      req.body
    );

    res.status(201).json({
      message: "Member added successfully",
      member,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to add member",
    });
  }
});


// ========================================
// UPDATE MEMBER
// ========================================

router.put("/:id", async (req, res) => {
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
        message: "Member not found",
      });
    }

    res.json({
      message: "Member updated successfully",
      member,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to update member",
    });
  }
});


// ========================================
// DELETE MEMBER
// ========================================

router.delete("/:id", async (req, res) => {
  try {
    const member =
      await Member.findByIdAndDelete(
        req.params.id
      );

    if (!member) {
      return res.status(404).json({
        message: "Member not found",
      });
    }

    res.json({
      message: "Member deleted successfully",
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to delete member",
    });
  }
});


module.exports = router;