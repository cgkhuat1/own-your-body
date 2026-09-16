"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, UserCircle, Target, Activity, CheckCircle, Dumbbell, Power, PowerOff } from "lucide-react";
import Link from "next/link";

export default function ClientProfileDetail() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>({
    height: '',
    current_weight: '',
    target_weight: '',
    dob: '',
    measurements: { chest: '', waist: '', hips: '', thigh: '' },
    injury_history: '',
    postural_issues: '',
    dietary_habits: '',
    notes: ''
  });
  
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    fetchClientData();
  }, [clientId]);

  const fetchClientData = async () => {
    setLoading(true);
    // Fetch user basic info
    const { data: userData } = await supabase.from('users').select('*').eq('id', clientId).single();
    if (userData) setUser(userData);

    // Fetch profile
    const { data: profileData } = await supabase.from('client_profiles').select('*').eq('id', clientId).single();
    if (profileData) {
      setProfile({
        ...profileData,
        dob: profileData.dob || '',
        measurements: profileData.measurements || { chest: '', waist: '', hips: '', thigh: '' }
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    
    // Cập nhật tên trong bảng users
    await supabase.from('users').update({ full_name: user.full_name }).eq('id', clientId);

    // UPSERT profile trong bảng client_profiles
    const { error } = await supabase.from('client_profiles').upsert({
      id: clientId,
      height: profile.height || null,
      current_weight: profile.current_weight || null,
      target_weight: profile.target_weight || null,
      dob: profile.dob || null,
      measurements: profile.measurements,
      injury_history: profile.injury_history,
      postural_issues: profile.postural_issues,
      dietary_habits: profile.dietary_habits,
      notes: profile.notes,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    setSaving(false);
    if (!error) {
      setSavedMessage('Đã lưu thành công!');
      setTimeout(() => setSavedMessage(''), 3000);
    } else {
      alert("Lỗi: " + error.message);
    }
  };

  const handleToggleActive = async () => {
    if (!user) return;
    
    const newStatus = !user.is_active;
    const confirmMessage = newStatus 
      ? "Khôi phục tài khoản này? Khách hàng sẽ tiếp tục truy cập được lịch tập."
      : "Đóng băng tài khoản này? Khách sẽ bị đẩy xuống cuối danh sách và bị chặn truy cập app.";
      
    if (!window.confirm(confirmMessage)) return;

    setIsDeactivating(true);
    const { error } = await supabase.from('users').update({ is_active: newStatus }).eq('id', clientId);
    setIsDeactivating(false);

    if (!error) {
      setUser({ ...user, is_active: newStatus });
      setSavedMessage(newStatus ? 'Đã khôi phục hoạt động!' : 'Đã đóng băng tài khoản!');
      setTimeout(() => setSavedMessage(''), 3000);
    } else {
      alert("Lỗi cập nhật trạng thái: " + error.message);
    }
  };

  const handleMeasurementChange = (key: string, value: string) => {
    setProfile({
      ...profile,
      measurements: { ...profile.measurements, [key]: value }
    });
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-sage" /></div>;
  if (!user) return <div className="p-8 text-center text-red-500">Không tìm thấy thông tin học viên.</div>;

  return (
    <div className={`p-6 max-w-3xl mx-auto space-y-6 pb-24 transition-all ${!user.is_active ? 'grayscale-[0.5]' : ''}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/coach')} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Hồ sơ học viên 
              {!user.is_active && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded-md uppercase tracking-wider">Đã đóng băng</span>}
            </h1>
            <p className="text-gray-500 text-sm">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleToggleActive}
            disabled={isDeactivating}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium border transition-colors ${
              user.is_active 
                ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' 
                : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
            }`}
          >
            {isDeactivating ? <Loader2 className="w-5 h-5 animate-spin" /> : (user.is_active ? <PowerOff className="w-5 h-5" /> : <Power className="w-5 h-5" />)}
            {user.is_active ? 'Đóng băng' : 'Khôi phục'}
          </button>
          
          <Link 
            href={`/coach/program?client=${clientId}`}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium border transition-colors ${
              !user.is_active ? 'bg-gray-100 text-gray-400 border-gray-200 pointer-events-none' : 'bg-brand-sand text-brand-sage border-brand-sage/20 hover:bg-brand-sage/10'
            }`}
          >
            <Dumbbell className="w-5 h-5" />
            Giáo Án
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Thông tin cơ bản */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="font-bold flex items-center gap-2 text-gray-800 border-b pb-2">
            <UserCircle className="w-5 h-5 text-brand-sage" /> Thông tin Hành chính
          </h2>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Họ và Tên</label>
            <input 
              type="text" 
              value={user.full_name || ''} 
              onChange={e => setUser({...user, full_name: e.target.value})} 
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 outline-none focus:border-brand-sage font-medium text-gray-900" 
              placeholder="Nhập tên học viên..."
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Ngày sinh</label>
            <input 
              type="date" 
              value={profile.dob || ''} 
              onChange={e => setProfile({...profile, dob: e.target.value})} 
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 outline-none focus:border-brand-sage font-medium text-gray-900" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Chiều cao (cm)</label>
              <input type="number" value={profile.height} onChange={e => setProfile({...profile, height: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 outline-none focus:border-brand-sage" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Hiện tại (kg)</label>
              <input type="number" value={profile.current_weight} onChange={e => setProfile({...profile, current_weight: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 outline-none focus:border-brand-sage" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Mục tiêu cân nặng (kg)</label>
            <input type="number" value={profile.target_weight} onChange={e => setProfile({...profile, target_weight: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 outline-none focus:border-brand-sage" />
          </div>
        </div>

        {/* Số đo các vòng */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="font-bold flex items-center gap-2 text-gray-800 border-b pb-2">
            <Target className="w-5 h-5 text-brand-sage" /> Số đo các vòng (cm)
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Vòng Ngực</label>
              <input type="number" value={profile.measurements.chest} onChange={e => handleMeasurementChange('chest', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 outline-none focus:border-brand-sage" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Vòng Eo</label>
              <input type="number" value={profile.measurements.waist} onChange={e => handleMeasurementChange('waist', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 outline-none focus:border-brand-sage" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Vòng Mông</label>
              <input type="number" value={profile.measurements.hips} onChange={e => handleMeasurementChange('hips', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 outline-none focus:border-brand-sage" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Vòng Đùi</label>
              <input type="number" value={profile.measurements.thigh} onChange={e => handleMeasurementChange('thigh', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 outline-none focus:border-brand-sage" />
            </div>
          </div>
        </div>
      </div>

      {/* Đánh giá chuyên môn */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <h2 className="font-bold flex items-center gap-2 text-gray-800 border-b pb-2">
          <Activity className="w-5 h-5 text-brand-sage" /> Đánh giá chuyên môn (HLV)
        </h2>
        
        <div>
          <label className="block text-sm font-bold text-gray-500 mb-1 uppercase tracking-wider">Lịch sử chấn thương / Bệnh lý</label>
          <textarea 
            rows={3} 
            value={profile.injury_history} 
            onChange={e => setProfile({...profile, injury_history: e.target.value})} 
            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 outline-none focus:border-brand-sage"
            placeholder="VD: Thoát vị đĩa đệm L4-L5, từng mổ dây chằng chéo trước..."
          />
        </div>
        
        <div>
          <label className="block text-sm font-bold text-gray-500 mb-1 uppercase tracking-wider">Phân tích tư thế (Posture)</label>
          <textarea 
            rows={3} 
            value={profile.postural_issues} 
            onChange={e => setProfile({...profile, postural_issues: e.target.value})} 
            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 outline-none focus:border-brand-sage"
            placeholder="VD: Võng lưng (APT), gù vai, sập vòm bàn chân trái..."
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-500 mb-1 uppercase tracking-wider">Thói quen ăn uống / Sinh hoạt</label>
          <textarea 
            rows={3} 
            value={profile.dietary_habits} 
            onChange={e => setProfile({...profile, dietary_habits: e.target.value})} 
            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 outline-none focus:border-brand-sage"
            placeholder="VD: Làm văn phòng ngồi nhiều, hay nhậu cuối tuần, ít ăn rau..."
          />
        </div>
      </div>

      {/* Save Button Fixed Bottom */}
      <div className="fixed bottom-[72px] md:bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 flex justify-center z-40">
        <div className="max-w-3xl w-full flex justify-end items-center gap-4">
          {savedMessage && <span className="text-brand-sage font-medium flex items-center gap-1"><CheckCircle className="w-5 h-5"/> {savedMessage}</span>}
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-brand-sage text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Lưu Hồ Sơ
          </button>
        </div>
      </div>
    </div>
  );
}
