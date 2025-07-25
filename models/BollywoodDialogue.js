const mongoose = require('mongoose');

const BollywoodDialogueSchema = new mongoose.Schema({
  style: {
    type: String,
    enum: ['amitabh', 'rajinikanth', 'tapori', 'kareena'],
    required: true
  },
  template: {
    type: String,
    required: true
  },
  variables: {
    items: [String],
    outcomes: [String]
  },
  isPopular: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Fortune_BollywoodDialogue', BollywoodDialogueSchema);