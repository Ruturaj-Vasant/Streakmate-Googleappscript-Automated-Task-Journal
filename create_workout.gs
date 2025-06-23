function getRoutines() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Routines');
  if (!sheet) return [];
  // Skip the header row
  const data = sheet.getDataRange().getValues().slice(1).map(row => row[0]).filter(name => !!name);
  return data.map(name => ({ name }));
}

function logWorkout(data) {
  const month = new Date(data.date).toLocaleString('default', { month: 'long', year: 'numeric' });
  const sheetName = `WorkoutLogs_${month}`;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName) || createWorkoutLogSheet(sheetName);
  
  sheet.appendRow([data.date, data.routine, data.exercise, data.sets, data.reps, data.weight, data.notes]);
}

function getLatestWeight(routineName, exerciseName) {
  const month = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  const sheetName = `WorkoutLogs_${month}`;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  
  if (!sheet) return null;

  const data = sheet.getDataRange().getValues();
  let latestWeight = null;

  for (let i = data.length - 1; i > 0; i--) {
    if (data[i][1] === routineName && data[i][2] === exerciseName) {
      latestWeight = data[i][5]; // Weight is in the 6th column
      break;
    }
  }

  return latestWeight;
}

function getWorkoutHistory(routineName) {
  const month = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  const sheetName = `WorkoutLogs_${month}`;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const history = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === routineName) {
      history.push({
        date: data[i][0],
        exercise: data[i][2],
        sets: data[i][3],
        reps: data[i][4],
        weight: data[i][5],
        notes: data[i][6]
      });
    }
  }

  return history;
}

function createWorkoutLogSheet(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);
  sheet.appendRow(['Date', 'Routine', 'Exercise', 'Sets', 'Reps', 'Weight', 'Notes']);
  return sheet;
}

function getAvailableExercises() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Training_DB');
  const values = sheet.getRange('B2:B' + sheet.getLastRow()).getValues();
  return values.flat().filter(name => name);
}

function createRoutineSheet(routineName) {
  // Only create the routine row if it doesn't exist. Exercises will be added later.
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Routines');
  if (!sheet) {
    sheet = ss.insertSheet('Routines');
    sheet.appendRow(['Routine']);  // Add header
  }
  const data = sheet.getDataRange().getValues().map(row => row[0]);
  if (!data.includes(routineName)) {
    sheet.appendRow([routineName]);
  }
}

function getExercisesForRoutine(routineName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Routines');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0].replace(/^★\s*/, '') === routineName.replace(/^★\s*/, '')) {
      return data[i].slice(1).filter(name => name && name.trim() !== '').map(name => ({ name }));
    }
  }
  return [];
}

function addExerciseToRoutine(routineName, exercise) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Routines');
  const data = sheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === routineName) {
      const decodedName = decodeURIComponent(exercise.name);
      if (data[i].includes(decodedName)) return;
      let col = 1;
      while (data[i][col]) col++;
      sheet.getRange(i + 1, col + 1).setValue(decodedName);
      return;
    }
  }
}

function deleteExerciseFromRoutine(routineName, exerciseName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Routines');
  const data = sheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === routineName) {
      for (let j = 1; j < data[i].length; j++) {
        if (data[i][j] === exerciseName) {
          sheet.getRange(i + 1, j + 1).clearContent();
          return;
        }
      }
    }
  }
}

function updateExerciseInRoutine(routineName, oldName, newName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Routines');
  const data = sheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === routineName) {
      const decodedOld = decodeURIComponent(oldName);
      const decodedNew = decodeURIComponent(newName);
      for (let j = 1; j < data[i].length; j++) {
        if (data[i][j] === decodedOld) {
          sheet.getRange(i + 1, j + 1).setValue(decodedNew);
          return;
        }
      }
    }
  }
}

function deleteRoutine(routineName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Routines');
  const data = sheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === routineName) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

function reorderExerciseInRoutine(routineName, fromIndex, toIndex) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Routines');
  const data = sheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === routineName) {
      const exercises = data[i].slice(1);
      if (fromIndex < 0 || fromIndex >= exercises.length || toIndex < 0 || toIndex >= exercises.length) return;
      const movedExercise = exercises.splice(fromIndex, 1)[0];
      exercises.splice(toIndex, 0, movedExercise);
      for (let j = 0; j < exercises.length; j++) {
        sheet.getRange(i + 1, j + 2).setValue(exercises[j] || '');
      }
      return;
    }
  }
}