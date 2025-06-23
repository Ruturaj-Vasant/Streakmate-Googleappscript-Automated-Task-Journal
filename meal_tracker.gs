function getFoodItems() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("FoodData");
  const data = sheet.getDataRange().getValues();
  const foodItems = data.slice(1).map(row => ({
    name: row[0],
    protein: row[1],
    carbs: row[2],
    fat: row[3],
    calories: row[4]
  }));
  return foodItems;
}

function logMealEntry(date, mealType, item, quantity) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(`Meals_${Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), "MMMM-yyyy")}`);
  const foodData = getFoodItems();
  const foodItem = foodData.find(food => food.name === item);
  
  if (foodItem) {
    const protein = (foodItem.protein / 100) * quantity;
    const carbs = (foodItem.carbs / 100) * quantity;
    const fat = (foodItem.fat / 100) * quantity;
    const calories = (foodItem.calories / 100) * quantity;

    sheet.appendRow([date, mealType, item, quantity, protein, carbs, fat, calories, ""]);
  } else {
    throw new Error("Food item not found in the database.");
  }
}

function getDailyNutrition(date) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(`Meals_${Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), "MMMM-yyyy")}`);
  const data = sheet.getDataRange().getValues();
  let totalProtein = 0, totalCarbs = 0, totalFat = 0, totalCalories = 0;

  data.slice(1).forEach(row => {
    totalProtein += row[4] || 0;
    totalCarbs += row[5] || 0;
    totalFat += row[6] || 0;
    totalCalories += row[7] || 0;
  });

  return {
    protein: totalProtein,
    carbs: totalCarbs,
    fat: totalFat,
    calories: totalCalories
  };
}

function getCalorieGoal() {
  // Placeholder for user-specific calorie goal logic
  return 2000; // Example fixed goal
}