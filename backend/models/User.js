const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // hashed

    // External accounts linked by the user
    githubUsername: { type: String, default: null },
    leetcodeUsername: { type: String, default: null },

    // LinkedIn OAuth tokens (obtained after user connects LinkedIn)
    linkedin: {
      accessToken: { type: String, default: null },
      expiresAt: { type: Date, default: null },
      linkedinUserId: { type: String, default: null },
      connected: { type: Boolean, default: false },
    },

    // Whether automated posting is turned on for this user
    autoPostEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
