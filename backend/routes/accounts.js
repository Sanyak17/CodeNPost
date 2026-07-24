const express = require("express");
const User = require("../models/User");
const protect = require("../middleware/auth");
const githubService = require("../services/githubService");
const leetcodeService = require("../services/leetcodeService");

const router = express.Router();

// POST /api/accounts/link  { githubUsername, leetcodeUsername }
router.post("/link", protect, async (req, res) => {
  try {
    const { githubUsername, leetcodeUsername } = req.body;
    const errors = [];

    if (githubUsername) {
      const exists = await githubService.usernameExists(githubUsername);
      if (!exists) errors.push(`GitHub username "${githubUsername}" not found`);
    }
    if (leetcodeUsername) {
      const exists = await leetcodeService.usernameExists(leetcodeUsername);
      if (!exists) errors.push(`LeetCode username "${leetcodeUsername}" not found`);
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(" | ") });
    }

    const update = {};
    if (githubUsername !== undefined) update.githubUsername = githubUsername;
    if (leetcodeUsername !== undefined) update.leetcodeUsername = leetcodeUsername;

    const user = await User.findByIdAndUpdate(req.userId, update, { new: true });
    res.json({
      githubUsername: user.githubUsername,
      leetcodeUsername: user.leetcodeUsername,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;