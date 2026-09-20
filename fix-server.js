const fs = require('fs');

let content = fs.readFileSync('src/utils/supabase/server.ts', 'utf8');

content = content.replace(/cookieStore\.get/g, '(await cookieStore).get');
content = content.replace(/cookieStore\.set/g, '(await cookieStore).set');

fs.writeFileSync('src/utils/supabase/server.ts', content);
console.log('Fixed supabase server cookies');
