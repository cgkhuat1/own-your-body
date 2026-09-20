require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: exercises, error } = await supabase
    .from('workout_exercises')
    .select('id, workout_id, order_index, group_code, custom_name, exercises(name), workouts(week_number, name)')
    .order('order_index');
  
  if (error) { console.error(error); return; }
  console.log(JSON.stringify(exercises, null, 2));
}
run();
