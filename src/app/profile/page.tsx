"use client";
import ClientNav from '@/components/ClientNav';
import { useState, useEffect } from "react";
import useSWR from 'swr';
import { supabase } from "@/lib/supabase";
import { Loader2, UserCircle, Activity, LogOut, Lock } from "lucide-react";

export default function ProfilePage() {
  const fetcher = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = "/login";
      return null;
    }
    const userId = session.user.id;
    const [userRes, profileRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).single(),
      supabase.from('client_profiles').select('*').eq('id', userId).single()
    ]);
    return { user: userRes.data, profile: profileRes.data };
  };

  const { data, isLoading: loading } = useSWR('profile_page', fetcher, { revalidateOnFocus: true });
  const user = data?.user;
  const profile = data?.profile;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-brand-paper shadow-2xl relative pb-24 font-nunito animate-pulse">
        {/* Header Skeleton */}
        <div className="bg-brand-mossDeep px-5 pb-6 pt-[max(env(safe-area-inset-top),20px)] rounded-b-[2rem] shadow-lg relative">
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="bg-white/20 px-3 py-1.5 rounded-lg w-28 h-7"></div>
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-[52px] h-[52px] bg-white/20 rounded-full border-[3px] border-white/10 shrink-0"></div>
            <div className="space-y-2">
              <div className="w-32 h-8 bg-white/20 rounded-lg"></div>
              <div className="w-24 h-3 bg-white/20 rounded-full"></div>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {/* Card 1 Skeleton */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <div className="w-32 h-6 bg-brand-line/50 rounded mb-4"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="w-16 h-3 bg-brand-line/40 rounded"></div>
                <div className="w-20 h-6 bg-brand-line/60 rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="w-16 h-3 bg-brand-line/40 rounded"></div>
                <div className="w-20 h-6 bg-brand-line/60 rounded"></div>
              </div>
            </div>
            <div className="bg-brand-line/20 h-24 rounded-xl mt-4 w-full"></div>
          </div>

          {/* Card 2 Skeleton */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <div className="w-24 h-6 bg-brand-line/50 rounded mb-4"></div>
            <div className="flex justify-between">
              <div className="w-12 h-4 bg-brand-line/40 rounded"></div>
              <div className="w-32 h-4 bg-brand-line/50 rounded"></div>
            </div>
            <div className="w-full h-12 bg-red-100/50 rounded-xl mt-4"></div>
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
              Hồ Sơ Thể Chất
            </p>
          </div>
        </div>
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
