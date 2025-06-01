// controllers/approvalController.js
import mongoose from 'mongoose';
import {
  ProjectMonthlyTarget,
  SubtaskTargetTaskDetail,
  TargetTaskDetails,
} from '../models/model.js';

// Utility to compute diff between old and new data
const computeDiff = (oldData, newData) => {
  const diff = {};
  for (const key in newData) {
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      diff[key] = { from: oldData[key], to: newData[key] };
    }
  }
  return diff;
};
const createReferencedDocs = async (subtask, session) => {
  // Create manpowerTarget docs and get IDs
  let manpowerTargetIds = [];
  if (subtask.manpowerTargetId && subtask.manpowerTargetId.length > 0) {
    manpowerTargetIds = await Promise.all(
      subtask.manpowerTargetId.map(async (mp) => {
        const doc = new ManpowerTargetTaskDetails(mp);
        await doc.save({ session });
        return doc._id;
      })
    );
  }

  // Create machineryTarget docs and get IDs
  let machineryTargetIds = [];
  if (subtask.machineryTargetId && subtask.machineryTargetId.length > 0) {
    machineryTargetIds = await Promise.all(
      subtask.machineryTargetId.map(async (mach) => {
        const doc = new MachineryTargetTaskDetails(mach);
        await doc.save({ session });
        return doc._id;
      })
    );
  }

  // Create toolTarget docs and get IDs
  let toolTargetIds = [];
  if (subtask.toolTargetId && subtask.toolTargetId.length > 0) {
    toolTargetIds = await Promise.all(
      subtask.toolTargetId.map(async (tool) => {
        const doc = new ToolsTargetTaskDetails(tool);
        await doc.save({ session });
        return doc._id;
      })
    );
  }

  // Create materialTarget docs and get IDs
  let materialTargetIds = [];
  if (subtask.materialTargetId && subtask.materialTargetId.length > 0) {
    materialTargetIds = await Promise.all(
      subtask.materialTargetId.map(async (mat) => {
        const doc = new MaterialTargetTaskDetails(mat);
        await doc.save({ session });
        return doc._id;
      })
    );
  }

  // Replace the raw data arrays with arrays of ObjectIds
  subtask.manpowerTargetId = manpowerTargetIds;
  subtask.machineryTargetId = machineryTargetIds;
  subtask.toolTargetId = toolTargetIds;
  subtask.materialTargetId = materialTargetIds;

  return subtask;
};

// Create ProjectMonthlyTarget with nested TargetTaskDetails and Subtasks
export const createProjectMonthlyTarget = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { locationId, projectId, remark, targetTaskDetailedIds } = req.body;

    // Create subtasks and replace their refs in tasks
    const tasksWithSubtaskIds = await Promise.all(
      targetTaskDetailedIds.map(async (task) => {
        if (task.targetSubtaskId && task.targetSubtaskId.length > 0) {
          const subtaskIds = await Promise.all(
            task.targetSubtaskId.map(async (subtask) => {
              // Create referenced resource docs before creating subtask
              const processedSubtask = await createReferencedDocs(subtask, session);
    
              const subtaskDoc = new SubtaskTargetTaskDetail(processedSubtask);
              await subtaskDoc.save({ session });
              return subtaskDoc._id;
            })
          );
          task.targetSubtaskId = subtaskIds;
        }
        return task;
      })
    );
    // Create tasks and get their IDs
    const createdTasks = await Promise.all(
      tasksWithSubtaskIds.map(async (task) => {
        const taskDoc = new TargetTaskDetails(task);
        await taskDoc.save({ session });
        return taskDoc._id;
      })
    );

    const projectMonthlyTarget = new ProjectMonthlyTarget({
      locationId,
      projectId,
      remark,
      targetTaskDetailIds: createdTasks,
      isApproved: false,
      approvalFlow: {
        currentStage: 'site_billing',
        status: 'pending',
        proposedBy: req.user?._id || null,
        currentChange: {
          data: null,
          changes: null,
          approvedBy: [],
        },
        history: [
          {
            by: req.user?._id || null,
            role: 'site_billing',
            action: 'propose',
            dataSnapshot: req.body,
            at: new Date(),
          },
        ],
      },
    });

    await projectMonthlyTarget.save({ session });
    await session.commitTransaction();
    session.endSession();

    res.status(201).json(projectMonthlyTarget);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ error: error.message });
  }
};

// Get all documents for ProjectMonthlyTarget or TargetTaskDetails
export const getAllDocuments = async (req, res) => {
  try {
    const { model } = req.query;

    if (!model) {
      return res.status(400).json({ message: 'Model query param is required (e.g. ?model=project or ?model=task)' });
    }

    if (model === 'project') {
      const docs = await ProjectMonthlyTarget.find()
        

      return res.status(200).json(docs);
    }

    if (model === 'task') {
      const docs = await TargetTaskDetails.find()
        .populate([
          {
            path: 'target_Substask_id',
            populate: [
              { path: 'manpower' },
              { path: 'tools' },
              { path: 'machinery' },
              { path: 'materials' },
              { path: 'comments' },
              { path: 'employees' }
            ]
          },
          { path: 'manpower' },
          { path: 'tools' },
          { path: 'machinery' },
          { path: 'materials' },
          { path: 'comments' },
          { path: 'employees' }
        ]);

      return res.status(200).json(docs);
    }

    return res.status(400).json({ message: 'Invalid model type. Use "project" or "task"' });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching documents', error: err.message });
  }
};


// Get single document by id
export const getDocumentById = async (req, res) => {
  try {
    const { model } = req.query;
    const Model = model === 'project' ? ProjectMonthlyTarget : TargetTaskDetails;
    const doc = await Model.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.status(200).json(doc);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching document', error: err });
  }
};

// Update document (non-approval updates)
export const updateDocument = async (req, res) => {
  try {
    const { model, update } = req.body;
    const Model = model === 'project' ? ProjectMonthlyTarget : TargetTaskDetails;
    const updated = await Model.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Error updating document', error: err });
  }
};

// Delete document
export const deleteDocument = async (req, res) => {
  try {
    const { model } = req.query;
    const Model = model === 'project' ? ProjectMonthlyTarget : TargetTaskDetails;
    const deleted = await Model.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.status(200).json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting document', error: err });
  }
};

// Approval action handler
export const handleApprovalAction = async (req, res) => {
  try {
    const { model } = req.query;
    const Model = model === 'project' ? ProjectMonthlyTarget : TargetTaskDetails;

    const { role, action, comment, updatedData, userId } = req.body;
    const doc = await Model.findById(req.params.id);

    if (!doc) return res.status(404).json({ message: 'Not found' });

    const stage = doc.approvalFlow.currentStage;

    // Allowed actions per stage (based on your schema)
    const validActions = {
      site_billing: ['propose', 'edit'],
      hod: ['approve', 'edit', 'decline'],
      sb_recheck: ['edit'],
      md: ['approve'],
    };

    if (!validActions[stage]?.includes(action)) {
      return res.status(400).json({ message: 'Invalid action for this role/stage' });
    }

    // Add to approval history
    doc.approvalFlow.history.push({
      by: userId,
      role,
      action,
      comment,
      dataSnapshot: updatedData,
      at: new Date(),
    });

    if (action === 'edit') {
      const oldData = doc.approvalFlow.currentChange?.data || {};
      doc.approvalFlow.currentChange = {
        data: updatedData,
        changes: computeDiff(oldData, updatedData),
        approvedBy: [userId],
      };

      // Advance stage after edit
      doc.approvalFlow.currentStage = role === 'hod' ? 'sb_recheck' : 'hod';
      doc.approvalFlow.status = 'in_review';
    }

    if (action === 'approve') {
      if (!doc.approvalFlow.currentChange?.approvedBy?.includes(userId)) {
        doc.approvalFlow.currentChange.approvedBy.push(userId);
      }
    
      if (role === 'hod') {
        doc.approvalFlow.currentStage = 'md';
      } else if (role === 'md') {
        const finalData = doc.approvalFlow.currentChange?.data;
        if (finalData) {
          Object.assign(doc, finalData);
        }
    
        doc.isApproved = true;
        doc.approvalFlow.status = 'approved';
        doc.approvalFlow.currentStage = 'final';
    
        // Optional: Clear currentChange after final approval
        // doc.approvalFlow.currentChange = null;
      }
    }

    if (action === 'decline') {
      doc.approvalFlow.status = 'declined';
      doc.approvalFlow.currentStage = 'final';
    }

    await doc.save();
    res.status(200).json({ message: 'Action processed', doc });
  } catch (err) {
    res.status(500).json({ message: 'Approval action failed', error: err });
  }
};
