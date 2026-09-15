"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Search, BookOpen, Settings, LogOut, ArrowRight, Loader2, Dumbbell, Plus } from "lucide-react";
import Link from "next/link";

export default function CoachDashboard() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>('coach');
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClient, setNewClient] = useState({ full_name: '', email: '', password: '' });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    checkSessionAndFetch();
  }, []);

  const checkSessionAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = "/login";
      return;
    }
    
    setCurrentUserId(session.user.id);
    
    // Check role
    const { data: me } = await supabase.from('users').select('role').eq('id', session.user.id).single();
    if (me) setCurrentUserRole(me.role);

    // Fetch all assigned clients
    let query = supabase.from('users').select('id, full_name, email, role, assigned_coach_id').neq('id', session.user.id);
    
    // Founders see all clients. Coaches see only theirs. 
    // RLS will naturally filter, but we explicitly filter just in case.
    if (me?.role?.toLowerCase() === 'coach') {
      query = query.eq('assigned_coach_id', session.user.id);
    }

    const { data: usersData } = await query;
    
    if (usersData) {
      // For each user, fetch their latest program to get stats
      const clientStats = await Promise.all(usersData.map(async (u) => {
        const { data: programs } = await supabase
          .from('programs')
          .select('id, name, blocks( workouts(id, is_completed) )')
          .eq('client_id', u.id)
          .order('created_at', { ascending: false });

        const totalPrograms = programs ? programs.length : 0;
        const latestProgram = programs && programs.length > 0 ? programs[0] : null;

        let completedWorkouts = 0;
        let totalWorkouts = 0;
        let compliance = 0;
        let status = "good";
        let badgeText = "Chưa có giáo án";

        if (latestProgram) {
          latestProgram.blocks?.forEach((block: any) => {
            block.workouts?.forEach((workout: any) => {
              totalWorkouts++;
              if (workout.is_completed) completedWorkouts++;
            });
          });
          compliance = totalWorkouts === 0 ? 0 : Math.round((completedWorkouts / totalWorkouts) * 100);
          status = compliance >= 80 ? "excellent" : compliance < 30 ? "warning" : "good";
          badgeText = compliance >= 80 ? "Phong độ cao" : compliance < 30 ? "Cần nhắc nhở" : "Ổn định";
        }

        return {
          id: u.id,
          name: u.full_name || "Học viên",
          email: u.email,
          totalPrograms,
          latestProgramName: latestProgram ? latestProgram.name : "Chưa có giáo án",
          weekStats: latestProgram ? `${completedWorkouts}/${totalWorkouts}` : "0/0",
          status,
          badgeText
        };
      }));

      setClients(clientStats);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setAddError('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newClient,
          role: 'client',
          assigned_coach_id: currentUserId // Assign to current coach/founder
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Có lỗi xảy ra');
      
      setShowAddModal(false);
      setNewClient({ full_name: '', email: '', password: '' });
      checkSessionAndFetch(); // Refresh list
    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-brand-paper"><Loader2 className="animate-spin mr-2 text-brand-moss" size={24}/> <span className="font-bold text-brand-moss">Đang tải dữ liệu HLV...</span></div>;
  }

  return (
    <div className="min-h-screen bg-brand-paper/50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-brand-mossDeep text-brand-sage hidden md:flex flex-col shadow-2xl z-10 fixed h-screen">
        <div className="p-6 border-b border-brand-sage/10">
          <div className="inline-flex items-center px-3 py-1.5 border border-brand-sand/80 rounded-md shadow-sm mb-2">
            <span className="text-brand-sand text-[12px] font-bold uppercase tracking-[0.15em]">CK Coaching</span>
          </div>
          <p className="text-[11px] font-semibold opacity-60 uppercase tracking-widest text-brand-sage">Trang Quản Trị</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <a href="/coach" className="flex items-center space-x-3 bg-brand-moss text-white px-4 py-3 rounded-xl font-bold shadow-md">
            <Users size={20} /><span>Khách hàng</span>
          </a>
          <a href="/coach/templates" className="flex items-center space-x-3 text-brand-sage/70 hover:text-white hover:bg-brand-moss/30 px-4 py-3 rounded-xl transition-all">
            <BookOpen size={20} /><span>Giáo án mẫu</span>
          </a>
          <a href="/coach/exercises" className="flex items-center space-x-3 text-brand-sage/70 hover:text-white hover:bg-brand-moss/30 px-4 py-3 rounded-xl transition-all">
            <Dumbbell size={20} /><span>Kho bài tập</span>
          </a>
        </nav>

        <div className="p-4 border-t border-brand-sage/10">
          <button onClick={handleLogout} className="flex w-full items-center space-x-3 text-brand-sage/70 hover:text-red-400 px-4 py-2 transition-colors">
            <LogOut size={20} /><span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 md:ml-64 max-w-6xl mx-auto w-full">
        <header className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-brand-moss">Quản lý Khách hàng</h1>
            <p className="text-sm text-brand-moss/60 mt-1">Theo dõi tiến độ và thông tin học viên</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-brand-moss text-white px-4 py-2.5 rounded-xl font-bold hover:bg-brand-mossDeep shadow-md transition-colors"
          >
            <Plus className="w-5 h-5" /> Thêm Học Viên
          </button>
        </header>

        {/* Danh sách Khách hàng */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.length === 0 ? (
            <div className="col-span-full bg-white p-8 rounded-2xl border border-brand-line border-dashed text-center text-brand-moss/60">
              Chưa có học viên nào. Bấm "Thêm Học Viên" để bắt đầu.
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
                    <p className="font-bold text-brand-moss text-lg">{client.weekStats} <span className="text-xs font-normal opacity-70">buổi</span></p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-brand-line/50">
                <Link 
                  href={`/coach/clients/${client.id}`}
                  className="text-center py-2 text-xs font-bold text-brand-sage bg-brand-paper hover:bg-brand-sand/30 border border-brand-line rounded-lg transition-colors flex flex-col items-center justify-center gap-1"
                >
                  <Users size={16} /> Hồ Sơ
                </Link>
                <Link 
                  href={`/coach/progress?clientId=${client.id}`}
                  className="text-center py-2 text-xs font-bold text-brand-sage bg-brand-paper hover:bg-brand-sand/30 border border-brand-line rounded-lg transition-colors flex flex-col items-center justify-center gap-1"
                >
                  <Activity size={16} /> Tiến độ
                </Link>
                <Link 
                  href={`/coach/program?clientId=${client.id}`}
                  className="text-center py-2 text-xs font-bold text-white bg-brand-moss hover:bg-brand-mossDeep rounded-lg transition-colors shadow-md flex flex-col items-center justify-center gap-1"
                >
                  <Dumbbell size={16} /> Giáo án
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-brand-moss mb-4">Tạo tài khoản Học viên</h2>
            <form onSubmit={handleAddClient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-moss mb-1">Họ tên</label>
                <input 
                  required
                  type="text" 
                  value={newClient.full_name}
                  onChange={e => setNewClient({...newClient, full_name: e.target.value})}
                  className="w-full rounded-xl p-3 bg-brand-paper/50 border border-brand-line focus:border-brand-moss focus:ring-1 focus:ring-brand-moss outline-none"
                  placeholder="VD: Nguyễn Tuấn Anh"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-moss mb-1">Email</label>
                <input 
                  required
                  type="email" 
                  value={newClient.email}
                  onChange={e => setNewClient({...newClient, email: e.target.value})}
                  className="w-full rounded-xl p-3 bg-brand-paper/50 border border-brand-line focus:border-brand-moss focus:ring-1 focus:ring-brand-moss outline-none"
                  placeholder="tuananh@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-moss mb-1">Mật khẩu cấp sẵn</label>
                <input 
                  required
                  type="text" 
                  value={newClient.password}
                  onChange={e => setNewClient({...newClient, password: e.target.value})}
                  className="w-full rounded-xl p-3 bg-brand-paper/50 border border-brand-line focus:border-brand-moss focus:ring-1 focus:ring-brand-moss outline-none"
                  placeholder="Nên đặt dễ nhớ, vd: ck123456"
                />
              </div>
              
              {addError && <p className="text-red-500 text-sm">{addError}</p>}
              
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 text-brand-moss font-bold bg-brand-paper hover:bg-brand-line rounded-xl transition-colors">
                  Hủy
                </button>
                <button type="submit" disabled={adding} className="flex-1 py-3 text-white font-bold bg-brand-moss hover:bg-brand-mossDeep rounded-xl flex justify-center shadow-md">
                  {adding ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Tạo Tài Khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
