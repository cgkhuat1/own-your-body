"use client";
import ClientNav from '@/components/ClientNav';
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, UserCircle, Activity, LogOut, Lock } from "lucide-react";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = "/login"; return; }

    const [userRes, profileRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', session.user.id).single(),
      supabase.from('client_profiles').select('*').eq('id', session.user.id).single()
    ]);

    if (userRes.data) setUser(userRes.data);
    if (profileRes.data) setProfile(profileRes.data);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-sage" /></div>;

  return (
    <div className="min-h-screen bg-brand-paper/50 pb-24 font-nunito">
      {/* Header */}
      <div className="bg-brand-mossDeep text-brand-sage px-5 pb-5 pt-[max(env(safe-area-inset-top),20px)] rounded-b-2xl shadow-md">
        <div className="flex justify-between items-center mb-4">
          <div className="inline-flex items-center px-2 py-1 border border-brand-sand/80 rounded-md shadow-sm">
            <span className="text-brand-sand text-[11px] font-bold uppercase tracking-[0.15em]">CK Coaching</span>
          </div>
          <button onClick={handleLogout} className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors border border-white/20">
            <LogOut size={18} className="text-brand-sand" />
          </button>
        </div>
        <h1 className="text-2xl font-black text-white">Hồ Sơ Của Bạn</h1>
      </div>

      <div className="p-5 space-y-6">
        {/* Hồ sơ thể chất */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="font-bold flex items-center gap-2 text-gray-800 border-b pb-2">
            <UserCircle className="w-5 h-5 text-brand-sage" /> Hồ sơ thể chất
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Hiện tại</p>
              <p className="text-lg font-black text-brand-moss">{profile?.current_weight || '--'} kg</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Mục tiêu</p>
              <p className="text-lg font-black text-brand-moss">{profile?.target_weight || '--'}</p>
            </div>
          </div>
          
          {(profile?.injury_history || profile?.notes) && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-2">
              <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2"><Activity size={16}/> Lưu ý từ Coach</h3>
              {profile?.injury_history && <p className="text-xs text-amber-700 font-medium"><strong>Chấn thương:</strong> {profile.injury_history}</p>}
              {profile?.notes && <p className="text-xs text-amber-700 font-medium"><strong>Ghi chú:</strong> {profile.notes}</p>}
            </div>
          )}

          {profile?.action_plan && (
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-2">
              <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2">🎯 Phương án xử lý</h3>
              <p className="text-xs text-emerald-700 font-medium whitespace-pre-line">{profile.action_plan}</p>
            </div>
          )}
        </div>

        {/* Tài khoản */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="font-bold flex items-center gap-2 text-gray-800 border-b pb-2">
            <Lock className="w-5 h-5 text-brand-sage" /> Tài khoản
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2">
              <span className="text-gray-500 font-bold">Email</span>
              <span className="text-gray-800 font-medium">{user?.email || '--'}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl flex items-center justify-center gap-2 mt-4">
            <LogOut size={18} /> Đăng xuất
          </button>
        </div>
      </div>
      <ClientNav />
    </div>
  );
}
