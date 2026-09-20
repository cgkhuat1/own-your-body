"use client";
import ClientNav from '@/components/ClientNav';
import { useState, useEffect } from "react";
import useSWR from 'swr';
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2, UserCircle, Target, Activity, Dumbbell, Calendar, Flame, Footprints, Lock, ArrowRight, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import updateLocale from "dayjs/plugin/updateLocale";

dayjs.extend(isoWeek);
dayjs.extend(updateLocale);
dayjs.updateLocale('en', { weekStart: 1 }); // Monday is the first day of the week

export default function ClientDashboard({ initialData }: { initialData?: any }) {
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
    fallbackData: weekStartStr === dayjs().startOf('isoWeek').format('YYYY-MM-DD') ? initialData : undefined,
    revalidateOnFocus: true,
    keepPreviousData: true
  });

  const user = data?.user || initialData?.user;
  const profile = data?.profile || initialData?.profile;
  const dailyMetrics = data?.metrics || initialData?.metrics || [];

  useEffect(() => {
    if (profile?.coaching_start_date && !viewingWeekIdx) {
      const start = dayjs(profile.coaching_start_date).startOf('day');
      const diff = dayjs().startOf('day').diff(start, 'day');
      // Nếu chưa tới ngày bắt đầu (diff < 0), luôn tính là Tuần 1
      const w = Math.max(1, Math.floor(diff / 7) + 1);
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
        target_steps: profile?.target_steps,
        target_calories: profile?.target_calories,
        target_protein: profile?.target_protein,
        goal_type: profile?.goal_type || 'cut'
      };
      if (profile?.tracking_level >= 2) payload.steps = metricsInput.steps ? parseInt(metricsInput.steps) : null;
      if (profile?.tracking_level >= 3) {
        payload.calories = metricsInput.calories ? parseInt(metricsInput.calories) : null;
        payload.protein = metricsInput.protein ? parseInt(metricsInput.protein) : null;
      }
      
      const existing = dailyMetrics.find((m: any) => m.date === editingDay);
      
      const isEmpty = !payload.weight && !payload.steps && !payload.calories && !payload.protein;
      
      if (isEmpty) {
        if (existing) {
          await supabase.from('daily_metrics').delete().eq('id', existing.id);
        }
      } else {
        if (existing) {
          await supabase.from('daily_metrics').update(payload).eq('id', existing.id);
        } else {
          await supabase.from('daily_metrics').insert([payload]);
        }
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


  // Gamification Level Check
  const level = profile?.tracking_level || 1;
  const canTrackSteps = level >= 2;
  const canTrackDiet = level >= 3;

  // Generate 7 days for the UI
  const weekDays = Array.from({length: 7}, (_, i) => {
    return currentWeekStart.add(i, 'day');
  });

  // Calculate Weekly Step Summary
  const totalStepsTarget = (profile?.target_steps || 0) * 7;
  const totalStepsDone = dailyMetrics.reduce((sum: any, m: any) => sum + (m.steps || 0), 0);
  const remainingSteps = Math.max(0, totalStepsTarget - totalStepsDone);
  
  // Calculate remaining days based on how many days have steps entered
  const daysWithSteps = dailyMetrics.filter((m: any) => m.steps && m.steps > 0).length;
  const daysLeft = Math.max(0, 7 - daysWithSteps);
  const avgStepsNeeded = daysLeft > 0 ? Math.round(remainingSteps / daysLeft) : 0;

  // Grace Period Logic
  const isActive = user ? user.is_active !== false : true;
  let durationWeeks = 12;
  let gracePeriodWeeks = 3;
  let maxAllowedWeeks = 15;
  let isExpired = false;
  let isInGracePeriod = false;
  let weeksLeftInGrace = 0;

  if (profile?.coaching_start_date && clientRealWeek) {
    durationWeeks = profile.coaching_duration_weeks || 12;
    gracePeriodWeeks = Math.ceil(durationWeeks * 0.25);
    maxAllowedWeeks = durationWeeks + gracePeriodWeeks;

    if (clientRealWeek > maxAllowedWeeks) {
      isExpired = true;
    } else if (clientRealWeek > durationWeeks) {
      isInGracePeriod = true;
      weeksLeftInGrace = maxAllowedWeeks - clientRealWeek;
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (!loading && user && (!isActive || isExpired)) {
    return (
      <div className="min-h-screen bg-brand-paper flex items-center justify-center p-6 text-center font-nunito">
        <div className="max-w-md bg-white p-8 rounded-3xl shadow-xl border border-brand-line w-full">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock size={40} />
          </div>
          <h1 className="text-2xl font-black text-brand-moss mb-3">
            {isExpired ? "Hành trình khép lại" : "Tài khoản bị khóa"}
          </h1>
          <p className="text-brand-moss/70 leading-relaxed mb-8">
            {isExpired 
              ? `Gói Coaching ${durationWeeks} tuần (kèm ${gracePeriodWeeks} tuần hỗ trợ thêm) của bạn đã kết thúc. Chúc mừng bạn đã nỗ lực hết mình! Vui lòng liên hệ Coach để đánh giá lại hành trình hoặc gia hạn.`
              : "Gói Coaching của bạn đang bị tạm ngưng. Vui lòng liên hệ Coach để biết thêm chi tiết."}
          </p>
          <button onClick={handleLogout} className="w-full py-4 rounded-xl font-bold text-white bg-brand-moss hover:bg-brand-mossDeep transition-colors shadow-md">
            Đăng xuất
          </button>
        </div>
      </div>
    );
  }

  if (loading && !user) {

    return (
      <div className="max-w-md mx-auto min-h-screen bg-brand-paper shadow-2xl relative pb-24 font-nunito animate-pulse">
        {/* Header Skeleton */}
        <div className="bg-brand-mossDeep px-5 pb-6 pt-[max(env(safe-area-inset-top),20px)] rounded-b-[2rem] shadow-lg relative">
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="bg-white/20 px-3 py-1 rounded-full w-24 h-6"></div>
            <div className="w-12 h-12 bg-white/20 rounded-full border-2 border-white/30"></div>
          </div>
          <div className="relative z-10">
            <div className="w-32 h-8 bg-white/20 rounded-lg mb-2"></div>
            <div className="w-48 h-4 bg-white/20 rounded-full"></div>
          </div>
        </div>

        <div className="px-5 mt-6 space-y-6">
          {/* Tabs Skeleton */}
          <div className="flex gap-2">
            <div className="flex-1 h-12 bg-brand-line/50 rounded-2xl"></div>
            <div className="flex-1 h-12 bg-brand-line/30 rounded-2xl"></div>
          </div>

          {/* Gamification Skeleton */}
          <div className="p-5 rounded-3xl bg-white border border-brand-line shadow-sm">
            <div className="w-32 h-5 bg-brand-line/50 rounded mb-4"></div>
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-brand-line/40"></div>
                  <div className="w-12 h-3 bg-brand-line/30 rounded"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Week Navigation Skeleton */}
          <div className="flex justify-between items-center px-4">
            <div className="w-8 h-8 rounded-full bg-brand-line/40"></div>
            <div className="w-24 h-6 bg-brand-line/50 rounded"></div>
            <div className="w-8 h-8 rounded-full bg-brand-line/40"></div>
          </div>

          {/* Daily Cards Skeleton */}
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white border border-brand-line rounded-2xl p-4 flex gap-4 items-center">
                <div className="w-12 h-12 rounded-xl bg-brand-line/30 shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="w-20 h-4 bg-brand-line/50 rounded"></div>
                  <div className="w-full h-8 bg-brand-line/30 rounded-lg"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-brand-paper shadow-2xl relative pb-24 font-nunito">
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
          
          {/* Grace Period Warning */}
          {isInGracePeriod && (
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl flex gap-3 items-start shadow-sm animate-in fade-in slide-in-from-top-4">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex flex-shrink-0 items-center justify-center text-orange-500 mt-0.5">
                <Flame size={16} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-orange-800 mb-1">Thời gian linh hoạt (Grace Period)</h4>
                <p className="text-[12px] text-orange-700 leading-relaxed font-medium">
                  Bạn đã bước qua tuần thứ {durationWeeks}. App đang kích hoạt thời gian hỗ trợ thêm để bạn hoàn thành nốt mục tiêu. Thời hạn đóng app: <strong>{weeksLeftInGrace === 0 ? "Cuối tuần này" : `Còn ${weeksLeftInGrace} tuần nữa`}</strong>. Cố lên nhé!
                </p>
              </div>
            </div>
          )}

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
                     Còn lại {daysLeft} ngày chưa nhập số liệu. Để đạt target tuần, mỗi ngày bạn cần đi trung bình <strong className="text-orange-600 text-sm">{avgStepsNeeded.toLocaleString()}</strong> bước. Cố lên nhé!
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
              const row = dailyMetrics.find((m: any) => m.date === dateStr);
              const hasData = !!row;
              let bgClass = "bg-white border-gray-100 hover:border-brand-sand";
              if (hasData) {
                bgClass = "bg-gradient-to-r from-emerald-50/80 to-emerald-50/40 border-emerald-300 hover:border-emerald-400";
              }
              if (isToday) {
                bgClass += " border-2 border-brand-moss shadow-md";
              }
              
              return (
                <div key={dateStr} onClick={() => openEditor(dateStr)} className={`rounded-2xl shadow-sm border p-4 cursor-pointer hover:shadow-md transition-all ${bgClass}`}>
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
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 max-h-[90vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),24px)]">
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