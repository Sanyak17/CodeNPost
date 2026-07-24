const axios = require("axios");

// NOTE: LeetCode has no official public API. This uses their unofficial
// GraphQL endpoint (same one their website's frontend calls). It can break
// if LeetCode changes their schema - worth mentioning as a known limitation.
const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";

async function usernameExists(leetcodeUsername) {
  const query = `
    query userExists($username: String!) {
      matchedUser(username: $username) {
        username
      }
    }
  `;
  const { data } = await axios.post(LEETCODE_GRAPHQL, {
    query,
    variables: { username: leetcodeUsername },
  });
  return !!data?.data?.matchedUser;
}

async function fetchRecentSubmissions(leetcodeUsername) {
  const query = `
    query recentAcSubmissions($username: String!, $limit: Int!) {
      recentAcSubmissionList(username: $username, limit: $limit) {
        title
        titleSlug
        timestamp
      }
    }
  `;

  try {
    const exists = await usernameExists(leetcodeUsername);
    if (!exists) {
      throw new Error(`LeetCode username "${leetcodeUsername}" not found`);
    }

    const { data } = await axios.post(LEETCODE_GRAPHQL, {
      query,
      variables: { username: leetcodeUsername, limit: 10 },
    });

    const list = data?.data?.recentAcSubmissionList || [];
    return list.map((item) => ({
      title: item.title,
      difficulty: null, // would require a second query per-problem to get difficulty
    }));
  } catch (err) {
    if (err.message.includes("not found")) throw err;
    console.error("[LeetCodeService] fetch failed:", err.message);
    return [];
  }
}

module.exports = { fetchRecentSubmissions, usernameExists };