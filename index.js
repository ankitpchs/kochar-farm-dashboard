require("dotenv").config();

const express = require("express");
const { google } = require("googleapis");
const askClaude = require("./ai");

const app = express();

// Serve static files (HTML, CSS, JS)
app.use(express.static(__dirname));

const auth = new google.auth.GoogleAuth({
  keyFile: "./credentials.json",   // must match file name
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

const SPREADSHEET_ID = "12uYiz9kCy4344iMSy3qxh3DGaQch-W5a0i_enyGw14k";

// 👉 TEST ROUTE
app.get("/", (req, res) => {
  res.send("Server is working ✅");
});

// 👉 GET TODO LIST DATA (with all sheets)
app.get("/todo", async (req, res) => {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const todo = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "To-Do List!A1:Z1000",
    });

    const packages = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "PackageOrder sheet!A1:Z1000",
    });

    const areas = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Area Sheet!A1:Z1000",
    });

    const vendors = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Vendor List!A1:Z1000",
    });

    const timeline = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Project Timeline(09.06.2025)!A1:Z1000",
    });

    const ddTracker = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "DD - Tracker!A1:Z1000",
    });

    const interiorDrawings = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Interior Drawings!A1:Z1000",
    });

    const workTracker = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Work-Tracker!A:BA",
    });

    const sheetData = {
      todo: todo.data.values,
      packages: packages.data.values,
      areas: areas.data.values,
      vendors: vendors.data.values,
      timeline: timeline.data.values,
      ddTracker: ddTracker.data.values,
      interiorDrawings: interiorDrawings.data.values,
      workTracker: workTracker.data.values,
    };

    res.json(sheetData);

  } catch (error) {
    console.error(error);
    res.send("Error: " + error.message);
  }
});

// 🤖 AI QUERY ROUTE (with all sheets)
app.get("/ask", async (req, res) => {
  try {
    const question = req.query.q;

    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const todo = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "To-Do List!A1:Z1000",
    });

    const packages = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "PackageOrder sheet!A1:Z1000",
    });

    const areas = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Area Sheet!A1:Z1000",
    });

    const vendors = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Vendor List!A1:Z1000",
    });

    const timeline = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Project Timeline(09.06.2025)!A1:Z1000",
    });

    const ddTracker = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "DD - Tracker!A1:Z1000",
    });

    const interiorDrawings = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Interior Drawings!A1:Z1000",
    });

    const workTracker = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Work-Tracker!A:BA",
    });

    const sheetData = {
      todoList: todo.data.values,
      packages: packages.data.values,
      areas: areas.data.values,
      vendors: vendors.data.values,
      timeline: timeline.data.values,
      ddTracker: ddTracker.data.values,
      interiorDrawings: interiorDrawings.data.values,
      workTracker: workTracker.data.values,
    };
 
    const answer = await askClaude(question, sheetData);

    res.send(answer);
  } catch (err) {
    console.error(err);
    res.send("Error getting AI response");
  }
});

// 📋 TODAY'S TASKS ROUTE - Full analysis with last 5 updates
app.get("/todaytasks", async (req, res) => {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    // Get all required sheets
    const todoResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "To-Do List!A1:AZ1000",
    });

    const packageResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "PackageOrder sheet!A1:J1000",
    });

    const timelineResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Project Timeline(09.06.2025)!A1:E1000",
    });

    const todoData = todoResponse.data.values;
    const packageData = packageResponse.data.values;
    const timelineData = timelineResponse.data.values;

    const todoHeaders = todoData[0];
    const packageHeaders = packageData[0];
    const timelineHeaders = timelineData[0];

    // Find date columns in To-Do List
    const dateColumns = [];
    for (let i = 0; i < todoHeaders.length; i++) {
      const header = todoHeaders[i];
      if (header && isValidDateHeader(header)) {
        dateColumns.push({
          index: i,
          date: header
        });
      }
    }

    const tasks = [];

    // Analyze each item in To-Do List (skip header)
    for (let i = 1; i < todoData.length; i++) {
      const row = todoData[i];
      const itemName = row[1]; // Column B - TO DO
      const status = row[4]; // Column E - STATUS

      if (!itemName || itemName.trim() === "") continue;
      if (status === "CLOSE") continue; // Skip completed items

      // Get LAST 5 updates from date columns
      const updates = [];
      for (let col of dateColumns) {
        const update = row[col.index];
        if (update && update.trim() !== "") {
          updates.push({
            date: col.date,
            message: update.trim()
          });
        }
      }

      // Keep only last 5 updates
      const last5Updates = updates.slice(-5);

      // Find matching vendor in PackageOrder sheet
      const vendorInfo = findVendorInPackage(itemName, packageData, packageHeaders);

      // Find timeline info
      const timelineInfo = findTimelineInfo(itemName, timelineData, timelineHeaders);

      // Analyze the item
      const analysis = analyzeTaskPriority(
        itemName,
        status,
        last5Updates,
        vendorInfo,
        timelineInfo
      );

      // Only include items with CRITICAL or HIGH priority
      if (analysis.priority !== "LOW") {
        tasks.push({
          item: itemName,
          status: status,
          vendor: vendorInfo.vendorName,
          vendorStatus: vendorInfo.vendorStatus,
          priority: analysis.priority,
          reason: analysis.reason,
          actionNeeded: analysis.actionNeeded,
          daysUntilStart: timelineInfo.daysUntilStart,
          timelineStart: timelineInfo.startDate,
          recentUpdates: last5Updates.slice(-3) // Show last 3 updates
        });
      }
    }

    // Sort by priority
    const priorityOrder = { "CRITICAL": 0, "HIGH": 1, "LOW": 2 };
    tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Count by priority
    const counts = {
      critical: tasks.filter(t => t.priority === "CRITICAL").length,
      high: tasks.filter(t => t.priority === "HIGH").length
    };

    res.json({
      success: true,
      counts: counts,
      totalTasks: tasks.length,
      tasks: tasks
    });

  } catch (error) {
    console.error(error);
    res.json({
      success: false,
      error: "Error getting today's tasks: " + error.message
    });
  }
});

// 📊 WORK TRACKER ANALYSIS ROUTE
app.get("/worktracker", async (req, res) => {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const workTrackerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Work-Tracker!A:BA",
    });

    const wtData = workTrackerResponse.data.values;
    const headers = wtData[0];

    const tasks = [];

    // Find date columns (weekly status columns) - they start from column L onwards
    const dateColumns = [];
    for (let i = 11; i < headers.length; i++) {  // Column L = index 11
      const header = headers[i];
      if (header && /\d{1,2}\s+[A-Za-z]{3}\s+\d{4}/.test(header)) {
        dateColumns.push({
          index: i,
          date: header
        });
      }
    }

    // Get last 4 week columns
    const last4Weeks = dateColumns.slice(-4);

    // Analyze each task (skip header)
    for (let i = 1; i < wtData.length; i++) {
      const row = wtData[i];
      
      const sNo = row[0];
      const floor = row[1];
      const particular = row[2];
      const taskDesc = row[3];
      const initialStartDate = row[4];
      const initialFinishDate = row[5];
      const latestStartDate = row[6];
      const latestFinishDate = row[7];
      const dependency = row[9];
      const taskStatus = row[10];

      if (!floor || !particular) continue;  // Skip empty rows
      if (taskStatus === "Completed") continue;  // Skip completed tasks
      if (!latestStartDate || latestStartDate === "Not Set") continue;  // Skip if no latest start date
      if (!latestFinishDate || latestFinishDate === "Not Set") continue;  // Skip if no latest finish date

      // Get last 4 weeks progress
      const progressHistory = [];
      for (let week of last4Weeks) {
        const status = row[week.index] || "";
        if (status) {
          progressHistory.push({
            week: week.date,
            status: status
          });
        }
      }

      // Calculate delay
      const delayDays = calculateDelayDays(initialFinishDate, latestFinishDate);
      
      // Determine priority
      const priority = determinePriority(taskStatus, delayDays, progressHistory);

      tasks.push({
        sNo: sNo,
        floor: floor,
        particular: particular,
        taskDesc: taskDesc,
        initialStartDate: initialStartDate || "Not Set",
        initialFinishDate: initialFinishDate || "Not Set",
        latestStartDate: latestStartDate,
        latestFinishDate: latestFinishDate,
        delayDays: delayDays,
        dependency: dependency || "N/A",
        taskStatus: taskStatus,
        progressHistory: progressHistory,
        priority: priority,
        aiAnalysis: generateAIAnalysis(taskDesc, taskStatus, delayDays, progressHistory),
actionItem: generateActionItem(taskDesc, taskStatus, delayDays, dependency)
      });
    }

    // Sort by priority
    const priorityOrder = { "CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3 };
    tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Count by priority
    const counts = {
      onTrack: tasks.filter(t => t.priority === "LOW").length,
      delayed: tasks.filter(t => t.priority === "HIGH" || t.priority === "MEDIUM").length,
      critical: tasks.filter(t => t.priority === "CRITICAL").length,
      completed: 0  // We're not showing completed tasks anymore
    };

    res.json({
      success: true,
      counts: counts,
      totalTasks: tasks.length,
      tasks: tasks
    });

  } catch (error) {
    console.error(error);
    res.json({
      success: false,
      error: "Error getting work tracker data: " + error.message
    });
  }
});

// Helper: Check if header is a valid date
function isValidDateHeader(header) {
  if (!header) return false;
  // Matches: "24 Jan 2026" or "7-Feb-2026" or "21-Feb-2026"
  return /(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})|(\d{1,2}-[A-Za-z]{3}-\d{4})/.test(header);
}

// Helper function: Find vendor in PackageOrder sheet by keyword matching
function findVendorInPackage(itemName, packageData, headers) {
  const packageItemIndex = 2; // Column C - Package Items
  const vendorNameIndex = 4; // Column E - Vendor Name
  const vendorStatusIndex = 5; // Column F - Vendor Status

  // Search for item in PackageOrder by keyword matching
  for (let i = 1; i < packageData.length; i++) {
    const row = packageData[i];
    const packageItem = row[packageItemIndex] || "";
    
    // Keyword matching: check if itemName words appear in packageItem
    const itemWords = itemName.toLowerCase().split(" ");
    const packageWords = packageItem.toLowerCase();
    
    const matchCount = itemWords.filter(word => 
      word.length > 2 && packageWords.includes(word)
    ).length;

    if (matchCount > 0) {
      return {
        vendorName: row[vendorNameIndex] || "Not Specified",
        vendorStatus: row[vendorStatusIndex] || "TBD"
      };
    }
  }

  return {
    vendorName: "Not Found",
    vendorStatus: "TBD"
  };
}

// Helper function: Find timeline info
function findTimelineInfo(itemName, timelineData, headers) {
  const itemIndex = 0; // Column A - ITEM
  const startDateIndex = 2; // Column C - START DATE

  for (let i = 1; i < timelineData.length; i++) {
    const row = timelineData[i];
    const timelineItem = (row[itemIndex] || "").toLowerCase();
    const itemNameLower = itemName.toLowerCase();

    if (timelineItem.includes(itemNameLower) || itemNameLower.includes(timelineItem)) {
      const startDate = row[startDateIndex];
      if (startDate) {
        const daysUntilStart = calculateDaysUntil(startDate);
        return {
          startDate: startDate,
          daysUntilStart: daysUntilStart
        };
      }
    }
  }

  return {
    startDate: "Not Found",
    daysUntilStart: 999
  };
}

// Helper function: Calculate days until start date (handles multiple date formats)
function calculateDaysUntil(dateString) {
  try {
    if (!dateString || dateString.trim() === "") return 999;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let day, month, year;
    
    const months = { 
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    
    // Format 1: "24 Jan 2026" (with spaces)
    let match = dateString.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
    if (match) {
      day = parseInt(match[1]);
      month = match[2];
      year = parseInt(match[3]);
      const startDate = new Date(year, months[month], day);
      const diffTime = startDate - today;
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    // Format 2: "7-Feb-2026" (with dashes, 4-digit year)
    match = dateString.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
    if (match) {
      day = parseInt(match[1]);
      month = match[2];
      year = parseInt(match[3]);
      const startDate = new Date(year, months[month], day);
      const diffTime = startDate - today;
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    // Format 3: "20-Apr-26" (with dashes, 2-digit year)
    match = dateString.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
    if (match) {
      day = parseInt(match[1]);
      month = match[2];
      year = 2000 + parseInt(match[3]); // Convert 26 to 2026
      const startDate = new Date(year, months[month], day);
      const diffTime = startDate - today;
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    return 999;
  } catch (e) {
    console.error("Date calculation error:", e);
    return 999;
  }
}

// Helper function: Analyze task priority with full logic
function analyzeTaskPriority(itemName, status, updates, vendorInfo, timelineInfo) {
  let priority = "LOW";
  let reason = "";
  let actionNeeded = "";

  // Check vendor status
  const vendorStatus = vendorInfo.vendorStatus.toUpperCase();
  const isVendorTBD = vendorStatus === "TBD" || vendorStatus === "";
  const isVendorPending = vendorStatus === "PENDING";
  const isVendorHired = vendorStatus === "HIRED";

  // Get days until work starts
  const daysUntilStart = timelineInfo.daysUntilStart;
  const isUrgent = daysUntilStart <= 14; // Less than 2 weeks

  if (status === "OPEN") {
    // Item not started
    if (isVendorTBD) {
      if (isUrgent) {
        priority = "CRITICAL";
        reason = `Not started. Vendor TBD. Work starts in ${daysUntilStart} days!`;
        actionNeeded = `URGENT: Finalize vendor "${vendorInfo.vendorName}". Work scheduled ${timelineInfo.startDate}`;
      } else {
        priority = "HIGH";
        reason = `Not started. Vendor not finalized. Work starts ${timelineInfo.startDate}`;
        actionNeeded = `Select and hire vendor for ${itemName}`;
      }
    } else if (isVendorPending) {
      priority = "HIGH";
      reason = "Not started. Vendor pending approval.";
      actionNeeded = `Follow up: Confirm vendor "${vendorInfo.vendorName}" for ${itemName}`;
    } else if (isVendorHired) {
      priority = "HIGH";
      reason = "Not started yet but vendor ready.";
      actionNeeded = `Start work on ${itemName}. Vendor (${vendorInfo.vendorName}) is ready.`;
    }
  } else if (status === "W.I.P") {
    // Work in progress
    if (updates.length === 0) {
      priority = "CRITICAL";
      reason = "In progress but no updates recorded.";
      actionNeeded = `Follow up on ${itemName}. No recent activity.`;
    } else {
      const lastUpdate = updates[updates.length - 1];
      
      // Check if stuck (same message in last 3 updates)
      let sameMessageCount = 0;
      for (let i = updates.length - 1; i >= 0; i--) {
        if (updates[i].message === lastUpdate.message) {
          sameMessageCount++;
        } else {
          break;
        }
      }

      if (sameMessageCount >= 3) {
        priority = "CRITICAL";
        reason = `Stuck on: "${lastUpdate.message.substring(0, 60)}..." for ${sameMessageCount} weeks`;
        actionNeeded = `URGENT: Resolve blocker - ${lastUpdate.message}`;
      } else if (sameMessageCount === 2) {
        priority = "HIGH";
        reason = `Waiting for: "${lastUpdate.message.substring(0, 60)}..." for 2 weeks`;
        actionNeeded = `Follow up: ${lastUpdate.message}`;
      } else {
        // Good progress
        if (isVendorTBD && isUrgent) {
          priority = "HIGH";
          reason = "Good progress but vendor TBD. Work starts soon.";
          actionNeeded = `Finalize vendor while work in progress. Scheduled ${timelineInfo.startDate}`;
        } else {
          priority = "LOW";
          reason = "Good progress. Moving forward.";
          actionNeeded = `Continue: ${lastUpdate.message}`;
        }
      }
    }
  }

  return {
    priority: priority,
    reason: reason,
    actionNeeded: actionNeeded
  };
}

// Helper: Calculate delay days
function calculateDelayDays(initialFinish, latestFinish) {
  try {
    if (!initialFinish || !latestFinish) return 0;
    
    const initial = parseDate(initialFinish);
    const latest = parseDate(latestFinish);
    
    if (!initial || !latest) return 0;
    
    const delayTime = latest - initial;
    const delayDays = Math.ceil(delayTime / (1000 * 60 * 60 * 24));
    
    return delayDays;
  } catch (e) {
    return 0;
  }
}

// Helper: Parse date from multiple formats
function parseDate(dateString) {
  try {
    if (!dateString) return null;
    
    const months = { 
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    
    // Format: "9-Jul-2025"
    let match = dateString.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
    if (match) {
      return new Date(parseInt(match[3]), months[match[2]], parseInt(match[1]));
    }
    
    // Format: "9 Jul 2025"
    match = dateString.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
    if (match) {
      return new Date(parseInt(match[3]), months[match[2]], parseInt(match[1]));
    }
    
    // Format: "9-Jul-2025" with spaces
    match = dateString.match(/^(\d{1,2})\s*-\s*([A-Za-z]{3})\s*-\s*(\d{4})$/);
    if (match) {
      return new Date(parseInt(match[3]), months[match[2]], parseInt(match[1]));
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

// Helper: Determine priority
function determinePriority(status, delayDays, progressHistory) {
  if (status === "Completed") return "LOW";
  
  if (status === "Not Started" && delayDays > 0) return "CRITICAL";
  if (status === "Not Started") return "HIGH";
  
  if (status === "WIP" && delayDays > 7) return "CRITICAL";
  if (status === "WIP" && delayDays > 0) return "HIGH";
  if (status === "WIP") return "MEDIUM";
  
  return "LOW";
}

// Helper: Generate AI Analysis
function generateAIAnalysis(particular, status, delayDays, progressHistory) {
  let analysis = "";
  
  if (status === "Completed") {
    analysis = `✅ Task completed successfully. ${delayDays === 0 ? "Finished on schedule!" : `Completed ${Math.abs(delayDays)} days ${delayDays > 0 ? "late" : "early"}.`}`;
  } else if (status === "Not Started") {
    if (delayDays > 0) {
      analysis = `🔴 CRITICAL: Task should have started ${Math.abs(delayDays)} days ago! Immediate action required.`;
    } else {
      analysis = `⏸️ Task not yet started. Monitor closely to ensure timely initiation.`;
    }
  } else if (status === "WIP") {
    if (delayDays > 7) {
      analysis = `🔴 CRITICAL: Work is ${delayDays} days behind schedule. Urgent intervention needed.`;
    } else if (delayDays > 0) {
      analysis = `🟡 HIGH: Work is ${delayDays} days delayed. Escalate to vendor/contractor.`;
    } else {
      analysis = `🟢 On track! Continue current progress to maintain schedule.`;
    }
  }
  
  return analysis;
}

// Helper: Generate Action Item
function generateActionItem(particular, status, delayDays, dependency) {
  if (status === "Completed") {
    return `✅ No action needed - task completed.`;
  } else if (status === "Not Started" && delayDays > 0) {
    return `🚨 URGENT: Start ${particular} immediately. Dependent on: ${dependency}. Escalate to project manager.`;
  } else if (status === "Not Started") {
    return `⏳ Prepare ${particular}. Confirm all dependencies met with ${dependency}.`;
  } else if (status === "WIP" && delayDays > 0) {
    return `⚠️ Accelerate ${particular}. Follow up with ${dependency} on schedule adherence.`;
  } else {
    return `✓ Continue work on ${particular}. Monitor weekly progress.`;
  }
}

app.listen(3000, () => {
  console.log("Server running → http://localhost:3000");
});