"use client";

import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Loader2, TrendingUp, Search, Calendar, Dumbbell, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

// Formula Epley: 1RM = W * (1 + R/30)
const estimate1RM = (weight: number, reps: number) => {
  if (!weight || !reps) return 0;
  return Math.round(weight * (1 + reps / 30));
};

function ClientProgressInner() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId');

  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState("Học viên");
  const [logsData, setLogsData] = useState<any[]>([]);
  const [exercisesList, setExercisesList] = useState<{id: string, name: string}[]>([]);
  const [selectedExId, setSelectedExId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!clientId) return;
      setLoading(true);

      // Lấy thông tin user
      const { data: user } = await supabase.from('users').select('full_name').eq('id', clientId).single();
      if (user) setClientName(user.full_name);

      // Lấy toàn bộ Programs -> Blocks -> Workouts -> W_Exercises -> Logs
      const { data: progs } = await supabase.from('programs')
        .select(`
          name,
          blocks (
            name, order_index,
            workouts (
              name, week_number, order_index, completed_at, is_completed,
              workout_exercises (
                custom_name,
                exercises (id, name),
                workout_logs (id, set_number, weight, reps, rpe)
              )
            )
          )
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });

      if (progs) {
        const flatLogs: any[] = [];
        const exMap = new Map(); // Dùng để gom danh sách bài tập đã từng tập

        progs.forEach((prog: any) => {
          prog.blocks?.forEach((block: any) => {
            block.workouts?.forEach((workout: any) => {
              if (workout.workout_exercises) {
                workout.workout_exercises.forEach((wex: any) => {
                  const logs = wex.workout_logs || [];
                  if (logs.length > 0) {
                    const exId = wex.exercises?.id || 'unknown';
                    const exName = wex.custom_name || wex.exercises?.name || 'Bài tập';
                    
                    if (!exMap.has(exId)) {
                      exMap.set(exId, { id: exId, name: exName });
                    }

                    // Tính Max 1RM của cả buổi (Chỉ tính cho Squat, Deadlift, Bench Press)
                    let max1RM = 0;
                    const exNameLower = exName.toLowerCase();
                    const isBig3 = ['squat', 'deadlift', 'bench press', 'benchpress'].some(kw => exNameLower.includes(kw));

                    const sortedSets = logs.sort((a: any, b: any) => a.set_number - b.set_number);
                    if (isBig3) {
                      sortedSets.forEach((l: any) => {
                        const rm = estimate1RM(l.weight, l.reps);
                        if (rm > max1RM) max1RM = rm;
                      });
                    }

                    flatLogs.push({
                      exId,
                      exName,
                      programName: prog.name,
                      blockName: block.name,
                      workoutName: workout.name,
                      weekNumber: workout.week_number,
                      isCompleted: workout.is_completed,
                      completedAt: workout.completed_at,
                      max1RM,
                      sets: sortedSets
                    });
                  }
                });
              }
            });
          });
        });

        const exArray = Array.from(exMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        setExercisesList(exArray);
        
        // Sort logs theo thứ tự (giả định theo block -> week -> day)
        flatLogs.reverse(); // Đảo ngược để hiển thị mới nhất lên trên
        setLogsData(flatLogs);

        if (exArray.length > 0) {
          setSelectedExId(exArray[0].id);
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [clientId]);

  const filteredExercises = exercisesList.filter(ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const currentLogs = logsData.filter(log => log.exId === selectedExId);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-brand-paper"><Loader2 className="animate-spin text-brand-moss" size={32} /></div>;
  }

  const selectedExName = exercisesList.find(e => e.id === selectedExId)?.name || "Chọn bài tập";

  return (
    <div className="min-h-screen bg-brand-paper pb-20">
      <header className="bg-white border-b border-brand-line px-6 py-6 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button onClick={() => window.location.href = '/coach'} className="p-2 hover:bg-brand-paper rounded-full text-brand-moss/60 hover:text-brand-moss transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-brand-moss tracking-tight">Tiến độ: {clientName}</h1>
            <p className="text-brand-moss/60 text-sm font-semibold mt-1">Lịch sử nâng tạ và ước tính 1RM</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {exercisesList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-brand-line p-10 text-center flex flex-col items-center">
            <Dumbbell size={48} className="text-brand-moss/20 mb-4" />
            <h2 className="text-xl font-bold text-brand-moss mb-2">Chưa có dữ liệu tập luyện</h2>
            <p className="text-brand-moss/60 text-sm">Học viên này chưa hoàn thành và lưu kết quả của bất kỳ bài tập nào.</p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-8 items-start">
            
            {/* Cột trái: Selector */}
            <div className="w-full md:w-80 flex-shrink-0 relative">
              <label className="text-xs font-bold text-brand-moss/60 uppercase tracking-wider mb-2 block">Lọc theo Bài tập</label>
              
              <div className="relative">
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full bg-white border border-brand-line rounded-xl p-4 text-left font-bold text-brand-moss flex items-center justify-between shadow-sm hover:border-brand-sand transition-colors"
                >
                  <span className="truncate pr-4">{selectedExName}</span>
                  <ChevronDown size={18} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-brand-line z-50 overflow-hidden flex flex-col max-h-[400px]">
                    <div className="p-3 border-b border-brand-line bg-brand-paper/50">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-moss/40" />
                        <input 
                          type="text" 
                          placeholder="Tìm bài tập..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-brand-line/50 rounded-lg outline-none focus:border-brand-sand font-semibold"
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto p-2">
                      {filteredExercises.map(ex => (
                        <button
                          key={ex.id}
                          onClick={() => { setSelectedExId(ex.id); setIsDropdownOpen(false); setSearchQuery(""); }}
                          className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${selectedExId === ex.id ? 'bg-brand-sand text-brand-mossDeep' : 'hover:bg-brand-paper text-brand-moss'}`}
                        >
                          {ex.name}
                        </button>
                      ))}
                      {filteredExercises.length === 0 && (
                        <div className="px-3 py-4 text-center text-xs text-brand-moss/50 italic">Không tìm thấy</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cột phải: Timeline */}
            <div className="flex-1 w-full">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="text-brand-moss" size={24} />
                <h2 className="text-xl font-bold text-brand-moss">Lịch sử thực hiện</h2>
              </div>
              
              <div className="space-y-6">
                {currentLogs.length === 0 ? (
                  <div className="p-8 text-center text-brand-moss/50 bg-white rounded-2xl border border-brand-line border-dashed font-semibold">
                    Không có dữ liệu cho bài tập này.
                  </div>
                ) : (
                  currentLogs.map((log, index) => (
                    <div key={index} className="bg-white rounded-2xl border border-brand-line p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                      
                      {/* Dấu hiệu hoàn thành */}
                      <div className={`absolute top-0 left-0 w-1.5 h-full ${log.isCompleted ? 'bg-emerald-400' : 'bg-brand-sand'}`}></div>
                      
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 border-b border-brand-line/50 pb-4 pl-3">
                        <div>
                          <h3 className="font-bold text-brand-moss text-lg leading-tight">{log.blockName} • Tuần {log.weekNumber}</h3>
                          <p className="text-sm font-semibold text-brand-moss/60 mt-1 flex items-center gap-1.5">
                            <Calendar size={14} /> 
                            {log.workoutName} 
                            {log.completedAt ? ` (${new Date(log.completedAt).toLocaleDateString('vi-VN')})` : ''}
                          </p>
                        </div>
                        
                        {log.max1RM > 0 && (
                          <div className="bg-brand-mossDeep text-brand-sage px-4 py-2 rounded-xl text-center shadow-sm">
                            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Ước tính 1RM</p>
                            <p className="text-xl font-black">{log.max1RM} <span className="text-xs font-bold">kg</span></p>
                          </div>
                        )}
                      </div>

                      <div className="pl-3">
                        <div className="grid grid-cols-4 gap-2 text-[10px] font-bold text-brand-moss/50 uppercase tracking-wider mb-2 px-2">
                          <div>Set</div>
                          <div>Trọng lượng</div>
                          <div>Số Reps</div>
                          <div>RPE</div>
                        </div>
                        
                        <div className="space-y-1.5">
                          {log.sets.map((set: any) => (
                            <div key={set.id} className="grid grid-cols-4 gap-2 items-center text-sm font-bold bg-brand-paper/50 rounded-lg px-2 py-2.5">
                              <div className="text-brand-moss/60 pl-2">{set.set_number}</div>
                              <div className="text-brand-moss">{set.weight} <span className="text-xs font-semibold opacity-60">kg</span></div>
                              <div className="text-brand-moss">{set.reps}</div>
                              <div className="text-brand-moss">
                                {set.rpe ? <span className="bg-white px-2 py-0.5 rounded shadow-sm border border-brand-line/50">@{set.rpe}</span> : '-'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
          </div>
        )}
      </main>
    </div>
  );
}

import { Suspense } from 'react';
export default function ClientProgress() {
  return <Suspense fallback={<div>Đang tải...</div>}><ClientProgressInner /></Suspense>;
}
