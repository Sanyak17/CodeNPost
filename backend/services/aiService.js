const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

/**
 * Builds a prompt from raw commit/LeetCode data and asks OpenAI
 * to produce a short, professional LinkedIn post.
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

  try {
    const response = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
    });
    return response.choices[0].message.content.trim();
  } catch (err) {
    console.error("[AIService] generation failed:", err.message);
    throw new Error("AI generation failed");
  }
}

module.exports = { generatePost };