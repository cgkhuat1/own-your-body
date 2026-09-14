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
    const { data: program } = await supabase.from('programs').select(`
        id, client:users!client_id (id, full_name, email),
        blocks (
            id, name,
            workouts (
                id, name, week_number, order_index, is_completed,
                workout_exercises (
                    id, order_index, group_code, target_sets, target_reps, target_rpe, custom_name,
                    exercises(name),
                    workout_logs (
                        set_number, weight, reps, rpe
                    )
                )
            )
        )
    `).limit(1).single();
    
    console.log(JSON.stringify(program, null, 2));
}
test();
