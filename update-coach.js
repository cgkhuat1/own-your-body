const fs = require('fs');

let content = fs.readFileSync('src/app/coach/page.tsx', 'utf8');

// Add imports
if (!content.includes('import { LineChart')) {
    content = content.replace("import { Trash2, TrendingUp,", "import { Trash2, TrendingUp, Activity,\n  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'lucide-react';\nimport dayjs from 'dayjs';\n// We will import recharts manually below");
    
    // Fix imports logic properly:
    content = content.replace("import dayjs from 'dayjs';", "import dayjs from 'dayjs';\nimport { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';");
    
    // The previous replace for lucide might have added recharts stuff into lucide-react. Let's fix that.
    content = content.replace("import { Trash2, TrendingUp, Activity,\n  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'lucide-react';", "import { Trash2, TrendingUp, Activity } from 'lucide-react';");
}

fs.writeFileSync('src/app/coach/page.tsx', content);
console.log('Updated imports in Coach');
