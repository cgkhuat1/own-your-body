"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Save, Plus, Loader2, Trash2, X, Search, Dumbbell, GripVertical, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

export default function ProgramBuilder() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId');
  const programId = searchParams.get('programId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [programInfo, setProgramInfo] = useState<any>(null);
  const [blockId, setBlockId] = useState<string>("");
  
  const [activeDay, setActiveDay] = useState(1);
  const [days, setDays] = useState<any[]>([]);

  // Modal state
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showAddDay, setShowAddDay] = useState(false);
  const [showDeleteDay, setShowDeleteDay] = useState(false);
  const [exerciseLibrary, setExerciseLibrary] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [newGroupCode, setNewGroupCode] = useState("");
  const [newSets, setNewSets] = useState("3");
  const [newReps, setNewReps] = useState("8-10");
  const [newRpe, setNewRpe] = useState("8");
  const [newDayName, setNewDayName] = useState("");
  const [addingExercise, setAddingExercise] = useState(false);

  // Drag state
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
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
                  exercises (name),
                  workout_logs (
                      id, set_number, weight, reps, rpe
                  )
              )
          )
      )
    `).eq('id', programId).single();

    if (program && program.blocks.length > 0) {
      setProgramInfo(program);
      
      const block = program.blocks[0];
      setBlockId(block.id);
      const allWorkouts = block.workouts || [];
      
      const dayIndices = Array.from(new Set(allWorkouts.map((w: any) => w.order_index))).sort() as number[];
      
      const newDays = dayIndices.map((dayIndex: number) => {
        const dayWorkouts = allWorkouts.filter((w: any) => w.order_index === dayIndex);
        
        const masterExercises = new Map();
        
        dayWorkouts.forEach((w: any) => {
          w.workout_exercises?.forEach((ex: any) => {
            const key = ex.exercise_id || ex.custom_name;
            if (!masterExercises.has(key)) {
              masterExercises.set(key, {
                key,
                exercise_id: ex.exercise_id,
                custom_name: ex.custom_name || ex.exercises?.name || "Bài tập",
                group_code: ex.group_code,
                order_index: ex.order_index,
                weeks: {}
              });
            }
            masterExercises.get(key).weeks[w.week_number] = ex;
          });
        });

        const exercisesArray = Array.from(masterExercises.values()).sort((a, b) => {
           const aIdx = a.order_index ?? 99;
           const bIdx = b.order_index ?? 99;
           return aIdx - bIdx;
        });

        return {
          dayIndex,
          name: dayWorkouts[0]?.name || `Buổi ${dayIndex}`,
          workoutIds: Object.fromEntries(dayWorkouts.map((w: any) => [w.week_number, w.id])),
          exercises: exercisesArray
        };
      });

      setDays(newDays);
      if (newDays.length > 0 && !newDays.find(d => d.dayIndex === activeDay)) {
        setActiveDay(newDays[0].dayIndex);
      }
    }
    setLoading(false);
  }, [clientId, programId, activeDay]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (showAddExercise) {
      supabase.from('exercises').select('*').order('name').then(({ data }) => {
        setExerciseLibrary(data || []);
      });
    }
  }, [showAddExercise]);

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

    await Promise.all(updates.map(u => 
      supabase.from('workout_exercises').update({
        target_sets: u.target_sets,
        target_reps: u.target_reps,
        target_rpe: u.target_rpe
      }).eq('id', u.id)
    ));

    showToast("Đã lưu giáo án thành công!");
    setSaving(false);
  };

  // === THÊM BÀI TẬP ===
  const handleAddExercise = async () => {
    if (!selectedExercise || !newGroupCode.trim()) return;
    setAddingExercise(true);

    const currentDay = days.find(d => d.dayIndex === activeDay);
    if (!currentDay) return;

    const maxOrder = currentDay.exercises.reduce((max: number, ex: any) => Math.max(max, ex.order_index || 0), 0);

    for (let week = 1; week <= 4; week++) {
      if (!currentDay.workoutIds[week]) {
        const { data: newWorkout } = await supabase.from('workouts').insert({
          block_id: blockId,
          name: currentDay.name,
          week_number: week,
          order_index: activeDay,
          is_completed: false
        }).select('id').single();
        
        if (newWorkout) {
          currentDay.workoutIds[week] = newWorkout.id;
        }
      }

      await supabase.from('workout_exercises').insert({
        workout_id: currentDay.workoutIds[week],
        exercise_id: selectedExercise.id,
        group_code: newGroupCode.trim().toUpperCase(),
        order_index: maxOrder + 1,
        target_sets: parseInt(newSets) || 3,
        target_reps: newReps,
        target_rpe: newRpe
      });
    }

    setShowAddExercise(false);
    setSelectedExercise(null);
    setNewGroupCode("");
    setNewSets("3");
    setNewReps("8-10");
    setNewRpe("8");
    setSearchQuery("");
    setAddingExercise(false);
    
    showToast(`Đã thêm "${selectedExercise.name}" vào ${currentDay.name}`);
    await fetchData();
  };

  // === THÊM BUỔI TẬP ===
  const handleAddDay = async () => {
    if (!newDayName.trim() || !blockId) return;
    setAddingExercise(true);

    const maxDayIndex = days.reduce((max, d) => Math.max(max, d.dayIndex), 0);
    const newDayIndex = maxDayIndex + 1;

    for (let week = 1; week <= 4; week++) {
      await supabase.from('workouts').insert({
        block_id: blockId,
        name: newDayName.trim(),
        week_number: week,
        order_index: newDayIndex,
        is_completed: false
      });
    }

    setShowAddDay(false);
    setNewDayName("");
    setAddingExercise(false);
    setActiveDay(newDayIndex);
    
    showToast(`Đã tạo buổi "${newDayName.trim()}"`);
    await fetchData();
  };

  // === XÓA BUỔI TẬP ===
  const handleDeleteDay = async () => {
    const currentDay = days.find(d => d.dayIndex === activeDay);
    if (!currentDay) return;
    setAddingExercise(true);

    // Lấy tất cả workout IDs thuộc buổi này
    const workoutIds = Object.values(currentDay.workoutIds) as string[];

    // Lấy tất cả workout_exercise IDs
    const { data: wExs } = await supabase
      .from('workout_exercises')
      .select('id')
      .in('workout_id', workoutIds);
    
    const wExIds = (wExs || []).map((w: any) => w.id);

    if (wExIds.length > 0) {
      // Xóa logs
      await Promise.all(wExIds.map(id =>
        supabase.from('workout_logs').delete().eq('workout_exercise_id', id)
      ));
      // Xóa workout_exercises
      await Promise.all(wExIds.map(id =>
        supabase.from('workout_exercises').delete().eq('id', id)
      ));
    }

    // Xóa workouts
    await Promise.all(workoutIds.map(id =>
      supabase.from('workouts').delete().eq('id', id)
    ));

    setShowDeleteDay(false);
    setAddingExercise(false);
    
    // Chuyển sang tab khác
    const remaining = days.filter(d => d.dayIndex !== activeDay);
    if (remaining.length > 0) setActiveDay(remaining[0].dayIndex);
    
    showToast(`Đã xóa buổi "${currentDay.name}"`);
    await fetchData();
  };

  // === XÓA BÀI TẬP ===
  const handleDeleteExercise = async (ex: any) => {
    const weekExIds = Object.values(ex.weeks).map((w: any) => w.id);
    
    await Promise.all(weekExIds.map(id =>
      supabase.from('workout_logs').delete().eq('workout_exercise_id', id)
    ));
    
    await Promise.all(weekExIds.map(id =>
      supabase.from('workout_exercises').delete().eq('id', id)
    ));

    showToast(`Đã xóa "${ex.custom_name}"`);
    await fetchData();
  };

  // === KÉO THẢ SẮP XẾP ===
  const handleDragStart = (index: number) => {
    dragItem.current = index;
    setDragIndex(index);
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
      setDragIndex(null);
      return;
    }

    const currentDay = days.find(d => d.dayIndex === activeDay);
    if (!currentDay) return;

    // Sắp xếp lại mảng exercises trong state
    const newExercises = [...currentDay.exercises];
    const draggedItem = newExercises.splice(dragItem.current, 1)[0];
    newExercises.splice(dragOverItem.current, 0, draggedItem);

    // Cập nhật order_index cho từng bài
    const updatedExercises = newExercises.map((ex: any, i: number) => ({
      ...ex,
      order_index: i + 1
    }));

    // Cập nhật state ngay để UI phản hồi tức thì
    setDays(prevDays => prevDays.map(day => {
      if (day.dayIndex !== activeDay) return day;
      return { ...day, exercises: updatedExercises };
    }));

    setDragIndex(null);
    dragItem.current = null;
    dragOverItem.current = null;

    // Cập nhật order_index vào DB cho tất cả các tuần
    const updatePromises: Promise<any>[] = [];
    updatedExercises.forEach((ex: any, i: number) => {
      Object.values(ex.weeks).forEach((wEx: any) => {
        updatePromises.push(
          supabase.from('workout_exercises').update({ order_index: i + 1 }).eq('id', wEx.id)
        );
      });
    });
    await Promise.all(updatePromises);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-brand-paper"><Loader2 className="animate-spin text-brand-moss" size={32} /></div>;

  const activeDayData = days.find(d => d.dayIndex === activeDay);
  const filteredExercises = exerciseLibrary.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen overflow-hidden bg-brand-paper/50 flex flex-col">
      <header className="bg-white border-b border-brand-line px-6 py-4 flex items-center justify-between z-40 relative shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => window.history.back()} className="p-2 hover:bg-brand-paper rounded-full text-brand-moss/60 hover:text-brand-moss transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-brand-moss">Giáo án: {programInfo?.client?.full_name}</h1>
            <p className="text-xs text-brand-moss/60 font-semibold mt-0.5">{programInfo?.name} • {programInfo?.blocks?.[0]?.name || 'Phase 1'} (Tuần 1-4)</p>
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
      <div className="px-6 py-4 flex items-center gap-3 border-b border-brand-line bg-white shadow-sm z-30 relative">
        {days.map(d => (
          <button
            key={d.dayIndex}
            onClick={() => setActiveDay(d.dayIndex)}
            className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all relative ${activeDay === d.dayIndex ? 'bg-brand-sand text-brand-mossDeep shadow-md' : 'bg-brand-paper/50 text-brand-moss/60 hover:bg-brand-paper'}`}
          >
            {d.name}
          </button>
        ))}
        <button
          onClick={() => setShowAddDay(true)}
          className="px-4 py-2.5 rounded-full font-bold text-sm border-2 border-dashed border-brand-moss/20 text-brand-moss/40 hover:border-brand-moss/40 hover:text-brand-moss/60 transition-all flex items-center gap-1.5"
        >
          <Plus size={14} /> Thêm Buổi
        </button>

        {/* Nút xóa buổi (chỉ hiện khi có > 1 buổi) */}
        {days.length > 1 && (
          <button
            onClick={() => setShowDeleteDay(true)}
            className="ml-auto px-3 py-2 rounded-lg text-xs font-bold text-red-400 hover:text-red-600 hover:bg-red-50 transition-all flex items-center gap-1.5"
          >
            <Trash2 size={13} /> Xóa buổi này
          </button>
        )}
      </div>

      {/* Spreadsheet Matrix (Scrollable Area) */}
      <main className="flex-1 overflow-auto bg-brand-paper/50 relative z-0">
        <div className="min-w-[1200px] min-h-full pb-20">
          {/* Header Row */}
          <div className="grid grid-cols-[280px_1fr_1fr_1fr_1fr] bg-brand-mossDeep text-brand-sage font-bold text-sm sticky top-0 z-20 shadow-md">
            <div className="p-4 border-r border-brand-sage/20">Bài tập</div>
            {[1,2,3,4].map(w => (
              <div key={w} className="p-4 border-r border-brand-sage/20 text-center">Tuần {w}</div>
            ))}
          </div>

          {/* Empty State */}
          {activeDayData?.exercises.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-brand-moss/40">
              <Dumbbell size={48} className="mb-4 opacity-30" />
              <p className="font-bold text-lg">Chưa có bài tập nào</p>
              <p className="text-sm mt-1">Bấm nút bên dưới để thêm bài tập đầu tiên</p>
            </div>
          )}

          {/* Exercise Rows (Draggable) */}
          {activeDayData?.exercises.map((ex: any, exIndex: number) => (
            <div 
              key={ex.key} 
              draggable
              onDragStart={() => handleDragStart(exIndex)}
              onDragEnter={() => handleDragEnter(exIndex)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              className={`grid grid-cols-[280px_1fr_1fr_1fr_1fr] min-w-[1200px] border-b border-brand-line group transition-all cursor-grab active:cursor-grabbing ${
                dragIndex === exIndex 
                  ? 'opacity-40 bg-brand-sand/20' 
                  : 'hover:bg-brand-paper/20'
              }`}
            >
              {/* Cột Tên bài tập */}
              <div className="p-4 border-r border-brand-line bg-brand-paper/40 flex items-center gap-2">
                {/* Drag Handle */}
                <div className="text-brand-moss/20 group-hover:text-brand-moss/50 transition-colors flex-shrink-0">
                  <GripVertical size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-brand-moss truncate">{ex.group_code ? `${ex.group_code}. ` : ''}{ex.custom_name}</p>
                </div>
                <button 
                  onClick={() => handleDeleteExercise(ex)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-all flex-shrink-0"
                  title="Xóa bài tập"
                >
                  <Trash2 size={14} />
                </button>
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

                const rawLogs = wEx.workout_logs || [];
                const uniqueLogsMap = new Map();
                rawLogs.forEach((l:any) => { uniqueLogsMap.set(l.set_number, l); });
                const uniqueLogs = Array.from(uniqueLogsMap.values()).sort((a:any, b:any) => a.set_number - b.set_number);
                
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
                    {uniqueLogs.length > 0 ? (
                      <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">✅ Thực tế tập</p>
                        <div className="space-y-1">
                          {uniqueLogs.map((l: any) => (
                            <div key={l.id} className="flex justify-between items-center text-[11px] font-black text-emerald-900 bg-emerald-100/50 px-2 py-1 rounded">
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

          {/* Nút thêm bài tập */}
          <div className="p-4 border-t border-brand-line">
            <button 
              onClick={() => setShowAddExercise(true)}
              className="px-5 py-2.5 text-sm font-bold text-brand-moss bg-white border-2 border-dashed border-brand-moss/20 hover:border-brand-moss/40 hover:bg-brand-sand/10 rounded-lg flex items-center gap-2 transition-all"
            >
              <Plus size={16} /> Thêm bài tập vào {activeDayData?.name || 'buổi này'}
            </button>
          </div>
        </div>
      </main>

      {/* ===== MODAL: THÊM BÀI TẬP ===== */}
      {showAddExercise && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddExercise(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-brand-line">
              <h2 className="text-lg font-bold text-brand-moss">Thêm bài tập</h2>
              <button onClick={() => setShowAddExercise(false)} className="p-1.5 hover:bg-brand-paper rounded-full text-brand-moss/40 hover:text-brand-moss transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Bước 1: Chọn bài tập */}
              <div>
                <label className="text-xs font-bold text-brand-moss/60 uppercase tracking-wider mb-2 block">1. Chọn bài tập</label>
                <div className="relative mb-3">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-moss/30" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm bài tập..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-brand-line rounded-xl text-sm focus:ring-2 focus:ring-brand-sand/30 focus:border-brand-sand outline-none"
                  />
                </div>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {filteredExercises.map(ex => (
                    <button
                      key={ex.id}
                      onClick={() => setSelectedExercise(ex)}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                        selectedExercise?.id === ex.id 
                          ? 'bg-brand-sand text-brand-mossDeep shadow-md ring-2 ring-brand-sand' 
                          : 'bg-brand-paper/50 text-brand-moss hover:bg-brand-paper'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Dumbbell size={14} className="opacity-50" />
                        {ex.name}
                      </span>
                    </button>
                  ))}
                  {filteredExercises.length === 0 && (
                    <p className="text-sm text-brand-moss/40 text-center py-4 italic">Không tìm thấy bài tập nào</p>
                  )}
                </div>
              </div>

              {/* Bước 2: Mã nhóm */}
              <div>
                <label className="text-xs font-bold text-brand-moss/60 uppercase tracking-wider mb-2 block">2. Mã nhóm (Group Code)</label>
                <input
                  type="text"
                  placeholder="VD: 1, 1A, 1B, 2A..."
                  value={newGroupCode}
                  onChange={(e) => setNewGroupCode(e.target.value)}
                  className="w-full px-4 py-2.5 border border-brand-line rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-sand/30 focus:border-brand-sand outline-none"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-bold text-brand-moss/40 uppercase mr-1 self-center">Gợi ý:</span>
                  {['1', '2', '3', '1A', '1B', '2A', '2B', '3A', '3B', '3C'].map(code => (
                    <button 
                      key={code}
                      onClick={() => setNewGroupCode(code)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        newGroupCode === code
                          ? 'bg-brand-sand text-brand-mossDeep'
                          : 'bg-brand-paper text-brand-moss/60 hover:bg-brand-sand/30'
                      }`}
                    >
                      {code}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-brand-moss/40 mt-2 leading-relaxed">
                  Số đơn (1, 2, 3) = bài riêng lẻ • Số + chữ cùng số (1A + 1B) = Superset • Ba chữ (2A + 2B + 2C) = Tri-set
                </p>
              </div>

              {/* Bước 3: Mục tiêu */}
              <div>
                <label className="text-xs font-bold text-brand-moss/60 uppercase tracking-wider mb-2 block">3. Mục tiêu (áp dụng cho cả 4 tuần)</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] font-semibold text-brand-moss/40 mb-0.5 block">Sets</label>
                    <input type="text" value={newSets} onChange={(e) => setNewSets(e.target.value)}
                      className="w-full px-3 py-2 border border-brand-line rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-brand-sand/30 focus:border-brand-sand outline-none" />
                  </div>
                  <span className="text-brand-moss/30 font-bold mt-4">×</span>
                  <div className="flex-1">
                    <label className="text-[10px] font-semibold text-brand-moss/40 mb-0.5 block">Reps</label>
                    <input type="text" value={newReps} onChange={(e) => setNewReps(e.target.value)}
                      className="w-full px-3 py-2 border border-brand-line rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-brand-sand/30 focus:border-brand-sand outline-none" />
                  </div>
                  <span className="text-brand-moss/30 font-bold mt-4">@</span>
                  <div className="flex-1">
                    <label className="text-[10px] font-semibold text-brand-moss/40 mb-0.5 block">RPE</label>
                    <input type="text" value={newRpe} onChange={(e) => setNewRpe(e.target.value)}
                      className="w-full px-3 py-2 border border-brand-line rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-brand-sand/30 focus:border-brand-sand outline-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-brand-line bg-brand-paper/30">
              <button
                onClick={handleAddExercise}
                disabled={!selectedExercise || !newGroupCode.trim() || addingExercise}
                className="w-full bg-brand-moss text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-mossDeep transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {addingExercise ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {addingExercise ? "Đang thêm..." : "Thêm vào Giáo án"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: THÊM BUỔI ===== */}
      {showAddDay && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddDay(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-brand-line">
              <h2 className="text-lg font-bold text-brand-moss">Thêm buổi tập mới</h2>
              <button onClick={() => setShowAddDay(false)} className="p-1.5 hover:bg-brand-paper rounded-full text-brand-moss/40 hover:text-brand-moss transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-brand-moss/60 uppercase tracking-wider mb-2 block">Tên buổi tập</label>
                <input
                  type="text"
                  placeholder="VD: Buổi 4 - Push"
                  value={newDayName}
                  onChange={(e) => setNewDayName(e.target.value)}
                  className="w-full px-4 py-3 border border-brand-line rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-sand/30 focus:border-brand-sand outline-none"
                  autoFocus
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {['Push', 'Pull', 'Legs', 'Upper Body', 'Lower Body', 'Full Body', 'Arms'].map(s => (
                    <button 
                      key={s}
                      onClick={() => setNewDayName(`Buổi ${days.length + 1} - ${s}`)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-paper text-brand-moss/60 hover:bg-brand-sand/30 transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-brand-line bg-brand-paper/30">
              <button
                onClick={handleAddDay}
                disabled={!newDayName.trim() || addingExercise}
                className="w-full bg-brand-moss text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-mossDeep transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {addingExercise ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {addingExercise ? "Đang tạo..." : "Tạo Buổi Tập"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: XÁC NHẬN XÓA BUỔI ===== */}
      {showDeleteDay && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteDay(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={28} className="text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-brand-moss mb-2">Xóa buổi tập?</h2>
              <p className="text-sm text-brand-moss/60 leading-relaxed">
                Toàn bộ <strong>{activeDayData?.exercises.length || 0} bài tập</strong> và dữ liệu tập luyện trong <strong>{activeDayData?.name}</strong> sẽ bị xóa vĩnh viễn.
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowDeleteDay(false)}
                className="flex-1 py-3 rounded-xl font-bold text-sm bg-brand-paper text-brand-moss hover:bg-brand-line transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteDay}
                disabled={addingExercise}
                className="flex-1 py-3 rounded-xl font-bold text-sm bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {addingExercise ? "Đang xóa..." : "Xóa luôn"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== TOAST ===== */}
      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-2xl font-bold text-sm shadow-2xl animate-[slideUp_0.3s_ease-out] ${
          toast.type === 'success' ? 'bg-brand-mossDeep text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
