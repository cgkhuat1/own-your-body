"use client";

import ClientNav from '@/components/ClientNav';
import { useState, useEffect } from "react";
import useSWR from 'swr';
import { CheckCircle2, Circle, Flame, CalendarDays, LogOut, UserCircle, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ClientDashboard() {
  const [activeWeek, setActiveWeek] = useState(1);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  const fetcher = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = "/login";
      return null;
    }

    const { data: user } = await supabase.from('users').select('full_name, role, is_active').eq('id', session.user.id).single();
    if (user?.role === 'coach' || user?.role === 'founder') {
      window.location.href = "/coach";
      return null;
    }

    if (user?.is_active === false) {
      return { user, programInfo: null };
    }

    const { data: programsData } = await supabase
      .from('programs')
      .select(`
        id, name,
        blocks (
          id, name, order_index,
          workouts (
            id, name, week_number, is_completed, is_perfect, order_index
          )
        )
      `)
      .eq('client_id', session.user.id)
      .neq('name', `dummy-${Date.now()}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (programsData) {
      // Sort blocks & workouts inside
      programsData.blocks.sort((a: any, b: any) => a.order_index - b.order_index);
      programsData.blocks.forEach((b: any) => {
        b.workouts.sort((w1: any, w2: any) => (w1.order_index || 0) - (w2.order_index || 0));
      });
    }

    return { user, programInfo: programsData };
  };

  const { data, isLoading: loading } = useSWR('program_dashboard', fetcher, { revalidateOnFocus: true });
  const user = data?.user;
  const programInfo = data?.programInfo;
  
  const userName = user?.full_name || "Bạn";
  const isActive = user ? user.is_active !== false : true;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // Tự động set activeBlockId ban đầu
  useEffect(() => {
    if (programInfo?.blocks && programInfo.blocks.length > 0 && !activeBlockId) {
      setActiveBlockId(programInfo.blocks[0].id);
    }
  }, [programInfo, activeBlockId]);

  const activeBlock = programInfo?.blocks?.find((b: any) => b.id === activeBlockId) || programInfo?.blocks?.[0];
  const activeWorkouts = activeBlock?.workouts?.filter((w: any) => w.week_number === activeWeek) || [];

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-brand-paper shadow-2xl relative pb-24 font-nunito animate-pulse">
        {/* Header Skeleton */}
        <div className="bg-brand-mossDeep px-5 pb-6 pt-[max(env(safe-area-inset-top),20px)] rounded-b-[2rem] shadow-lg relative">
          <div className="flex justify-between items-start mb-6">
            <div className="bg-white/20 px-3 py-1 rounded-full w-24 h-6"></div>
            <div className="w-12 h-12 bg-white/20 rounded-full border-2 border-white/30"></div>
          </div>
          <div className="w-32 h-8 bg-white/20 rounded-lg mb-2"></div>
          <div className="w-48 h-4 bg-white/20 rounded-full"></div>
        </div>

        <div className="px-5 mt-6 space-y-6">
          {/* Tabs Skeleton */}
          <div className="flex gap-2 mb-6">
            <div className="flex-1 h-12 bg-brand-line/30 rounded-2xl"></div>
            <div className="flex-1 h-12 bg-brand-line/50 rounded-2xl"></div>
          </div>

          {/* Block Skeleton */}
          <div className="mb-4">
            <div className="w-40 h-6 bg-brand-line/50 rounded mb-3"></div>
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-white border border-brand-line rounded-2xl p-5 flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="w-16 h-4 bg-brand-line/50 rounded"></div>
                    <div className="w-32 h-5 bg-brand-line/40 rounded"></div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-brand-line/30"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Màn hình vô hiệu hóa
  if (!isActive) {
    return (
      <div className="min-h-screen bg-brand-paper flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-white p-8 rounded-3xl shadow-xl border border-brand-line">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock size={40} />
          </div>
          <h1 className="text-2xl font-black text-brand-moss mb-3">Tài khoản tạm khóa</h1>
          <p className="text-brand-moss/70 leading-relaxed mb-8">
            Gói Coaching của bạn đã kết thúc hoặc tài khoản đang bị tạm ngưng. Lịch tập đã được đưa vào Kho lưu trữ. Vui lòng liên hệ HLV để gia hạn và tiếp tục.
          </p>
          <button onClick={handleLogout} className="w-full py-4 rounded-xl font-bold text-white bg-brand-moss hover:bg-brand-mossDeep transition-colors shadow-md">
            Đăng xuất
          </button>
        </div>
      </div>
    );
  }

  let programData = null;
  let completedThisWeek = 0;
  let compliance = 0;

  if (programInfo && activeBlockId) {
    const activeBlock = programInfo.blocks.find((b: any) => b.id === activeBlockId);
    if (activeBlock) {
      


  const formatWeeks = (block: any) => {
    const weeksMap = new Map();
    if (block?.workouts && Array.isArray(block.workouts)) {
      block.workouts.forEach((wo: any) => {
        const wn = wo.week_number || 1;
        if (!weeksMap.has(wn)) {
          weeksMap.set(wn, { id: wn, name: `Tuần ${wn}`, workouts: [] });
        }
        weeksMap.get(wn).workouts.push({
          id: wo.id,
          name: wo.name,
          order_index: wo.order_index,
          status: wo.is_completed ? (wo.is_perfect ? 'perfect' : 'partial') : 'incomplete'
        });
      });
    }
    return Array.from(weeksMap.values()).sort((a, b) => a.id - b.id).map(w => {
       w.workouts.sort((a:any, b:any) => (a.order_index || 0) - (b.order_index || 0));
       return w;
    });
  };

  const weeks = formatWeeks(activeBlock);

      programData = { weeks };
      
      const currentWeek = weeks.find((w: any) => w.id === activeWeek);
      if (currentWeek) {
        const total = currentWeek.workouts.length;
        completedThisWeek = currentWeek.workouts.filter((w: any) => w.status === 'perfect').length;
        compliance = total > 0 ? Math.round((completedThisWeek / total) * 100) : 0;
      }
    }
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-brand-paper shadow-2xl relative pb-24">
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
              {userName ? userName.charAt(0).toUpperCase() : 'B'}
            </span>
          </div>
          <div>
            <h1 className="text-[28px] font-black text-white tracking-tight">Chào {userName ? userName.split(' ').pop() : 'Bạn'}!</h1>
            <p className="text-brand-sand text-[10px] font-black uppercase tracking-widest mt-0.5 opacity-90">
              Chương Trình Tập Luyện
            </p>
          </div>
        </div>

        {/* Consistency Widget */}
        <div className="bg-brand-moss rounded-xl p-4 border border-brand-sand/20 relative overflow-hidden mt-6">
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <Flame size={80} className="text-brand-sand" />
          </div>
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <div className="flex items-center space-x-2 text-brand-sand mb-1">
                <Flame size={16} />
                <span className="font-bold text-xs uppercase tracking-wider">Chuỗi tập luyện</span>
              </div>
              <p className="text-white text-sm">Tuân thủ: <span className="font-bold">{compliance}%</span> <span className="text-white/60 text-xs">(Tuần này)</span></p>
            </div>
            <div className="w-10 h-10 bg-brand-sand rounded-full flex items-center justify-center shadow-inner">
              <span className="text-brand-mossDeep font-black text-lg">{completedThisWeek}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5">
        {programData ? (
          <>
            <div className="mb-4">
              <h2 className="text-brand-moss font-black text-xl flex items-center space-x-2 mb-3">
                <CalendarDays size={20} className="text-brand-sand" />
                <span>Phase: {programInfo?.name}</span>
              </h2>
              
              {/* Block Tabs */}
              {programInfo?.blocks && programInfo.blocks.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {programInfo.blocks.map((b: any) => (
                    <button
                      key={b.id}
                      onClick={() => { setActiveBlockId(b.id); setActiveWeek(1); }}
                      className={`flex-shrink-0 px-4 py-1.5 rounded-lg font-bold text-sm transition-all border ${
                        activeBlockId === b.id 
                          ? "bg-brand-mossDeep text-white border-brand-mossDeep shadow-sm" 
                          : "bg-white text-brand-moss/60 border-brand-line hover:bg-brand-paper"
                      }`}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex space-x-2 mb-6 overflow-x-auto p-2 -mx-2 scrollbar-hide">
              {programData.weeks.map((week: any) => (
                <button
                  key={week.id}
                  onClick={() => setActiveWeek(week.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full font-bold text-sm transition-all shadow-sm ${
                    activeWeek === week.id 
                      ? "bg-brand-moss text-white ring-2 ring-brand-sand ring-offset-2 ring-offset-brand-paper" 
                      : "bg-white text-brand-moss/60 hover:bg-brand-sand/30 border border-brand-line"
                  }`}
                >
                  {week.name}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {programData.weeks.find((w: any) => w.id === activeWeek)?.workouts.length > 0 ? (
                programData.weeks.find((w: any) => w.id === activeWeek)?.workouts.map((workout: any) => (
                  <div 
                    key={workout.id} 
                    className={`rounded-2xl p-5 shadow-sm border flex items-center justify-between cursor-pointer transition-all group ${
                      workout.status === 'perfect'
                        ? "bg-gradient-to-tr from-[#B8860B] via-[#FCE3A1] to-[#D4AF37] border-[2px] border-[#B8860B] shadow-[0_8px_30px_rgba(212,175,55,0.5)] transform scale-[1.01] hover:scale-[1.03] relative overflow-hidden" 
                        : workout.status === 'partial' 
                        ? "bg-gradient-to-r from-emerald-50/80 to-emerald-50/40 border-emerald-300 hover:border-emerald-400"
                        : "bg-white border-brand-line hover:border-brand-sand hover:shadow-md"
                    }`}
                    onClick={() => window.location.href = `/workout?id=${workout.id}`}
                  >
                    <div>
                      <h3 className={`font-bold text-lg transition-colors ${
                        workout.status === 'perfect' ? 'text-brand-mossDeep drop-shadow-sm' : workout.status === 'partial' ? 'text-emerald-800' : 'text-brand-moss group-hover:text-brand-mossDeep'
                      }`}>
                        {workout.name}
                      </h3>
                    </div>
                    
                    {/* Checkmark bên phải */}
                    <div className="flex-shrink-0 ml-4 relative">
                      {workout.status === 'perfect' ? (
                        <>
                          <div className="absolute inset-0 bg-[#FCE3A1]/70 blur-md rounded-full animate-pulse"></div>
                          <CheckCircle2 className="text-brand-mossDeep relative z-10" fill="#FCE3A1" size={32} />
                        </>
                      ) : workout.status === 'partial' ? (
                        <CheckCircle2 className="text-emerald-500" fill="#D1FAE5" size={32} />
                      ) : (
                        <Circle className="text-brand-line/60" size={32} />
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-xl p-8 shadow-sm border border-brand-line border-dashed flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 bg-brand-paper rounded-full flex items-center justify-center mb-3">
                    <CalendarDays className="text-brand-moss/30" size={24} />
                  </div>
                  <h3 className="font-bold text-brand-moss mb-1">Chưa có giáo án</h3>
                  <p className="text-sm text-brand-moss/50">Tuần này của bạn trống. Chờ HLV lên lịch nhé!</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-10">
            <h3 className="font-bold text-brand-moss mb-1">Chưa có giáo án</h3>
            <p className="text-sm text-brand-moss/50">HLV chưa khởi tạo giáo án cho bạn.</p>
          </div>
        )}
      </div>
      <ClientNav />
      <ClientNav />
    </div>
  );
}