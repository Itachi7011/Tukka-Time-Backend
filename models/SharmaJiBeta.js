const mongoose = require('mongoose');

const SharmaJiBetaSchema = new mongoose.Schema({
  achievement: {
    type: String,
    required: true
  },
  insult: {
    type: String,
    required: true
  },
  intensity: {
    type: String,
    enum: ['mild', 'medium', 'savage'],
    default: 'medium'
  },
  lastUsed: Date
}, { timestamps: true });

module.exports = mongoose.model('Fortune_SharmaJiBeta', SharmaJiBetaSchema);