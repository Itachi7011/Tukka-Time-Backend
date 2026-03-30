const mongoose = require("mongoose");

const PredictionLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  templateType: {
    type: String,
    enum: [
      "RomanticTwist", "FoodJoke", "HorrorTwist",
      "TechHumor", "BollywoodStyle", "BollywoodDialogue",
      "DailyQuestion", "Fortunes", "FriendFortune",
      "MummyScolding", "NameFortune", "SharmaJiBeta",
      "WhatsAppStatus"
    ],
    required: true,
  },
  generatedText: {
    type: String,
    required: true,
  },
  userReaction: {
    type: String,
    enum: ["liked", "disliked", "shared", "skipped"],
  },
  inputVariables: {
    type: Object,
    required: true,
  },
}, { timestamps: true });

// Index for faster analytics
PredictionLogSchema.index({ user: 1, templateType: 1 });

module.exports = mongoose.model(`${process.env.APP_NAME}_PredictionLog`, PredictionLogSchema);