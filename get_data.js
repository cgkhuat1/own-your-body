require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: exercises, error } = await supabase
    .from('workout_exercises')
    .select('id, workout_id, order_index, group_code, exercises(name), workouts(week_number)')
    .order('order_index');
    
  if (error) {
    console.error("Fetch error:", error);
    return;
  }
  
  // Just print all exercises, grouped by name to find SMC and Seated Row
  const filtered = exercises.filter(ex => 
    ex.exercises && (ex.exercises.name.includes('Seated Row') || ex.exercises.name.includes('Slow'))
  );
  console.log(JSON.stringify(filtered, null, 2));
}
run();
