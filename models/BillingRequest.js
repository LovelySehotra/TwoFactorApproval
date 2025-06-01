
import mongoose from 'mongoose';

const changeSchema = new mongoose.Schema({
  added: Object,
  updated: Object,
  removed: Object,
}, { _id: false });

const historySchema = new mongoose.Schema({
  by: mongoose.Schema.Types.ObjectId,
  role: String,
  action: String,
  dataSnapshot: Object,
  comment: String,
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const approvalFlowSchema = new mongoose.Schema({
  currentStage: String, // 'hod' | 'sb_recheck' | 'md' | 'final'
  status: String, // 'pending' | 'approved' | 'rejected'
  proposedBy: mongoose.Schema.Types.ObjectId,
  approvedBy: [mongoose.Schema.Types.ObjectId],
  currentChange: {
    data: Object,
    changes: changeSchema
  },
  history: [historySchema]
}, { _id: false });

const billingRequestSchema = new mongoose.Schema({
  data: Object,
  approvalFlow: approvalFlowSchema
});

export const BillingRequest = mongoose.model('BillingRequest', billingRequestSchema);
