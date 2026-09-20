const fs = require('fs');
let content = fs.readFileSync('src/app/coach/page.tsx', 'utf8');

// The modal relies on `client.full_name`. The list uses `client.name`. Let's ensure chartClient has a name.
content = content.replace('{chartClient.full_name}', '{chartClient.name || chartClient.full_name}');
// Change grid-cols-3 to grid-cols-4
content = content.replace('grid-cols-3 gap-2 mt-4 pt-4 border-t border-brand-line/50', 'grid-cols-4 gap-2 mt-4 pt-4 border-t border-brand-line/50');

// Add the weight chart button inside the grid
const weightButton = `
                <button 
                  onClick={() => openChartModal(client)}
                  className="text-center py-2 text-xs font-bold text-brand-sage bg-brand-paper hover:bg-brand-sand/30 border border-brand-line rounded-lg transition-colors flex flex-col items-center justify-center gap-1"
                >
                  <TrendingUp size={16} /> Cân nặng
                </button>
`;
content = content.replace('<Link \n                  href={`/coach/clients/${client.id}`}', weightButton + '                <Link \n                  href={`/coach/clients/${client.id}`}');

fs.writeFileSync('src/app/coach/page.tsx', content);
console.log('Fixed coach button');
