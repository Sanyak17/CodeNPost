const express = require("express");
const User = require("../models/User");
const Post = require("../models/Post");
const protect = require("../middleware/auth");
const githubService = require("../services/githubService");
const leetcodeService = require("../services/leetcodeService");
const aiService = require("../services/aiService");
const linkedinService = require("../services/linkedinService");

const router = express.Router();

/**
 * Core pipeline, reused by both the manual "generate" route and the cron job.
 * 1. Fetch raw activity  2. Ask AI to summarize  3. Save as a draft Post
 */
async function generateDraftForUser(user) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // last 7 days

  // Fetch both sources independently so a bad username on one platform
  // doesn't prevent us from also checking/reporting the other.
  const errors = [];

  let commits = [];
  if (user.githubUsername) {
    try {
      commits = await githubService.fetchRecentCommits(user.githubUsername, since);
    } catch (err) {
      errors.push(err.message);
    }
  }

  let leetcodeSolved = [];
  if (user.leetcodeUsername) {
    try {
      leetcodeSolved = await leetcodeService.fetchRecentSubmissions(user.leetcodeUsername);
    } catch (err) {
      errors.push(err.message);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join(" | "));
  }

  if (commits.length === 0 && leetcodeSolved.length === 0) {
    return null; // nothing new - skip, avoids posting empty/repetitive content
  }

  const generatedText = await aiService.generatePost({ commits, leetcodeSolved });

  const post = await Post.create({
    user: user._id,
    sourceData: { commits, leetcodeSolved },
    generatedText,
    status: "draft",
  });

  return post;
}

// POST /api/posts/generate - manually trigger draft generation for logged-in user
router.post("/generate", protect, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const post = await generateDraftForUser(user);
    if (!post) return res.status(200).json({ message: "No new activity to summarize" });
    res.status(201).json(post);
  } catch (err) {
    // Invalid GitHub username produces a clear, specific message rather than a generic 500
    if (err.message.includes("not found")) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/posts/:id - edit the AI-generated text before publishing
router.put("/:id", protect, async (req, res) => {
  try {
    const { generatedText } = req.body;
    const post = await Post.findOneAndUpdate(
      { _id: req.params.id, user: req.userId, status: "draft" },
      { generatedText },
      { new: true }
    );
    if (!post) return res.status(404).json({ error: "Draft not found" });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/posts/:id/regenerate - re-run AI generation on the same source
// data, optionally guided by custom instructions from the user (e.g. "make it
// shorter", "more casual tone", "focus only on the leetcode problems")
router.post("/:id/regenerate", protect, async (req, res) => {
  try {
    const { instruction } = req.body;
    const post = await Post.findOne({ _id: req.params.id, user: req.userId, status: "draft" });
    if (!post) return res.status(404).json({ error: "Draft not found" });

    const generatedText = await aiService.generatePost({
      commits: post.sourceData.commits || [],
      leetcodeSolved: post.sourceData.leetcodeSolved || [],
      customInstruction: instruction,
    });

    post.generatedText = generatedText;
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: "Failed to regenerate", details: err.message });
  }
});

// POST /api/posts/:id/publish - publish a draft to LinkedIn
router.post("/:id/publish", protect, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const post = await Post.findOne({ _id: req.params.id, user: req.userId });

    if (!post) return res.status(404).json({ error: "Post not found" });
    if (!user.linkedin?.connected) {
      return res.status(400).json({ error: "LinkedIn account not connected" });
    }

    try {
      const linkedinPostId = await linkedinService.publishPost(
        user.linkedin.accessToken,
        user.linkedin.linkedinUserId,
        post.generatedText
      );
      post.status = "posted";
      post.linkedinPostId = linkedinPostId;
      await post.save();
      res.json(post);
    } catch (publishErr) {
      post.status = "failed";

      // LinkedIn returns specific info in the response body - surface that
      // instead of a generic axios error message where possible.
      const linkedinStatus = publishErr.response?.status;
      const linkedinMessage = publishErr.response?.data?.message;
      let friendlyMessage = linkedinMessage || publishErr.message;

      if (linkedinStatus === 401) {
        friendlyMessage = "LinkedIn session expired - reconnect LinkedIn and try again.";
      } else if (linkedinStatus === 403) {
        friendlyMessage = "LinkedIn denied permission to post - check the app's product access.";
      } else if (linkedinStatus === 429) {
        friendlyMessage = "LinkedIn rate limit reached - wait a bit before trying again.";
      }

      post.errorMessage = friendlyMessage;
      await post.save();
      res.status(502).json({ error: "Failed to publish to LinkedIn", details: friendlyMessage });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/posts/:id - remove a post (e.g. cleanup old test drafts)
router.delete("/:id", protect, async (req, res) => {
  try {
    const post = await Post.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/posts - history of drafts/posts for logged-in user
router.get("/", protect, async (req, res) => {
  try {
    const posts = await Post.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.generateDraftForUser = generateDraftForUser;