"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, UserCircle, Target, Activity, CheckCircle, Dumbbell, Power, PowerOff, Gamepad2, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import dayjs from "dayjs";
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
    measurements: { chest: '', waist: '', belly: '', hips: '', thigh: '', arm: '' },
    injury_history: '',
    postural_issues: '',
    dietary_habits: '',
    notes: '',
    tracking_level: 1,
    target_steps: '',
    target_calories: '',
    target_protein: '',
    goal_type: 'cut',
    target_weight_num: ''
  });
  
  const [savedMessage, setSavedMessage] = useState('');
  
  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'));
  const [dailyMetrics, setDailyMetrics] = useState<any[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [currentRealWeek, setCurrentRealWeek] = useState<number>(1);

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
        measurements: profileData.measurements || { chest: '', waist: '', hips: '', thigh: '' },
        coaching_start_date: profileData.coaching_start_date || '',
        coaching_duration_weeks: profileData.coaching_duration_weeks || 12
      });
    }
    
    
    let calcCurrentWeek = 1;
    if (profileData?.coaching_start_date) {
      const start = dayjs(profileData.coaching_start_date).startOf('day');
      const today = dayjs().startOf('day');
      const diffDays = today.diff(start, 'day');
      if (diffDays >= 0) {
        calcCurrentWeek = Math.floor(diffDays / 7) + 1;
      } else {
        calcCurrentWeek = 1; // Not started yet
      }
      setCurrentRealWeek(calcCurrentWeek);
      setSelectedWeek(calcCurrentWeek);
      
      // Fetch ALL metrics for this client to render any tab quickly
      const { data: metrics } = await supabase.from('daily_metrics')
        .select('*').eq('client_id', clientId);
      if (metrics) setDailyMetrics(metrics);
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
      tracking_level: profile.tracking_level,
      target_steps: profile.target_steps || null,
      target_calories: profile.target_calories || null,
      target_protein: profile.target_protein || null,
      goal_type: profile.goal_type,
      target_weight_num: profile.target_weight_num || null,
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

  const getStepColor = (steps: number, target: number) => {
    if (!steps || !target) return 'text-gray-900';
    const ratio = steps / target;
    if (ratio >= 1) return 'bg-emerald-100 text-emerald-800 font-bold';
    if (ratio >= 0.8) return 'bg-amber-100 text-amber-800 font-bold';
    return 'bg-red-100 text-red-800 font-bold';
  };

  const getCalColor = (cals: number, target: number, goalType: string) => {
    if (!cals || !target) return 'text-gray-900';
    const ratio = cals / target;
    if (ratio >= 0.9 && ratio <= 1.1) return 'bg-emerald-100 text-emerald-800 font-bold';
    
    if (goalType === 'cut') {
      if (ratio >= 0.8 && ratio < 0.9) return 'bg-amber-100 text-amber-800 font-bold';
      return 'bg-red-100 text-red-800 font-bold';
    } else if (goalType === 'bulk') {
      if (ratio > 1.1 && ratio <= 1.2) return 'bg-amber-100 text-amber-800 font-bold';
      return 'bg-red-100 text-red-800 font-bold';
    }
    // maintain
    return 'bg-red-100 text-red-800 font-bold';
  };

  const getProColor = (pro: number, target: number) => {
    if (!pro || !target) return 'text-gray-900';
    const ratio = pro / target;
    if (ratio >= 0.95) return 'bg-emerald-100 text-emerald-800 font-bold';
    if (ratio >= 0.8) return 'bg-amber-100 text-amber-800 font-bold';
    return 'bg-red-100 text-red-800 font-bold';
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

  if (loading) return <div className="min-h-screen bg-brand-paper flex items-center justify-center p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-sage" /></div>;
  if (!user) return <div className="min-h-screen bg-brand-paper flex items-center justify-center p-8 text-center text-red-500">Không tìm thấy thông tin học viên.</div>;

  return (
    <div className="min-h-screen bg-brand-paper">
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
            href={`/coach/program?clientId=${clientId}`}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium border transition-colors ${
              !user.is_active ? 'bg-gray-100 text-gray-400 border-gray-200 pointer-events-none' : 'bg-brand-moss text-white hover:bg-brand-mossDeep shadow-md border-transparent'
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
            <UserCircle className="w-5 h-5 text-brand-sage" /> Thông tin
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
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Mục tiêu</label>
            <input type="text" value={profile.target_weight} onChange={e => setProfile({...profile, target_weight: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 outline-none focus:border-brand-sage" />
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

      {/* Cài đặt Tracking & Gamification */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-5">
        <h2 className="font-bold flex items-center gap-2 text-gray-800 border-b pb-2">
          <Gamepad2 className="w-5 h-5 text-brand-sage" /> Cài đặt Tracking & Gamification
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 bg-brand-paper/30 p-3 rounded-xl border border-brand-line/50">
              <div>
                <label className="block text-[10px] font-black text-brand-moss mb-1 uppercase tracking-wider">Ngày bắt đầu (Thứ 2)</label>
                <input type="date" value={profile?.coaching_start_date || ''} onChange={e => setProfile({...profile, coaching_start_date: e.target.value})} className="w-full bg-white border border-gray-200 rounded-lg p-2 outline-none focus:border-brand-sage font-bold text-gray-800 text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-brand-moss mb-1 uppercase tracking-wider">Số tuần Coaching</label>
                <select value={profile?.coaching_duration_weeks || 12} onChange={e => setProfile({...profile, coaching_duration_weeks: parseInt(e.target.value)})} className="w-full bg-white border border-gray-200 rounded-lg p-2 outline-none focus:border-brand-sage font-bold text-gray-800 text-sm">
                  <option value={4}>4 Tuần</option>
                  <option value={8}>8 Tuần</option>
                  <option value={12}>12 Tuần</option>
                  <option value={16}>16 Tuần</option>
                  <option value={24}>24 Tuần</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Level Mở Khóa Khách Hàng</label>
              <div className="flex gap-2">
                {[1, 2, 3].map(level => (
                  <button
                    key={level}
                    onClick={() => setProfile({...profile, tracking_level: level})}
                    className={`flex-1 py-2 rounded-lg font-bold border transition-colors ${profile.tracking_level === level ? 'bg-brand-moss text-white border-brand-moss' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'}`}
                  >
                    Level {level}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 mt-2 font-medium italic">
                {profile.tracking_level === 1 && "L1: Chỉ nhập Cân nặng (Dành cho 2 tuần đầu)."}
                {profile.tracking_level === 2 && "L2: Cân nặng + Bước chân (Bắt đầu tạo thói quen vận động)."}
                {profile.tracking_level === 3 && "L3: Full tính năng (+Calo & Protein). Dành cho khách đã hiểu về dinh dưỡng."}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Chế Độ Dinh Dưỡng</label>
              <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200">
                <button
                  onClick={() => setProfile({...profile, goal_type: 'cut'})}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${profile.goal_type === 'cut' ? 'bg-white shadow-sm text-green-600' : 'text-gray-400'}`}
                >
                  🟢 Giảm mỡ
                </button>
                <button
                  onClick={() => setProfile({...profile, goal_type: 'bulk'})}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${profile.goal_type === 'bulk' ? 'bg-white shadow-sm text-red-500' : 'text-gray-400'}`}
                >
                  🔴 Tăng cân
                </button>
                <button
                  onClick={() => setProfile({...profile, goal_type: 'maintain'})}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${profile.goal_type === 'maintain' ? 'bg-white shadow-sm text-blue-500' : 'text-gray-400'}`}
                >
                  ⚪️ Duy trì (Recomp)
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Đích Cân Nặng (kg)</label>
              <input type="number" value={profile.target_weight_num || ''} onChange={e => setProfile({...profile, target_weight_num: e.target.value})} className="w-full bg-white border border-gray-200 rounded-lg p-2 outline-none focus:border-brand-sage font-black text-gray-800" placeholder="VD: 65" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Target Steps</label>
              <input type="number" value={profile.target_steps || ''} onChange={e => setProfile({...profile, target_steps: e.target.value})} className="w-full bg-white border border-gray-200 rounded-lg p-2 outline-none focus:border-brand-sage font-black text-gray-800" placeholder="VD: 10000" />
            </div>
            <div className="col-span-2 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Target Calo</label>
                <input type="number" value={profile.target_calories || ''} onChange={e => setProfile({...profile, target_calories: e.target.value})} className="w-full bg-white border border-gray-200 rounded-lg p-2 outline-none focus:border-brand-sage font-black text-gray-800" placeholder="VD: 2000" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Target Đạm (g)</label>
                <input type="number" value={profile.target_protein || ''} onChange={e => setProfile({...profile, target_protein: e.target.value})} className="w-full bg-white border border-gray-200 rounded-lg p-2 outline-none focus:border-brand-sage font-black text-gray-800" placeholder="VD: 150" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nhật ký sinh hoạt (Google Sheet 12 Weeks Style) */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <h2 className="font-bold flex items-center gap-2 text-gray-800 border-b pb-2">
          <CalendarDays className="w-5 h-5 text-brand-sage" /> Quản trị Lộ trình ({profile?.coaching_duration_weeks || 12} Tuần)
        </h2>
        
        {!profile?.coaching_start_date ? (
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl text-orange-800 text-sm font-semibold text-center">
            ⚠️ Vui lòng cài đặt "Ngày bắt đầu (Thứ 2)" ở khung phía trên và bấm Lưu hồ sơ để kích hoạt Bảng theo dõi!
          </div>
        ) : (
          <>
            {/* Tabs Cuộn */}
            <div className="flex gap-2 overflow-x-auto pt-2 pr-2 pb-2 scrollbar-hide">
              {Array.from({length: profile.coaching_duration_weeks}, (_, i) => i + 1).map(w => {
                const isCurrent = w === currentRealWeek;
                const isSelected = w === selectedWeek;
                return (
                  <button
                    key={w}
                    onClick={() => setSelectedWeek(w)}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-all relative ${
                      isSelected 
                        ? 'bg-brand-moss text-brand-sand shadow-md' 
                        : isCurrent 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-gray-50 text-gray-400 border border-gray-100 hover:bg-gray-100'
                    }`}
                  >
                    Tuần {w}
                    {isCurrent && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bảng Dữ liệu của Tuần được chọn */}
            {(() => {
              const weekStartDate = dayjs(profile.coaching_start_date).add((selectedWeek - 1) * 7, 'day');
              const weekDays = Array.from({length: 7}, (_, i) => weekStartDate.add(i, 'day'));
              
              // Tính toán Tổng kết
              let totalSteps = 0;
              let totalCal = 0;
              let totalPro = 0;
              let totalWeight = 0;
              let weightDays = 0;
              let dietDays = 0;

              const rows = weekDays.map(day => {
                const dateStr = day.format('YYYY-MM-DD');
                const row = dailyMetrics.find(m => m.date === dateStr);
                if (row) {
                  totalSteps += (row.steps || 0);
                  if (row.calories) { totalCal += row.calories; dietDays++; }
                  if (row.protein) totalPro += row.protein;
                  if (row.weight) { totalWeight += parseFloat(row.weight); weightDays++; }
                }
                return { day, dateStr, row };
              });

              const targetStepsW = (profile.target_steps || 0) * 7;
              const targetCalW = (profile.target_calories || 0) * 7;
              const targetProW = (profile.target_protein || 0) * 7;

              const stepProgress = targetStepsW > 0 ? (totalSteps / targetStepsW) * 100 : 0;
              const calProgress = targetCalW > 0 ? (totalCal / targetCalW) * 100 : 0;
              const proProgress = targetProW > 0 ? (totalPro / targetProW) * 100 : 0;

              return (
                <div className="space-y-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cân TB Tuần</p>
                      <p className="text-xl font-black text-brand-moss">{weightDays > 0 ? (totalWeight / weightDays).toFixed(1) : '--'} <span className="text-sm">kg</span></p>
                    </div>
                    <div className={`p-3 rounded-xl border ${stepProgress >= 100 ? 'bg-emerald-50 border-emerald-200' : stepProgress >= 80 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-60">Tiến độ Steps</p>
                      <p className="text-xl font-black">{stepProgress.toFixed(1)}%</p>
                      <p className="text-xs font-bold opacity-60">{totalSteps.toLocaleString()} / {targetStepsW.toLocaleString()}</p>
                    </div>
                    <div className={`p-3 rounded-xl border ${calProgress >= 90 && calProgress <= 110 ? 'bg-emerald-50 border-emerald-200' : calProgress >= 80 && calProgress <= 120 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-60">Tiến độ Calo</p>
                      <p className="text-xl font-black">{calProgress.toFixed(1)}%</p>
                      <p className="text-xs font-bold opacity-60">{totalCal.toLocaleString()} / {targetCalW.toLocaleString()}</p>
                    </div>
                    <div className={`p-3 rounded-xl border ${proProgress >= 95 ? 'bg-emerald-50 border-emerald-200' : proProgress >= 80 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-60">Tiến độ Protein</p>
                      <p className="text-xl font-black">{proProgress.toFixed(1)}%</p>
                      <p className="text-xs font-bold opacity-60">{totalPro.toLocaleString()} / {targetProW.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* 7-Day Table */}
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-brand-moss text-white font-bold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="p-3 border-b border-brand-mossDeep">Ngày</th>
                          <th className="p-3 border-b border-brand-mossDeep text-center">Cân (kg)</th>
                          <th className="p-3 border-b border-brand-mossDeep text-center">Bước chân</th>
                          <th className="p-3 border-b border-brand-mossDeep text-center">Calo in</th>
                          <th className="p-3 border-b border-brand-mossDeep text-center">Protein (g)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(({day, dateStr, row}) => {
                          const isToday = day.isSame(dayjs(), 'day');
                          return (
                            <tr key={dateStr} className={`border-b border-gray-100 hover:bg-gray-50/50 ${isToday ? 'bg-brand-moss/5' : ''}`}>
                              <td className="p-2 whitespace-nowrap">
                                <span className="font-bold text-gray-700">{day.format('ddd')}</span>
                                <span className="text-xs text-gray-400 ml-1">{day.format('DD/MM')}</span>
                              </td>
                              <td className="p-2 text-center font-medium text-gray-700">{row?.weight || '-'}</td>
                              
                              <td className="p-1 text-center">
                                <div className={`py-1.5 rounded-md ${getStepColor(row?.steps, row?.target_steps || profile.target_steps)}`}>
                                  {row?.steps ? row.steps.toLocaleString() : '-'}
                                </div>
                              </td>
                              
                              <td className="p-1 text-center">
                                <div className={`py-1.5 rounded-md ${getCalColor(row?.calories, row?.target_calories || profile.target_calories, row?.goal_type || profile.goal_type)}`}>
                                  {row?.calories ? row.calories.toLocaleString() : '-'}
                                </div>
                              </td>
                              
                              <td className="p-1 text-center">
                                <div className={`py-1.5 rounded-md ${getProColor(row?.protein, row?.target_protein || profile.target_protein)}`}>
                                  {row?.protein || '-'}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </>
        )}
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
        <div className="max-w-3xl w-full flex justify-center items-center gap-4">
          {savedMessage && <span className="text-brand-sage font-medium flex items-center gap-1"><CheckCircle className="w-5 h-5"/> {savedMessage}</span>}
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center gap-2 bg-brand-moss text-white px-12 py-3.5 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all w-full md:w-auto min-w-[200px]"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Lưu Hồ Sơ
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}
