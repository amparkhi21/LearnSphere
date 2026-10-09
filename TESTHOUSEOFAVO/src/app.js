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

// Render/Vercel-style hosting sits behind a reverse proxy. Without this, every user
// shares the proxy's IP, so the rate limiters would throttle ALL users together.
app.set("trust proxy", 1);

// ---------- Core middlewares ----------
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

// ---------- CORS ----------
// Origins are compared without trailing slashes ("https://x.app/" === "https://x.app"),
// a very common env-var typo that otherwise silently breaks every browser request.
const normalizeOrigin = (value) => String(value || "").trim().replace(/\/+$/, "");

const allowedOrigins = [
  process.env.CLIENT_URL || (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : ""),
  ...(process.env.CLIENT_URLS || "").split(","),
]
  .map(normalizeOrigin)
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no Origin header
      // (for example, Postman or server-to-server requests)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(normalizeOrigin(origin))) {
        return callback(null, true);
      }

      const corsError = new Error(`CORS blocked for origin: ${origin}`);
      corsError.statusCode = 403;
      return callback(corsError);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ---------- Rate limiting ----------
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", apiLimiter);

// ---------- Local uploads ----------
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ---------- Health check ----------
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message:
      "AI-Powered Learning Marketplace & Exam Prep Platform API is running 🚀",
    docs: "/api/v1",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// ---------- API routes ----------
app.use("/api/v1", routes);

// ---------- Error handling ----------
app.use(notFound);
app.use(errorHandler);

module.exports = app;