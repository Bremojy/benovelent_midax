require("dotenv").config();

const mongoose = require("mongoose");
const Member = require("./models/Member");

async function createMember() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const existing = await Member.findOne({
      email: "member@example.com",
    });

    if (existing) {
      console.log("✅ Test member already exists.");
      process.exit();
    }

    const member = new Member({
      memberNumber: "BM0001",
      fullName: "John Mwangi",
      username: "johnmwangi",
      email: "member@example.com",
      password: "Member123!",
      phone: "0712345678",
      monthlyContribution: 500,
      role: "member",
      status: "active",
      verified: true,
    });

    await member.save();

    console.log("✅ Test member created successfully!");
    console.log("");
    console.log("Login credentials:");
    console.log("Email: member@example.com");
    console.log("Password: Member123!");

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

createMember();