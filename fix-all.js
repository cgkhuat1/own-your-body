const fs = require('fs');

// --- PROFILE PAGE ---
let profile = fs.readFileSync('src/app/profile/page.tsx', 'utf8');
profile = profile.replace('let chartData = [];', 'let chartData: any[] = [];');
profile = profile.replace('const weeksMap = {};', 'const weeksMap: Record<number, number[]> = {};');
profile = profile.replace('const avg = arr.reduce((a,b) => a+b, 0) / arr.length;', 'const avg = arr.reduce((a: number, b: number) => a+b, 0) / arr.length;');

const chartUI = `
        {/* Biểu đồ cân nặng */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
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
            <div className="p-8 text-center text-brand-moss/50 bg-brand-paper/50 rounded-xl font-semibold border border-dashed border-gray-200">
              Chưa có đủ dữ liệu cân nặng để vẽ biểu đồ.
            </div>
          )}
        </div>
`;
if (!profile.includes('Biểu đồ cân nặng')) {
    profile = profile.replace('<div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">', chartUI + '\n        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">');
}
fs.writeFileSync('src/app/profile/page.tsx', profile);

// --- COACH PAGE ---
let coach = fs.readFileSync('src/app/coach/page.tsx', 'utf8');
if (!coach.includes("import { LineChart")) {
    coach = "import dayjs from 'dayjs';\nimport { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';\n" + coach;
}
coach = coach.replace('const weeksMap = {};', 'const weeksMap: Record<number, number[]> = {};');
coach = coach.replace('const avg = arr.reduce((a,b) => a+b, 0) / arr.length;', 'const avg = arr.reduce((a: number, b: number) => a+b, 0) / arr.length;');
fs.writeFileSync('src/app/coach/page.tsx', coach);

console.log('Fixed Types and Imports!');
