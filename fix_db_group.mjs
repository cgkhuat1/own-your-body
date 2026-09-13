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

async function fix() {
   // Assuming workout_exercises has custom_name and group_code columns now
   const { data, error } = await supabase.from('workout_exercises').select('id, exercises(name)').order('order_index', { ascending: true });
   if (error) return console.log("DB error, maybe columns don't exist yet?", error);
   
   if (data) {
       for (const item of data) {
           let code = '1';
           if (item.exercises?.name === 'Barbell Bench Press') code = '1';
           if (item.exercises?.name === 'Incline DB Press') code = '2A';
           if (item.exercises?.name === 'Dumbbell Flyes') code = '2B';
           if (item.exercises?.name === 'Triceps Pushdown') code = '3';
           
           await supabase.from('workout_exercises').update({ group_code: code }).eq('id', item.id);
       }
       console.log("Updated groups in DB");
   }
}
fix();
