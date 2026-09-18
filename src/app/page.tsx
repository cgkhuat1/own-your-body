"use client";
import ClientNav from '@/components/ClientNav';
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2, UserCircle, Target, Activity, Dumbbell, Calendar, Flame, Footprints, Lock, ArrowRight, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import updateLocale from "dayjs/plugin/updateLocale";

dayjs.extend(isoWeek);
dayjs.extend(updateLocale);
dayjs.updateLocale('en', { weekStart: 1 }); // Monday is the first day of the week

export default function ClientDashboard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  
  // Tab Navigation
  const [activeTab, setActiveTab] = useState<'log' | 'workout'>('log');
  
  // Active Program (Old profile page logic)
  const [activeProgram, setActiveProgram] = useState<any>(null);
  const [activeBlock, setActiveBlock] = useState<any>(null);

  // Daily Log Logic
  const [currentWeekStart, setCurrentWeekStart] = useState(dayjs().startOf('isoWeek'));
  const [clientRealWeek, setClientRealWeek] = useState<number | null>(null);
  const [viewingWeekIdx, setViewingWeekIdx] = useState<number | null>(null);
  const [dailyMetrics, setDailyMetrics] = useState<any[]>([]);
  
  // Modal State
  const [editingDay, setEditingDay] = useState<any>(null); // Date string 'YYYY-MM-DD'
  const [metricsInput, setMetricsInput] = useState({ weight: '', steps: '', calories: '', protein: '' });

  useEffect(() => {
    fetchMyData();
  }, [currentWeekStart]);

  const fetchMyData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = "/login";
      return;
    }

    const userId = session.user.id;

    // Fetch User & Profile
    if (!user) {
      const startDate = currentWeekStart.format('YYYY-MM-DD');
      const endDate = currentWeekStart.endOf('isoWeek').format('YYYY-MM-DD');

      // 🔥 Chạy song song tất cả các request để giảm thời gian load từ 3s xuống 0.5s
      const [
        userRes,
        profileRes,
        progRes,
        metricsRes
      ] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).single(),
        supabase.from('client_profiles').select('*').eq('id', userId).single(),
        supabase.from('programs').select(`
          id, name, duration_weeks,
          blocks ( id, name, order_index, workouts ( id, name, week_number, is_completed ) )
        `).eq('client_id', userId).neq('name', `dummy-${Date.now()}`).limit(1).single(),
        supabase.from('daily_metrics').select('*').eq('client_id', userId).gte('date', startDate).lte('date', endDate)
      ]);

      if (userRes.data) setUser(userRes.data);
      if (profileRes.data) {
        setProfile(profileRes.data);
        if (profileRes.data.coaching_start_date) {
          const start = dayjs(profileRes.data.coaching_start_date).startOf('day');
          const diff = dayjs().startOf('day').diff(start, 'day');
          const w = diff >= 0 ? Math.floor(diff / 7) + 1 : 1;
          setClientRealWeek(w);
          
          // If first time loading, set currentWeekStart to exactly match that week's Monday
          if (!viewingWeekIdx) {
            setViewingWeekIdx(w);
            setCurrentWeekStart(start.add((w - 1) * 7, 'day'));
          }
        }
      }
      if (progRes.data) {
        setActiveProgram(progRes.data);
        if (progRes.data.blocks && progRes.data.blocks.length > 0) {
          const sortedBlocks = [...progRes.data.blocks].sort((a: any, b: any) => a.order_index - b.order_index);
          setActiveBlock(sortedBlocks[0]);
        }
      }
      if (metricsRes.data) setDailyMetrics(metricsRes.data);
    } else {
      // Nếu user đã có sẵn, chỉ cần lấy metrics của tuần mới
      const startDate = currentWeekStart.format('YYYY-MM-DD');
      const endDate = currentWeekStart.endOf('isoWeek').format('YYYY-MM-DD');
      const { data: metrics } = await supabase.from('daily_metrics')
        .select('*')
        .eq('client_id', userId)
        .gte('date', startDate)
        .lte('date', endDate);
      if (metrics) setDailyMetrics(metrics);
    }
    
    setLoading(false);
  };

  // Gamification Level Check
  const level = profile?.tracking_level || 1;
  const canTrackSteps = level >= 2;
  const canTrackDiet = level >= 3;

  // Handle Save Metric
  const handleSaveMetric = async () => {
    if (!editingDay || !user) return;
    setSaving(true);
    
    const payload = {
      client_id: user.id,
      date: editingDay,
      weight: metricsInput.weight ? parseFloat(metricsInput.weight) : null,
      steps: metricsInput.steps ? parseInt(metricsInput.steps) : null,
      calories: metricsInput.calories ? parseInt(metricsInput.calories) : null,
      protein: metricsInput.protein ? parseInt(metricsInput.protein) : null,
      // Snapshot targets if it's a new row, else keep existing (upsert logic)
      target_steps: profile.target_steps,
      target_calories: profile.target_calories,
      target_protein: profile.target_protein,
      goal_type: profile.goal_type || 'cut'
    };

    // We check if a row already exists to avoid overwriting old targets if they already exist
    const existingRow = dailyMetrics.find(m => m.date === editingDay);
    if (existingRow) {
       payload.target_steps = existingRow.target_steps || payload.target_steps;
       payload.target_calories = existingRow.target_calories || payload.target_calories;
       payload.target_protein = existingRow.target_protein || payload.target_protein;
       payload.goal_type = existingRow.goal_type || payload.goal_type;
    }

    await supabase.from('daily_metrics').upsert(payload, { onConflict: 'client_id,date' });
    
    await fetchMyData();
    setEditingDay(null);
    setSaving(false);
  };

  const openEditor = (dateStr: string) => {
    const existingRow = dailyMetrics.find(m => m.date === dateStr);
    setMetricsInput({
      weight: existingRow?.weight?.toString() || '',
      steps: existingRow?.steps?.toString() || '',
      calories: existingRow?.calories?.toString() || '',
      protein: existingRow?.protein?.toString() || '',
    });
    setEditingDay(dateStr);
  };

  // Generate 7 days for the UI
  const weekDays = Array.from({length: 7}, (_, i) => {
    return currentWeekStart.add(i, 'day');
  });

  // Calculate Weekly Step Summary
  const totalStepsTarget = (profile?.target_steps || 0) * 7;
  const totalStepsDone = dailyMetrics.reduce((sum, m) => sum + (m.steps || 0), 0);
  const remainingSteps = Math.max(0, totalStepsTarget - totalStepsDone);
  
  // How many days left in the week (including today)?
  const today = dayjs();
  let daysLeft = 7;
  if (currentWeekStart.isSame(today, 'isoWeek')) {
    daysLeft = 7 - (today.isoWeekday() - 1); // 7 - (Day of week - 1)
  } else if (currentWeekStart.isBefore(today)) {
    daysLeft = 0; // Past week
  }
  
  const avgStepsNeeded = daysLeft > 0 ? Math.round(remainingSteps / daysLeft) : 0;

  if (loading && !user) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-sage" /></div>;

  return (
    <div className="min-h-screen bg-brand-paper/50 pb-24 font-nunito">
                        {/* Header */}
      <div className="bg-brand-mossDeep px-5 pb-6 pt-[max(env(safe-area-inset-top),20px)] rounded-b-[2rem] shadow-lg relative overflow-hidden">
        <div className="flex justify-between items-center mb-5 relative z-10">
          <div className="inline-flex items-center px-3 py-1.5 border border-brand-sand/40 rounded-lg bg-white/5">
            <span className="text-brand-sand text-[10px] font-black uppercase tracking-[0.2em]">CK Coaching</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-[52px] h-[52px] bg-brand-paper rounded-full border-[3px] border-brand-paper/20 flex items-center justify-center shadow-md shrink-0">
            <span className="text-brand-mossDeep text-2xl font-black">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'B'}
            </span>
          </div>
          <div>
            <h1 className="text-[28px] font-black text-white tracking-tight">Chào {user?.full_name ? user.full_name.split(' ').pop() : 'Bạn'}!</h1>
            <p className="text-brand-sand text-[10px] font-black uppercase tracking-widest mt-0.5 opacity-90">
              Nhật Ký Tracking
            </p>
          </div>
        </div>
        
        {/* Gamification Level Badges */}
        <div className="flex gap-2 mt-6 relative z-10">
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all ${level >= 1 ? 'bg-brand-sand text-brand-mossDeep' : 'bg-white/5 text-white/40 border border-white/10'}`}>
            {level >= 1 ? <CheckCircle2 size={13} /> : <Lock size={11} />} Cân nặng
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all ${level >= 2 ? 'bg-brand-sand text-brand-mossDeep' : 'bg-white/5 text-white/40 border border-white/10'}`}>
            {level >= 2 ? <CheckCircle2 size={13} /> : <Lock size={11} />} Steps
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all ${level >= 3 ? 'bg-brand-sand text-brand-mossDeep' : 'bg-white/5 text-white/40 border border-white/10'}`}>
            {level >= 3 ? <CheckCircle2 size={13} /> : <Lock size={11} />} Dinh dưỡng
          </div>
        </div>
      </div>

      <div className="p-5 space-y-6">
          
          {/* Week Selector */}
          <div className="flex justify-between items-center bg-white p-3 rounded-2xl shadow-sm border border-brand-line/50">
            <button onClick={() => {
              if (profile?.coaching_start_date && viewingWeekIdx) {
                const newIdx = viewingWeekIdx - 1;
                if (newIdx >= 1) {
                  setViewingWeekIdx(newIdx);
                  setCurrentWeekStart(dayjs(profile.coaching_start_date).add((newIdx - 1) * 7, 'day'));
                }
              } else {
                setCurrentWeekStart(prev => prev.subtract(1, 'week'));
              }
            }} className="p-2 hover:bg-brand-paper rounded-full text-brand-moss"><ChevronLeft /></button>
            
            <div className="text-center">
              {profile?.coaching_start_date && viewingWeekIdx ? (
                <>
                   <span className="block text-xs font-bold text-gray-500 uppercase tracking-widest">
                     {viewingWeekIdx === clientRealWeek ? "🔥 Đang ở " : ""} Tuần {viewingWeekIdx} / {profile.coaching_duration_weeks || 12}
                   </span>
                   <span className="font-bold text-brand-moss">{currentWeekStart.format('DD/MM')} - {currentWeekStart.add(6, 'day').format('DD/MM')}</span>
                </>
              ) : (
                <>
                   <span className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Tuần này</span>
                   <span className="font-bold text-brand-moss">{currentWeekStart.format('DD/MM')} - {currentWeekStart.endOf('isoWeek').format('DD/MM')}</span>
                </>
              )}
            </div>

            <button onClick={() => {
              if (profile?.coaching_start_date && viewingWeekIdx) {
                const newIdx = viewingWeekIdx + 1;
                const max = profile.coaching_duration_weeks || 12;
                if (newIdx <= max) {
                  setViewingWeekIdx(newIdx);
                  setCurrentWeekStart(dayjs(profile.coaching_start_date).add((newIdx - 1) * 7, 'day'));
                }
              } else {
                setCurrentWeekStart(prev => prev.add(1, 'week'));
              }
            }} className="p-2 hover:bg-brand-paper rounded-full text-brand-moss"><ChevronRight /></button>
          </div>

          {/* Weekly Summary (If Level >= 2) */}
          {canTrackSteps && profile?.target_steps && (
             <div className="bg-white p-5 rounded-2xl shadow-sm border border-brand-line/50">
               <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                 <Footprints size={14} className="text-orange-500"/> Tổng kết Bước chân Tuần
               </h3>
               <div className="flex justify-between items-end mb-2">
                 <div>
                   <span className="text-3xl font-black text-brand-moss">{totalStepsDone.toLocaleString()}</span>
                   <span className="text-gray-400 font-bold ml-1">/ {totalStepsTarget.toLocaleString()}</span>
                 </div>
                 <div className="text-right">
                   <span className="block text-[10px] uppercase font-bold text-orange-500">Còn lại</span>
                   <span className="font-bold text-gray-700">{remainingSteps.toLocaleString()}</span>
                 </div>
               </div>
               {/* Progress Bar */}
               <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden mb-3">
                 <div className="bg-orange-400 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (totalStepsDone / totalStepsTarget) * 100)}%` }}></div>
               </div>
               
               {daysLeft > 0 && remainingSteps > 0 && (
                 <div className="bg-orange-50 border border-orange-200 p-3 rounded-xl flex gap-3 items-start">
                   <span className="text-xl">💡</span>
                   <p className="text-orange-800 text-[12px] font-semibold leading-snug">
                     Tuần này còn {daysLeft} ngày. Để đạt target, mỗi ngày bạn chỉ cần đi trung bình <strong className="text-orange-600 text-sm">{avgStepsNeeded.toLocaleString()}</strong> bước. Cố lên nhé!
                   </p>
                 </div>
               )}
               {remainingSteps === 0 && (
                 <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex gap-3 items-start text-emerald-800 text-sm font-bold">
                   🎉 Tuyệt vời! Bạn đã hoàn thành mục tiêu bước chân của cả tuần!
                 </div>
               )}
             </div>
          )}

          {/* 7-Day Grid */}
          <div className="space-y-4">
            {weekDays.map(day => {
              const dateStr = day.format('YYYY-MM-DD');
              const isToday = day.isSame(dayjs(), 'day');
              const row = dailyMetrics.find(m => m.date === dateStr);
              
              return (
                <div key={dateStr} onClick={() => openEditor(dateStr)} className={`bg-white rounded-2xl shadow-sm border p-4 cursor-pointer hover:shadow-md transition-all ${isToday ? 'border-brand-moss ring-2 ring-brand-moss/20' : 'border-gray-100'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${isToday ? 'bg-brand-moss text-brand-sand' : 'bg-brand-paper text-brand-moss'}`}>
                        {day.format('DD')}
                      </span>
                      <div>
                        <span className="block text-xs font-bold text-gray-400 uppercase">{day.format('dddd')}</span>
                        {isToday && <span className="text-[10px] font-black text-brand-moss bg-brand-moss/10 px-2 py-0.5 rounded-md uppercase tracking-wider">Hôm nay</span>}
                      </div>
                    </div>
                    {row ? (
                      <CheckCircle2 className="text-emerald-500 w-5 h-5" />
                    ) : (
                      <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">+ Nhập</span>
                    )}
                  </div>
                  
                  {/* Metric Chips */}
                  <div className="flex flex-wrap gap-2">
                    {/* Weight (Always Level 1) */}
                    <div className="flex-1 min-w-[30%] bg-gray-50 border border-gray-100 rounded-lg p-2 text-center">
                      <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Cân nặng</span>
                      <span className="font-black text-brand-moss">{row?.weight ? `${row.weight} kg` : '--'}</span>
                    </div>

                    {/* Steps (Level 2+) */}
                    <div className="flex-1 min-w-[30%] bg-gray-50 border border-gray-100 rounded-lg p-2 text-center relative overflow-hidden">
                      <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Bước chân</span>
                      {canTrackSteps ? (
                        <span className="font-black text-brand-moss">{row?.steps ? row.steps.toLocaleString() : '--'}</span>
                      ) : (
                         <div className="absolute inset-0 bg-gray-100/80 backdrop-blur-[1px] flex items-center justify-center">
                           <Lock size={14} className="text-gray-400" />
                         </div>
                      )}
                    </div>

                    {/* Calories (Level 3+) */}
                    <div className="flex-1 min-w-[30%] bg-gray-50 border border-gray-100 rounded-lg p-2 text-center relative overflow-hidden">
                      <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Calo In</span>
                      {canTrackDiet ? (
                        <span className="font-black text-brand-moss">{row?.calories ? row.calories.toLocaleString() : '--'}</span>
                      ) : (
                         <div className="absolute inset-0 bg-gray-100/80 backdrop-blur-[1px] flex items-center justify-center">
                           <Lock size={14} className="text-gray-400" />
                         </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>


        </div>

      {/* Metric Input Modal */}
      {editingDay && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0">
            <h3 className="text-xl font-black text-brand-moss mb-1">
              Nhật ký ngày {dayjs(editingDay).format('DD/MM')}
            </h3>
            <p className="text-sm text-gray-500 font-medium mb-6">Điền số liệu để Coach theo dõi tiến độ của bạn</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Cân nặng sáng (kg)</label>
                <input type="number" step="0.1" value={metricsInput.weight} onChange={e => setMetricsInput({...metricsInput, weight: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 outline-none focus:border-brand-sage font-black text-xl text-gray-900" placeholder="VD: 65.5" />
              </div>

              <div className="relative">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Số bước chân</label>
                <input type="number" disabled={!canTrackSteps} value={metricsInput.steps} onChange={e => setMetricsInput({...metricsInput, steps: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 outline-none focus:border-brand-sage font-black text-xl text-gray-900 disabled:opacity-50" placeholder="VD: 10000" />
                {!canTrackSteps && <div className="absolute right-4 top-10 flex items-center gap-1 text-xs font-bold text-orange-500"><Lock size={12}/> Level 2</div>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Calo In</label>
                  <input type="number" disabled={!canTrackDiet} value={metricsInput.calories} onChange={e => setMetricsInput({...metricsInput, calories: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 outline-none focus:border-brand-sage font-black text-xl text-gray-900 disabled:opacity-50" placeholder="VD: 2000" />
                  {!canTrackDiet && <div className="absolute right-3 top-10 flex items-center text-orange-500"><Lock size={12}/></div>}
                </div>
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Protein (g)</label>
                  <input type="number" disabled={!canTrackDiet} value={metricsInput.protein} onChange={e => setMetricsInput({...metricsInput, protein: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 outline-none focus:border-brand-sage font-black text-xl text-gray-900 disabled:opacity-50" placeholder="VD: 150" />
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button onClick={() => setEditingDay(null)} className="flex-1 py-3.5 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200">Hủy</button>
              <button onClick={handleSaveMetric} disabled={saving} className="flex-1 py-3.5 rounded-xl font-bold text-white bg-brand-moss hover:bg-brand-mossDeep shadow-md flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Lưu Nhật Ký'}
              </button>
            </div>
          </div>
        </div>
      )}
      <ClientNav />
    </div>
  );
}