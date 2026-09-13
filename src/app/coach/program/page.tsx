"use client";
import { useState, useEffect } from "react";
import { ArrowLeft, Save, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

export default function ProgramBuilder() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId');
  const programId = searchParams.get('programId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [programInfo, setProgramInfo] = useState<any>(null);
  
  // Dữ liệu ma trận: days[dayIndex].exercises[exId].weeks[weekIndex]
  const [activeDay, setActiveDay] = useState(1);
  const [days, setDays] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!clientId || !programId) return;

      const { data: program } = await supabase.from('programs').select(`
        id, name,
        client:users!client_id (id, full_name, email),
        blocks (
            id, name, order_index,
            workouts (
                id, name, week_number, order_index, is_completed,
                workout_exercises (
                    id, exercise_id, custom_name, group_code, order_index,
                    target_sets, target_reps, target_rpe,
                    workout_logs (
                        set_number, weight, reps, rpe
                    )
                )
            )
        )
      `).eq('id', programId).single();

      if (program && program.blocks.length > 0) {
        setProgramInfo(program);
        
        const block = program.blocks[0];
        const allWorkouts = block.workouts || [];
        
        // Tìm các Buổi (Day) duy nhất (dựa vào order_index của workout)
        const dayIndices = Array.from(new Set(allWorkouts.map((w: any) => w.order_index))).sort();
        
        const newDays = dayIndices.map((dayIndex: any) => {
          // Lấy tất cả workout của buổi này trong 4 tuần
          const dayWorkouts = allWorkouts.filter((w: any) => w.order_index === dayIndex);
          
          // Tạo danh sách bài tập Master (gom nhóm theo exercise_id hoặc custom_name)
          const masterExercises = new Map();
          
          dayWorkouts.forEach((w: any) => {
            w.workout_exercises?.forEach((ex: any) => {
              const key = ex.exercise_id || ex.custom_name;
              if (!masterExercises.has(key)) {
                masterExercises.set(key, {
                  key,
                  exercise_id: ex.exercise_id,
                  custom_name: ex.custom_name || "Bài tập",
                  group_code: ex.group_code,
                  order_index: ex.order_index,
                  weeks: {} // Lưu w_ex theo week_number
                });
              }
              masterExercises.get(key).weeks[w.week_number] = ex;
            });
          });

          // Chuyển Map thành Array và sort
          const exercisesArray = Array.from(masterExercises.values()).sort((a, b) => {
             const getNum = (str: string) => parseInt(String(str).replace(/\D/g, '')) || 99;
             return getNum(a.group_code) - getNum(b.group_code);
          });

          return {
            dayIndex,
            name: dayWorkouts[0]?.name || `Buổi ${dayIndex}`,
            exercises: exercisesArray
          };
        });

        setDays(newDays);
        if (newDays.length > 0) setActiveDay(newDays[0].dayIndex);
      }
      setLoading(false);
    };

    fetchData();
  }, [clientId, programId]);

  const handleTargetChange = (dayIndex: number, exKey: string, week: number, field: string, value: string) => {
    setDays(prevDays => prevDays.map(day => {
      if (day.dayIndex !== dayIndex) return day;
      return {
        ...day,
        exercises: day.exercises.map((ex: any) => {
          if (ex.key !== exKey) return ex;
          const newWeeks = { ...ex.weeks };
          if (newWeeks[week]) {
            newWeeks[week] = { ...newWeeks[week], [field]: value };
          }
          return { ...ex, weeks: newWeeks };
        })
      };
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    // Thu thập tất cả workout_exercises đã bị sửa
    const updates: any[] = [];
    days.forEach(day => {
      day.exercises.forEach((ex: any) => {
        Object.values(ex.weeks).forEach((wEx: any) => {
          updates.push({
            id: wEx.id,
            target_sets: parseInt(wEx.target_sets) || 3,
            target_reps: wEx.target_reps,
            target_rpe: wEx.target_rpe
          });
        });
      });
    });

    // Cập nhật từng cái (vì Supabase REST upsert multiple cần chuẩn schema, nên dùng Promise.all cho lẹ bản prototype)
    await Promise.all(updates.map(u => 
      supabase.from('workout_exercises').update({
        target_sets: u.target_sets,
        target_reps: u.target_reps,
        target_rpe: u.target_rpe
      }).eq('id', u.id)
    ));

    alert("✅ Đã lưu giáo án thành công!");
    setSaving(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-brand-paper"><Loader2 className="animate-spin text-brand-moss" /></div>;

  const activeDayData = days.find(d => d.dayIndex === activeDay);

  return (
    <div className="min-h-screen bg-brand-paper/50 flex flex-col">
      <header className="bg-white border-b border-brand-line px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => window.history.back()} className="p-2 hover:bg-brand-paper rounded-full text-brand-moss/60 hover:text-brand-moss transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-brand-moss">Giáo án: {programInfo?.client?.full_name}</h1>
            <p className="text-xs text-brand-moss/60 font-semibold mt-0.5">{programInfo?.name} • Phase 1 (Tuần 1-4)</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-brand-moss text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-brand-mossDeep transition-colors shadow-md disabled:opacity-70"
        >
          {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />}
          {saving ? "Đang lưu..." : "Lưu Thay Đổi"}
        </button>
      </header>

      {/* Day Tabs */}
      <div className="px-6 py-4 flex gap-3 border-b border-brand-line bg-white sticky top-[73px] z-10 shadow-sm">
        {days.map(d => (
          <button
            key={d.dayIndex}
            onClick={() => setActiveDay(d.dayIndex)}
            className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all ${activeDay === d.dayIndex ? 'bg-brand-sand text-brand-mossDeep shadow-md' : 'bg-brand-paper/50 text-brand-moss/60 hover:bg-brand-paper'}`}
          >
            {d.name}
          </button>
        ))}
      </div>

      {/* Spreadsheet Matrix */}
      <main className="flex-1 overflow-x-auto">
        <div className="min-w-[1200px] pb-20">
          {/* Header Row */}
          <div className="grid grid-cols-[250px_1fr_1fr_1fr_1fr] bg-brand-mossDeep text-brand-sage font-bold text-sm sticky top-[137px] z-10 shadow-md">
            <div className="p-4 border-r border-brand-sage/20">Bài tập</div>
            {[1,2,3,4].map(w => (
              <div key={w} className="p-4 border-r border-brand-sage/20 text-center">Tuần {w}</div>
            ))}
          </div>

          {/* Exercise Rows */}
          {activeDayData?.exercises.map((ex: any) => (
            <div key={ex.key} className="grid grid-cols-[250px_1fr_1fr_1fr_1fr] min-w-[1200px] border-b border-brand-line group hover:bg-brand-paper/20 transition-colors">
              {/* Cột Tên bài tập */}
              <div className="p-4 border-r border-brand-line bg-brand-paper/40 flex flex-col justify-center">
                <p className="font-bold text-brand-moss">{ex.group_code ? `${ex.group_code}. ` : ''}{ex.custom_name}</p>
              </div>

              {/* Cột Tuần 1 -> 4 */}
              {[1, 2, 3, 4].map(weekNum => {
                const wEx = ex.weeks[weekNum];
                if (!wEx) {
                  return (
                    <div key={weekNum} className="p-4 border-r border-brand-line flex items-center justify-center bg-gray-50/50">
                      <span className="text-xs text-gray-400 italic">Trống</span>
                    </div>
                  );
                }

                const logs = wEx.workout_logs || [];
                
                return (
                  <div key={weekNum} className="p-4 border-r border-brand-line flex flex-col gap-2">
                    {/* Input Target */}
                    <div className="bg-white p-2.5 rounded-lg border border-brand-line hover:border-brand-sand focus-within:border-brand-sand focus-within:ring-2 ring-brand-sand/20 transition-all shadow-sm">
                      <p className="text-[10px] font-bold text-brand-moss/50 uppercase tracking-wider mb-1">Mục tiêu (Set x Rep @RPE)</p>
                      <div className="flex items-center gap-1">
                        <input 
                          type="text" 
                          value={wEx.target_sets || ""} 
                          onChange={(e) => handleTargetChange(activeDayData.dayIndex, ex.key, weekNum, 'target_sets', e.target.value)}
                          className="w-6 text-sm font-bold text-brand-moss border-b border-brand-line/50 focus:border-brand-moss outline-none text-center bg-transparent" 
                        />
                        <span className="text-xs font-semibold text-brand-moss/50">x</span>
                        <input 
                          type="text" 
                          value={wEx.target_reps || ""} 
                          onChange={(e) => handleTargetChange(activeDayData.dayIndex, ex.key, weekNum, 'target_reps', e.target.value)}
                          className="w-12 text-sm font-bold text-brand-moss border-b border-brand-line/50 focus:border-brand-moss outline-none text-center bg-transparent" 
                        />
                        <input 
                          type="text" 
                          value={wEx.target_rpe || ""} 
                          onChange={(e) => handleTargetChange(activeDayData.dayIndex, ex.key, weekNum, 'target_rpe', e.target.value)}
                          className="w-10 text-sm font-bold text-brand-moss border-b border-brand-line/50 focus:border-brand-moss outline-none text-center bg-transparent" 
                        />
                      </div>
                    </div>

                    {/* Actual Logs */}
                    {logs.length > 0 ? (
                      <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">✅ Thực tế tập</p>
                        <div className="space-y-1">
                          {logs.sort((a:any, b:any) => a.set_number - b.set_number).map((l: any) => (
                            <div key={l.set_number} className="flex justify-between items-center text-[11px] font-black text-emerald-900 bg-emerald-100/50 px-2 py-1 rounded">
                              <span className="text-emerald-700 font-semibold w-4">#{l.set_number}</span>
                              <span>{l.weight}kg x {l.reps}</span>
                              <span className="text-emerald-600 text-[10px]">@{l.rpe || '?'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50/50 p-2.5 rounded-lg border border-gray-200 border-dashed text-gray-400">
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5">Thực tế tập</p>
                        <p className="text-xs italic font-medium">Chưa tập...</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
