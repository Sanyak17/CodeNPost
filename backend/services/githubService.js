const axios = require("axios");

const GITHUB_API = "https://api.github.com";

const githubHeaders = {
  Authorization: `token ${process.env.GITHUB_TOKEN}`,
  Accept: "application/vnd.github+json",
};

/**
 * GitHub's public Events API tells us WHICH pushes happened (repo, before/head SHA,
 * timestamp) but no longer includes commit messages directly in the payload.
 * So for each recent PushEvent, we call the "compare" endpoint (before...head)
 * which returns the actual list of commits with their messages for that push.
 */
async function fetchRecentCommits(githubUsername, sinceDate) {
  let events;
  try {
    const response = await axios.get(
      `${GITHUB_API}/users/${githubUsername}/events/public`,
      { headers: githubHeaders }
    );
    events = response.data;
  } catch (err) {
    if (err.response?.status === 404) {
      // Clearer than a silent empty result - the username itself is wrong,
      // not "no recent activity."
      throw new Error(`GitHub username "${githubUsername}" not found`);
    }
    console.error("[GitHubService] fetch failed:", err.message);
    return [];
  }

  const recentPushes = events.filter((event) => {
    if (event.type !== "PushEvent") return false;
    const eventDate = new Date(event.created_at);
    return !sinceDate || eventDate >= sinceDate;
  });

  // Cap how many pushes we expand into full commit details, to avoid
  // hammering the GitHub API with too many requests for one generation.
  const pushesToExpand = recentPushes.slice(0, 10);

  const commits = [];
  for (const event of pushesToExpand) {
    const { before, head } = event.payload;
    const repoName = event.repo.name;

    try {
      const { data: comparison } = await axios.get(
        `${GITHUB_API}/repos/${repoName}/compare/${before}...${head}`,
        { headers: githubHeaders }
      );

      for (const commit of comparison.commits || []) {
        commits.push({
          message: commit.commit.message.split("\n")[0], // first line only
          repo: repoName,
          date: new Date(event.created_at),
        });
      }
    } catch (compareErr) {
      // A single push failing to expand (e.g. force-push changed history)
      // shouldn't break the whole fetch - skip it and keep going.
      console.error(`[GitHubService] compare failed for ${repoName}:`, compareErr.message);
    }
  }

  return commits;
}

/**
 * Lightweight check - just confirms the username exists, without pulling
 * any activity data. Used for immediate validation when the user saves
 * their username, rather than waiting until they try to generate a post.
 */
async function usernameExists(githubUsername) {
  try {
    await axios.get(`${GITHUB_API}/users/${githubUsername}`, { headers: githubHeaders });
    return true;
  } catch (err) {
    if (err.response?.status === 404) return false;
    // Any other error (network, rate limit) - don't block saving over an
    // unrelated issue, just assume valid and let the real fetch surface it later.
    return true;
  }
}

module.exports = { fetchRecentCommits, usernameExists };