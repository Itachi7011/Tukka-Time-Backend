const mongoose = require('mongoose');

const WhatsAppStatusSchema = new mongoose.Schema({
  fortuneText: {
    type: String,
    required: true
  },
  templateName: {
    type: String,
    enum: ['chai', 'auto', 'traffic', 'exam'],
    required: true
  },
  textColor: {
    type: String,
    default: '#FFFFFF'
  },
  backgroundColor: {
    type: String,
    default: '#FF0000'
  },
  usageCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Fortune_WhatsAppStatus', WhatsAppStatusSchema);