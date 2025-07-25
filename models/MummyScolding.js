const mongoose = require('mongoose');

const MummyScoldingSchema = new mongoose.Schema({
  context: {
    type: String,
    required: true
  },
  scolding: {
    type: String,
    required: true
  },
  severity: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  regionalVariations: [String]
}, { timestamps: true });

module.exports = mongoose.model('Fortune_MummyScolding', MummyScoldingSchema);