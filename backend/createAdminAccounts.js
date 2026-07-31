
require("dotenv").config();

const mongoose = require("mongoose");

const Admin = require("./models/Admin");
const SuperAdmin = require("./models/SuperAdmin");

async function createAccounts() {
  try {
    await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log(
      "✅ Connected to MongoDB"
    );

    // =====================================
    // ADMIN
    // =====================================

    let admin =
      await Admin.findOne({
        email: "admin@example.com",
      });

    if (admin) {
      console.log(
        "⚠️ Admin account already exists."
      );
    } else {
      admin = new Admin({
        name:
          "Benevolent Midax Administrator",

        fullName:
          "Benevolent Midax Administrator",

        email:
          "admin@example.com",

        phone:
          "0712345679",

        password:
          "Admin123!",

        role:
          "admin",

        status:
          "active",

        mustChangePassword:
          true,
      });

      await admin.save();

      console.log(
        "✅ Admin account created."
      );
    }

    // =====================================
    // SUPERADMIN
    // =====================================

    let superAdmin =
      await SuperAdmin.findOne({
        email:
          "superadmin@example.com",
      });

    if (superAdmin) {
      console.log(
        "⚠️ SuperAdmin account already exists."
      );
    } else {
      superAdmin =
        new SuperAdmin({
          name:
            "Benevolent Midax Super Administrator",

          email:
            "superadmin@example.com",

          password:
            "SuperAdmin123!",

          role:
            "superadmin",

          status:
            "active",

          mustChangePassword:
            true,
        });

      await superAdmin.save();

      console.log(
        "✅ SuperAdmin account created."
      );
    }

    // =====================================
    // CREDENTIALS
    // =====================================

    console.log("");
    console.log(
      "========================================"
    );
    console.log(
      "Benevolent Midax Test Accounts"
    );
    console.log(
      "========================================"
    );

    console.log("");
    console.log(
      "ADMIN"
    );
    console.log(
      "Email: admin@example.com"
    );
    console.log(
      "Password: Admin123!"
    );

    console.log("");
    console.log(
      "SUPERADMIN"
    );
    console.log(
      "Email: superadmin@example.com"
    );
    console.log(
      "Password: SuperAdmin123!"
    );

    console.log("");
    console.log(
      "========================================"
    );

    await mongoose.disconnect();

    process.exit(0);

  } catch (error) {

    console.error(
      "❌ Account creation failed:"
    );

    console.error(error);

    try {
      await mongoose.disconnect();
    } catch (_) {}

    process.exit(1);
  }
}

createAccounts();
