const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const path = require("path");

const routes = require("./routes");
const { notFound, errorHandler } = require("./middlewares/error.middleware");

const app = express();

// ---------- Core middlewares ----------
app.use(
  helmet({
    crossOriginResourcePolicy: false, // allow serving uploaded files/images cross-origin
  })
);
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Basic rate limiting to protect free-tier deployments from abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

// Serve locally uploaded files (used when Cloudinary isn't configured)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ---------- Health check ----------
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AI-Powered Learning Marketplace & Exam Prep Platform API is running 🚀",
    docs: "/api/v1",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// ---------- API routes ----------
app.use("/api/v1", routes);

// ---------- Error handling ----------
app.use(notFound);
app.use(errorHandler);

module.exports = app;
