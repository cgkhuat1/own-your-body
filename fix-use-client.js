const fs = require('fs');

let content = fs.readFileSync('src/app/coach/page.tsx', 'utf8');

// Remove all instances of "use client";
content = content.replace(/"use client";\n?/g, '');
content = content.replace(/'use client';\n?/g, '');

// Prepend it to the very top
content = '"use client";\n' + content;

fs.writeFileSync('src/app/coach/page.tsx', content);
console.log('Fixed use client directive');
