const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_DB_CONNECTION_STRING, {
      tls: true,
      tlsAllowInvalidCertificates: true, // dev only — remove in strict production
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.warn(`⚠️  Running without MongoDB - Auth, Admin, and Waitlist routes won't work`);
    // Don't exit, let the app continue for testing Voice-to-Voice functionality
  }
};

module.exports = connectDB;
