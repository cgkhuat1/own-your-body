"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2, UserCircle, Target, Activity, Dumbbell } from "lucide-react";
import Link from "next/link";

export default function MyProfile() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetchMyData();
  }, []);

  const fetchMyData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = "/login";
      return;
    }

    const { data: userData } = await supabase.from('users').select('*').eq('id', session.user.id).single();
    if (userData) setUser(userData);

    const { data: profileData } = await supabase.from('client_profiles').select('*').eq('id', session.user.id).single();
    if (profileData) {
      setProfile({
        ...profileData,
        measurements: profileData.measurements || {}
      });
    }
    setLoading(false);
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-sage" /></div>;

  return (
    <div className="min-h-screen bg-brand-paper/50 pb-24">
      {/* Header */}
      <div className="bg-brand-moss text-white p-6 rounded-b-[2rem] shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Dumbbell size={100} />
        </div>
        
        <div className="relative z-10 flex items-center gap-4 mb-6">
          <Link href="/" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors backdrop-blur-md">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <span className="font-medium tracking-widest uppercase text-xs opacity-80">CK Coaching</span>
        </div>
        
        <div className="relative z-10">
          <h1 className="text-3xl font-black mb-1">Hồ sơ thể chất</h1>
          <p className="opacity-80">Thông tin và Đánh giá từ Huấn luyện viên</p>
        </div>
      </div>

      <div className="p-6 max-w-xl mx-auto space-y-6 -mt-4 relative z-20">
        
        {/* Chỉ số cơ thể */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-brand-line space-y-4">
          <h2 className="font-bold flex items-center gap-2 text-brand-moss border-b border-brand-line pb-2">
            <UserCircle className="w-5 h-5" /> Chỉ số cơ bản
          </h2>
          {profile ? (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-brand-paper/50 rounded-xl p-3">
                <p className="text-xs text-brand-moss/60 mb-1">Chiều cao</p>
                <p className="font-bold text-brand-moss">{profile.height ? `${profile.height} cm` : '--'}</p>
              </div>
              <div className="bg-brand-paper/50 rounded-xl p-3">
                <p className="text-xs text-brand-moss/60 mb-1">Hiện tại</p>
                <p className="font-bold text-brand-moss">{profile.current_weight ? `${profile.current_weight} kg` : '--'}</p>
              </div>
              <div className="bg-brand-paper/50 rounded-xl p-3">
                <p className="text-xs text-brand-moss/60 mb-1">Mục tiêu</p>
                <p className="font-bold text-emerald-600">{profile.target_weight ? `${profile.target_weight} kg` : '--'}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-brand-moss/60 italic">Chưa có dữ liệu.</p>
          )}
        </div>

        {/* Đánh giá chuyên môn */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-brand-line space-y-4">
          <h2 className="font-bold flex items-center gap-2 text-brand-moss border-b border-brand-line pb-2">
            <Activity className="w-5 h-5" /> Đánh giá chuyên môn
          </h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-brand-moss mb-1">Lịch sử chấn thương / Bệnh lý</h3>
              <div className="bg-brand-paper/30 rounded-xl p-3 text-sm text-brand-moss/80 border border-brand-line/50">
                {profile?.injury_history || <span className="italic opacity-50">Không có ghi chú.</span>}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-bold text-brand-moss mb-1">Phân tích tư thế</h3>
              <div className="bg-brand-paper/30 rounded-xl p-3 text-sm text-brand-moss/80 border border-brand-line/50">
                {profile?.postural_issues || <span className="italic opacity-50">Không có ghi chú.</span>}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-brand-moss mb-1">Dinh dưỡng & Sinh hoạt</h3>
              <div className="bg-brand-paper/30 rounded-xl p-3 text-sm text-brand-moss/80 border border-brand-line/50">
                {profile?.dietary_habits || <span className="italic opacity-50">Không có ghi chú.</span>}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
