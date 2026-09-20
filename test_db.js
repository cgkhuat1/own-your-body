require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  // Let's find workout_exercises that have duplicates in order_index for the same workout_id
  const { data: exercises, error } = await supabase
    .from('workout_exercises')
    .select('id, workout_id, order_index, exercises(name)');
    
  if (error) {
    console.error("Fetch error:", error);
    return;
  }
  
  // Group by workout_id + order_index
  const groups = {};
  exercises.forEach(ex => {
    if (!ex.workout_id || ex.order_index == null) return;
    const key = `${ex.workout_id}_${ex.order_index}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(ex);
  });
  
  const duplicates = Object.values(groups).filter(g => g.length > 1);
  console.log(`Found ${duplicates.length} duplicate groups.`);
  
  if (duplicates.length > 0) {
     console.log("First duplicate group:", JSON.stringify(duplicates[0], null, 2));
     
     // Let's try to delete one of them to see what the error is!
     const idToDelete = duplicates[0][0].id;
     console.log("Attempting to delete ID:", idToDelete);
     
     const logRes = await supabase.from('workout_logs').delete().eq('workout_exercise_id', idToDelete);
     console.log("Log delete result:", logRes.error || "Success");
     
     const exRes = await supabase.from('workout_exercises').delete().eq('id', idToDelete);
     console.log("Ex delete result:", exRes.error || "Success");
  }
}
run();
