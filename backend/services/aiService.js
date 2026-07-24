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
    .slice(0, 8)
    .map((p) => `- ${p.title}`)
    .join("\n");

  const prompt = `
You are helping a software developer write a short, professional LinkedIn post
summarizing their recent coding activity. Be specific, avoid generic filler,
avoid hashtag spam (max 3), and keep it under 120 words.

Recent GitHub commits:
${commitSummary || "None"}

Recently solved LeetCode problems:
${leetcodeSummary || "None"}
${customInstruction ? `\nAdditional instructions from the user - follow these closely: ${customInstruction}` : ""}

Write the LinkedIn post now. Return only the post text, nothing else.
`;

  try {
    const response = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
    });
    return response.choices[0].message.content.trim();
  } catch (err) {
    console.error("[AIService] generation failed:", err.message);
    throw new Error("AI generation failed");
  }
}

module.exports = { generatePost };