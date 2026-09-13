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
   // Get all workouts for Week 1
   const { data: workouts } = await supabase.from('workouts').select('id, name, order_index').eq('week_number', 1);
   const w1 = workouts.find(w => w.order_index === 1);
   const w2 = workouts.find(w => w.order_index === 2);
   const w3 = workouts.find(w => w.order_index === 3);

   // Get exercises for w1
   const { data: exercises } = await supabase.from('workout_exercises').select('*').eq('workout_id', w1.id);
   
   // Insert for w2 and w3 if they don't have exercises
   for (const targetW of [w2, w3]) {
       const { data: existing } = await supabase.from('workout_exercises').select('id').eq('workout_id', targetW.id);
       if (existing && existing.length === 0) {
           const newExs = exercises.map(ex => {
               const { id, workout_id, ...rest } = ex;
               return { ...rest, workout_id: targetW.id };
           });
           await supabase.from('workout_exercises').insert(newExs);
           console.log(`Cloned exercises to ${targetW.name}`);
       }
   }
}
fix();
