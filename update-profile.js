const fs = require('fs');

let content = fs.readFileSync('src/app/profile/page.tsx', 'utf8');

// Add imports
if (!content.includes('import dayjs')) {
    content = content.replace("import { supabase }", "import dayjs from 'dayjs';\nimport { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';\nimport { supabase }");
}

// Replace fetcher
const oldFetcherMatch = content.match(/const fetcher = async \(\) => \{[\s\S]*?return \{ user: userRes\.data, profile: profileRes\.data \};\n  \};/);

const newFetcher = `const fetcher = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = "/login";
      return null;
    }
    const userId = session.user.id;
    const [userRes, profileRes, metricsRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).single(),
      supabase.from('client_profiles').select('*').eq('id', userId).single(),
      supabase.from('daily_metrics').select('date, weight').eq('client_id', userId).gt('weight', 0).order('date', { ascending: true })
    ]);
    
    const profile = profileRes.data;
    const metrics = metricsRes.data || [];
    
    let chartData = [];
    let minWeight = Infinity;
    let maxWeight = -Infinity;
    
    if (profile?.coaching_start_date && metrics.length > 0) {
      const start = dayjs(profile.coaching_start_date).startOf('day');
      const weeksMap = {};
      
      metrics.forEach(m => {
        const mDate = dayjs(m.date).startOf('day');
        if (mDate.isBefore(start)) return;
        const wIndex = Math.floor(mDate.diff(start, 'day') / 7) + 1;
        if (!weeksMap[wIndex]) weeksMap[wIndex] = [];
        weeksMap[wIndex].push(m.weight);
        
        if (m.weight < minWeight) minWeight = m.weight;
        if (m.weight > maxWeight) maxWeight = m.weight;
      });
      
      chartData = Object.keys(weeksMap).sort((a,b) => parseInt(a) - parseInt(b)).map(weekNum => {
        const arr = weeksMap[parseInt(weekNum)];
        const avg = arr.reduce((a,b) => a+b, 0) / arr.length;
        return {
          name: \`Tuần \${weekNum}\`,
          weight: parseFloat(avg.toFixed(1))
        };
      });
    }
    
    return { 
      user: userRes.data, 
      profile, 
      chartData,
      yDomain: minWeight !== Infinity ? [Math.max(0, Math.floor(minWeight - 3)), Math.ceil(maxWeight + 3)] : ['dataMin - 3', 'dataMax + 3']
    };
  };`;

content = content.replace(oldFetcherMatch[0], newFetcher);

// Add chartData and yDomain extraction
content = content.replace("const profile = data?.profile;", "const profile = data?.profile;\n  const chartData = data?.chartData || [];\n  const yDomain = data?.yDomain || [0, 'auto'];");

// Find a good place to insert the chart UI. Probably before the <ClientNav /> or at the bottom of the content.
// Looking for the main content area... let's insert it right after the Settings section or similar.
const chartUI = `
        {/* Biểu đồ cân nặng */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-brand-line/50 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="text-brand-moss" size={20} />
            <h3 className="font-bold text-brand-moss text-lg">Cân nặng Trung bình tuần</h3>
          </div>
          {chartData.length > 0 ? (
            <div className="h-[250px] w-full mt-4 -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                  <YAxis domain={yDomain} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', fontWeight: 'bold', color: '#1C2E20' }}
                    itemStyle={{ color: '#1C2E20' }}
                    formatter={(value) => [\`\${value} kg\`, 'Trung bình']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="#1C2E20" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#1C2E20', strokeWidth: 2, stroke: '#FFF' }}
                    activeDot={{ r: 6, fill: '#1C2E20', strokeWidth: 2, stroke: '#FFF' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="p-8 text-center text-brand-moss/50 bg-brand-paper/50 rounded-xl font-semibold border border-dashed border-brand-line">
              Chưa có đủ dữ liệu cân nặng để vẽ biểu đồ.
            </div>
          )}
        </div>
`;

// Insert chartUI before the logout button block
content = content.replace('<div className="bg-white p-5 rounded-2xl shadow-sm border border-brand-line/50 space-y-4">', chartUI + '\n        <div className="bg-white p-5 rounded-2xl shadow-sm border border-brand-line/50 space-y-4">');

fs.writeFileSync('src/app/profile/page.tsx', content);
console.log('Updated Profile');
