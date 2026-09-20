const fs = require('fs');

let profile = fs.readFileSync('src/app/profile/page.tsx', 'utf8');
profile = profile.replace(/\[\'dataMin - 3\', \'dataMax \+ 3\'\]/g, "['auto', 'auto']");
profile = profile.replace(/yDomain \= data\?\.yDomain \|\| \[0, \'auto\'\];/g, "yDomain: any[] = data?.yDomain || ['auto', 'auto'];");
fs.writeFileSync('src/app/profile/page.tsx', profile);

let coach = fs.readFileSync('src/app/coach/page.tsx', 'utf8');
// coach already uses ['auto', 'auto'] from my previous patch. Let's just ensure no 'dataMin - 3' exists.
coach = coach.replace(/\[\'dataMin - 3\', \'dataMax \+ 3\'\]/g, "['auto', 'auto']");
fs.writeFileSync('src/app/coach/page.tsx', coach);

console.log('Fixed yDomain types');
