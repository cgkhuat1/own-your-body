"use client";

import { usePathname } from "next/navigation";
import { Users, BookOpen, Dumbbell, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function CoachSidebar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <aside className="w-64 bg-brand-mossDeep text-white hidden md:flex flex-col shadow-2xl z-50 fixed h-screen top-0 left-0 border-r border-[#31251c]">
      <div className="p-6 border-b border-white/10 flex items-center justify-center">
        <div className="inline-flex items-center px-4 py-2 border border-white/30 rounded-lg shadow-sm">
          <span className="text-white text-[18px] font-black uppercase tracking-[0.1em]">OwnYourBody</span>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 mt-2">
        <a href="/coach" className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${pathname === '/coach' ? 'bg-white/20 text-white border border-white/10 font-bold shadow-md' : 'text-white hover:bg-white/10 font-medium'}`}>
          <Users size={20} /><span>Khách hàng</span>
        </a>
        <a href="/coach/templates" className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${pathname?.includes('/templates') ? 'bg-white/20 text-white border border-white/10 font-bold shadow-md' : 'text-white hover:bg-white/10 font-medium'}`}>
          <BookOpen size={20} /><span>Giáo án mẫu</span>
        </a>
        <a href="/coach/exercises" className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${pathname?.includes('/exercises') ? 'bg-white/20 text-white border border-white/10 font-bold shadow-md' : 'text-white hover:bg-white/10 font-medium'}`}>
          <Dumbbell size={20} /><span>Kho bài tập</span>
        </a>
      </nav>

      <div className="p-4 border-t border-white/10 mb-4">
        <button onClick={handleLogout} className="flex w-full items-center space-x-3 text-white hover:text-red-400 hover:bg-white/10 px-4 py-3 rounded-xl transition-colors font-medium">
          <LogOut size={20} /><span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
