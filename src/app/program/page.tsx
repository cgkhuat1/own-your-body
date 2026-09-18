"use client";

import ClientNav from '@/components/ClientNav';
import { useState, useEffect } from "react";
import { CheckCircle2, Circle, Flame, CalendarDays, LogOut, UserCircle, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ClientDashboard() {
  const [activeWeek, setActiveWeek] = useState(1);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [userName, setUserName] = useState("Bạn");
  const [isActive, setIsActive] = useState(true);
  const [programInfo, setProgramInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load Dữ liệu từ Supabase thay vì Mock Data
  useEffect(() => {
    const fetchRealData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/login";
        return;
      }

      // 1. Fetch User Data
      const { data: user } = await supabase.from('users').select('full_name, role, is_active').eq('id', session.user.id).single();
      if (user) {
        if (user.full_name) setUserName(user.full_name);
        setIsActive(user.is_active !== false); // Default is true unless explicitly false
        if (user.role === 'coach' || user.role === 'founder') {
          window.location.href = "/coach";
          return;
        }
      }

      if (user?.is_active === false) {
        setLoading(false);
        return; // Dừng lại nếu tài khoản bị khóa
      }

      // 2. Fetch Latest Program
      const { data: programsData } = await supabase
        .from('programs')
        .select(`
          id, name,
          blocks (
            id, name, order_index,
            workouts ( id, name, week_number, is_completed, order_index )
          )
        `)
        .eq('client_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const programs = programsData?.[0];

      if (programs) {
        // Sort blocks
        const sortedBlocks = programs.blocks.sort((a: any, b: any) => a.order_index - b.order_index);
        
        let initialBlockId = sortedBlocks[0]?.id;
        
        const formatWeeks = (block: any) => {
          // Group workouts by week_number
          const weeksMap = new Map();
          
          if (block.workouts && Array.isArray(block.workouts)) {
            block.workouts.forEach((wo: any) => {
              const wn = wo.week_number || 1;
              if (!weeksMap.has(wn)) {
                weeksMap.set(wn, {
                  id: wn,
                  name: `Tuần ${wn}`,
                  workouts: []
                });
              }
              weeksMap.get(wn).workouts.push({
                id: wo.id,
                name: wo.name,
                order_index: wo.order_index,
                status: wo.is_completed ? 'perfect' : 'incomplete'
              });
            });
          }

          // Convert to array and sort
          return Array.from(weeksMap.values())
            .sort((a, b) => a.id - b.id)
            .map(w => {
              w.workouts.sort((a: any, b: any) => a.order_index - b.order_index);
              return w;
            });
        };

        setProgramInfo({
          id: programs.id,
          name: programs.name,
          blocks: sortedBlocks,
          formatWeeks
        });
        
        setActiveBlockId(initialBlockId);
        
        const firstBlock = sortedBlocks[0];
        if (firstBlock) {
          const weeksArray = formatWeeks(firstBlock);
          if (weeksArray.length > 0) {
            setActiveWeek(weeksArray[0].id);
          }
        }
      }

      setLoading(false);
    };

    fetchRealData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (loading) {
    return <div className="min-h-screen bg-brand-paper flex items-center justify-center font-bold text-brand-moss">Đang tải dữ liệu...</div>;
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
      const weeks = programInfo.formatWeeks(activeBlock);
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
      <div className="bg-[#243028] px-5 pb-6 pt-[max(env(safe-area-inset-top),20px)] rounded-b-3xl shadow-lg relative overflow-hidden">
        <div className="flex justify-between items-center mb-5 relative z-10">
          <div className="inline-flex items-center px-3 py-1.5 border border-[#c4a962]/40 rounded-lg bg-white/5">
            <span className="text-[#c4a962] text-[10px] font-black uppercase tracking-[0.2em]">CK Coaching</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-[52px] h-[52px] bg-[#F2F1E8] rounded-full border-[3px] border-[#F2F1E8]/20 flex items-center justify-center shadow-md shrink-0">
            <span className="text-[#243028] text-2xl font-black">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : (typeof userName !== 'undefined' && userName ? userName.charAt(0).toUpperCase() : 'B')}
            </span>
          </div>
          <div>
            <h1 className="text-[28px] font-black text-white tracking-tight">Chào {user?.full_name ? user.full_name.split(' ').pop() : (typeof userName !== 'undefined' && userName ? userName.split(' ').pop() : 'Bạn')}!</h1>
            <p className="text-[#c4a962] text-[10px] font-black uppercase tracking-widest mt-0.5 opacity-90">
              Chương Trình Tập Luyện
            </p>
          </div>
        </div>

        {/* Consistency Widget */}
        <div className="bg-[#2C3B2E] rounded-xl p-4 border border-[#c4a962]/20 relative overflow-hidden mt-6">
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <Flame size={80} className="text-[#c4a962]" />
          </div>
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <div className="flex items-center space-x-2 text-[#c4a962] mb-1">
                <Flame size={16} />
                <span className="font-bold text-xs uppercase tracking-wider">Chuỗi tập luyện</span>
              </div>
              <p className="text-white text-sm">Tuân thủ: <span className="font-bold">{compliance}%</span> <span className="text-white/60 text-xs">(Tuần này)</span></p>
            </div>
            <div className="w-10 h-10 bg-[#c4a962] rounded-full flex items-center justify-center shadow-inner">
              <span className="text-[#2C3B2E] font-black text-lg">{completedThisWeek}</span>
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
                        ? "bg-gradient-to-r from-[#FFF8E7] to-[#FDF4D9] border-[#D4AF37] hover:border-[#B5952F] shadow-[0_4px_12px_rgba(212,175,55,0.15)]" 
                        : workout.status === 'partial' 
                        ? "bg-gradient-to-r from-emerald-50/80 to-emerald-50/40 border-emerald-300 hover:border-emerald-400"
                        : "bg-white border-brand-line hover:border-brand-sand hover:shadow-md"
                    }`}
                    onClick={() => window.location.href = `/workout?id=${workout.id}`}
                  >
                    <div>
                      <h3 className={`font-bold text-lg transition-colors ${
                        workout.status === 'perfect' ? 'text-[#8C6216]' : workout.status === 'partial' ? 'text-emerald-800' : 'text-brand-moss group-hover:text-brand-mossDeep'
                      }`}>
                        {workout.name}
                      </h3>
                    </div>
                    
                    {/* Checkmark bên phải */}
                    <div className="flex-shrink-0 ml-4">
                      {workout.status === 'perfect' ? (
                        <CheckCircle2 className="text-[#D4AF37] fill-[#FFF8E7]" size={32} />
                      ) : workout.status === 'partial' ? (
                        <CheckCircle2 className="text-emerald-500 fill-emerald-100" size={32} />
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