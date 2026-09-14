"use client";
import { useState, useEffect } from "react";
import { Users, BookOpen, Dumbbell, Settings, Search, Plus, ArrowRight, LogOut, Loader2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function PTDashboard() {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);

  // Lấy dữ liệu thật từ Supabase
  useEffect(() => {
    const checkSessionAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/login";
        return;
      }

      // Kiểm tra Role HLV
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();
        
      if (userData?.role !== 'pt' && userData?.role !== 'coach') {
        window.location.href = "/";
        return;
      }

      // Lấy danh sách Học viên thông qua các chương trình (Gom nhóm 1 profile/khách)
      const { data: programs } = await supabase.from('programs').select(`
        id, name, client_id,
        client:users!client_id(id, full_name, email),
        blocks ( workouts ( id, is_completed ) )
      `).eq('coach_id', session.user.id).order('created_at', { ascending: false });

      if (programs) {
        // Gom nhóm theo client_id
        const clientMap = new Map();
        
        programs.forEach(prog => {
          if (!prog.client) return;
          if (!clientMap.has(prog.client_id)) {
            // Lấy program mới nhất làm đại diện tính stats
            let completedWorkouts = 0;
            let totalWorkouts = 0;
            
            prog.blocks?.forEach((b: any) => {
              b.workouts?.forEach((w: any) => {
                totalWorkouts++;
                if (w.is_completed) completedWorkouts++;
              });
            });

            const compliance = totalWorkouts === 0 ? 0 : Math.round((completedWorkouts / totalWorkouts) * 100);
            const status = compliance >= 80 ? "excellent" : compliance < 30 ? "warning" : "good";
            const badgeText = compliance >= 80 ? "Phong độ cao" : compliance < 30 ? "Cần nhắc nhở" : "Ổn định";

            clientMap.set(prog.client_id, {
              id: prog.client.id,
              programId: prog.id,
              name: prog.client.full_name || "Học viên",
              email: prog.client.email,
              program: prog.name || "Chương trình tập",
              latestProgramName: prog.name,
              totalPrograms: 1, // Đếm số phase
              weekStats: `${completedWorkouts}/${totalWorkouts || 4}`,
              monthStats: `${completedWorkouts}/${totalWorkouts || 16}`,
              status: status,
              badgeText: badgeText
            });
          } else {
            // Nếu đã có, chỉ tăng biến đếm số Phase
            const existing = clientMap.get(prog.client_id);
            existing.totalPrograms += 1;
          }
        });

        setClients(Array.from(clientMap.values()));
      }
      setLoading(false);
    };

    checkSessionAndFetch();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-brand-paper"><Loader2 className="animate-spin mr-2 text-brand-moss" size={24}/> <span className="font-bold text-brand-moss">Đang tải dữ liệu HLV...</span></div>;
  }

  return (
    <div className="min-h-screen bg-brand-paper/50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-brand-mossDeep text-brand-sage hidden md:flex flex-col shadow-2xl z-10">
        <div className="p-6 border-b border-brand-sage/10">
          <div className="inline-flex items-center px-3 py-1.5 border border-brand-sand/80 rounded-md shadow-sm mb-2">
            <span className="text-brand-sand text-[12px] font-bold uppercase tracking-[0.15em]">
              CK Coaching
            </span>
          </div>
          <p className="text-[11px] font-semibold opacity-60 uppercase tracking-widest text-brand-sage">Trang Quản Trị</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <a href="/coach" className="flex items-center space-x-3 bg-brand-moss text-white px-4 py-3 rounded-xl font-bold shadow-md">
            <Users size={20} />
            <span>Khách hàng</span>
          </a>
          <a href="/coach/templates" className="flex items-center space-x-3 text-brand-sage/70 hover:text-white hover:bg-brand-moss/30 px-4 py-3 rounded-xl transition-all">
            <BookOpen size={20} />
            <span>Giáo án mẫu</span>
          </a>
          <a href="/coach/exercises" className="flex items-center space-x-3 text-brand-sage/70 hover:text-white hover:bg-brand-moss/30 px-4 py-3 rounded-xl transition-all">
            <Dumbbell size={20} />
            <span>Kho bài tập</span>
          </a>
        </nav>

        <div className="p-4 border-t border-brand-sage/10">
          <a href="#" className="flex items-center space-x-3 text-brand-sage/70 hover:text-white px-4 py-2 mb-2 transition-all">
            <Settings size={20} />
            <span>Cài đặt</span>
          </a>
          <button onClick={handleLogout} className="flex w-full items-center space-x-3 text-brand-sage/70 hover:text-red-400 px-4 py-2 transition-colors">
            <LogOut size={20} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
        <header className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-brand-moss">Quản lý Khách hàng</h1>
            <p className="text-sm text-brand-moss/60 mt-1">Theo dõi tiến độ và tỷ lệ tuân thủ của học viên</p>
          </div>
        </header>

        {/* Tìm kiếm */}
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-brand-line flex items-center mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-moss/40" size={20} />
            <input 
              type="text" 
              placeholder="Tìm kiếm học viên..." 
              className="w-full pl-12 pr-4 py-3 bg-transparent border-none focus:outline-none focus:ring-0 text-brand-moss font-medium placeholder:font-normal"
            />
          </div>
        </div>

        {/* Danh sách Khách hàng */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.length === 0 ? (
            <div className="col-span-full bg-white p-8 rounded-2xl border border-brand-line border-dashed text-center text-brand-moss/60">
              Chưa có học viên nào.
            </div>
          ) : clients.map(client => (
            <div key={client.id} className="bg-white p-6 rounded-2xl shadow-sm border border-brand-line hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              
              <div className="flex justify-between items-start mb-4">
                <div className="w-14 h-14 bg-brand-paper text-brand-moss rounded-full flex items-center justify-center font-black text-2xl border border-brand-line/50 uppercase">
                  {client.name.split(" ").pop()?.charAt(0)}
                </div>
                
                {/* Badge Trạng Thái */}
                <div className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border shadow-sm ${
                  client.status === 'excellent' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                  client.status === 'warning' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {client.badgeText}
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-brand-moss">{client.name}</h3>
              <p className="text-sm font-medium text-brand-moss/60 mt-1 mb-4 flex items-center gap-1.5">
                <BookOpen size={14} /> Có {client.totalPrograms} Giáo án (Phases)
              </p>
              
              {/* Box Thống kê chi tiết Phase gần nhất */}
              <div className="bg-brand-paper/50 rounded-xl p-3 mb-5 border border-brand-line/50">
                <p className="text-[10px] font-bold text-brand-moss/40 uppercase tracking-wider mb-1 truncate">Đang tập: {client.latestProgramName}</p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex-1">
                    <p className="font-bold text-brand-moss text-lg">{client.monthStats} <span className="text-xs font-normal opacity-70">buổi</span></p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-brand-line/50">
                <button 
                  onClick={() => window.location.href = `/coach/progress?clientId=${client.id}`}
                  className="text-center py-2.5 text-sm font-bold text-brand-moss bg-brand-paper hover:bg-brand-sand/30 border border-brand-line rounded-xl transition-colors"
                >
                  Tiến độ
                </button>
                <button 
                  onClick={() => window.location.href = `/coach/program?clientId=${client.id}`}
                  className="text-center py-2.5 text-sm font-bold text-white bg-brand-moss hover:bg-brand-mossDeep rounded-xl transition-colors shadow-md flex items-center justify-center gap-1 group"
                >
                  Giáo án
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
