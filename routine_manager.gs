// Routine & Exercise Manager Backend
// Sheet: Exercises, Routines, RoutineExercises

function addExerciseToBank(exercise) {
  const sheet = getOrCreateSheet_('Exercises', ['Name', 'Sets', 'Reps', 'Weight']);
  sheet.appendRow([exercise.name, exercise.sets, exercise.reps, exercise.weight]);
  return 'Exercise added to bank!';
}

function getExerciseBank() {
  const sheet = getOrCreateSheet_('Exercises', ['Name', 'Sets', 'Reps', 'Weight']);
  const data = sheet.getDataRange().getValues();
  return data.slice(1).map(r => ({name: r[0], sets: r[1], reps: r[2], weight: r[3]}));
}

function addRoutineToBank(routineName) {
  const sheet = getOrCreateSheet_('Routines', ['Name']);
  sheet.appendRow([routineName]);
  return 'Routine added to bank!';
}

function getRoutineBank() {
  const sheet = getOrCreateSheet_('Routines', ['Name']);
  const data = sheet.getDataRange().getValues();
  return data.slice(1).map(r => ({name: r[0]}));
}

function assignExerciseToRoutine(routineName, exerciseName) {
  const sheet = getOrCreateSheet_('RoutineExercises', ['Routine', 'Exercise']);
  sheet.appendRow([routineName, exerciseName]);
  return 'Exercise assigned to routine!';
}

function getExercisesForRoutine(routineName) {
  const sheet = getOrCreateSheet_('RoutineExercises', ['Routine', 'Exercise']);
  const data = sheet.getDataRange().getValues();
  return data.slice(1).filter(r => r[0] === routineName).map(r => r[1]);
}

function getOrCreateSheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}
