const mongoose = require('mongoose');

const DailyQuestionSchema = new mongoose.Schema({
  question: { 
    type: String, 
    required: true,
    unique: true 
  },
  options: [{
    yes: { type: Number, default: 0 },
    no: { type: Number, default: 0 },
    maybe: { type: Number, default: 0 }
  }],
  date: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  language: {
    type: String,
    enum: ['hindi', 'english', 'hinglish'],
    default: 'hinglish'
  }
}, { timestamps: true });

module.exports = mongoose.model(`${process.env.APP_NAME}_DailyQuestion`, DailyQuestionSchema);