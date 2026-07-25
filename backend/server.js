require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const startScheduler = require("./cron/scheduler");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth");
const accountsRoutes = require("./routes/accounts");
const linkedinRoutes = require("./routes/linkedin");
const postsRoutes = require("./routes/posts");

const app = express();

app.use(cors());
app.use(express.json());

// Rate limit auth routes specifically - these are the ones most worth
// protecting against brute-force attempts (repeated login guesses, or
// scripted mass signups). Other routes are already behind JWT auth, which
// is a stronger barrier on its own.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window per IP
  message: { error: "Too many attempts. Please try again in a few minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/accounts", accountsRoutes);
app.use("/api/linkedin", linkedinRoutes);
app.use("/api/posts", postsRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "CodeNPost API is running",
    frontend: "https://code-n-post.vercel.app",
    health: "/api/health",
  });
});

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// These two MUST be registered last, in this order - after every real
// route, so notFoundHandler only catches genuinely unmatched requests,
// and errorHandler catches anything thrown/passed to next() anywhere above.
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
    startScheduler();
  });
});