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
    const { data: pt } = await supabase.from('users').select('id').eq('email', 'coach@ck.com').single();
    
    const { data, error } = await supabase.from('programs').select(`
        id, name,
        client:users!client_id (id, full_name, email),
        blocks (
            workouts (id, week_number, is_completed)
        )
    `).eq('pt_id', pt.id);
    
    console.log(error || JSON.stringify(data, null, 2));
}
test();
