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
   console.log("Updating group_code...");
   await supabase.from('workout_exercises').update({ group_code: '1' }).eq('order_index', 1);
   await supabase.from('workout_exercises').update({ group_code: '2A' }).eq('order_index', 2);
   await supabase.from('workout_exercises').update({ group_code: '2B' }).eq('order_index', 3);
   await supabase.from('workout_exercises').update({ group_code: '3' }).eq('order_index', 4);
   
   const { data } = await supabase.from('workout_exercises').select('id, group_code, order_index');
   console.log("Verified:", data);
}
fix();
