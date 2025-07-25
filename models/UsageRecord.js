const mongoose = require("mongoose");

const UsageRecordSchema = new mongoose.Schema({
  // Identification
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: true
  },

  // Usage Details
  metric: {
    type: String,
    required: true,
    enum: ['invoice_created', 'client_added', 'api_call', 'storage_used']
  },
  quantity: {
    type: Number,
    default: 1,
    min: [0, 'Quantity cannot be negative']
  },
  recordedAt: {
    type: Date,
    default: Date.now
  },

  // Context
  description: String,
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

// Indexes for performance
UsageRecordSchema.index({ userId: 1 });
UsageRecordSchema.index({ subscriptionId: 1 });
UsageRecordSchema.index({ metric: 1 });
UsageRecordSchema.index({ recordedAt: 1 });

const UsageRecord = mongoose.model('Billing_UsageRecord', UsageRecordSchema);
module.exports = UsageRecord;