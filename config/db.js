const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.DATABASE_URL;

  if (!mongoUri) {
    throw new Error("MongoDB URI is missing. Set one of MONGODB_URI, MONGO_URI, or DATABASE_URL in backend/.env");
  }

  try {
    await mongoose.connect(String(mongoUri).trim(), {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      family: 4,
    });

    const host = mongoose.connection?.host || "unknown-host";
    const dbName = mongoose.connection?.name || "unknown-db";
    console.log(`MongoDB connected (${host}/${dbName})`);
  } catch (error) {
    const message = error?.message || "Unknown MongoDB error";
    const hint = [
      "Check MongoDB Atlas IP allowlist (add your current IP or 0.0.0.0/0 for dev).",
      "Verify username/password and database name in the URI.",
      "Confirm cluster is active and network is reachable.",
      "Ensure URI starts with mongodb:// or mongodb+srv://.",
    ].join(" ");

    throw new Error(`${message}. ${hint}`);
  }
};

module.exports = { connectDB };
