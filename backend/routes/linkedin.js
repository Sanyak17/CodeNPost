const express = require("express");
const User = require("../models/User");
const protect = require("../middleware/auth");
const linkedinService = require("../services/linkedinService");

const router = express.Router();

// GET /api/linkedin/status - protected, tells the frontend if this user has LinkedIn connected
router.get("/status", protect, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json({ connected: !!user.linkedin?.connected });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/linkedin/connect - protected, returns the URL frontend should redirect to
router.get("/connect", protect, async (req, res) => {
  // We stash the userId in "state" so the callback knows which user to attach tokens to
  const url = `${linkedinService.getAuthUrl()}&state=${req.userId}`;
  res.json({ url });
});

// GET /api/linkedin/callback - LinkedIn redirects here after user consents
// NOT protected by JWT middleware because LinkedIn calls this directly (no auth header)
router.get("/callback", async (req, res) => {
  try {
    const { code, state: userId } = req.query;
    if (!code || !userId) return res.status(400).send("Missing code or state");

    const tokenData = await linkedinService.exchangeCodeForToken(code);
    const linkedinUserId = await linkedinService.getLinkedinUserId(tokenData.access_token);

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    await User.findByIdAndUpdate(userId, {
      linkedin: {
        accessToken: tokenData.access_token,
        expiresAt,
        linkedinUserId,
        connected: true,
      },
    });

    // Redirect back to the dashboard so the user sees "LinkedIn connected"
    res.redirect(`${process.env.CLIENT_URL}/dashboard.html?linkedin=connected`);
  } catch (err) {
    console.error("[LinkedIn callback] failed:", err.message);
    res.redirect(`${process.env.CLIENT_URL}/dashboard.html?linkedin=error`);
  }
});

module.exports = router;