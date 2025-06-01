import mongoose from 'mongoose';
const { Schema } = mongoose;

// --- User Roles Enum ---
const userRoles = ['MD', 'HOD', 'SiteBilling'];

// 1. Project Schema
const projectSchema = new Schema({
  name: { type: String, required: true, unique: true },
  photo: { type: String, required: true },
  address: { type: String, default: '' },
  projectType: { type: String, default: '' },
  estimateBudget: { type: Number, default: 0 },
  projectArea: { type: Number, default: 0 },
  rateType: { type: String, default: 'Sq.ft' },
  rate: { type: Number, default: 0 },
  projectStartDate: Date,
  projectDuration: { type: Number, default: 1 },
  projectDrawing: [String],
  clientId: { type: Schema.Types.ObjectId, ref: 'Client' },
  projectStatus: { type: String, default: 'Ongoing' },
  projectCompletes: { type: Number, default: 0 },
  assignedEngg: [{ type: Schema.Types.ObjectId, ref: 'Engineer' }],
  remarks: { type: String, default: '' },
  isDeleted: { type: Boolean, default: false },
  isApproved: { type: Boolean, default: false },
  awaitingApproval: { type: Boolean, default: false },
  updatedData: Schema.Types.Mixed,
}, { timestamps: true });

// 2. Towerlocations Schema
const towerLocationsSchema = new Schema({
  category: { type: String, required: true },
  name: { type: String, required: true, unique: true },
  locationDrawing: [String],
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  area: { type: Number, required: true },
  numberOfFloors: Number,
  numberOfBasements: Number,
  locationDuration: { type: Number, required: true },
  structureType: { type: String, default: 'Ground' },
  conventionals: [String],
  mivan: [String],
  taskId: Schema.Types.Mixed,
  remarks: String,
  isApprovedBy: { type: String, default: '' },
  isDeniedBy: { type: String, default: '' },
  deniedComment: String,
  isOpenBy: { type: String, default: '' },
  isCompleted: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

// 3. TowerlocationsDetails Schema
const towerLocationsDetailsSchema = new Schema({
  locationId: { type: Schema.Types.ObjectId, ref: 'Towerlocations', required: true },
  task: [{ type: Schema.Types.ObjectId, ref: 'TowerTaskDetails' }],
  currentVersion: { type: String, required: true, default: '1.0' },
  isMdApproval: { type: Boolean, default: false },
  updatedDataHeadOfficeBilling: Schema.Types.Mixed,
  updatedDataMdData: Schema.Types.Mixed,
}, { timestamps: true });

// 4. TowerTaskDetails Schema
const towerTaskDetailsSchema = new Schema({
  name: { type: String, required: true },
  payments: { type: Number, required: true, default: 0 },
  area: Number,
  durations: Number,
  shuttering: { type: Number, default: 0 },
}, { timestamps: true });

// 5. TargetTaskDetails Schema
const targetTaskDetailsSchema = new Schema({
  locTaskId: { type: Schema.Types.ObjectId, ref: 'TowerlocationsDetails', required: true },
  taskId: { type: Schema.Types.ObjectId },
  startDate: Date,
  area: { type: Number, default: 0 },
  drawing: String,
  remark: String,
  targetSubtaskIds: [{ type: Schema.Types.ObjectId, ref: 'SubtaskTargetTaskDetail' }],
  duration: { type: Number, default: 20 },

  // Approval Flow
  approvalFlow: {
    currentStage: {
      type: String,
      enum: ['site_billing', 'hod', 'sb_recheck', 'md', 'final'],
      default: 'site_billing'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'declined', 'in_review'],
      default: 'pending'
    },
    proposedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    currentChange: {
      data: Schema.Types.Mixed,
      changes: Schema.Types.Mixed,
      approvedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }]
    },
    history: [
      {
        by: { type: Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['site_billing', 'hod', 'md'] },
        action: { type: String, enum: ['propose', 'edit', 'approve', 'decline'] },
        dataSnapshot: Schema.Types.Mixed,
        comment: String,
        at: { type: Date, default: Date.now }
      }
    ]
  }
}, { timestamps: true });

// 6. ManpowerTargetTaskDetails Schema
const manpowerTargetTaskDetailsSchema = new Schema({
  utilized: { type: Number, default: 0 },
  assigned: { type: Number, default: 0 },
}, { timestamps: true });

// 7. LocationMachinery Schema
const locationMachinerySchema = new Schema({
  quantity: { type: Number, required: true },
  spec: { type: String, required: true },
}, { timestamps: true });

// 8. MachineryTargetTaskDetails Schema
const machineryTargetTaskDetailsSchema = new Schema({
  projectLocationMachineryId: { type: Schema.Types.ObjectId, ref: 'LocationMachinery' },
  utilized: { type: Number, default: 0 },
  assigned: { type: Number, default: 0 },
  quantity: { type: Number, required: true },
  spec: { type: String, required: true },
}, { timestamps: true });

// 9. ToolsTargetTaskDetails Schema
const toolsTargetTaskDetailsSchema = new Schema({
  utilized: { type: Number, default: 0 },
  assignedQuantity: { type: Number, default: 0 },
}, { timestamps: true });

// 10. LocationMaterial Schema
const locationMaterialSchema = new Schema({
  quantity: { type: Number, required: true },
  spec: { type: String, required: true },
}, { timestamps: true });

// 11. MaterialTargetTaskDetails Schema
const materialTargetTaskDetailsSchema = new Schema({
  projectLocationMaterialId: { type: Schema.Types.ObjectId, ref: 'LocationMaterial' },
  utilized: { type: Number, default: 0 },
  assignedQuantity: { type: Number, default: 0 },
}, { timestamps: true });

// 12. SubtaskTargetTaskDetail Schema
const subtaskTargetTaskDetailSchema = new Schema({
  utilizedQuantity: { type: Number, default: 0 },
  manpowerTargetId: [{ type: Schema.Types.ObjectId, ref: 'ManpowerTargetTaskDetails' }],
  machineryTargetId: [{ type: Schema.Types.ObjectId, ref: 'MachineryTargetTaskDetails' }],
  toolTargetId: [{ type: Schema.Types.ObjectId, ref: 'ToolsTargetTaskDetails' }],
  materialTargetId: [{ type: Schema.Types.ObjectId, ref: 'MaterialTargetTaskDetails' }],
  assignedEmp: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
  subTaskCommentId: [{ type: Schema.Types.ObjectId, ref: 'SubtaskComment' }],
}, { timestamps: true });

// 13. ProjectMonthlyTarget Schema
const projectMonthlyTargetSchema = new Schema({
  locationId: { type: Schema.Types.ObjectId, ref: 'Towerlocations' },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
  targetTaskDetailedIds: [{ type: Schema.Types.ObjectId, ref: 'TargetTaskDetails' }],
  remark: String,
  isApproved: Boolean,

  approvalFlow: {
    currentStage: {
      type: String,
      enum: ['site_billing', 'hod', 'sb_recheck', 'md', 'final'],
      default: 'site_billing'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'declined', 'in_review'],
      default: 'pending'
    },
    proposedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    currentChange: {
      data: Schema.Types.Mixed,
      changes: Schema.Types.Mixed,
      approvedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }]
    },
    history: [
      {
        by: { type: Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['site_billing', 'hod', 'md'] },
        action: { type: String, enum: ['propose', 'edit', 'approve', 'decline'] },
        dataSnapshot: Schema.Types.Mixed,
        comment: String,
        at: { type: Date, default: Date.now }
      }
    ]
  }
}, { timestamps: true });

// Model exports
const Project = mongoose.model('Project', projectSchema);
const Towerlocations = mongoose.model('Towerlocations', towerLocationsSchema);
const TowerlocationsDetails = mongoose.model('TowerlocationsDetails', towerLocationsDetailsSchema);
const TowerTaskDetails = mongoose.model('TowerTaskDetails', towerTaskDetailsSchema);
const TargetTaskDetails = mongoose.model('TargetTaskDetails', targetTaskDetailsSchema);
const ManpowerTargetTaskDetails = mongoose.model('ManpowerTargetTaskDetails', manpowerTargetTaskDetailsSchema);
const LocationMachinery = mongoose.model('LocationMachinery', locationMachinerySchema);
const MachineryTargetTaskDetails = mongoose.model('MachineryTargetTaskDetails', machineryTargetTaskDetailsSchema);
const ToolsTargetTaskDetails = mongoose.model('ToolsTargetTaskDetails', toolsTargetTaskDetailsSchema);
const LocationMaterial = mongoose.model('LocationMaterial', locationMaterialSchema);
const MaterialTargetTaskDetails = mongoose.model('MaterialTargetTaskDetails', materialTargetTaskDetailsSchema);
const SubtaskTargetTaskDetail = mongoose.model('SubtaskTargetTaskDetail', subtaskTargetTaskDetailSchema);
const ProjectMonthlyTarget = mongoose.model('ProjectMonthlyTarget', projectMonthlyTargetSchema);

export {
  Project,
  Towerlocations,
  TowerlocationsDetails,
  TowerTaskDetails,
  TargetTaskDetails,
  ManpowerTargetTaskDetails,
  LocationMachinery,
  MachineryTargetTaskDetails,
  ToolsTargetTaskDetails,
  LocationMaterial,
  MaterialTargetTaskDetails,
  SubtaskTargetTaskDetail,
  ProjectMonthlyTarget
};
