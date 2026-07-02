const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const { User } = require("./models/User");

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB_CONNECTION_STRING);
    console.log("Connected to MongoDB...");

    const adminEmail = "Praisecyber2005@gmail.com";
    const adminPassword = "Admin@probix@55#mtn!"; // You should change this after login
    const adminPin = "123456"; // Initial 6-digit PIN for dashboard access

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log(`Admin with email ${adminEmail} already exists.`);
      process.exit(0);
    }

    const admin = new User({
      fullname: "System Admin",
      email: adminEmail,
      password: adminPassword,
      adminPin: adminPin,
      preferredLanguage: "English",
      role: "admin"
    });

    await admin.save();
    console.log("*****************************************");
    console.log("Admin User Created Successfully!");
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log(`PIN: ${adminPin}`);
    console.log("*****************************************");
    process.exit(0);
  } catch (error) {
    console.error("Error creating admin:", error);
    process.exit(1);
  }
};

createAdmin();
