Great! Here's a **full breakdown** of the **multi-role approval flow**, including:

1. ✅ A **sequence diagram**
2. 🧩 Example **MongoDB document (with diff and history)**
3. 🧪 Sample UI-friendly **JSON response**
4. 🧭 What to show in the UI at each stage

---

## 🟢 1. Sequence Diagram

```plaintext
Site Billing          HOD                 MD
     |                 |                  |
     |--- Propose ---->|                  |
     |                 |--- Approve ----->|
     |                 |                  |
     |                 |--- Edit -------->|
     |<---- Needs SB approval (sb_recheck)|
     |--- Re-approve -->                  |
     |--- Edit Again --->                 |
     |                 |<-- Back to HOD --|
     |                 |--- Approve ----->|
     |                 |                  |
     |                 |      MD Final -->|
```

---

## 🧩 2. MongoDB Document Example

```js
{
  _id: ObjectId("..."),
  data: {
    amount: 10000,
    description: "Final approved billing"
  },
  approvalFlow: {
    currentStage: "md",
    status: "pending",
    proposedBy: ObjectId("userSB"),
    currentChange: {
      data: {
        amount: 10000,
        description: "Final approved billing"
      },
      approvedBy: [ObjectId("userSB"), ObjectId("userHOD")],
      changes: {
        added: {},
        updated: {
          amount: {
            from: 9500,
            to: 10000
          }
        },
        removed: {}
      }
    },
    history: [
      {
        by: ObjectId("userSB"),
        role: "site_billing",
        action: "propose",
        dataSnapshot: { amount: 9500 },
        timestamp: ISODate("2025-05-30T12:00:00Z")
      },
      {
        by: ObjectId("userHOD"),
        role: "hod",
        action: "edit",
        dataSnapshot: { amount: 9800 },
        timestamp: ISODate("2025-05-30T12:10:00Z")
      },
      {
        by: ObjectId("userSB"),
        role: "site_billing",
        action: "edit",
        dataSnapshot: { amount: 10000 },
        timestamp: ISODate("2025-05-30T12:20:00Z")
      },
      {
        by: ObjectId("userHOD"),
        role: "hod",
        action: "approve",
        dataSnapshot: { amount: 10000 },
        timestamp: ISODate("2025-05-30T12:30:00Z")
      }
    ]
  }
}
```

---

## 🧪 3. UI-Friendly JSON Response

### For Site Billing (after HOD edited):

```json
{
  "currentStage": "sb_recheck",
  "status": "pending",
  "proposedBy": "userSB",
  "changes": {
    "updated": {
      "amount": {
        "from": 9500,
        "to": 9800
      }
    }
  },
  "canEdit": true,
  "canApprove": true,
  "approvedBy": ["userHOD"]
}
```

### If SB edits again:

```json
{
  "currentStage": "hod",
  "changes": {
    "updated": {
      "amount": {
        "from": 9800,
        "to": 10000
      }
    }
  },
  "approvedBy": ["userSB"],
  "awaiting": "HOD"
}
```

---

## 🧭 4. UI Behavior per Role & Stage

| Role         | Stage        | Can Edit | Can Approve | Notes                         |
| ------------ | ------------ | -------- | ----------- | ----------------------------- |
| Site Billing | `sb_recheck` | ✅        | ✅           | If edited, goes to HOD        |
| HOD          | `hod`        | ✅        | ✅           | If edited, goes to SB recheck |
| MD           | `md`         | ❌        | ✅           | Final decision only           |

---

Here's a **step-by-step breakdown** of your **approval flow**, showing **where the data is stored at each step**, **what’s visible to whom**, and **how the state evolves.**

---

### 🧱 Initial Setup: Data Structure

Your main model (e.g., `ProjectMonthlyTarget`) contains these approval-related fields:

```js
approvalFlow: {
  currentStage: 'site_billing' | 'hod' | 'sb_recheck' | 'md' | 'final',
  status: 'pending' | 'in_review' | 'declined' | 'approved',
  proposedBy: ObjectId,
  currentChange: {
    data: Object,        // The most recent edited version
    changes: Object,     // Diff between previous and edited
    approvedBy: [ObjectId]
  },
  history: [
    {
      by: ObjectId,
      role: 'site_billing' | 'hod' | 'md',
      action: 'propose' | 'edit' | 'approve' | 'decline',
      comment: String,
      dataSnapshot: Object,  // Full snapshot of data at the time of action
      at: Date
    }
  ]
}
```

---

## 🔄 Step-by-Step: What Data is Present Where

---

### ✅ **Step 1: Site Billing - Propose**

* 📌 **Action**: `propose`
* 👤 **Actor**: `site_billing`
* ✅ **Stored in**:

  * `approvalFlow.history[0].dataSnapshot` = full proposed data
  * `approvalFlow.currentStage = 'site_billing'`
  * `approvalFlow.status = 'pending'`
* ❌ `approvalFlow.currentChange = undefined` (no edits yet)

---

### ✏️ **Step 2: HOD - Edit**

* 📌 **Action**: `edit`
* 👤 **Actor**: `hod`
* ✅ **Stored in**:

  * `approvalFlow.currentChange.data` = new HOD-edited data
  * `approvalFlow.currentChange.changes` = `{ field: { from, to } }`
  * `approvalFlow.currentChange.approvedBy = [userId]`
  * `approvalFlow.history[n].dataSnapshot = new edited data`
  * `approvalFlow.history[n].action = 'edit'`
  * `approvalFlow.currentStage = 'sb_recheck'`
  * `approvalFlow.status = 'in_review'`

---

### 🔁 **Step 3: Site Billing - Recheck/Edit Again**

* 📌 **Action**: `edit`
* 👤 **Actor**: `site_billing`
* ✅ **Stored in**:

  * Updates `approvalFlow.currentChange.data` again
  * Updates `approvalFlow.currentChange.changes` with new diff
  * Appends to `approvalFlow.history` again with `action: 'edit'`
  * `approvalFlow.currentStage = 'hod'` (sends back to HOD)

---

### ✅ **Step 4: HOD - Approve**

* 📌 **Action**: `approve`
* 👤 **Actor**: `hod`
* ✅ **Stored in**:

  * Pushes to `approvalFlow.history` with `action: 'approve'`
  * Adds `userId` to `currentChange.approvedBy`
  * `approvalFlow.currentStage = 'md'`

---

### ✅ **Step 5: MD - Approve**

* 📌 **Action**: `approve`
* 👤 **Actor**: `md`
* ✅ **Stored in**:

  * Pushes to `approvalFlow.history` with `action: 'approve'`
  * Adds MD `userId` to `currentChange.approvedBy`
  * `approvalFlow.status = 'approved'`
  * `approvalFlow.currentStage = 'final'`
  * Sets `isApproved = true`

---

### ❌ **Alternate Flow: HOD - Decline**

* 📌 **Action**: `decline`
* 👤 **Actor**: `hod`
* ✅ **Stored in**:

  * Pushes to `approvalFlow.history` with `action: 'decline'`
  * `approvalFlow.status = 'declined'`
  * `approvalFlow.currentStage = 'final'`

---

## 📌 Summary Table

| Stage       | Field Holding Data                     | What’s Stored There                              |
| ----------- | -------------------------------------- | ------------------------------------------------ |
| Propose     | `approvalFlow.history[0].dataSnapshot` | Full initial form data from site billing         |
| HOD Edit    | `approvalFlow.currentChange.data`      | Updated version by HOD                           |
|             | `approvalFlow.currentChange.changes`   | Differences from last version                    |
|             | `approvalFlow.history[n].dataSnapshot` | Full edited version                              |
| SB Recheck  | `approvalFlow.currentChange.data`      | Final version from SB (overwrites previous edit) |
| HOD Approve | `approvalFlow.history[n].action`       | Logs action + userId                             |
| MD Approve  | `isApproved = true`                    | Final approval                                   |
| Any Step    | `approvalFlow.history`                 | Timeline of all actions taken                    |

---
| **Frontend Page**         | **Display From**                                   | **Purpose**                                            |       |                               |
| ------------------------- | -------------------------------------------------- | ------------------------------------------------------ | ----- | ----------------------------- |
| View Mode (Always)        | `doc.approvalFlow.history`                         | Render full action history with comments               |       |                               |
| Preview Editable Draft    | \`doc.approvalFlow\.currentChange?.data            |                                                        | doc\` | Show current editable version |
| Compare Button            | `doc.approvalFlow.currentChange?.changes`          | Show "Before vs After" with diff UI                    |       |                               |
| Approval Buttons          | `doc.approvalFlow.currentStage` + `req.user.role`  | Enable buttons conditionally                           |       |                               |
| Status Tag / Icon         | `doc.approvalFlow.status`                          | Show badge: pending / in\_review / approved / declined |       |                               |
| Approval Progress Stepper | `approvalFlow.currentStage`, `approvalFlow.status` | Timeline-style visual showing progress                 |       |                               |


# TwoFactorApproval
