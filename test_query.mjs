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

async function test() {
    const workoutId = '103582e5-dece-4650-a047-85408584861b';
    const { data: wExercises, error } = await supabase
        .from('workout_exercises')
        .select('id, order_index, group_code, custom_name, target_sets, target_reps, target_rpe, exercise_id, exercises(name, youtube_id)')
        .eq('workout_id', workoutId)
        .order('order_index', { ascending: true });
        
    console.log("Error:", error);
    console.log("Data:", JSON.stringify(wExercises, null, 2));
}
test();
