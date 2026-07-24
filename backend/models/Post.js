const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Raw activity snapshot used to generate this post (kept for traceability/debugging)
    sourceData: {
      commits: [{ message: String, repo: String, date: Date }],
      leetcodeSolved: [{ title: String, difficulty: String }],
    },

    // AI-generated content
    generatedText: { type: String, required: true },

    // Lifecycle: draft -> edited (optional) -> posted / failed
    status: {
      type: String,
      enum: ["draft", "posted", "failed"],
      default: "draft",
    },

    linkedinPostId: { type: String, default: null }, // returned by LinkedIn after publish
    errorMessage: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", PostSchema);
