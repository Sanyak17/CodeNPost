const express = require("express");
const User = require("../models/User");
const Post = require("../models/Post");
const protect = require("../middleware/auth");
const githubService = require("../services/githubService");
const leetcodeService = require("../services/leetcodeService");

const router = express.Router();

// POST /api/accounts/link  { githubUsername, leetcodeUsername }
router.post("/link", protect, async (req, res) => {
  try {
    const { githubUsername, leetcodeUsername } = req.body;
    const errors = [];

    const [githubValid, leetcodeValid] = await Promise.all([
      githubUsername ? githubService.usernameExists(githubUsername) : Promise.resolve(true),
      leetcodeUsername ? leetcodeService.usernameExists(leetcodeUsername) : Promise.resolve(true),
    ]);

    if (githubUsername && !githubValid) errors.push(`GitHub username "${githubUsername}" not found`);
    if (leetcodeUsername && !leetcodeValid) errors.push(`LeetCode username "${leetcodeUsername}" not found`);

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(" | ") });
    }

    const existingUser = await User.findById(req.userId);
    const usernameChanged =
      (githubUsername !== undefined && githubUsername !== existingUser.githubUsername) ||
      (leetcodeUsername !== undefined && leetcodeUsername !== existingUser.leetcodeUsername);

    const update = {};
    if (githubUsername !== undefined) update.githubUsername = githubUsername;
    if (leetcodeUsername !== undefined) update.leetcodeUsername = leetcodeUsername;

    const user = await User.findByIdAndUpdate(req.userId, update, { new: true });

    // Drafts were generated from the OLD linked account's data, so they're no
    // longer relevant once the account changes. "Posted" posts are left alone
    // since they're a real historical record of what was actually published.
    let deletedDraftCount = 0;
    if (usernameChanged) {
      const result = await Post.deleteMany({ user: req.userId, status: "draft" });
      deletedDraftCount = result.deletedCount;
    }

    res.json({
      githubUsername: user.githubUsername,
      leetcodeUsername: user.leetcodeUsername,
      deletedDraftCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;