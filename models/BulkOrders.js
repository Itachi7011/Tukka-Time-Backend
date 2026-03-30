const mongoose = require('mongoose');


const BulkOrderSchema = new mongoose.Schema({
  // Client Info
  companyName: {
    type: String,
    required: true,
    trim: true,
  },
  contactName: {
    type: String,
    trim: true,
    default: '',
  },
  contactEmail: {
    type: String,
    trim: true,
    lowercase: true,
    default: '',
  },
  contactPhone: {
    type: String,
    trim: true,
    default: '',
  },

  // Order Details
  quantity: {
    type: Number,
    required: true,
    min: 50,
  },
  occasion: {
    type: String,
    enum: ['corporate-diwali', 'corporate-event', 'wedding', 'conference', 'product-launch', 'team-outing', 'other'],
    default: 'corporate-diwali',
  },
  mood: {
    type: String,
    enum: ['funny', 'roast', 'motivational', 'drama', 'mixed', 'custom'],
    default: 'motivational',
  },

  // Customisation flags
  customBranding: {
    type: Boolean,
    default: false,
  },
  customFortunes: {
    type: Boolean,
    default: false,
  },
  brandingTier: {
    type: String,
    enum: ['none', 'brand-strip', 'full-wrap', 'premium-cobrand'],
    default: 'none',
  },

  // Pricing snapshot
  pricePerUnit: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    default: 0,
  },
  discount: {
    type: Number,
    default: 0,   // percentage
  },

  // Delivery
  deliveryAddress: {
    type: String,
    default: '',
  },
  expectedDeliveryDate: {
    type: Date,
  },
  actualDeliveryDate: {
    type: Date,
  },
  trackingNumber: {
    type: String,
    default: '',
  },

  // Status & Workflow
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },
  specialInstructions: {
    type: String,
    default: '',
  },
  internalNotes: {
    type: String,
    default: '',
  },

  // Analytics (QR-linked)
  qrEnabled: {
    type: Boolean,
    default: false,
  },
  qrScanCount: {
    type: Number,
    default: 0,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

BulkOrderSchema.index({ status: 1, createdAt: -1 });
BulkOrderSchema.index({ companyName: 'text', contactName: 'text', contactEmail: 'text' });

const BulkOrderModel = mongoose.model(`${process.env.APP_NAME}_BulkOrder`, BulkOrderSchema);