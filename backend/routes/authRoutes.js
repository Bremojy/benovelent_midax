const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Admin = require("../models/Admin");

const router = express.Router();


// ===============================
// ADMIN SIGNUP
// ===============================

router.post("/signup", async (req, res) => {
  try {

    const {
      name,
      email,
      password,
    } = req.body;


    if (!name || !email || !password) {

      return res.status(400).json({
        message: "All fields are required",
      });

    }


    const existingAdmin =
      await Admin.findOne({ email });


    if (existingAdmin) {

      return res.status(400).json({
        message: "Admin already exists",
      });

    }


    const hashedPassword =
      await bcrypt.hash(password, 10);


    const admin =
      await Admin.create({

        name,

        email,

        password: hashedPassword,

      });


    res.status(201).json({

      message: "Admin account created successfully",

      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
      },

    });


  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Server error",
    });

  }
});


// ===============================
// ADMIN LOGIN
// ===============================

router.post("/login", async (req, res) => {

  try {

    const {
      email,
      password,
    } = req.body;


    if (!email || !password) {

      return res.status(400).json({
        message:
          "Email and password are required",
      });

    }


    const admin =
      await Admin.findOne({
        email: email.toLowerCase(),
      });


    if (!admin) {

      return res.status(401).json({
        message:
          "Invalid email or password",
      });

    }


    const passwordMatch =
      await bcrypt.compare(
        password,
        admin.password
      );


    if (!passwordMatch) {

      return res.status(401).json({
        message:
          "Invalid email or password",
      });

    }


    const token =
      jwt.sign(

        {
          id: admin._id,
          role: admin.role,
        },

        process.env.JWT_SECRET,

        {
          expiresIn: "1d",
        }

      );


    res.json({

      message: "Login successful",

      token,

      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },

    });


  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Server error",
    });

  }

});


module.exports = router;