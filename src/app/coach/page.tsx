"use client";
import { useState, useEffect } from "react";
import { Users, BookOpen, Dumbbell, Settings, Search, Plus, ArrowRight, LogOut, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function PTDashboard() {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);

  // Bảo vệ Route và lấy dữ liệu thật từ Supabase
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

      // Lấy danh sách Học viên qua bảng Programs
      const { data: programs } = await supabase.from('programs').select(`
        id, name,
        client:users!client_id (id, full_name, email),
        blocks (
          workouts (id, week_number, is_completed)
        )
      `).eq('pt_id', session.user.id);

      if (programs) {
        const processedClients = programs.map((prog: any) => {
          let totalWorkouts = 0;
          let completedWorkouts = 0;
          let currentWeek = 1;

          const block = prog.blocks?.[0];
          if (block && block.workouts) {
            totalWorkouts = block.workouts.length;
            completedWorkouts = block.workouts.filter((w: any) => w.is_completed).length;
            
            const pendingWorkouts = block.workouts.filter((w: any) => !w.is_completed).sort((a: any, b: any) => a.week_number - b.week_number);
            if (pendingWorkouts.length > 0) currentWeek = pendingWorkouts[0].week_number;
          }

          const compliance = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;
          const status = compliance >= 80 ? "excellent" : compliance < 30 ? "warning" : "good";
          const badgeText = compliance >= 80 ? "Phong độ cao" : compliance < 30 ? "Cần nhắc nhở" : "Ổn định";

          return {
            id: prog.client?.id || prog.id,
            programId: prog.id,
            name: prog.client?.full_name || "Học viên",
            program: prog.name || "Chương trình tập",
            currentWeek: currentWeek,
            weekStats: `${completedWorkouts}/${totalWorkouts || 4}`,
            monthStats: `${completedWorkouts}/${totalWorkouts || 16}`,
            status: status,
            badgeText: badgeText
          };
        });
        setClients(processedClients);
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
          <button className="bg-brand-sand text-brand-mossDeep px-6 py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-[#ebd8b7] transition-all shadow-md">
            <Plus size={20} />
            <span>Thêm Khách hàng</span>
          </button>
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
              <p className="text-sm font-medium text-brand-moss/60 mt-1 mb-4">{client.program} • Tuần {client.currentWeek}/4</p>
              
              {/* Box Thống kê chi tiết Tuần & Tháng */}
              <div className="flex items-center gap-4 bg-brand-paper/50 rounded-xl p-3 mb-5 border border-brand-line/50">
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-brand-moss/40 uppercase tracking-wider mb-1">Tuần này</p>
                  <p className="font-bold text-brand-moss text-lg">{client.weekStats} <span className="text-xs font-normal opacity-70">buổi</span></p>
                </div>
                <div className="w-px h-8 bg-brand-line"></div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-brand-moss/40 uppercase tracking-wider mb-1">Cả Khóa</p>
                  <p className="font-bold text-brand-moss text-lg">{client.monthStats} <span className="text-xs font-normal opacity-70">buổi</span></p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-brand-line/50">
                <button className="text-center py-2.5 text-sm font-bold text-brand-moss bg-brand-paper hover:bg-brand-sand/30 border border-brand-line rounded-xl transition-colors">
                  Tiến độ
                </button>
                <button 
                  onClick={() => window.location.href = `/coach/program?clientId=${client.id}&programId=${client.programId}`}
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
