const axios = require("axios");

const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo";
const LINKEDIN_POST_URL = "https://api.linkedin.com/v2/ugcPosts";

/** Builds the URL the frontend redirects the user to for LinkedIn login/consent */
function getAuthUrl() {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID,
    redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
    scope: "openid profile w_member_social", // w_member_social = permission to post
  });
  return `${LINKEDIN_AUTH_URL}?${params.toString()}`;
}

/** Exchanges the auth "code" (from LinkedIn redirect) for an access token */
async function exchangeCodeForToken(code) {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
    client_id: process.env.LINKEDIN_CLIENT_ID,
    client_secret: process.env.LINKEDIN_CLIENT_SECRET,
  });

  const { data } = await axios.post(LINKEDIN_TOKEN_URL, params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  return data; // { access_token, expires_in, ... }
}

/** Gets the LinkedIn user's own ID - needed as the "author" field when posting */
async function getLinkedinUserId(accessToken) {
  const { data } = await axios.get(LINKEDIN_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data.sub; // "sub" is the unique LinkedIn user ID (OpenID Connect standard claim)
}

/** Publishes a text post to LinkedIn on behalf of the connected user */
async function publishPost(accessToken, linkedinUserId, text) {
  const body = {
    author: `urn:li:person:${linkedinUserId}`,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const { data } = await axios.post(LINKEDIN_POST_URL, body, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });

  return data.id; // LinkedIn post ID
}

module.exports = {
  getAuthUrl,
  exchangeCodeForToken,
  getLinkedinUserId,
  publishPost,
};
