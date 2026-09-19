const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/Users/macbook/Documents/ck-coaching/.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('client_profiles').select('*');
  if (error) console.error(error);
  console.log(data);
}
run();
