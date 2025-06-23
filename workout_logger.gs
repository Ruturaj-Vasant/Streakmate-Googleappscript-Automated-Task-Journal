// Workout Logger Backend
// Sheet: WorkoutLogs_<Month-Year>

function getRoutinesForLogging() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Routines');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  return data.slice(1).map(r => ({name: r[0]}));
}

function getExercisesForLogging(routineName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Routines');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const routineRow = data.find(row => row[0] === routineName);
  if (!routineRow) return [];
  const exerciseNames = routineRow.slice(1).filter(name => name);
  const exSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Exercises');
  const exData = exSheet ? exSheet.getDataRange().getValues() : [];
  const logSheets = SpreadsheetApp.getActiveSpreadsheet().getSheets().filter(s => s.getName().startsWith('WorkoutLogs_'));

  return exerciseNames.map(name => {
    const found = exData.find(r => r[0] === name) || [];
    
    // Collect last 3 sets for this exercise from all logs (most recent first)
    let prevSets = [];
    for (let s = logSheets.length - 1; s >= 0 && prevSets.length < 3; s--) {
      const rows = logSheets[s].getDataRange().getValues().slice(1).reverse();
      for (let i = 0; i < rows.length && prevSets.length < 3; i++) {
        if (rows[i][2] === name) {
          prevSets.push({ reps: rows[i][5], weight: rows[i][6] });
        }
      }
    }

    return {
      name: name,
      sets: found[1] || '',
      prevSets: prevSets
    };
  });
}

function logWorkoutSession(data) {
  const date = data.date;
  const routine = data.routineName;
  const exercises = data.exercises;
  const month = Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), 'MMMM-yyyy');
  const sheetName = 'WorkoutLogs_' + month;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(['Date', 'Routine', 'Exercise', 'Prev Weight', 'Prev Reps', "Today's Reps", "Today's Weight"]);
  }
  exercises.forEach(ex => {
    sheet.appendRow([date, routine, ex.exerciseName, ex.prevWeight || '', ex.prevReps || '', ex.reps || '', ex.weight || '']);
  });
  return 'Workout logged!';
}

function getWorkoutHistoryForRoutine(routineName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets().filter(s => s.getName().startsWith('WorkoutLogs_'));
  let logs = [];
  sheets.forEach(sheet => {
    const data = sheet.getDataRange().getValues();
    logs = logs.concat(data.slice(1).filter(r => r[1] === routineName));
  });
  return logs;
}

function getNthPreviousSet(exerciseName, setIndex) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets().filter(s => s.getName().startsWith('WorkoutLogs_'));
  let foundSets = [];

  for (let s = sheets.length - 1; s >= 0; s--) {
    const rows = sheets[s].getDataRange().getValues();
    for (let i = rows.length - 1; i >= 1; i--) {
      const row = rows[i];
      if (row[2] === exerciseName && row[5] && row[6]) {
        foundSets.push({ reps: row[5], weight: row[6] });
        if (foundSets.length > setIndex) {
          return foundSets[setIndex];
        }
      }
    }
  }

  return { reps: '', weight: '' };
}
