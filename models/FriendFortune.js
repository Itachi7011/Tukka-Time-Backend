const mongoose = require('mongoose');

const FriendFortuneSchema = new mongoose.Schema({

  //   friendName: {
  //   type: String,
  //   required: true
  // },
  // relation: {
  //   type: String,
  //   required: true
  // },
    language: {
    type: String,
    enum: ['hindi', 'english', 'hinglish'],
    default: 'hinglish'
  },
  prediction: {
    type: String,
    required: true
  },
  roastLevel: {
    type: String,
    enum: ['friendly', 'savage', 'deadly'],
    default: 'friendly'
  },
  shareCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Fortune_FriendFortune', FriendFortuneSchema);