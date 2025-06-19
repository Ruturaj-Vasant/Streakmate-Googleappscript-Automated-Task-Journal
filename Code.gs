// === Global Constants ===
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const TASK_SHEET_NAME = 'Tasks';
const COMMENT_SHEET_NAME = 'Comments';

// === Initial Setup: Auto-create Task Sheet ===
function ensureTaskSheetExists(taskSheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(taskSheetName);
  const HEADERS = ["Task ID", "Reminder Interval (hrs)", "Category", "Task Name", "Type", "Goal", "Time of Day", "Days", "Note"];
  if (!sheet) {
    sheet = ss.insertSheet();
    sheet.setName(taskSheetName);
    sheet.appendRow(HEADERS);

    // Copy tasks from previous month
    const previousMonth = new Date();
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    const prevName = "Tasks_" + Utilities.formatDate(previousMonth, Session.getScriptTimeZone(), "MMMM-yyyy");
    const prevSheet = ss.getSheetByName(prevName);

    if (prevSheet) {
      const data = prevSheet.getDataRange().getValues().slice(1);
      data.forEach(row => {
        sheet.appendRow(row);
      });
    }
  } else {
    // If sheet exists but is empty or missing headers, re-initialize
    const data = sheet.getDataRange().getValues();
    const firstRow = data[0] || [];
    let needsHeader = false;
    if (data.length === 0 || firstRow.length < HEADERS.length) {
      needsHeader = true;
    } else {
      for (let i = 0; i < HEADERS.length; i++) {
        if (firstRow[i] !== HEADERS[i]) {
          needsHeader = true;
          break;
        }
      }
    }
    if (needsHeader) {
      sheet.clear();
      sheet.appendRow(HEADERS);
    }
  }
}

// === Setup Comments Sheet if Missing ===
function ensureCommentSheetExists() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(COMMENT_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(COMMENT_SHEET_NAME);
    sheet.appendRow(["Date", "Comments"]);
  }
}

// === Web Entry Point ===
function doGet(e) {
  const page = e.parameter.page || 'index';
  return HtmlService.createHtmlOutputFromFile(page).setTitle("Daily Tracker");
}

// === Monthly Sheet Handler ===
function getMonthlySheet(date) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const monthName = Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), "MMMM-yyyy");
  let sheet = ss.getSheetByName(monthName);

  if (!sheet) {
    sheet = ss.insertSheet(monthName);
    const taskNames = getTaskNames();
    sheet.appendRow(['Date', ...taskNames, 'Comment']);
  } else {
    // Ensure all current tasks are included as columns
    let existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const taskNames = getTaskNames();
    let updated = false;

    taskNames.forEach(task => {
      if (!existingHeaders.includes(task)) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(task);
        updated = true;
      }
    });

    // Refresh headers after possible additions
    existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Make sure "Comment" exists
    if (!existingHeaders.includes("Comment")) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue("Comment");
      existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    }

    // Move "Comment" to the end if it's not already last
    if (existingHeaders[existingHeaders.length - 1] !== "Comment") {
      const commentCol = existingHeaders.indexOf("Comment") + 1; // 1-based
      const lastCol = sheet.getLastColumn();
      // Copy Comment header and data to a new last column
      sheet.getRange(1, commentCol, sheet.getLastRow()).copyTo(sheet.getRange(1, lastCol + 1), {contentsOnly: true});
      // Delete the old Comment column
      sheet.deleteColumn(commentCol);
    }
  }

  return sheet;
}

function getTaskNames() {
  const monthName = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MMMM-yyyy");
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(`Tasks_${monthName}`);
  const data = sheet.getDataRange().getValues();
  const nameIdx = data[0].indexOf("Task Name");

  return data.slice(1)
    .map(row => (row[nameIdx] || "").toString().trim())
    .filter(name => !!name && !name.includes("-"));  // Filter out UUIDs
}

// === Helper: Time String to Float ===
function parseTimeToFloat(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h + (m || 0) / 60;
}

// === Fetch Active Tasks (Based on Time & Day) ===
// function getTodayTasks(dateString) {
//   const tz = Session.getScriptTimeZone();
//   // Always get today in local timezone
//   const todayDateString = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
//   const dayOfWeek = Utilities.formatDate(new Date(), tz, 'EEE'); // e.g., 'Wed'
//   Logger.log('Today is: ' + dayOfWeek + ', Date string: ' + todayDateString);

//   const monthName = Utilities.formatDate(new Date(), tz, "MMMM-yyyy");
//   const taskSheetName = `Tasks_${monthName}`;
//   const progressSheetName = `${monthName}`;

//   ensureTaskSheetExists(taskSheetName);
//   const ss = SpreadsheetApp.getActiveSpreadsheet();
//   const taskSheet = ss.getSheetByName(taskSheetName);
//   const progressSheet = getMonthlySheet(todayDateString);

//   const taskData = taskSheet.getDataRange().getValues();
//   const progressData = progressSheet.getDataRange().getValues();
//   const headers = progressData[0].map(h => typeof h === "string" ? h.trim() : h);

//   const todayRow = progressData.find(row => {
//     if (!row[0]) return false;
//     const cellDate = typeof row[0] === 'string'
//       ? row[0]
//       : Utilities.formatDate(new Date(row[0]), tz, "yyyy-MM-dd");
//     return cellDate === todayDateString;
//   });
//   const todayRowData = todayRow || [];

//   // Column map from Tasks_<Month>
//   const taskHeaders = taskData[0];
//   const colMap = {};
//   taskHeaders.forEach((h, i) => colMap[h.trim()] = i);
//   const rows = taskData.slice(1);

//   const allTasks = [];
//   rows.forEach(row => {
//     // Defensive: skip rows that are too short
//     if (!row || row.length < Object.keys(colMap).length) return;
//     const taskName = (row[colMap["Task Name"]] || "").toString().trim();
//     const type = (row[colMap["Type"]] || "yes/no").toString().trim();
//     const goal = row[colMap["Goal"]];
//     let deadline = row[colMap["Time of Day"]];
//     const dayStr = row[colMap["Days"]];

//     if (!taskName) return;
//     if (deadline instanceof Date) {
//       deadline = Utilities.formatDate(deadline, tz, "HH:mm");
//     }

//     // --- Robust Days logic with logging ---
//     let showToday = false;
//     let daysArr = [];
//     if (typeof dayStr === "string") {
//       if (dayStr.trim().toLowerCase() === "all") {
//         showToday = true;
//         daysArr = ["All"];
//       } else {
//         daysArr = dayStr.split(',').map(d => {
//           const trimmed = d.trim();
//           return trimmed.charAt(0).toUpperCase() + trimmed.slice(1,3).toLowerCase();
//         });
//         if (daysArr.includes(dayOfWeek)) showToday = true;
//       }
//     }
//     Logger.log(`Task: ${taskName}, Days raw: '${dayStr}', Days parsed: ${JSON.stringify(daysArr)}, Today: ${dayOfWeek}, Included: ${showToday}`);
//     if (!showToday) return;
//     // --- End robust Days logic ---

//     const colIdx = headers.indexOf(taskName);
//     const val = colIdx !== -1 ? todayRowData[colIdx] : "";
//     const skipped = val === "Skipped";

//     let progress = 0;
//     if (!skipped && val !== "") {
//       const stringVal = typeof val === "string" ? val.trim() : val.toString().trim();
//       const match = stringVal.match(/^(\d+(\.\d+)?)\s*\(Goal:/);
//       if (match) {
//         progress = parseFloat(match[1]) || 0;
//       } else if (!isNaN(stringVal)) {
//         progress = parseFloat(stringVal) || 0;
//       }
//     }

//     // Parse categories/tags as array
//     let tags = [];
//     if (row[colMap["Category"]]) {
//       tags = row[colMap["Category"]].toString().split(',').map(t => t.trim()).filter(Boolean);
//     }

//     allTasks.push({
//       taskName,
//       type,
//       goal,
//       deadline,
//       value: "",
//       skipped,
//       completedValue: skipped ? "Skipped" : val || "",
//       progress,
//       tags
//     });
//   });

//   Logger.log("Today's tasks: " + JSON.stringify(allTasks));
//   return {
//     overdue: [],
//     upcoming: [],
//     allday: allTasks
//   };
// }

function getTodayTasks(dateString) {
  const tz = Session.getScriptTimeZone();
  const todayDateString = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const dayOfWeek = Utilities.formatDate(new Date(), tz, 'EEE');
  Logger.log('Today is: ' + dayOfWeek + ', Date string: ' + todayDateString);

  const monthName = Utilities.formatDate(new Date(), tz, "MMMM-yyyy");
  const taskSheetName = `Tasks_${monthName}`;
  ensureTaskSheetExists(taskSheetName);
  ensureTaskSheetHeaders(taskSheetName);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const taskSheet = ss.getSheetByName(taskSheetName);
  const taskData = taskSheet.getDataRange().getValues();

  if (taskData.length < 2) return { overdue: [], upcoming: [], allday: [] };

  const taskHeaders = taskData[0];
  const colMap = {};
  taskHeaders.forEach((h, i) => colMap[h.trim()] = i);
  const rows = taskData.slice(1);

  function safeGet(row, colName) {
    const idx = colMap[colName];
    if (idx === undefined) {
      Logger.log(`safeGet: Column "${colName}" not found in colMap`);
      return "";
    }
    if (!row || idx >= row.length) {
      Logger.log(`safeGet: Row too short or missing for column "${colName}". Row: ${JSON.stringify(row)}, idx: ${idx}`);
      return "";
    }
    return (row[idx] !== undefined && row[idx] !== null) ? row[idx].toString() : "";
  }

  const allTasks = [];
  rows.forEach(row => {
    if (!row || row.length < Object.keys(colMap).length) {
      Logger.log(`Skipping incomplete row: ${JSON.stringify(row)}`);
      return;
    }
    const taskName = safeGet(row, "Task Name").trim();
    const type = safeGet(row, "Type").trim() || "yes/no";
    const goal = safeGet(row, "Goal");
    let deadline = safeGet(row, "Time of Day");
    const dayStr = safeGet(row, "Days");

    if (!taskName) return;

    // Days logic
    let showToday = false;
    let daysArr = [];
    if (typeof dayStr === "string") {
      if (dayStr.trim().toLowerCase() === "all") {
        showToday = true;
        daysArr = ["All"];
      } else {
        daysArr = dayStr.split(',').map(d => {
          const trimmed = d.trim();
          return trimmed.charAt(0).toUpperCase() + trimmed.slice(1,3).toLowerCase();
        });
        if (daysArr.includes(dayOfWeek)) showToday = true;
      }
    }
    Logger.log(`Task: ${taskName}, Days raw: '${dayStr}', Days parsed: ${JSON.stringify(daysArr)}, Today: ${dayOfWeek}, Included: ${showToday}`);
    if (!showToday) return;

    // You can add progress/skip logic here as needed

    // Parse categories/tags as array
    let tags = [];
    const catVal = safeGet(row, "Category");
    if (catVal) {
      tags = catVal.split(',').map(t => t.trim()).filter(Boolean);
    }

    allTasks.push({
      taskName,
      type,
      goal,
      deadline,
      value: "",
      skipped: false,
      completedValue: "",
      progress: 0,
      tags
    });
  });

  Logger.log("Today's tasks: " + JSON.stringify(allTasks));
  return {
    overdue: [],
    upcoming: [],
    allday: allTasks
  };
}

function testGetTodayTasksWithLogs() {
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const result = getTodayTasks(today);
  Logger.log('Result from getTodayTasks: ' + JSON.stringify(result));
}

// === Helper: Get Column Map for Monthly Sheet ===
function getColumnMap(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((h, i) => {
    map[h] = i + 1;
  });
  return map;
}

// === Submit Progress Form ===
function submitProgress(data) {
  const sheet = getMonthlySheet(data.date);
  const colMap = getColumnMap(sheet);
  const allValues = sheet.getDataRange().getValues();
  const dateStr = data.date;

  let rowIdx = allValues.findIndex((row, idx) => {
    if (idx === 0) return false;
    const cellDate = typeof row[0] === 'string'
      ? row[0]
      : Utilities.formatDate(new Date(row[0]), Session.getScriptTimeZone(), "yyyy-MM-dd");
    return cellDate === dateStr;
  });

  if (rowIdx === -1) {
    rowIdx = sheet.getLastRow() + 1;
    sheet.getRange(rowIdx, colMap["Date"]).setValue(dateStr);
  } else {
    rowIdx += 1;
  }

  data.entries.forEach(entry => {
    const col = colMap[entry.taskName];
    if (!col) return;

    if (entry.cannotDo) {
      sheet.getRange(rowIdx, col).setValue("Skipped");
      return;
    }

    // ✅ Save yes/no task result
    if (entry.value === "yes") {
      sheet.getRange(rowIdx, col).setValue("Yes");
      return;
    }

    // ✅ Save number task progress
    let newValue = entry.value || "";
    if (newValue && !isNaN(newValue)) {
      const cellVal = sheet.getRange(rowIdx, col).getValue();
      let prev = 0;

      if (typeof cellVal === "string") {
        const match = cellVal.match(/^(\d+(\.\d+)?)\s*\(Goal:/);
        if (match) prev = parseFloat(match[1]) || 0;
      } else if (!isNaN(cellVal)) {
        prev = parseFloat(cellVal) || 0;
      }

      const total = prev + parseFloat(newValue);
      newValue = `${total} (Goal: ${entry.goal})`;
      sheet.getRange(rowIdx, col).setValue(newValue);
    }
  });

  if (data.generalComment) {
    const commentCol = colMap["Comment"];
    const oldVal = sheet.getRange(rowIdx, commentCol).getValue();
    sheet.getRange(rowIdx, commentCol).setValue((oldVal || "") + '\n' + data.generalComment);
  }

  return "Submitted successfully!";
}

// === Send 3-Hourly Reminder Email ===
function sendReminder() {
  ensureTaskSheetExists();

  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const tasks = getTodayTasks(today);

  if (tasks.length === 0) return;

  const taskList = tasks.map(t =>
    `<li><b>${t.taskName}</b> (Due: ${t.deadline}) – Not yet completed</li>`
  ).join("");

  const htmlBody = `
    <p>Here are your pending tasks for today:</p>
    <ul>${taskList}</ul>
    <p><a href="${ScriptApp.getService().getUrl()}?page=index">Click here to complete them</a></p>
  `;

  MailApp.sendEmail({
    to: Session.getActiveUser().getEmail(),
    subject: "⏰ Reminder: Pending Tasks Today",
    htmlBody: htmlBody
  });
}

/**
 * Send an HTML email with all pending tasks (overdue yes/no and number tasks not yet completed).
 * For number tasks, reminders are sent every X hours (configurable per task or globally).
 * For yes/no tasks, reminders are sent if the deadline is passed and not completed.
 */
function sendPendingTasksReminder() {
  const tz = Session.getScriptTimeZone();
  const todayDateString = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const now = new Date();
  const tasksObj = getTodayTasks(todayDateString);
  const pendingTasks = [];

  // Yes/No and Number tasks
  [...tasksObj.overdue, ...tasksObj.upcoming, ...tasksObj.allday].forEach(task => {
    if (task.skipped) return;
    // Yes/No tasks: check deadline
    if (task.type === 'yes/no') {
      if (task.deadline) {
        const [h, m] = task.deadline.split(':').map(Number);
        const deadlineDate = new Date(now);
        deadlineDate.setHours(h, m || 0, 0, 0);
        if (now > deadlineDate && (!task.completedValue || task.completedValue.toString().toLowerCase() !== 'yes')) {
          pendingTasks.push({
            id: task.id,
            name: task.taskName,
            type: 'yes/no',
            deadline: task.deadline,
            goal: '',
            reason: `Missed deadline (${task.deadline})`
          });
        }
      }
    } else if (task.type === 'number') {
      // Number tasks: check if goal met and interval elapsed
      const goal = parseFloat(task.goal) || 1;
      const progress = parseFloat(task.progress) || 0;
      const interval = parseInt(task.reminderInterval, 10) || 3;
      if (progress < goal) {
        // Check last reminder
        const info = getLastReminder(task.id, todayDateString);
        let shouldRemind = false;
        if (!info.last) {
          shouldRemind = true;
        } else {
          const last = new Date(info.last);
          const diffHrs = (now - last) / (1000 * 60 * 60);
          if (diffHrs >= interval) shouldRemind = true;
        }
        if (shouldRemind) {
          pendingTasks.push({
            id: task.id,
            name: task.taskName,
            type: 'number',
            deadline: task.deadline,
            goal: `${progress} / ${goal}`,
            reason: `Goal not met (reminder every ${interval}h)`
          });
          setLastReminder(task.id, todayDateString, now);
        }
      }
    }
  });

  if (pendingTasks.length === 0) return;

  // Group tasks by type
  const yesNoTasks = pendingTasks.filter(t => t.type === 'yes/no');
  const numberTasks = pendingTasks.filter(t => t.type === 'number');

  // Build HTML email
  const indexUrl = ScriptApp.getService().getUrl() + '?page=index';
  let htmlBody = `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:500px;margin:auto;background:#f7f9fb;padding:24px 18px 18px 18px;border-radius:12px;box-shadow:0 2px 12px #2d6cdf22;">
    <h2 style="color:#2d6cdf;text-align:center;margin-bottom:8px;">⏰ Task Reminder</h2>
    <p style="font-size:1.1em;text-align:center;margin-top:0;">Hi there! You have <b>${pendingTasks.length}</b> pending task${pendingTasks.length>1?'s':''} today.</p>
    <hr style="border:none;border-top:1.5px solid #e0e7ef;margin:18px 0;">
  `;

  if (yesNoTasks.length) {
    htmlBody += `<h3 style="color:#2d6cdf;margin-bottom:6px;">🟢 Yes/No Tasks</h3><ul style="padding-left:18px;">`;
    yesNoTasks.forEach(t => {
      let tagsHtml = '';
      if (Array.isArray(t.tags) && t.tags.length) {
        tagsHtml = t.tags.map(tag => `<span style='background:#e0e7ef;color:#2d6cdf;padding:2px 10px;border-radius:12px;font-size:0.95em;display:inline-block;margin-right:6px;margin-bottom:2px;'>${tag}</span>`).join('') + ' ';
      }
      htmlBody += `<li style="margin-bottom:8px;">${tagsHtml}<b>${t.name}</b> <span style='color:#e67e22;'>(Due: ${t.deadline || 'Anytime'})</span> <span style='color:#c0392b;'>${t.reason}</span></li>`;
    });
    htmlBody += `</ul>`;
  }
  if (numberTasks.length) {
    htmlBody += `<h3 style="color:#2d6cdf;margin-bottom:6px;">🔢 Number Tasks</h3><ul style="padding-left:18px;">`;
    numberTasks.forEach(t => {
      let tagsHtml = '';
      if (Array.isArray(t.tags) && t.tags.length) {
        tagsHtml = t.tags.map(tag => `<span style='background:#e0e7ef;color:#2d6cdf;padding:2px 10px;border-radius:12px;font-size:0.95em;display:inline-block;margin-right:6px;margin-bottom:2px;'>${tag}</span>`).join('') + ' ';
      }
      htmlBody += `<li style="margin-bottom:8px;">${tagsHtml}<b>${t.name}</b> <span style='color:#888;'>(${t.goal})</span> <span style='color:#e67e22;'>(Due: ${t.deadline || 'Anytime'})</span> <span style='color:#c0392b;'>${t.reason}</span></li>`;
    });
    htmlBody += `</ul>`;
  }

  htmlBody += `<div style="text-align:center;margin:24px 0 12px 0;">
    <a href="${indexUrl}" style="background:#2d6cdf;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:1.1em;box-shadow:0 2px 8px #2d6cdf33;">Complete Your Tasks</a>
  </div>
  <hr style="border:none;border-top:1.5px solid #e0e7ef;margin:18px 0;">
  <p style="color:#888;text-align:center;font-size:0.98em;">Stay consistent and keep up the great work!<br>— Your Task Tracker</p>
  </div>`;

  MailApp.sendEmail({
    to: Session.getActiveUser().getEmail(),
    subject: `⏰ You have ${pendingTasks.length} pending task${pendingTasks.length>1?'s':''} today!`,
    htmlBody: htmlBody
  });
}

// === Create Triggers (Every 3 Hours) ===
function createTrigger() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === "sendReminder") {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  for (let hour = 9; hour <= 21; hour += 3) {
    ScriptApp.newTrigger("sendReminder")
      .timeBased()
      .everyDays(1)
      .atHour(hour)
      .create();
  }
}

// === Task Manager – Get Tasks ===
function getAllTasks() {
  const monthName = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MMMM-yyyy");
  const taskSheetName = `Tasks_${monthName}`;
  ensureTaskSheetExists(taskSheetName);
  ensureTaskSheetHeaders(taskSheetName);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(taskSheetName);

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  const colMap = {};
  headers.forEach((h, i) => colMap[h.trim()] = i);

  return rows.map(row => {
    let timeValue = row[colMap["Time of Day"]];
    if (timeValue instanceof Date) {
      timeValue = Utilities.formatDate(timeValue, Session.getScriptTimeZone(), "HH:mm");
    }
    return {
      id: row[colMap["Task ID"]],
      reminderInterval: row[colMap["Reminder Interval (hrs)"]],
      category: row[colMap["Category"]],
      name: row[colMap["Task Name"]],
      type: row[colMap["Type"]],
      goal: row[colMap["Goal"]],
      time: timeValue || "",
      days: row[colMap["Days"]],
      note: row[colMap["Note"]]
    };
  });
}
// === Task Manager – Save Tasks ===
function updateTasks(taskList, deletedIds) {
  const monthName = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MMMM-yyyy");
  const taskSheetName = `Tasks_${monthName}`;
  ensureTaskSheetExists(taskSheetName);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(taskSheetName);

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const colMap = {};
  headers.forEach((h, i) => colMap[h.trim()] = i);
  const idCol = colMap["Task ID"];

  // Step 1: Remove deleted tasks
  if (Array.isArray(deletedIds)) {
    for (let i = data.length - 1; i > 0; i--) {
      const rowId = data[i][idCol];
      if (deletedIds.includes(rowId)) {
        sheet.deleteRow(i + 1);
      }
    }
  }

  // Step 2: Map existing tasks by ID
  const updated = {};
  for (let i = 1; i < sheet.getLastRow(); i++) {
    const rowId = sheet.getRange(i + 1, idCol + 1).getValue();
    updated[rowId] = i + 1;
  }

  // Step 3: Add or update rows
  taskList.forEach(task => {
    if (!task.name || task.name.trim() === "") return; // Ignore unnamed tasks

    const taskName = task.name.trim();
    const time = typeof task.time === 'string'
      ? task.time
      : Utilities.formatDate(new Date(task.time), Session.getScriptTimeZone(), "HH:mm");

    const values = [];
    values[colMap["Task ID"]] = task.id || Utilities.getUuid();
    values[colMap["Reminder Interval (hrs)"]] = task.reminderInterval || 3;
    values[colMap["Category"]] = task.category || "";
    values[colMap["Task Name"]] = taskName;
    values[colMap["Type"]] = task.type || "";
    values[colMap["Goal"]] = task.type === "number" ? task.goal || 0 : "";
    values[colMap["Time of Day"]] = time;
    values[colMap["Days"]] = task.days || "";
    values[colMap["Note"]] = task.note || "";

    const rowIdx = updated[task.id];
    if (rowIdx) {
      sheet.getRange(rowIdx, 1, 1, headers.length).setValues([values]);
    } else {
      const row = headers.map((_, i) => values[i] || "");
      sheet.appendRow(row);
    }
  });
  return "✅ Tasks saved successfully!";
}

// === Optional: One-Time Setup ===
function setup() {
  const monthName = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MMMM-yyyy");
  ensureTaskSheetExists(`Tasks_${monthName}`);
  ensureCommentSheetExists();
  createTrigger();
}

function testTodayTasks() {
  const result = getTodayTasks("2025-06-18");
  Logger.log(JSON.stringify(result));
}
function testGetTodayTasks() {
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const tasks = getTodayTasks(today);
  Logger.log(JSON.stringify(tasks, null, 2));
}

function testGetAllTasksFormat() {
  const tasks = getAllTasks();

  if (!Array.isArray(tasks) || tasks.length === 0) {
    Logger.log("❌ No tasks found or invalid data format.");
    return;
  }

  Logger.log(`✅ Total tasks fetched: ${tasks.length}`);
  tasks.forEach((task, i) => {
    Logger.log(`Task ${i + 1}:`);
    Logger.log(`  Name: ${task.name} (${typeof task.name})`);
    Logger.log(`  Type: ${task.type} (${typeof task.type})`);
    Logger.log(`  Goal: ${task.goal} (${typeof task.goal})`);
    Logger.log(`  Time: ${task.time} (${typeof task.time})`);
    Logger.log(`  Days: ${task.days} (${typeof task.days})`);
  });
}

function fixTaskTimeFormatting() {
  const monthName = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MMMM-yyyy");
  const taskSheetName = `Tasks_${monthName}`;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(taskSheetName);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const cellVal = data[i][3];
    if (cellVal instanceof Date) {
      const fixedTime = Utilities.formatDate(cellVal, Session.getScriptTimeZone(), "HH:mm");
      sheet.getRange(i + 1, 4).setValue(fixedTime); // row offset +1 due to header
    }
  }
}

// === Analytics: Get Daily Task Completion Data ===
function getAnalyticsData() {
  // Get the current month's progress sheet
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const monthName = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MMMM-yyyy");
  const sheet = ss.getSheetByName(monthName);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  const dateCol = headers.indexOf('Date');
  const commentCol = headers.indexOf('Comment');

  // All task columns are between Date and Comment
  const taskCols = [];
  for (let i = dateCol + 1; i < commentCol; i++) {
    taskCols.push(i);
  }

  // Prepare chart data: [ ["Date", "Completed Tasks"], ... ]
  const chartData = [["Date", "Tasks Completed"]];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const date = row[dateCol];
    let completed = 0;
    taskCols.forEach(idx => {
      const val = row[idx];
      if (typeof val === 'string' && (val.trim().toLowerCase() === 'yes' || val.trim().toLowerCase() === 'completed')) completed++;
      if (!isNaN(val) && val !== "") {
        if (parseFloat(val) > 0) completed++;
      }
    });
    if (date) chartData.push([typeof date === 'string' ? date : Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), 'yyyy-MM-dd'), completed]);
  }
  return chartData;
}

// === Reminder Tracking: Manage Task Reminders ===
function ensureRemindersSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Reminders');
  if (!sheet) {
    sheet = ss.insertSheet('Reminders');
    sheet.hideSheet();
    sheet.appendRow(['Task ID', 'Date', 'LastReminder']);
  }
  return sheet;
}

function getLastReminder(taskId, dateStr) {
  const sheet = ensureRemindersSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === taskId && data[i][1] === dateStr) {
      return { row: i + 1, last: data[i][2] };
    }
  }
  return { row: null, last: null };
}

function setLastReminder(taskId, dateStr, timestamp) {
  const sheet = ensureRemindersSheet();
  const info = getLastReminder(taskId, dateStr);
  if (info.row) {
    sheet.getRange(info.row, 3).setValue(timestamp);
  } else {
    sheet.appendRow([taskId, dateStr, timestamp]);
  }
}

function ensureTaskSheetHeaders(taskSheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(taskSheetName);
  if (!sheet) return;
  const expectedHeaders = [
    "Task ID",
    "Reminder Interval (hrs)",
    "Category",
    "Task Name",
    "Type",
    "Goal",
    "Time of Day",
    "Days",
    "Note"
  ];
  const headers = sheet.getRange(1, 1, 1, expectedHeaders.length).getValues()[0];
  let needsRepair = false;
  for (let i = 0; i < expectedHeaders.length; i++) {
    if (headers[i] !== expectedHeaders[i]) {
      needsRepair = true;
      break;
    }
  }
  if (needsRepair) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
  }
}