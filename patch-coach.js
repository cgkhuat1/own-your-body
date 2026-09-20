const fs = require('fs');
let content = fs.readFileSync('src/app/coach/page.tsx', 'utf8');

// 1. Ensure Activity is imported from lucide-react if not already
if (!content.includes('Activity,')) {
    content = content.replace("Trash2, TrendingUp, ", "Trash2, TrendingUp, Activity, ");
}

// 2. Add states for the chart modal
const stateInsert = `
  const [chartClient, setChartClient] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [yDomain, setYDomain] = useState<any[]>(['auto', 'auto']);
  const [isChartLoading, setIsChartLoading] = useState(false);

  const openChartModal = async (client: any) => {
    setChartClient(client);
    setIsChartLoading(true);
    setChartData([]);
    
    try {
      const { data: metrics } = await supabase
        .from('daily_metrics')
        .select('date, weight')
        .eq('client_id', client.id)
        .gt('weight', 0)
        .order('date', { ascending: true });
        
      if (metrics && metrics.length > 0 && client.coaching_start_date) {
        const start = dayjs(client.coaching_start_date).startOf('day');
        const weeksMap = {};
        let minW = Infinity;
        let maxW = -Infinity;
        
        metrics.forEach(m => {
          const mDate = dayjs(m.date).startOf('day');
          if (mDate.isBefore(start)) return;
          const wIndex = Math.floor(mDate.diff(start, 'day') / 7) + 1;
          if (!weeksMap[wIndex]) weeksMap[wIndex] = [];
          weeksMap[wIndex].push(m.weight);
          
          if (m.weight < minW) minW = m.weight;
          if (m.weight > maxW) maxW = m.weight;
        });
        
        const cData = Object.keys(weeksMap).sort((a,b) => parseInt(a) - parseInt(b)).map(weekNum => {
          const arr = weeksMap[parseInt(weekNum)];
          const avg = arr.reduce((a,b) => a+b, 0) / arr.length;
          return {
            name: \`T\${weekNum}\`,
            weight: parseFloat(avg.toFixed(1))
          };
        });
        
        setChartData(cData);
        setYDomain(minW !== Infinity ? [Math.max(0, Math.floor(minW - 3)), Math.ceil(maxW + 3)] : ['auto', 'auto']);
      } else {
        setChartData([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsChartLoading(false);
    }
  };
`;

content = content.replace("const handleAddClient = async", stateInsert + "\n  const handleAddClient = async");

// 3. Add the quick view button next to the Trash button in the table
const buttonInsert = `
                        <button 
                          onClick={() => openChartModal(client)}
                          className="p-2 text-brand-moss/40 hover:text-brand-moss hover:bg-brand-moss/10 rounded-lg transition-colors"
                          title="Xem biểu đồ cân nặng"
                        >
                          <Activity size={18} />
                        </button>
`;
content = content.replace(/(<button[\s\S]*?onClick=\{\(\) => handleDeleteClient[\s\S]*?<\/button>)/, buttonInsert + "$1");

// 4. Add the Chart Modal UI at the bottom (before final closing tag)
const chartModalUI = `
      {/* Biểu đồ Modal */}
      {chartClient && (
        <div className="fixed inset-0 bg-brand-mossDeep/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-brand-line/50 flex justify-between items-center bg-brand-paper/30">
              <div>
                <h3 className="font-bold text-xl text-brand-moss flex items-center gap-2">
                  <Activity className="text-brand-moss" size={24} />
                  Tiến độ Cân nặng
                </h3>
                <p className="text-sm font-semibold text-brand-moss/60 mt-1">
                  Học viên: {chartClient.full_name}
                </p>
              </div>
              <button 
                onClick={() => setChartClient(null)}
                className="w-10 h-10 flex items-center justify-center bg-white border border-brand-line rounded-full hover:bg-brand-sand transition-colors"
              >
                <X size={20} className="text-brand-moss" />
              </button>
            </div>
            <div className="p-8">
              {isChartLoading ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="animate-spin text-brand-moss/40" size={32} />
                </div>
              ) : chartData.length > 0 ? (
                <div className="h-[300px] w-full -ml-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 'bold' }} dy={10} />
                      <YAxis domain={yDomain} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 'bold' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', fontWeight: 'bold', color: '#1C2E20' }}
                        itemStyle={{ color: '#1C2E20' }}
                        formatter={(value) => [\`\${value} kg\`, 'Trung bình tuần']}
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
                <div className="py-20 text-center text-brand-moss/50 bg-brand-paper/50 rounded-2xl font-bold border border-dashed border-brand-line/80">
                  Học viên này chưa nhập đủ dữ liệu cân nặng.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
`;

content = content.replace("{/* Add Client Modal */}", chartModalUI + "\n      {/* Add Client Modal */}");

fs.writeFileSync('src/app/coach/page.tsx', content);
console.log('Patch complete');
