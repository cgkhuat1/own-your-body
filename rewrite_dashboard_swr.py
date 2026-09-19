import re

with open('/Users/macbook/Documents/ck-coaching/src/app/page.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { useState, useEffect } from \"react\";", "import { useState, useEffect } from \"react\";\nimport useSWR from 'swr';")

match = re.search(r'export default function ClientDashboard\(\) \{(.*?)\n  if \(loading && !user\)', content, re.DOTALL)
if match:
    old_body = match.group(1)
    
    new_body = """
  const [saving, setSaving] = useState(false);
  
  // Tab Navigation
  const [activeTab, setActiveTab] = useState<'log' | 'workout'>('log');
  
  // Daily Log Logic
  const [currentWeekStart, setCurrentWeekStart] = useState(dayjs().startOf('isoWeek'));
  const weekStartStr = currentWeekStart.format('YYYY-MM-DD');
  const [clientRealWeek, setClientRealWeek] = useState<number | null>(null);

  const [viewingWeekIdx, setViewingWeekIdx] = useState<number | null>(null);
  
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [metricsInput, setMetricsInput] = useState({ weight: '', steps: '', calories: '', protein: '' });

  const fetcher = async (key: string, weekStr: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = "/login";
      return null;
    }
    const userId = session.user.id;
    const endDate = dayjs(weekStr).endOf('isoWeek').format('YYYY-MM-DD');

    const [userRes, profileRes, metricsRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).single(),
      supabase.from('client_profiles').select('*').eq('id', userId).single(),
      supabase.from('daily_metrics').select('*').eq('client_id', userId).gte('date', weekStr).lte('date', endDate)
    ]);

    return {
      user: userRes.data,
      profile: profileRes.data,
      metrics: metricsRes.data || []
    };
  };

  const { data, isLoading: loading, mutate } = useSWR(['dashboard', weekStartStr], ([key, weekStr]) => fetcher(key, weekStr), {
    revalidateOnFocus: true
  });

  const user = data?.user;
  const profile = data?.profile;
  const dailyMetrics = data?.metrics || [];

  useEffect(() => {
    if (profile?.coaching_start_date && !viewingWeekIdx) {
      const start = dayjs(profile.coaching_start_date).startOf('day');
      const diff = dayjs().startOf('day').diff(start, 'day');
      const w = Math.floor(diff / 7) + 1;
      setClientRealWeek(w);
      setViewingWeekIdx(w);
      setCurrentWeekStart(start.add((w - 1) * 7, 'day'));
    }
  }, [profile?.coaching_start_date, viewingWeekIdx]);

  const openEditor = (dateStr: string) => {
    const existing = dailyMetrics.find((m: any) => m.date === dateStr);
    if (existing) {
      setMetricsInput({
        weight: existing.weight?.toString() || '',
        steps: existing.steps?.toString() || '',
        calories: existing.calories?.toString() || '',
        protein: existing.protein?.toString() || ''
      });
    } else {
      setMetricsInput({ weight: '', steps: '', calories: '', protein: '' });
    }
    setEditingDay(dateStr);
  };

  const handleSaveMetric = async () => {
    if (!editingDay || !user) return;
    setSaving(true);
    try {
      const payload: any = {
        client_id: user.id,
        date: editingDay,
        weight: metricsInput.weight ? parseFloat(metricsInput.weight) : null,
      };
      if (profile?.tracking_level >= 2) payload.steps = metricsInput.steps ? parseInt(metricsInput.steps) : null;
      if (profile?.tracking_level >= 3) {
        payload.calories = metricsInput.calories ? parseInt(metricsInput.calories) : null;
        payload.protein = metricsInput.protein ? parseInt(metricsInput.protein) : null;
      }
      
      const existing = dailyMetrics.find((m: any) => m.date === editingDay);
      if (existing) {
        await supabase.from('daily_metrics').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('daily_metrics').insert([payload]);
      }
      
      // Update local SWR cache immediately for instant UI response
      await mutate();
      setEditingDay(null);
    } catch (e) {
      console.error(e);
      alert("Lỗi khi lưu");
    } finally {
      setSaving(false);
    }
  };
"""
    content = content.replace(old_body, new_body)
    
    with open('/Users/macbook/Documents/ck-coaching/src/app/page.tsx', 'w') as f:
        f.write(content)
    print("Done rewriting page.tsx")
