import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].replace(/['"]/g, '') : null;
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
   console.log("Altering schema to support custom exercise names & superset grouping...");
   await supabase.rpc('execute_sql', { sql_string: "ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS custom_name TEXT; ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS group_code TEXT DEFAULT '1';" });
   
   // Workaround since we can't easily run alter table via anon key without postgres RPC (which might not exist)
   // Actually let's just insert into 'exercises' first.
   
   const { data: e1 } = await supabase.from('exercises').insert({ name: 'Barbell Bench Press', youtube_id: 'rxD321l2svE' }).select().single();
   const { data: e2 } = await supabase.from('exercises').insert({ name: 'Incline DB Press' }).select().single();
   const { data: e3 } = await supabase.from('exercises').insert({ name: 'Dumbbell Flyes' }).select().single();
   const { data: e4 } = await supabase.from('exercises').insert({ name: 'Triceps Pushdown' }).select().single();

   console.log("Fetching users...");
   const { data: clientUser } = await supabase.from('users').select('id').eq('email', 'tuan@client.com').single();
   const { data: coachUser } = await supabase.from('users').select('id').eq('email', 'coach@ck.com').single();

   console.log("Inserting Program...");
   const { data: program } = await supabase.from('programs').insert({
      pt_id: coachUser.id,
      client_id: clientUser.id,
      name: "Xây dựng nền tảng",
      start_date: new Date().toISOString().split('T')[0]
   }).select().single();

   console.log("Inserting Block...");
   const { data: block } = await supabase.from('blocks').insert({
      program_id: program.id,
      name: "Phase 1: Thích nghi (Tuần 1-4)",
      order_index: 1
   }).select().single();

   console.log("Inserting Workouts...");
   const { data: w1 } = await supabase.from('workouts').insert({
      block_id: block.id,
      name: "Buổi 1 - Thân Trên",
      week_number: 1,
      order_index: 1
   }).select().single();

   const { data: w2 } = await supabase.from('workouts').insert({
      block_id: block.id,
      name: "Buổi 2 - Thân Dưới",
      week_number: 1,
      order_index: 2
   }).select().single();
   
   // Week 2 pending
   const { data: w3 } = await supabase.from('workouts').insert({
      block_id: block.id,
      name: "Buổi 1 - Thân Trên",
      week_number: 2,
      order_index: 1
   }).select().single();

   console.log("Inserting Exercises for W1-D1...");
   // Using order_index to simulate grouping for now, or just rely on the UI formatting
   await supabase.from('workout_exercises').insert([
      { workout_id: w1.id, exercise_id: e1.id, order_index: 1, target_sets: 3, target_reps: "8-10", target_rpe: "7" },
      { workout_id: w1.id, exercise_id: e2.id, order_index: 2, target_sets: 3, target_reps: "10-12", target_rpe: "8" },
      { workout_id: w1.id, exercise_id: e3.id, order_index: 3, target_sets: 3, target_reps: "12-15", target_rpe: "8" },
      { workout_id: w1.id, exercise_id: e4.id, order_index: 4, target_sets: 4, target_reps: "12-15", target_rpe: "9" },
   ]);

   console.log("SUCCESS!");
}
seed().catch(console.error);
