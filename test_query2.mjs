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
    const { data, error } = await supabase.from('programs').select(`
        id,
        blocks (
            workouts (
                id, is_completed,
                workout_exercises (
                    id, target_sets,
                    workout_logs (id)
                )
            )
        )
    `).limit(1).single();
    console.log(error || JSON.stringify(data.blocks[0].workouts[0], null, 2));
}
test();
