
const mongoose = require('mongoose');


const GiftSetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  occasion: {
    type: String,
    enum: ['birthday', 'diwali', 'holi', 'eid', 'christmas', 'wedding', 'babyshower', 'graduation', 'other'],
    default: 'diwali',
  },
  size: {
    type: String,
    enum: ['small', 'medium', 'large', 'premium'],
    default: 'medium',
  },
  mood: {
    type: String,
    enum: ['funny', 'roast', 'motivational', 'drama', 'mixed'],
    default: 'mixed',
  },
  cookieCount: {
    type: Number,
    default: 12,
  },
  price: {
    type: Number,
    default: 549,
  },

  // Fortune IDs included in this set
  fortunes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: `${process.env.APP_NAME}_Data`,
  }],

  // Media
  imageUrl: {
    type: String,
    default: '',
  },
  galleryUrls: {
    type: [String],
    default: [],
  },

  // Packaging
  packagingColor: {
    type: String,
    default: '#1A1410',
  },
  hasQR: {
    type: Boolean,
    default: false,
  },

  // WhatsApp Status inclusion
  includesWhatsAppStatus: {
    type: Boolean,
    default: false,
  },
  whatsAppTemplateName: {
    type: String,
    enum: ['chai', 'auto', 'traffic', 'exam', ''],
    default: '',
  },

  isActive: {
    type: Boolean,
    default: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  ordersCount: {
    type: Number,
    default: 0,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

GiftSetSchema.index({ occasion: 1, size: 1 });
GiftSetSchema.index({ isFeatured: -1, ordersCount: -1 });

const GiftSetModel = mongoose.model(`${process.env.APP_NAME}_GiftSet`, GiftSetSchema);

module.exports = { ReviewModel: module.exports, BulkOrderModel, GiftSetModel };