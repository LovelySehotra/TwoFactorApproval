import mongoose from 'mongoose';
import {
  ProjectMonthlyTarget,
  TargetTaskDetails,
  SubtaskTargetTaskDetail,
} from '../models/model.js'


// --- Helper for Approval Update ---
async function updateApproval(item, role, approved, comment, declinedReason) {
  const approvedAt = new Date();

  switch (role) {
    case 'SiteBilling':
      item.approvalStatus.siteBilling = { approved, comment, approvedAt };
      break;

    case 'HOD':
      item.approvalStatus.hod = {
        approved,
        declined: !approved,
        declinedReason: approved ? null : declinedReason,
        comment,
        edited: false,
        editedAt: approvedAt,
      };
      break;

    case 'MD':
      item.approvalStatus.md = { approved, approvedAt };
      break;

    default:
      throw new Error('Invalid role');
  }

  await item.save();
}

// === 1. Create ProjectMonthlyTarget (with tasks and subtasks nested) ===
export async function createProjectMonthlyTarget(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { LocationId, projectId, remark, tasks } = req.body;

    // Step 1: Create all SubtaskTargettaskDetail documents for each task and collect their _ids
    const tasksWithSubtasksIds = await Promise.all(
      tasks.map(async (task) => {
        if (task.target_Substask_id && task.target_Substask_id.length > 0) {
          const subtaskIds = await Promise.all(
            task.target_Substask_id.map(async (subtask) => {
              const subtaskDoc = new SubtaskTargetTaskDetail(subtask);
              await subtaskDoc.save({ session });
              return subtaskDoc._id;
            })
          );
          task.target_Substask_id = subtaskIds;
        }
        return task;
      })
    );

    // Step 2: Create all TargetTaskDetails documents for tasks with subtask ids replaced
    const createdTasks = await Promise.all(
      tasksWithSubtasksIds.map(async (task) => {
        const taskDoc = new TargetTaskDetails(task);
        await taskDoc.save({ session });
        return taskDoc._id;
      })
    );

    // Step 3: Create ProjectMonthlyTarget document with created task IDs
    const projectMonthlyTarget = new ProjectMonthlyTarget({
      LocationId,
      projectId,
      remark,
      TargetTaskDetailedIds: createdTasks,
      isApproved: false,
      approvalStatus: {
        siteBilling: { approved: false },
        hod: { approved: false, declined: false, edited: false },
        md: { approved: false },
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
}

// === 2. Update ProjectMonthlyTarget ===
export async function updateProjectMonthlyTarget(req, res) {
  try {
    const updated = await ProjectMonthlyTarget.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: 'ProjectMonthlyTarget not found' });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// === 3. Get ProjectMonthlyTarget (with populated tasks and subtasks) ===
export async function getProjectMonthlyTarget(req, res) {
  try {
    const projectMonthlyTarget = await ProjectMonthlyTarget.findById(req.params.id)
      .populate({
        path: 'TargetTaskDetailedIds',
        populate: {
          path: 'target_Substask_id',
          model: 'SubtaskTargetTaskDetail',
          populate: [
            { path: 'manpowertargetId', model: 'manpowertargettaskdetails' },
            { path: 'machinarytargetId', model: 'machinarytargettaskdetails' },
            { path: 'tooltargetId', model: 'toolstargettaskdetails' },
            { path: 'materialtargetId', model: 'materialtargettaskdetails' },
            { path: 'Assigned_emp', model: 'Employee' },
            { path: 'subTaskComment_id', model: 'SubtaskComment' },
          ],
        },
      });

    if (!projectMonthlyTarget)
      return res.status(404).json({ message: 'ProjectMonthlyTarget not found' });

    res.json(projectMonthlyTarget);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// === 4. Approve ProjectMonthlyTarget (by role) ===
export async function approveProjectMonthlyTarget(req, res) {
  const { id } = req.params;
  const { role, approved, comment, declinedReason } = req.body;

  try {
    const projectMonthlyTarget = await ProjectMonthlyTarget.findById(id);
    if (!projectMonthlyTarget)
      return res.status(404).json({ message: 'ProjectMonthlyTarget not found' });

    await updateApproval(projectMonthlyTarget, role, approved, comment, declinedReason);

    res.json({ message: `ProjectMonthlyTarget approval updated by ${role}` });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// === 5. Update individual TargetTaskDetails task ===
export async function updateTask(req, res) {
  try {
    const task = await TargetTaskDetails.findByIdAndUpdate(
      req.params.taskId,
      req.body,
      { new: true, runValidators: true }
    );
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// === 6. Approval flow for individual task (TargetTaskDetails) ===
export async function approveTask(req, res) {
  const { taskId } = req.params;
  const { role, approved, comment, declinedReason } = req.body;

  try {
    const task = await TargetTaskDetails.findById(taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    await updateApproval(task, role, approved, comment, declinedReason);

    res.json({ message: `Task approval updated by ${role}` });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
