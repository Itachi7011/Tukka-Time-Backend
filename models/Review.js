const mongoose = require('mongoose');


const ReviewSchema = new mongoose.Schema({
  // Reviewer Info
  reviewerName: {
    type: String,
    required: true,
    trim: true,
  },
  reviewerCity: {
    type: String,
    enum: ['mumbai', 'delhi', 'bangalore', 'chennai', 'kolkata', 'hyderabad', 'pune', 'jaipur', 'other'],
    default: 'other',
  },
  reviewerAvatarUrl: {
    type: String,
    default: '',
  },

  // Review Content
  reviewText: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 1200,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },

  // Context — what they reviewed
  category: {
    type: String,
    enum: ['fortune-cookies', 'custom-messages', 'gift-sets', 'bulk-orders', 'general'],
    default: 'general',
  },
  productUsed: {
    type: String,   // e.g. "Diwali Premium Gift Set", "Bulk Order – 200 units"
    default: '',
  },
  usageContext: {
    type: String,
    enum: ['personal', 'gifting', 'corporate', 'event', 'wedding', 'other'],
    default: 'personal',
  },

  // Engagement
  helpfulCount: {
    type: Number,
    default: 0,
  },

  // Media (screenshots / unboxing photos)
  mediaUrls: {
    type: [String],
    default: [],
  },

  // Moderation & Display
  isVerified: {
    type: Boolean,
    default: false,    // true = verified purchase / order
  },
  isApproved: {
    type: Boolean,
    default: false,    // goes live only after admin approval
  },
  isFeatured: {
    type: Boolean,
    default: false,    // pinned to top of reviews page
  },
  adminReply: {
    type: String,
    default: '',
  },

  // Fortune reference (optional — link to the fortune that impressed them)
  relatedFortuneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: `${process.env.APP_NAME}_Data`,
    default: null,
  },

  // Source platform
  platform: {
    type: String,
    enum: ['website', 'google', 'instagram', 'twitter', 'whatsapp', 'other'],
    default: 'website',
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

ReviewSchema.index({ rating: -1, isFeatured: -1, createdAt: -1 });
ReviewSchema.index({ category: 1, isApproved: 1 });

module.exports = mongoose.model(`${process.env.APP_NAME}_Review`, ReviewSchema);