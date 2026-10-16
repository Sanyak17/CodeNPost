const axios = require("axios");

const GEMINI_MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest"];
const geminiUrl = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

/**
 * Calls Gemini directly via REST instead of the @google/generative-ai SDK.
 * That SDK is legacy and doesn't correctly support the newer "AQ." key format,
 * so the key is sent in the `x-goog-api-key` header, as Google's docs show.
 * Tries the main model first, then falls back to a lighter one if Google
 * reports high demand (503) or the model is unavailable (404).
 */
async function generatePost({ commits, leetcodeSolved, customInstruction }) {
  const commitSummary = commits
    .slice(0, 8)
    .map((c) => `- ${c.message} (${c.repo})`)
    .join("\n");

  const leetcodeSummary = leetcodeSolved
    .slice(0, 10)
    .map((p) => `- ${p.title}${p.lang ? ` (solved in ${p.lang})` : ""}`)
    .join("\n");

  const hasCommits = commits.length > 0;
  const hasLeetcode = leetcodeSolved.length > 0;

  const prompt = `
You are helping a software developer write a "weekly recap" style LinkedIn post
summarizing their real coding activity from the past week. This should read like
a genuine, specific update from a working developer - not generic motivational
filler. Ground every claim in the actual data given below; do not invent details,
technologies, or outcomes that aren't present in the data.

${
  hasCommits && hasLeetcode
    ? "IMPORTANT: The developer worked on BOTH real project code (GitHub) and problem-solving practice (LeetCode) this week. Give roughly EQUAL space and weight to both in the post - do not let one dominate just because it has punchier detail to describe. Structure it so a reader clearly sees two distinct threads of work, not one heavily favored over the other."
    : hasCommits
    ? "The developer only has GitHub commit activity this week (no LeetCode data) - focus entirely on that."
    : "The developer only has LeetCode activity this week (no GitHub commits) - focus entirely on that."
}

Recent GitHub commits (real project work):
${commitSummary || "None"}

Recently solved LeetCode problems (practice/problem-solving):
${leetcodeSummary || "None"}

Formatting guidance:
- Keep it between 100-180 words - enough room to cover both sources with real detail, but still a scannable LinkedIn post, not an essay.
- Reference specific commit messages, repo names, or problem titles directly rather than vague summaries like "worked on various things."
- Avoid generic filler phrases like "excited to share" or "grateful for the journey" unless the data specifically supports that tone.
- CRITICAL: Do not characterize whether something "improved" or "got better/worse" (e.g. runtime, performance, efficiency) unless the data unambiguously shows that direction. If numbers in the data are unclear, mixed, or you're not confident which direction they indicate, describe the action neutrally (e.g. "updated the runtime approach" or "revisited the solution") instead of claiming a specific outcome that isn't clearly supported.
- Max 3 hashtags at the very end.
${customInstruction ? `\nAdditional instructions from the user - follow these closely, even if they override the guidance above: ${customInstruction}` : ""}

Write the LinkedIn post now. Return only the post text, nothing else.
`;

  for (const model of GEMINI_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await axios.post(
          geminiUrl(model),
          { contents: [{ parts: [{ text: prompt }] }] },
          {
            timeout: 15000,
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": process.env.GEMINI_API_KEY,
            },
          }
        );

        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("Gemini returned no usable text in the response");
        return text.trim();
      } catch (err) {
        const status = err.response?.status;
        console.error(
          `[AIService] ${model} attempt ${attempt} failed:`,
          err.response?.data || err.message
        );

        if (status === 404) break; // model unavailable, move to the next model
        const retryable = !status || status === 503 || status === 429 || status === 500;
        if (!retryable) throw new Error("AI generation failed");
        if (attempt < 2) await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  throw new Error("AI generation failed");
}

module.exports = { generatePost };