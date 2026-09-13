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

async function fixNames() {
   await supabase.from('users').update({ full_name: 'Tuấn Anh' }).eq('email', 'tuan@client.com');
   await supabase.from('users').update({ full_name: 'Coach CK' }).eq('email', 'coach@ck.com');
   console.log("Updated full_name in database!");
}
fixNames();
