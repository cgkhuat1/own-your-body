"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Circle, Flame, CalendarDays, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ClientDashboard() {
  const [activeWeek, setActiveWeek] = useState(1);
  const [userName, setUserName] = useState("Bạn");
  const [programData, setProgramData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load Dữ liệu từ Supabase thay vì Mock Data
  useEffect(() => {
    const fetchRealData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/login";
        return;
      }

      // Lấy Tên hiển thị và Role
      const { data: user } = await supabase
        .from('users')
        .select('full_name, role')
        .eq('id', session.user.id)
        .single();
      
      if (user?.role === 'pt' || user?.role === 'coach') {
        window.location.href = "/coach";
        return;
      }

      if (user?.full_name) setUserName(user.full_name);

      // Lấy Giáo án (Program) -> Giai đoạn (Blocks) -> Lịch tập (Workouts)
      const { data: program } = await supabase
        .from('programs')
        .select(`
          id, name,
          blocks (
            id, name, order_index,
            workouts (
              id, name, week_number, order_index, is_completed,
              workout_exercises (
                target_sets,
                workout_logs (id)
              )
            )
          )
        `)
        .eq('client_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (program) {
        // Gom nhóm workouts theo tuần để dễ render UI
        const currentBlock = program.blocks[0]; // Tạm lấy block đầu tiên
        if (currentBlock) {
          const weeksMap: any = {};
          
          // Sắp xếp Workouts theo order_index
          const sortedWorkouts = currentBlock.workouts.sort((a: any, b: any) => a.order_index - b.order_index);

          sortedWorkouts.forEach((w: any) => {
            let totalTarget = 0;
            let totalLogged = 0;
            w.workout_exercises?.forEach((ex: any) => {
               totalTarget += (ex.target_sets || 3);
               totalLogged += (ex.workout_logs?.length || 0);
            });

            let status = "pending";
            if (w.is_completed) {
                if (totalLogged >= totalTarget && totalTarget > 0) {
                    status = "perfect"; // 100% -> Gold
                } else {
                    status = "partial"; // Thiếu bài -> Green
                }
            }

            if (!weeksMap[w.week_number]) {
              weeksMap[w.week_number] = {
                id: w.week_number,
                name: `Tuần ${w.week_number}`,
                workouts: []
              };
            }
            weeksMap[w.week_number].workouts.push({
              id: w.id,
              name: w.name,
              status: status
            });
          });

          // Đảm bảo luôn có 4 tuần (nếu thiếu thì thêm rỗng)
          for(let i=1; i<=4; i++) {
             if(!weeksMap[i]) weeksMap[i] = { id: i, name: `Tuần ${i}`, workouts: [] };
          }

          const processedData = {
            title: currentBlock.name,
            weeks: Object.values(weeksMap).sort((a: any, b: any) => a.id - b.id)
          };
          setProgramData(processedData);
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
    return <div className="min-h-screen flex items-center justify-center bg-brand-paper font-bold text-brand-moss">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-brand-paper shadow-2xl relative pb-24">
      {/* Header */}
      <div className="bg-brand-mossDeep text-brand-sage p-5 rounded-b-2xl shadow-md">
        <div className="inline-flex items-center mb-4 px-2 py-1 border border-brand-sand/80 rounded-md shadow-sm">
          <span className="text-brand-sand text-[11px] font-bold uppercase tracking-[0.15em]">
            CK Coaching
          </span>
        </div>
        
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Chào {userName}!</h1>
            <p className="text-sm opacity-90">Sẵn sàng cho buổi tập hôm nay chưa?</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-11 h-11 bg-brand-moss rounded-full flex items-center justify-center font-bold text-white border border-brand-sage/30 uppercase">
              {userName.split(" ").pop()?.charAt(0)}
            </div>
            <button 
              onClick={handleLogout}
              className="w-11 h-11 flex items-center justify-center text-brand-sand hover:bg-white/10 rounded-full transition-colors"
              title="Đăng xuất"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Consistency Widget */}
        <div className="bg-brand-moss rounded-xl p-4 border border-brand-sage/20 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <Flame size={80} />
          </div>
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <div className="flex items-center space-x-2 text-brand-sand mb-1">
                <Flame size={16} />
                <span className="font-bold text-xs uppercase tracking-wider">Chuỗi tập luyện</span>
              </div>
              <p className="text-white text-sm">Tuân thủ: <span className="font-bold">100%</span> (Tuần này)</p>
            </div>
            <div className="w-10 h-10 bg-brand-sand rounded-full flex items-center justify-center">
              <span className="text-brand-mossDeep font-black text-lg">3</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5">
        {programData ? (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-brand-moss font-black text-lg flex items-center space-x-2">
                <CalendarDays size={20} className="text-brand-sand" />
                <span>{programData.title}</span>
              </h2>
            </div>

            <div className="flex space-x-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
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
    </div>
  );
}
