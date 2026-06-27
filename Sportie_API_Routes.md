# Sportie API Routes — Complete Reference (55 routes)

---

## GET /
**What it does:** Health check — confirms server is running.
**Request:** No body, no params.
**200:**
```
Server is running!
```

---

## Auth

### POST /api/auth/signup
**What it does:** Registers a new trainer. Hashes password, creates user + trainer rows.
**Request body:**
```json
{ "email": "john@example.com", "password": "secret123" }
```
**201:**
```json
{ "message": "User registered successfully" }
```
**400 (email taken):**
```json
{ "message": "Email already exists" }
```

---

### POST /api/auth/login
**What it does:** Authenticates by email/password, returns trainer profile.
**Request body:**
```json
{ "email": "john@example.com", "password": "secret123" }
```
**200:**
```json
{
  "message": "Login successful",
  "trainer": {
    "trainer_id": 101,
    "name": "John",
    "email": "john@example.com",
    "specialization": "Strength",
    "avatar_color": "#3B82F6",
    "avatar_url": null,
    "units": "metric",
    "notifications_enabled": 1
  }
}
```
**401 (wrong credentials):**
```json
{ "message": "Invalid email or password" }
```
**403 (no trainer profile):**
```json
{ "message": "No trainer profile for this account" }
```

---

## Trainers

### GET /api/trainers
**What it does:** Returns the full list of all trainers.
**Request:** No body, no params.
**200:**
```json
[
  {
    "trainer_id": 101,
    "name": "John",
    "email": "john@example.com",
    "specialization": "Strength",
    "avatar_color": "#3B82F6",
    "avatar_url": null,
    "units": "metric"
  },
  {
    "trainer_id": 102,
    "name": "Sara",
    "email": "sara@example.com",
    "specialization": "Cardio",
    "avatar_color": "#10B981",
    "avatar_url": null,
    "units": "imperial"
  }
]
```

---

### GET /api/trainers/:trainerId
**What it does:** Gets a single trainer by ID.
**Request:** Param trainerId = 101
**200:**
```json
{
  "trainer_id": 101,
  "name": "John",
  "email": "john@example.com",
  "specialization": "Strength",
  "avatar_color": "#3B82F6",
  "avatar_url": null,
  "units": "metric",
  "notifications_enabled": 1,
  "date_of_birth": "1990-05-15",
  "country_code": "+972",
  "phone_number": "0501234567"
}
```
**404:**
```json
{ "message": "Trainer not found" }
```
**400 (invalid ID):**
```json
{ "message": "Invalid trainerId: must be a positive integer" }
```

---

### GET /api/trainers/:trainerId/monthly-activity
**What it does:** Returns how many of the trainer's trainees were active each calendar month.
**Request:** Param trainerId = 101
**200:**
```json
[
  { "month": "2026-04", "active_trainees": 7 },
  { "month": "2026-05", "active_trainees": 9 },
  { "month": "2026-06", "active_trainees": 8 }
]
```
**404:**
```json
{ "message": "Trainer not found" }
```

---

### PUT /api/trainers/:trainerId/profile
**What it does:** Trainer updates their own profile fields.
**Request:** Param trainerId = 101, Body:
```json
{
  "name": "John Updated",
  "email": "john.new@example.com",
  "specialization": "Hypertrophy",
  "avatar_color": "#10B981",
  "avatar_url": null,
  "units": "imperial",
  "notifications_enabled": 1,
  "date_of_birth": "1990-05-15",
  "country_code": "+972",
  "phone_number": "0501234567"
}
```
**200:**
```json
{ "message": "Profile updated" }
```
**404:**
```json
{ "message": "Trainer not found" }
```
**409 (email taken):**
```json
{ "message": "Email already in use" }
```
**413 (avatar too large):**
```json
{ "message": "Avatar exceeds 2MB limit" }
```

---

### DELETE /api/trainers/:trainerId
**What it does:** Deletes trainer and unassigns all their trainees first.
**Request:** Param trainerId = 101
**200:**
```json
{ "message": "Trainer deleted, trainees unassigned" }
```
**404:**
```json
{ "message": "Trainer not found" }
```

---

### POST /api/trainers/:trainerId/trainees
**What it does:** Assigns an existing unassigned trainee to this trainer.
**Request:** Param trainerId = 101, Body:
```json
{ "traineeId": 5 }
```
**200:**
```json
{ "message": "Trainee assigned successfully" }
```
**404:**
```json
{ "message": "Trainer not found" }
```
**409 (already assigned):**
```json
{ "message": "Trainee already assigned to a trainer" }
```

---

### PUT /api/trainers/:trainerId/trainees/:traineeId
**What it does:** Trainer updates one of their managed trainees (status, progress, weight, goal).
**Request:** Params trainerId = 101, traineeId = 1, Body:
```json
{
  "status": "active",
  "progress": 65,
  "goal": "fat loss",
  "start_weight": 90,
  "current_weight": 85
}
```
**200:**
```json
{ "message": "Trainee updated", "changed": 1 }
```
**404:**
```json
{ "message": "Trainee not found under this trainer" }
```

---

### DELETE /api/trainers/:trainerId/trainees/:traineeId
**What it does:** Removes trainee from trainer. Trainee account stays.
**Request:** Params trainerId = 101, traineeId = 1
**200:**
```json
{ "message": "Trainee unassigned" }
```
**404:**
```json
{ "message": "Trainee not found under this trainer" }
```

---

## Trainees

### GET /api/trainees/trainer/:trainerId
**What it does:** Gets all trainees assigned to a specific trainer. Used by the dashboard.
**Request:** Param trainerId = 101
**200:**
```json
[
  {
    "trainee_id": 1,
    "name": "Eliya Danon",
    "email": "eliya@example.com",
    "goal": "fat loss",
    "status": "active",
    "progress": 70,
    "start_weight": 84.4,
    "current_weight": 82,
    "trainer_id": 101
  },
  {
    "trainee_id": 4,
    "name": "Jaimie David",
    "email": "jaimie@example.com",
    "goal": "muscle gain",
    "status": "active",
    "progress": 55,
    "start_weight": 87.4,
    "current_weight": 85,
    "trainer_id": 101
  }
]
```
**404:**
```json
{ "message": "No trainees found for this trainer" }
```

---

### GET /api/trainees/:traineeId
**What it does:** Gets a single trainee by ID.
**Request:** Param traineeId = 1
**200:**
```json
{
  "trainee_id": 1,
  "name": "Eliya Danon",
  "email": "eliya@example.com",
  "goal": "fat loss",
  "status": "active",
  "progress": 70,
  "start_weight": 84.4,
  "current_weight": 82,
  "trainer_id": 101,
  "avatar_color": "#F59E0B",
  "avatar_url": null,
  "date_of_birth": "1998-03-20",
  "country_code": "+972",
  "phone_number": "0521234567"
}
```
**404:**
```json
{ "message": "Trainee not found" }
```

---

### PUT /api/trainees/:traineeId/profile
**What it does:** Trainee updates their own profile. Cannot touch weight/status/progress — those are trainer-only.
**Request:** Param traineeId = 1, Body:
```json
{
  "name": "Eliya D.",
  "email": "eliya.new@example.com",
  "goal": "muscle gain",
  "avatar_color": "#8B5CF6",
  "avatar_url": null,
  "date_of_birth": "1998-03-20",
  "country_code": "+972",
  "phone_number": "0521234567"
}
```
**200:**
```json
{ "message": "Profile updated" }
```
**404:**
```json
{ "message": "Trainee not found" }
```
**409:**
```json
{ "message": "Email already in use" }
```

---

## Exercises

### GET /api/exercises/bodyparts
**What it does:** Returns all body part options for filtering exercises.
**Request:** No params.
**200:**
```json
["back","cardio","chest","lower arms","lower legs","neck","shoulders","upper arms","upper legs","waist"]
```

---

### GET /api/exercises/targets
**What it does:** Returns all target muscle options for filtering.
**Request:** No params.
**200:**
```json
["abs","biceps","calves","delts","glutes","hamstrings","lats","pectorals","quads","traps","triceps","upper back"]
```

---

### GET /api/exercises/equipment
**What it does:** Returns all equipment type options for filtering.
**Request:** No params.
**200:**
```json
["assisted","band","barbell","body weight","cable","dumbbell","ez barbell","kettlebell","leverage machine","olympic barbell","resistance band","rope","smith machine","weighted"]
```

---

### GET /api/exercises/search/:name
**What it does:** Searches exercises by name directly from ExerciseDB API. Supports ?limit= and ?offset=.
**Request:** Param name = bench, Query ?limit=3&offset=0
**200:**
```json
[
  {
    "id": "0026",
    "name": "barbell bench press",
    "bodyPart": "chest",
    "target": "pectorals",
    "equipment": "barbell",
    "gifUrl": "https://v2.exercisedb.io/image/VJHKaNJVQSBgz9",
    "secondaryMuscles": ["triceps", "delts"],
    "instructions": ["Lie flat on a bench...", "Lower the bar to chest level..."]
  }
]
```

---

### GET /api/exercises/:id
**What it does:** Gets a single exercise by its ID.
**Request:** Param id = 0026
**200:**
```json
{
  "id": "0026",
  "name": "barbell bench press",
  "bodyPart": "chest",
  "target": "pectorals",
  "equipment": "barbell",
  "gifUrl": "https://v2.exercisedb.io/image/VJHKaNJVQSBgz9",
  "secondaryMuscles": ["triceps", "delts"],
  "instructions": ["Lie flat on a bench...", "Lower the bar to chest level..."]
}
```
**404:**
```json
{ "message": "Exercise not found" }
```

---

### GET /api/exercises
**What it does:** Gets exercises with filtering. Checks local DB cache first, falls back to ExerciseDB. Supports ?search=, ?bodyPart=, ?target=, ?equipment=, ?limit=, ?offset=.
**Request (search):** ?search=squat&limit=5
**Request (filter):** ?bodyPart=chest&limit=10
**200:**
```json
[
  {
    "id": "0026",
    "name": "barbell bench press",
    "bodyPart": "chest",
    "target": "pectorals",
    "equipment": "barbell",
    "secondaryMuscles": ["triceps", "delts"],
    "instructions": ["Lie flat on a bench..."]
  }
]
```

---

## Meals

### GET /api/meals/search
**What it does:** Searches meals by name from TheMealDB. ?q= is required.
**Request:** ?q=chicken
**200:**
```json
[
  {
    "idMeal": "52772",
    "strMeal": "Chicken Handi",
    "strCategory": "Chicken",
    "strArea": "Indian",
    "strMealThumb": "https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg"
  }
]
```
**400 (missing q):**
```json
{ "message": "Query param \"q\" is required" }
```

---

### GET /api/meals/letter/:letter
**What it does:** Gets all meals whose name starts with the given letter a-z.
**Request:** Param letter = c
**200:**
```json
[
  {
    "idMeal": "52772",
    "strMeal": "Chicken Handi",
    "strCategory": "Chicken",
    "strArea": "Indian",
    "strMealThumb": "https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg"
  }
]
```
**400 (not a single letter):**
```json
{ "message": "Parameter must be a single letter (a-z)" }
```

---

### GET /api/meals/random
**What it does:** Returns one random meal.
**Request:** No params.
**200:**
```json
{
  "idMeal": "53190",
  "strMeal": "Bryndzove Halusky",
  "strCategory": "Pork",
  "strArea": "Slovakia",
  "strMealThumb": "https://www.themealdb.com/images/media/meals/g33c901763365484.jpg",
  "strInstructions": "1. Prepare the Dough...",
  "strIngredient1": "Potatoes",
  "strMeasure1": "500g"
}
```

---

### GET /api/meals/categories
**What it does:** Returns all meal categories with full details.
**Request:** No params.
**200:**
```json
[
  {
    "idCategory": "1",
    "strCategory": "Beef",
    "strCategoryThumb": "https://www.themealdb.com/images/category/beef.png",
    "strCategoryDescription": "Beef is the culinary name for meat from cattle..."
  },
  {
    "idCategory": "2",
    "strCategory": "Chicken",
    "strCategoryThumb": "https://www.themealdb.com/images/category/chicken.png",
    "strCategoryDescription": "Chicken is a type of domesticated fowl..."
  }
]
```

---

### GET /api/meals/category/:category
**What it does:** Gets all meals in a specific category.
**Request:** Param category = beef
**200:**
```json
[
  { "strMeal": "Beef Wellington", "strMealThumb": "https://www.themealdb.com/images/media/meals/vvpprx1487325699.jpg", "idMeal": "52803", "strArea": "British", "strCountry": "United Kingdom" },
  { "strMeal": "Beef Stroganoff", "strMealThumb": "https://www.themealdb.com/images/media/meals/svprys1511176755.jpg", "idMeal": "52834", "strArea": "Russian", "strCountry": "Russia" }
]
```
**404:**
```json
{ "message": "No meals found for this category" }
```

---

### GET /api/meals/area/:area
**What it does:** Gets all meals from a specific cuisine/area.
**Request:** Param area = Canadian
**200:**
```json
[
  { "strMeal": "Poutine", "strMealThumb": "https://www.themealdb.com/images/media/meals/uuyrrx1487327597.jpg", "idMeal": "52804", "strArea": "Canadian", "strCountry": "Canada" },
  { "strMeal": "Montreal Smoked Meat", "strMealThumb": "https://www.themealdb.com/images/media/meals/uttupv1511815050.jpg", "idMeal": "52927", "strArea": "Canadian", "strCountry": "Canada" }
]
```
**404:**
```json
{ "message": "No meals found for this area" }
```

---

### GET /api/meals/ingredient/:ingredient
**What it does:** Gets all meals that use a specific ingredient.
**Request:** Param ingredient = Chicken
**200:**
```json
[
  { "strMeal": "Chicken Handi", "strMealThumb": "https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg", "idMeal": "52772" },
  { "strMeal": "Chicken Basquaise", "strMealThumb": "https://www.themealdb.com/images/media/meals/wruvqv1511880994.jpg", "idMeal": "52934" }
]
```
**404:**
```json
{ "message": "No meals found for this ingredient" }
```

---

### GET /api/meals/list/categories
**What it does:** Returns just category names — lightweight version for dropdowns.
**Request:** No params.
**200:**
```json
[
  { "strCategory": "Beef" },
  { "strCategory": "Chicken" },
  { "strCategory": "Dessert" },
  { "strCategory": "Lamb" }
]
```

---

### GET /api/meals/list/areas
**What it does:** Returns list of cuisine area names for dropdowns.
**Request:** No params.
**200:**
```json
[
  { "strArea": "American" },
  { "strArea": "British" },
  { "strArea": "Canadian" },
  { "strArea": "French" }
]
```

---

### GET /api/meals/list/ingredients
**What it does:** Returns list of ingredients for dropdowns.
**Request:** No params.
**200:**
```json
[
  { "strIngredient": "Chicken" },
  { "strIngredient": "Salmon" },
  { "strIngredient": "Beef" },
  { "strIngredient": "Avocado" }
]
```

---

### GET /api/meals/:id
**What it does:** Gets a single meal by its numeric ID.
**Request:** Param id = 52772
**200:**
```json
{
  "idMeal": "52772",
  "strMeal": "Chicken Handi",
  "strCategory": "Chicken",
  "strArea": "Indian",
  "strMealThumb": "https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg",
  "strInstructions": "Place the chicken in a large bowl...",
  "strIngredient1": "Chicken",
  "strMeasure1": "1kg",
  "strIngredient2": "Onion",
  "strMeasure2": "2 large"
}
```
**404:**
```json
{ "message": "Meal not found" }
```

---

## Plans

### POST /api/plans/generate
**What it does:** Builds a workout plan from goal/preferences without saving. Goal must be strength, hypertrophy, or fat loss.
**Request body:**
```json
{
  "goal": "hypertrophy",
  "daysPerWeek": 3,
  "bodyParts": ["chest", "back", "upper legs"],
  "exercisesPerDay": 4
}
```
**200:**
```json
{
  "goal": "hypertrophy",
  "daysPerWeek": 3,
  "scheme": { "sets": 3, "reps": 10, "restSeconds": 90 },
  "bodyParts": ["chest", "back", "upper legs"],
  "days": [
    {
      "day": 1,
      "focus": ["chest"],
      "exercises": [
        { "id": "0026", "name": "barbell bench press", "bodyPart": "chest", "target": "pectorals", "equipment": "barbell", "sets": 3, "reps": 10, "restSeconds": 90 }
      ]
    },
    {
      "day": 2,
      "focus": ["back"],
      "exercises": [
        { "id": "0017", "name": "assisted pull-up", "bodyPart": "back", "target": "lats", "equipment": "assisted", "sets": 3, "reps": 10, "restSeconds": 90 }
      ]
    }
  ]
}
```
**400 (bad goal):**
```json
{ "message": "Unknown goal \"cardio\". Use: strength, hypertrophy, fat loss" }
```

---

### POST /api/plans/save
**What it does:** Saves a generated plan to the database for a specific trainee.
**Request body:**
```json
{
  "traineeId": 1,
  "goal": "hypertrophy",
  "daysPerWeek": 3,
  "days": [
    {
      "dayNumber": 1,
      "exercises": [
        { "id": "0026", "name": "barbell bench press", "bodyPart": "chest", "target": "pectorals", "equipment": "barbell", "sets": 3, "reps": 10, "restSeconds": 90 }
      ]
    },
    {
      "dayNumber": 2,
      "exercises": []
    }
  ]
}
```
**201:**
```json
{ "success": true, "message": "Training plan saved successfully", "planId": 42 }
```
**404:**
```json
{ "message": "Trainee not found" }
```

---

### GET /api/plans/active/:traineeId
**What it does:** Gets the trainee's currently active workout plan with all days and exercises.
**Request:** Param traineeId = 1
**200:**
```json
{
  "planId": 42,
  "goal": "hypertrophy",
  "daysPerWeek": 3,
  "createdAt": "2026-06-10T08:00:00.000Z",
  "days": [
    {
      "dayNumber": 1,
      "exercises": [
        { "id": "0026", "name": "barbell bench press", "sets": 3, "reps": 10, "restSeconds": 90 }
      ]
    },
    { "dayNumber": 2, "exercises": [] },
    { "dayNumber": 3, "exercises": [] }
  ]
}
```
**404:**
```json
{ "message": "No active plan found for this trainee" }
```

---

### GET /api/plans/:planId
**What it does:** Gets any plan by its ID (not just active ones).
**Request:** Param planId = 42
**200:**
```json
{
  "planId": 42,
  "goal": "hypertrophy",
  "daysPerWeek": 3,
  "createdAt": "2026-06-10T08:00:00.000Z",
  "days": [
    {
      "dayNumber": 1,
      "exercises": [
        { "id": "0026", "name": "barbell bench press", "sets": 3, "reps": 10, "restSeconds": 90 }
      ]
    }
  ]
}
```
**404:**
```json
{ "message": "Plan not found" }
```

---

### PUT /api/plans/:planId
**What it does:** Replaces an existing plan's goal, daysPerWeek, and all exercises.
**Request:** Param planId = 42, Body:
```json
{
  "goal": "strength",
  "daysPerWeek": 4,
  "days": [
    {
      "dayNumber": 1,
      "exercises": [
        { "id": "0026", "name": "barbell bench press", "bodyPart": "chest", "target": "pectorals", "equipment": "barbell", "sets": 4, "reps": 5, "restSeconds": 180 }
      ]
    }
  ]
}
```
**200:**
```json
{ "success": true, "message": "Training plan updated successfully" }
```
**404:**
```json
{ "message": "Plan not found" }
```

---

### GET /api/plans/meal-plan/:traineeId
**What it does:** Gets the trainee's active meal plan with all slots, options, and calculated day-total macros.
**Request:** Param traineeId = 1
**200:**
```json
{
  "meal_plan_id": 10,
  "name": "My Cutting Plan",
  "created_at": "2026-06-01T00:00:00.000Z",
  "total_calories": 1850.5,
  "total_protein": 145.0,
  "total_carbs": 210.0,
  "total_fat": 55.0,
  "slots": [
    {
      "slot_index": 0,
      "label": "Breakfast",
      "options": [
        {
          "name": "Oats",
          "thumb": null,
          "notes": null,
          "quantity": 100,
          "unit": "g",
          "calories_per_100": 389,
          "protein_per_100": 17,
          "carbs_per_100": 66,
          "fat_per_100": 7
        }
      ]
    },
    {
      "slot_index": 1,
      "label": "Lunch",
      "options": [
        {
          "name": "Chicken Handi",
          "thumb": "https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg",
          "notes": "high protein",
          "quantity": 300,
          "unit": "g",
          "calories_per_100": 165,
          "protein_per_100": 31,
          "carbs_per_100": 0,
          "fat_per_100": 3.6
        }
      ]
    }
  ]
}
```
**404:**
```json
{ "message": "No active meal plan for this trainee" }
```

---

### PUT /api/plans/meal-plan/:planId
**What it does:** Updates a meal plan's name, slots, and options. Macros are recalculated automatically.
**Request:** Param planId = 10, Body:
```json
{
  "name": "Updated Cutting Plan",
  "slots": [
    {
      "label": "Breakfast",
      "options": [
        {
          "name": "Egg Whites",
          "quantity": 150,
          "unit": "g",
          "calories_per_100": 52,
          "protein_per_100": 11,
          "carbs_per_100": 1,
          "fat_per_100": 0
        }
      ]
    }
  ]
}
```
**200:**
```json
{ "success": true, "message": "Meal plan updated successfully" }
```
**404:**
```json
{ "message": "Meal plan not found" }
```

---

## Templates — Workout

### GET /api/templates/workout
**What it does:** Lists all workout templates for a trainer. ?trainerId= is required.
**Request:** ?trainerId=101
**200:**
```json
[
  {
    "template_id": 3,
    "name": "Push Pull Legs",
    "mode": "day-specific",
    "goal": "hypertrophy",
    "days": [
      {
        "block_index": 1,
        "label": "Day 1",
        "block_type": "workout",
        "notes": null,
        "exercises": [
          { "exercise_id": null, "custom_exercise_name": "Bench Press", "sets": 3, "reps": 10, "rest_seconds": 90 }
        ]
      }
    ]
  }
]
```
**400 (missing trainerId):**
```json
{ "message": "Query \"trainerId\" is required" }
```

---

### POST /api/templates/workout
**What it does:** Saves a new workout template. Cap is 10 per trainer.
**Request body:**
```json
{
  "trainerId": 101,
  "name": "Push Pull Legs",
  "mode": "day-specific",
  "goal": "muscle_gain",
  "blocks": [
    {
      "index": 1,
      "label": "Day 1 - Push",
      "type": "workout",
      "notes": "Chest & triceps",
      "exercises": [
        { "name": "Bench Press", "sets": 4, "reps": 8, "rest": 90 },
        { "name": "Triceps Pushdown", "sets": 3, "reps": 12, "rest": 60 }
      ]
    }
  ]
}
```
**201:**
```json
{ "success": true, "templateId": 180004 }
```
**409 (cap reached):**
```json
{ "message": "Template limit reached (max 10)" }
```

---

### PUT /api/templates/workout/:id
**What it does:** Edits a workout template in-place, replacing all blocks and exercises.
**Request:** Param id = 120001, Body:
```json
{
  "name": "Push Pull Legs (v2)",
  "mode": "day-specific",
  "goal": "strength",
  "blocks": [
    {
      "index": 1,
      "label": "Day 1 - Push",
      "type": "workout",
      "notes": "",
      "exercises": [
        { "name": "Incline Bench Press", "sets": 4, "reps": 6, "rest": 120 }
      ]
    }
  ]
}
```
**200:**
```json
{ "success": true, "templateId": 120001 }
```
**404:**
```json
{ "message": "Template not found" }
```

---

### DELETE /api/templates/workout/:id
**What it does:** Deletes a workout template. Cascades to all its blocks and exercises.
**Request:** Param id = 3
**200:**
```json
{ "success": true }
```
**404:**
```json
{ "message": "Workout template not found" }
```

---

### POST /api/templates/workout/:id/assign
**What it does:** Assigns a workout template to a trainee as their new active plan.
**Request:** Param id = 180004, Body:
```json
{ "traineeId": 1 }
```
**201:**
```json
{ "success": true, "planId": 390001 }
```
**404:**
```json
{ "message": "Workout template not found" }
```

---

## Templates — Meal

### GET /api/templates/meal
**What it does:** Lists all meal templates for a trainer. ?trainerId= is required.
**Request:** ?trainerId=101
**200:**
```json
[
  {
    "template_id": 30001,
    "name": "Cutting Plan",
    "slots": [
      {
        "slot_index": 0,
        "slot_label": "Breakfast",
        "options": [
          { "mealdb_id": null, "meal_name": "Oats", "quantity": "100.00", "unit": "g", "calories_per_100": "389.00", "protein_per_100": "17.00", "carbs_per_100": "66.00", "fat_per_100": "7.00" }
        ]
      },
      {
        "slot_index": 1,
        "slot_label": "Lunch",
        "options": [
          { "mealdb_id": "52772", "meal_name": "Chicken Handi", "meal_thumb": "https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg", "quantity": "100.00", "unit": "g", "calories_per_100": "0.00", "protein_per_100": "0.00", "carbs_per_100": "0.00", "fat_per_100": "0.00" }
        ]
      }
    ]
  }
]
```
**400 (missing trainerId):**
```json
{ "message": "Query \"trainerId\" is required" }
```

---

### POST /api/templates/meal
**What it does:** Saves a new meal template. Cap is 5 per trainer.
**Request body:**
```json
{
  "trainerId": 102,
  "name": "Cutting Plan",
  "slots": [
    {
      "label": "Breakfast",
      "options": [
        {
          "mealId": "52772",
          "name": "Oatmeal with Banana",
          "thumb": "https://www.themealdb.com/images/media/meals/xxxx.jpg",
          "notes": "no sugar",
          "quantity": 100,
          "unit": "g",
          "per100g": { "calories": 150, "protein": 5, "carbs": 27, "fat": 3, "sugar": 1, "fiber": 4 }
        }
      ]
    },
    { "label": "Lunch", "options": [] }
  ]
}
```
**201:**
```json
{ "success": true, "templateId": 60001 }
```
**404 (trainer not found):**
```json
{ "message": "Trainer not found" }
```

---

### PUT /api/templates/meal/:id
**What it does:** Edits a meal template in-place, replacing all slots and options.
**Request:** Param id = 30001, Body:
```json
{
  "name": "Cutting Plan (v2)",
  "slots": [
    {
      "label": "Breakfast",
      "options": [
        {
          "mealId": "52772",
          "name": "Egg Whites",
          "quantity": 150,
          "unit": "g",
          "per100g": { "calories": 52, "protein": 11, "carbs": 1, "fat": 0, "sugar": 1, "fiber": 0 }
        }
      ]
    }
  ]
}
```
**200:**
```json
{ "success": true, "templateId": 30001 }
```
**404:**
```json
{ "message": "Template not found" }
```

---

### DELETE /api/templates/meal/:id
**What it does:** Deletes a meal template. Cascades to all slots and options.
**Request:** Param id = 60001
**200:**
```json
{ "success": true }
```
**404:**
```json
{ "message": "Meal template not found" }
```

---

### POST /api/templates/meal/:id/assign
**What it does:** Assigns a meal template to a trainee as their new active meal plan. Trainee must be managed by the template's trainer.
**Request:** Param id = 60001, Body:
```json
{ "traineeId": 6 }
```
**201:**
```json
{ "success": true, "mealPlanId": 120001 }
```
**403 (trainee not under trainer):**
```json
{ "message": "Trainee is not managed by this template's trainer" }
```
**404:**
```json
{ "message": "Meal template not found" }
```

---

## Analytics

### GET /api/analytics/workouts-this-week/:trainerId
**What it does:** Total completed workouts this week (Sun-Sat) across all the trainer's trainees. Used as a dashboard tile.
**Request:** Param trainerId = 101
**200:**
```json
{ "workouts_this_week": 23 }
```
**404:**
```json
{ "message": "Trainer not found" }
```

---

### GET /api/analytics/at-risk/:trainerId
**What it does:** Lists trainees who haven't trained recently so the trainer can follow up.
**Request:** Param trainerId = 101
**200:**
```json
[
  { "trainee_id": 12, "name": "Lior Maman",  "last_completed_at": "2026-06-02 15:55:00", "days_since": 21 },
  { "trainee_id": 15, "name": "Niv Biton",   "last_completed_at": "2026-06-03 15:31:00", "days_since": 20 },
  { "trainee_id": 14, "name": "Omer Peretz", "last_completed_at": "2026-06-13 15:26:00", "days_since": 10 }
]
```
**404:**
```json
{ "message": "Trainer not found" }
```

---

### GET /api/analytics/attendance-distribution/:trainerId
**What it does:** Buckets the trainer's trainees by attendance rate over a 4-week window (<50%, 50-80%, 80+%).
**Request:** Param trainerId = 101
**200:**
```json
{
  "window_weeks": 4,
  "buckets": { "<50": 4, "50-80": 2, "80+": 3 },
  "trainees_without_plan": 0,
  "total_trainees": 9
}
```
**404:**
```json
{ "message": "Trainer not found" }
```

---

### GET /api/analytics/leaderboard/:trainerId
**What it does:** Ranks the trainer's trainees by body_weight or strength. Default is body_weight, use ?metric=strength to switch.
**Request:** Param trainerId = 101, Query ?metric=body_weight
**200:**
```json
{
  "metric": "body_weight",
  "ranking": [
    { "rank": 1, "trainee_id": 11, "name": "Daniel Bar",   "start_value": 95.4, "latest_value": 93, "pct_change": -2.52 },
    { "rank": 2, "trainee_id": 10, "name": "Noam Azulay",  "start_value": 90.4, "latest_value": 88, "pct_change": -2.65 },
    { "rank": 3, "trainee_id": 4,  "name": "Jaimie David", "start_value": 87.4, "latest_value": 85, "pct_change": -2.75 }
  ]
}
```
**404:**
```json
{ "message": "Trainer not found" }
```

---

### GET /api/analytics/volume-over-time/:trainerId
**What it does:** Total training volume (sets x reps x weight) per week — used for trend charts.
**Request:** Param trainerId = 101
**200:**
```json
[
  { "week": "2026-W22", "total_volume": 139763.5 },
  { "week": "2026-W23", "total_volume": 157999 },
  { "week": "2026-W24", "total_volume": 164749 },
  { "week": "2026-W25", "total_volume": 67008 }
]
```
**404:**
```json
{ "message": "Trainer not found" }
```

---

### GET /api/analytics/engagement-heatmap/:trainerId
**What it does:** Heatmap grid — rows are trainees, columns are weeks, values are workout counts per cell.
**Request:** Param trainerId = 101
**200:**
```json
{
  "weeks": ["2026-W22", "2026-W23", "2026-W24", "2026-W25"],
  "rows": [
    { "trainee_id": 1,  "name": "Eliya Danon",  "counts": [4, 3, 6, 1] },
    { "trainee_id": 4,  "name": "Jaimie David", "counts": [6, 4, 4, 2] },
    { "trainee_id": 5,  "name": "Roee Tohar",   "counts": [0, 0, 2, 1] },
    { "trainee_id": 10, "name": "Noam Azulay",  "counts": [1, 4, 4, 1] }
  ]
}
```
**404:**
```json
{ "message": "Trainer not found" }
```

---

### GET /api/analytics/trainee-weekly-activity/:traineeId
**What it does:** Returns completed session counts per day for the last 30 days for a single trainee. Used to populate the monthly activity bar chart on the trainee profile page.
**Request:** Param traineeId = 1
**200:**
```json
[
  { "day": "Mon", "date": "2026-05-28", "sessions": 0 },
  { "day": "Tue", "date": "2026-05-29", "sessions": 1 },
  { "day": "Wed", "date": "2026-05-30", "sessions": 0 },
  { "day": "Thu", "date": "2026-05-31", "sessions": 2 },
  { "day": "Fri", "date": "2026-06-01", "sessions": 0 }
]
```
**404:**
```json
{ "message": "Trainee not found" }
```
**400 (invalid ID):**
```json
{ "message": "Invalid traineeId: must be a positive integer" }
```

---

### GET /api/analytics/trainee-recent-sessions/:traineeId
**What it does:** Returns all completed sessions for a single trainee within the last 30 days, ordered newest first. Includes set count and total volume (weight × reps) per session. Used for the Recent Activity list on the trainee profile page.
**Request:** Param traineeId = 1
**200:**
```json
[
  { "session_id": 201, "performed_at": "2026-06-25T10:30:00.000Z", "set_count": 14, "total_volume": 10085 },
  { "session_id": 198, "performed_at": "2026-06-22T09:15:00.000Z", "set_count": 11, "total_volume": 6279 },
  { "session_id": 195, "performed_at": "2026-06-19T11:00:00.000Z", "set_count": 9,  "total_volume": 6325.5 }
]
```
**404:**
```json
{ "message": "Trainee not found" }
```
**400 (invalid ID):**
```json
{ "message": "Invalid traineeId: must be a positive integer" }
```

---

## Users

### PUT /api/users/:userId/password
**What it does:** Changes a user's password after verifying the current one.
**Request:** Param userId = 102, Body:
```json
{
  "currentPassword": "trainer102",
  "newPassword": "trainer201",
  "confirmNewPassword": "trainer201"
}
```
**200:**
```json
{ "message": "Password changed successfully" }
```
**401 (wrong current password):**
```json
{ "message": "Current password is incorrect" }
```
**404:**
```json
{ "message": "User not found" }
```
