
require("dotenv").config();

const mongoose = require("mongoose");

const Admin = require("./models/Admin");
const SuperAdmin = require("./models/SuperAdmin");

async function createAccounts() {
  try {
    await mongoose.connect(
      process.env.MONGO_URI
    );

    const adminInitialPassword = String(process.env.ADMIN_INITIAL_PASSWORD || "").trim();
    const superAdminInitialPassword = String(process.env.SUPERADMIN_INITIAL_PASSWORD || "").trim();

    if (!adminInitialPassword || !superAdminInitialPassword) {
      throw new Error(
        "ADMIN_INITIAL_PASSWORD and SUPERADMIN_INITIAL_PASSWORD must be set before creating accounts."
      );
    }

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
      admin.password = adminInitialPassword;
      admin.status = "active";
      admin.role = "admin";
      admin.mustChangePassword = true;
      admin.failedLoginAttempts = 0;
      admin.accountLockedUntil = null;
      await admin.save();
      console.log("✅ Existing Admin account repaired and password synchronized.");
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
          adminInitialPassword,

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
      superAdmin.password = superAdminInitialPassword;
      superAdmin.status = "active";
      superAdmin.role = "superadmin";
      superAdmin.mustChangePassword = true;
      superAdmin.failedLoginAttempts = 0;
      superAdmin.accountLockedUntil = null;
      await superAdmin.save();
      console.log("✅ Existing SuperAdmin account repaired and password synchronized.");
    } else {
      superAdmin =
        new SuperAdmin({
          name:
            "Benevolent Midax Super Administrator",

          email:
            "superadmin@example.com",

          password:
            superAdminInitialPassword,

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
    // ACCOUNT SUMMARY
    // =====================================

    console.log("");
    console.log("========================================");
    console.log("Benevolent Midax account setup complete");
    console.log("========================================");
    console.log("Admin: admin@example.com");
    console.log("SuperAdmin: superadmin@example.com");
    console.log("Passwords are supplied only through environment variables.");

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
