require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const liveKit = require("./services/livekit.service");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  // Report presence only; never emit LiveKit URLs, API keys, or secrets.
  console.info("[LiveKit] Backend startup configuration", liveKit.getConfigPresence());

  const server = app.listen(PORT, () => {
    console.log(`
🚀 Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}
🔗 http://localhost:${PORT}
📚 API base: http://localhost:${PORT}/api/v1
    `);
  });

  // Graceful shutdown & unhandled rejection safety
  process.on("unhandledRejection", (err) => {
    console.error("UNHANDLED REJECTION! Shutting down...", err);
    server.close(() => process.exit(1));
  });
};

startServer();
