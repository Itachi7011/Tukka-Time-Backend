const mongoose = require("mongoose");

const FortuneSchema = new mongoose.Schema({
  // Core Content
  text: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Context Parameters
  language: {
    type: String,
    enum: ["hindi", "english"]
  },
  timeOfDay: {
    type: String,
    enum: ["morning", "afternoon", "evening", "night"]
  },
  city: {
    type: String,
    enum: ["mumbai", "delhi", "bangalore", "chennai", "kolkata", "other"]
  },
  weather: {
    type: String,
    enum: ["sunny", "rainy", "hot", "cold"]
  },
  dayOfWeek: {
    type: String,
    enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "weekend"]
  },
  mood: {
    type: String,
    enum: ["funny", "roast", "motivational", "drama"]
  },
  festival: {
    type: String,
    enum: ["diwali", "holi", "eid", "christmas", "none"]
  },

  dramaType: {
    type: String,
    enum: ["saas-bahu", "roadside romeo", "office ka hero", "college cringe"]
  },
  loveStatus: {
    type: String,
    enum: ["single AF", "secret crush", "ghapla chal raha", "shaadi fixed"]
  },
  mummyMood: {
    type: String,
    enum: ["pyaar", "daant", "comparison", "khana khila rahi"]
  },
  statusLevel: {
    type: String,
    enum: ["amreeka return", "middle-class struggler", "village ka chhora"]
  },
  tvShow: {
    type: String,
    enum: ["TMKOC", "KBC", "Bigg Boss", "CID"]
  },
  shoeSize: {
    type: String,
    enum: ["chhota (8-9)", "medium (10)", "bada (11+)", "joota hi nahi"]
  },

  pocketMoney: {
    type: String,
    enum: ["zero", "10 ka chutta", "500 ka note", "card hai par balance nahi"]
  },
  phoneStyle: {
    type: String,
    enum: ["one-hand", "thoda-type thoda-swipe", "dono haath", "mummy pakad ke chalati"]
  },
  wakeUpTime: {
    type: String,
    enum: ["5 baje (psycho)", "7 baje (normal)", "9 baje (late)", "shaam ko utho"]
  },

  stomachStatus: {
    type: String,
    enum: ["bhookha", "thoda bhara", "food baby", "diet pe hu"]
  },
  // Engagement Metrics
  timesServed: {
    type: Number,
    default: 0  // When fortune is shown to user
  },
  shareCount: {
    type: Number,
    default: 0  // When user shares the fortune
  },
  lastServedAt: {
    type: Date
  },

  // System Fields
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const Fortune = mongoose.model(`${process.env.APP_NAME}_Data`, FortuneSchema);
module.exports = Fortune;