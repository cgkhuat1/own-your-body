import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].replace(/['"]/g, '') : null;
};

const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'));

async function check() {
   const { data: workouts } = await supabase.from('workouts').select('id, name, week_number').order('week_number', { ascending: true });
   console.log("Workouts:", workouts.length);
   
   if (workouts.length > 0) {
       for (const w of workouts) {
           const { data: ex } = await supabase.from('workout_exercises').select('*').eq('workout_id', w.id);
           console.log(`Workout [${w.name}] (Tuần ${w.week_number}) - ID: ${w.id} -> Exercises: ${ex ? ex.length : 'error/null'}`);
       }
   }
}
check();
