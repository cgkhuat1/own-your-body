require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  // Let's just create a collision and see the exact error from Supabase
  // Fetch two exercises from the same workout
  const { data: exercises, error } = await supabase
    .from('workout_exercises')
    .select('id, workout_id, order_index')
    .limit(2);
    
  if (exercises && exercises.length >= 2) {
    const ex1 = exercises[0];
    const ex2 = exercises[1];
    
    // Attempt to set ex1's order_index to ex2's order_index
    const { error: updateErr } = await supabase
      .from('workout_exercises')
      .update({ order_index: ex2.order_index })
      .eq('id', ex1.id);
      
    console.log("Update Error:", updateErr);
  }
}
run();
