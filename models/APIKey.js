const mongoose = require("mongoose");

const ApiKeySchema = new mongoose.Schema({
  // Key Identification
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'API key name is required'],
    trim: true
  },
  key: {
    type: String,
    required: true,
    unique: true
  },
  prefix: {
    type: String,
    required: true
  },

  // Permissions
  permissions: [{
    type: String,
    enum: ['read', 'write', 'delete', 'admin'],
    default: 'read'
  }],

  // Scopes
  scopes: [String],

  // Status
  isActive: {
    type: Boolean,
    default: true
  },

  // Usage Tracking
  lastUsed: Date,
  lastUsedIp: String,
  usageCount: {
    type: Number,
    default: 0
  },

  // Expiry
  expiresAt: Date,

  // Metadata
  description: {
    type: String,
    trim: true
  },

  // Audit Fields
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
ApiKeySchema.index({ userId: 1 });
ApiKeySchema.index({ key: 1 });
ApiKeySchema.index({ prefix: 1 });
ApiKeySchema.index({ expiresAt: 1 });

const ApiKey = mongoose.model(`${process.env.APP_NAME}_Billing_ApiKey`, ApiKeySchema);
module.exports = ApiKey;