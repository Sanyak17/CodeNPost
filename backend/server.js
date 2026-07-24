require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const startScheduler = require("./cron/scheduler");

const authRoutes = require("./routes/auth");
const accountsRoutes = require("./routes/accounts");
const linkedinRoutes = require("./routes/linkedin");
const postsRoutes = require("./routes/posts");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountsRoutes);
app.use("/api/linkedin", linkedinRoutes);
app.use("/api/posts", postsRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
    startScheduler();
  });
});
