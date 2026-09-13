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
   // get block_id from w1
   const { data: w1 } = await supabase.from('workouts').select('block_id').eq('week_number', 1).limit(1).single();
   if (!w1) return console.error("No block found");

   await supabase.from('workouts').insert({
      block_id: w1.block_id,
      name: "Buổi 3 - Full Body",
      week_number: 1,
      order_index: 3
   });
   console.log("Inserted Buổi 3");
}
fix();
