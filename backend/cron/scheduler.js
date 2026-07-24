const cron = require("node-cron");
const User = require("../models/User");
const { generateDraftForUser } = require("../routes/posts");

/**
 * Registers the recurring job. Schedule is configurable via .env (CRON_SCHEDULE),
 * defaults to daily at 9am ("0 9 * * *").
 *
 * Design choice: the cron job only ever creates DRAFTS, never auto-publishes.
 * Auto-publishing without a human glance is riskier (AI could misfire), so even
 * users with autoPostEnabled=true just get a draft ready for one-click approval.
 */
function startScheduler() {
  const schedule = process.env.CRON_SCHEDULE || "0 9 * * *";

  cron.schedule(schedule, async () => {
    console.log("[Cron] Running scheduled draft generation...");
    const users = await User.find({ autoPostEnabled: true });

    for (const user of users) {
      try {
        const post = await generateDraftForUser(user);
        if (post) console.log(`[Cron] Draft created for ${user.email}`);
      } catch (err) {
        console.error(`[Cron] Failed for ${user.email}:`, err.message);
      }
    }
  });

  console.log(`[Cron] Scheduler registered with pattern "${schedule}"`);
}

module.exports = startScheduler;
