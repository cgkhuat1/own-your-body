const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/Users/macbook/Documents/ck-coaching/.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data } = await supabase.from('client_profiles').select('*');
  console.log(data);
}
run();
