# StreakMate: Google Apps Script Automated Task Journal

![View Count](https://komarev.com/ghpvc/?username=streakmate-googleappscript-automated-task-journal&color=blue)

**StreakMate** is a lightweight, customizable task tracker built on top of Google Apps Script and Google Sheets.  
It helps you **build habits**, **track daily tasks**, and **automate reminders** – all inside your Google Workspace.

---

## ✨ Features

- ✅ **Daily Task Dashboard** with checkboxes and progress bars
- 📅 **Monthly Logging** in dynamically generated Google Sheets
- 🔁 **Recurring Tasks** with day-of-week scheduling
- ⏰ **Automated 3-hour Reminders** for pending tasks (via email)
- 📝 **Inline General Comments** for each day
- 🧮 **Cumulative Number Tracking** (e.g., rounds, pages read, hours)
- 📊 **Analytics Dashboard** using Google Charts
- 🛠️ **Task Manager Interface** to create, edit, delete tasks
- 🔒 **Resilient to column reordering**, based on header matching
- 🌱 Supports `yes/no` tasks, numeric goals, tags, notes, and skip option

---

## 🚀 Setup Instructions

### 1. 📁 Create a New Google Apps Script Project
- Go to [script.google.com](https://script.google.com)
- Click **New Project**

### 2. 📄 Add the Script Files
- Replace the default `Code.gs` with your full `Code.gs` content
- Add the following HTML files via **File > New > HTML**:
  - `index.html` (for Daily Dashboard)
  - `TaskManager.html` (for managing tasks)
  - `Analytics.html` (for visualizing progress)

### 3. 🧪 Run Initial Setup
In the Apps Script Editor:
- Go to `Run > setup()`
- Approve all permissions
- This will:
  - Create a task sheet for the current month (e.g., `Tasks_June-2025`)
  - Create a progress log (e.g., `June-2025`)
  - Set up a comment sheet and email reminder triggers

### 4. 🔗 Deploy the Web App
- Click **Deploy > Test deployments > Web App**
- Set:
  - **Execute as**: Me (your account)
  - **Who has access**: Only Myself *(or anyone, if shared)*
- Copy the **Web App URL**

### 5. 🖥 Use the Web Interfaces
- Visit: `YOUR_WEB_APP_URL?page=index` – Daily Dashboard  
- Visit: `YOUR_WEB_APP_URL?page=TaskManager` – Manage Tasks  
- Visit: `YOUR_WEB_APP_URL?page=Analytics` – Progress Chart

---

## 📦 Folder Structure

```
├── Code.gs                 # Main AppScript logic
├── index.html              # Daily tracking interface
├── TaskManager.html        # Task CRUD UI
├── Analytics.html          # Chart-based analytics
└── Google Sheets           # Acts as backend database (auto-generated)
```

---

## 🙌 Credits

Built with ❤️ using Google Apps Script by Ruturaj Tambe 
Inspired by the idea of creating a habit tracker that runs natively within Google Sheets with no external dependency.

---

## 📄 License

MIT License – feel free to use, modify, and share.
