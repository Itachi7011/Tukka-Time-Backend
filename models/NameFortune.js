const mongoose = require('mongoose');

const NameFortuneSchema = new mongoose.Schema({
  template: {
    type: String,
    required: true,
    unique: true
  },
  variables: {
    items: [String],
    amounts: [String],
    consequences: [String]
  },
  popularity: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model(`${process.env.APP_NAME}_NameFortune`, NameFortuneSchema);