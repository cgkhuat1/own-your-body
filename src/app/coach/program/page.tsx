"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Save, Plus, Loader2, Trash2, X, Search, Dumbbell, GripVertical, AlertTriangle, Pencil, Check, Copy, Repeat } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

// === HELPER: Gom bài tập thành các cụm kéo thả (Drag Units) ===
function groupIntoDragUnits(exercises: any[]) {
  const units: any[] = [];
  const visited = new Set();

  for (const ex of exercises) {
    if (visited.has(ex.key)) continue;
    const hasLetter = /[a-zA-Z]/.test(String(ex.group_code || ''));
    const numPrefix = parseInt(String(ex.group_code || '99').replace(/\D/g, '')) || 99;

    if (hasLetter) {
      const group = exercises.filter(e => {
        const eNum = parseInt(String(e.group_code || '').replace(/\D/g, '')) || -1;
        const eLetter = /[a-zA-Z]/.test(String(e.group_code || ''));
        return eLetter && eNum === numPrefix;
      });
      group.forEach((e: any) => visited.add(e.key));
      units.push({ type: 'group', exercises: group });
    } else {
      visited.add(ex.key);
      units.push({ type: 'single', exercises: [ex] });
    }
  }
  return units;
}

// === HELPER: Tự động đánh lại số sau khi sắp xếp ===
function renumberUnits(units: any[]) {
  let counter = 1;
  const allExercises: any[] = [];
  const letters = 'ABCDEFGHIJ';

  for (const unit of units) {
    if (unit.type === 'single') {
      const ex = { ...unit.exercises[0], group_code: String(counter) };
      if (ex.base_ex) ex.base_ex.group_code = String(counter);
      unit.exercises[0] = ex;
      allExercises.push(ex);
    } else {
      unit.exercises.forEach((exOld: any, i: number) => {
        const ex = { ...exOld, group_code: `${counter}${letters[i]}` };
        if (ex.base_ex) ex.base_ex.group_code = `${counter}${letters[i]}`;
        unit.exercises[i] = ex;
        allExercises.push(ex);
      });
    }
    counter++;
  }
  return { units, allExercises };
}

export default function ProgramBuilder() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId');
  // Không còn bắt buộc phải có programId từ URL
  const initialProgramId = searchParams.get('programId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phases, setPhases] = useState<any[]>([]);
  const [activeProgramId, setActiveProgramId] = useState<string | null>(initialProgramId);
  const [programInfo, setProgramInfo] = useState<any>(null);
  const [clientInfo, setClientInfo] = useState<any>(null);
  
  // Quản lý Block
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [editingBlockName, setEditingBlockName] = useState(false);
  const [editBlockValue, setEditBlockValue] = useState("");
  const [showDeleteBlock, setShowDeleteBlock] = useState(false);
  
  const [activeDay, setActiveDay] = useState<number>(1);
  const [days, setDays] = useState<any[]>([]);

  // Phase Actions
  const [editingPhaseName, setEditingPhaseName] = useState(false);
  const [editPhaseValue, setEditPhaseValue] = useState("");
  const [showDeletePhase, setShowDeletePhase] = useState(false);

  // Phase Add Modal state
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

  // Trạng thái Swap (Thay thế 1 bài tập cụ thể trong 1 tuần)
  const [swapTarget, setSwapTarget] = useState<{ wExId: string, weekNum: number } | null>(null);

  // Inline edit state
  const [editingDayName, setEditingDayName] = useState(false);
  const [editDayValue, setEditDayValue] = useState("");
  const [editingExKey, setEditingExKey] = useState<string | null>(null);
  const [editExValue, setEditExValue] = useState("");

  // Drag state
  const dragUnit = useRef<number | null>(null);
  const dragOverUnit = useRef<number | null>(null);
  const [dragUnitIndex, setDragUnitIndex] = useState<number | null>(null);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Add Phase state
  const [isAddPhaseModalOpen, setIsAddPhaseModalOpen] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [savingPhase, setSavingPhase] = useState(false);

  const handleCreatePhase = async () => {
    if (!newPhaseName.trim()) return;
    setSavingPhase(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    const { data: newProg, error } = await supabase.from('programs').insert({
      client_id: clientId,
      coach_id: session?.user?.id,
      name: newPhaseName.trim(),
      start_date: new Date().toISOString().split('T')[0]
    }).select('id').single();

    if (!error && newProg) {
      // Tự động tạo Block 1 cho Phase mới
      const { data: newBlock } = await supabase.from('blocks').insert({
        program_id: newProg.id,
        name: 'Block 1',
        order_index: 1
      }).select('id').single();

      showToast("Tạo Phase mới thành công!");
      setActiveProgramId(newProg.id);
      if (newBlock) setActiveBlockId(newBlock.id);
      setIsAddPhaseModalOpen(false);
      setNewPhaseName("");
    } else {
      showToast("Lỗi khi tạo Phase", "error");
    }
    setSavingPhase(false);
  };

  const fetchData = useCallback(async () => {
    if (!clientId) return;

    // Lấy thông tin user (khách hàng)
    const { data: user } = await supabase.from('users').select('id, full_name, email').eq('id', clientId).single();
    if (user) setClientInfo(user);

    // Lấy toàn bộ các Phases (programs) của khách hàng này
    const { data: allPrograms } = await supabase.from('programs')
      .select('id, name, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });
    
    setPhases(allPrograms || []);

    const targetProgramId = activeProgramId || (allPrograms && allPrograms.length > 0 ? allPrograms[0].id : null);
    if (!targetProgramId) {
      setLoading(false);
      return; // Khách chưa có phase nào
    }
    
    if (activeProgramId !== targetProgramId) {
      setActiveProgramId(targetProgramId);
    }

    const { data: program, error: fetchErr } = await supabase.from('programs').select(`
      id, name,
      blocks (
          id, name, order_index,
          workouts (
              id, name, week_number, order_index, is_completed,
              workout_exercises (
                  id, exercise_id, custom_name, group_code, order_index,
                  target_sets, target_reps, target_rpe,
                  exercises (id, name),
                  workout_logs (
                      id, set_number, weight, reps, rpe
                  )
              )
          )
      )
    `).eq('id', targetProgramId).neq('name', `dummy-${Date.now()}`).single();

    if (fetchErr) {
      console.error("fetchData error:", fetchErr);
      showToast(`Lỗi tải dữ liệu: ${fetchErr.message}`, "error");
      // Không clear sạch programInfo để tránh crash UI nếu lỗi mạng tạm thời
      if (!programInfo) {
        setProgramInfo({ blocks: [], _error: fetchErr });
      }
      setLoading(false);
      return;
    }

    if (program) {
      if (program.blocks) {
        program.blocks.sort((a: any, b: any) => a.order_index - b.order_index);
      } else {
        program.blocks = [];
      }
      setProgramInfo(program);
      
      if (program.blocks.length > 0) {
        // Nếu activeBlockId cũ không nằm trong program này, reset lại
        const blockExists = activeBlockId && program.blocks.find((b: any) => b.id === activeBlockId);
        const currentBlockId = blockExists ? activeBlockId : program.blocks[0].id;
        if (activeBlockId !== currentBlockId) setActiveBlockId(currentBlockId);

      const block = program.blocks.find((b: any) => b.id === currentBlockId);
      const allWorkouts = block?.workouts || [];
      
      const dayIndices = Array.from(new Set(allWorkouts.map((w: any) => w.order_index))).sort() as number[];
      
      const newDays = dayIndices.map((dayIndex: number) => {
        const dayWorkouts = allWorkouts.filter((w: any) => w.order_index === dayIndex);
        const masterExercises = new Map();
        
        // Pass 1: Gom nhóm theo order_index
        dayWorkouts.forEach((w: any) => {
          w.workout_exercises?.forEach((ex: any) => {
            const key = String(ex.order_index);
            if (!masterExercises.has(key)) {
              masterExercises.set(key, {
                key,
                order_index: ex.order_index,
                group_code: ex.group_code,
                weeks: {},
                all_ex: []
              });
            }
            masterExercises.get(key).weeks[w.week_number] = ex;
            masterExercises.get(key).all_ex.push(ex);
          });
        });

        // Pass 2: Xác định base_ex bằng cách tìm bài tập xuất hiện nhiều nhất (Majority vote)
        Array.from(masterExercises.values()).forEach((group: any) => {
          const freqMap = new Map();
          let maxFreq = 0;
          let bestBaseEx = group.all_ex[0]; // Mặc định lấy cái đầu tiên

          for (const ex of group.all_ex) {
            const exId = ex.exercise_id;
            const count = (freqMap.get(exId) || 0) + 1;
            freqMap.set(exId, count);
            if (count > maxFreq) {
              maxFreq = count;
              bestBaseEx = ex;
            }
          }
          group.base_ex = bestBaseEx;
        });

        const exercisesArray = Array.from(masterExercises.values()).sort((a: any, b: any) => {
           return (a.order_index ?? 99) - (b.order_index ?? 99);
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
    } else {
      setActiveBlockId(null);
      setDays([]);
    }
  }
    setLoading(false);
  }, [clientId, activeProgramId, activeBlockId, activeDay]);

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
          if (newWeeks[week]) { newWeeks[week] = { ...newWeeks[week], [field]: value }; }
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
          updates.push({ id: wEx.id, target_sets: parseInt(wEx.target_sets) || 3, target_reps: wEx.target_reps, target_rpe: wEx.target_rpe });
        });
      });
    });
    await Promise.all(updates.map(u => 
      supabase.from('workout_exercises').update({ target_sets: u.target_sets, target_reps: u.target_reps, target_rpe: u.target_rpe }).eq('id', u.id)
    ));
    showToast("Đã lưu giáo án thành công!");
    setSaving(false);
  };

  const handleDeleteExerciseGroup = async (exKey: string) => {
    setSaving(true);
    const exGroup = activeDayData?.exercises.find((e: any) => e.key === exKey);
    if (exGroup) {
      const idsToDelete = Object.values(exGroup.weeks).map((w: any) => w.id);
      if (idsToDelete.length > 0) {
        await supabase.from('workout_exercises').delete().in('id', idsToDelete);
        showToast("Đã xóa bài tập");
        await fetchData();
      }
    }
    setSaving(false);
  };

  const startEditPhaseName = () => {
    const p = phases.find((p: any) => p.id === activeProgramId);
    if (p) {
      setEditPhaseValue(p.name);
      setEditingPhaseName(true);
    }
  };

  const savePhaseName = async () => {
    setEditingPhaseName(false);
    if (!editPhaseValue.trim() || !activeProgramId) return;
    await supabase.from('programs').update({ name: editPhaseValue.trim() }).eq('id', activeProgramId);
    setPhases((prev: any) => prev.map((p: any) => p.id === activeProgramId ? { ...p, name: editPhaseValue.trim() } : p));
    if (programInfo && programInfo.id === activeProgramId) {
       setProgramInfo({ ...programInfo, name: editPhaseValue.trim() });
    }
    showToast("Đã cập nhật tên Phase");
  };

  const handleDeletePhase = async () => {
    if (!activeProgramId) return;
    setSaving(true);
    await supabase.from('programs').delete().eq('id', activeProgramId);
    setShowDeletePhase(false);
    showToast("Đã xóa Phase");
    
    const remainingPhases = phases.filter((p: any) => p.id !== activeProgramId);
    setPhases(remainingPhases);
    if (remainingPhases.length > 0) {
      setActiveProgramId(remainingPhases[0].id);
      setActiveBlockId(null);
    } else {
      setActiveProgramId(null);
      setProgramInfo(null);
      setDays([]);
    }
    setSaving(false);
  };

  const startEditBlockName = () => {
    const currentBlock = programInfo?.blocks?.find((b: any) => b.id === activeBlockId);
    if (currentBlock) {
      setEditBlockValue(currentBlock.name);
      setEditingBlockName(true);
    }
  };

  const saveBlockName = async () => {
    if (!editBlockValue.trim() || !activeBlockId) { setEditingBlockName(false); return; }
    await supabase.from('blocks').update({ name: editBlockValue.trim() }).eq('id', activeBlockId);
    setEditingBlockName(false);
    showToast(`Đã đổi tên thành "${editBlockValue.trim()}"`);
    await fetchData();
  };

  const handleDeleteBlock = async () => {
    if (!activeBlockId) return;
    setSaving(true);
    // Xóa block (Cascade sẽ tự động xóa workout, workout_exercises, workout_logs ở Database)
    await supabase.from('blocks').delete().eq('id', activeBlockId);
    setShowDeleteBlock(false);
    setSaving(false);
    
    // Đổi active block sang block khác
    const remainingBlocks = programInfo?.blocks?.filter((b: any) => b.id !== activeBlockId) || [];
    if (remainingBlocks.length > 0) {
      setActiveBlockId(remainingBlocks[0].id);
    } else {
      setActiveBlockId(null);
    }
    showToast(`Đã xóa Block`);
    await fetchData();
  };

  const startEditDayName = () => {
    const currentDay = days.find(d => d.dayIndex === activeDay);
    if (currentDay) { setEditDayValue(currentDay.name); setEditingDayName(true); }
  };

  const saveDayName = async () => {
    if (!editDayValue.trim()) { setEditingDayName(false); return; }
    const currentDay = days.find(d => d.dayIndex === activeDay);
    if (!currentDay) return;

    const workoutIds = Object.values(currentDay.workoutIds) as string[];
    await Promise.all(workoutIds.map(id => supabase.from('workouts').update({ name: editDayValue.trim() }).eq('id', id)));

    setEditingDayName(false);
    showToast(`Đã đổi tên thành "${editDayValue.trim()}"`);
    await fetchData();
  };

  const startEditExName = (ex: any) => {
    setEditingExKey(ex.key);
    // Use custom_name if it exists, otherwise use base exercise name
    setEditExValue(ex.base_ex.custom_name || ex.base_ex.exercises?.name || "");
  };

  const saveExName = async (ex: any) => {
    if (!editExValue.trim()) { setEditingExKey(null); return; }
    const weekExIds = Object.values(ex.weeks).map((w: any) => w.id);
    await Promise.all(weekExIds.map(id => supabase.from('workout_exercises').update({ custom_name: editExValue.trim() }).eq('id', id)));
    setEditingExKey(null);
    showToast(`Đã đổi tên thành "${editExValue.trim()}"`);
    await fetchData();
  };

  // === THÊM BÀI TẬP HOẶC SWAP ===
  const handleAddOrSwapExercise = async () => {
    if (!selectedExercise) return;
    setAddingExercise(true);

    if (swapTarget) {
      // Logic: Swap chỉ cho 1 tuần duy nhất
      await supabase.from('workout_exercises').update({
        exercise_id: selectedExercise.id,
        custom_name: null // reset custom_name để nó hiển thị tên gốc từ exercises table
      }).eq('id', swapTarget.wExId);
      
      showToast(`Đã thay thế thành "${selectedExercise.name}" cho Tuần ${swapTarget.weekNum}`);
    } else {
      // Logic: Thêm mới cho cả 4 tuần
      if (!newGroupCode.trim()) { setAddingExercise(false); return; }
      const currentDay = days.find(d => d.dayIndex === activeDay);
      if (!currentDay) { setAddingExercise(false); return; }
  
      const maxOrder = currentDay.exercises.reduce((max: number, ex: any) => Math.max(max, ex.order_index || 0), 0);
  
      for (let week = 1; week <= 4; week++) {
        if (!currentDay.workoutIds[week]) {
          const { data: newWorkout } = await supabase.from('workouts').insert({
            block_id: activeBlockId, name: currentDay.name, week_number: week, order_index: activeDay, is_completed: false
          }).select('id').single();
          if (newWorkout) currentDay.workoutIds[week] = newWorkout.id;
        }
        await supabase.from('workout_exercises').insert({
          workout_id: currentDay.workoutIds[week], exercise_id: selectedExercise.id,
          group_code: newGroupCode.trim().toUpperCase(), order_index: maxOrder + 1,
          target_sets: parseInt(newSets) || 3, target_reps: newReps, target_rpe: newRpe
        });
      }
      showToast(`Đã thêm "${selectedExercise.name}"`);
    }

    setShowAddExercise(false); setSelectedExercise(null); setSwapTarget(null);
    setNewGroupCode(""); setNewSets("3"); setNewReps("8-10"); setNewRpe("8"); setSearchQuery(""); setAddingExercise(false);
    await fetchData();
  };

  const handleAddDay = async () => {
    if (!activeBlockId) {
      showToast("Vui lòng tạo Block trước khi thêm Buổi tập!", "error");
      return;
    }
    if (!newDayName.trim()) return;
    setAddingExercise(true);
    const maxDayIndex = days.reduce((max, d) => Math.max(max, d.dayIndex), 0);
    const newDayIndex = maxDayIndex + 1;
    for (let week = 1; week <= 4; week++) {
      await supabase.from('workouts').insert({ block_id: activeBlockId, name: newDayName.trim(), week_number: week, order_index: newDayIndex, is_completed: false });
    }
    setShowAddDay(false); setNewDayName(""); setAddingExercise(false); setActiveDay(newDayIndex);
    showToast(`Đã tạo buổi "${newDayName.trim()}"`);
    await fetchData();
  };

  const handleDeleteDay = async () => {
    const currentDay = days.find(d => d.dayIndex === activeDay);
    if (!currentDay) return;
    setAddingExercise(true);
    const workoutIds = Object.values(currentDay.workoutIds) as string[];
    const { data: wExs } = await supabase.from('workout_exercises').select('id').in('workout_id', workoutIds);
    const wExIds = (wExs || []).map((w: any) => w.id);
    if (wExIds.length > 0) {
      await Promise.all(wExIds.map(id => supabase.from('workout_logs').delete().eq('workout_exercise_id', id)));
      await Promise.all(wExIds.map(id => supabase.from('workout_exercises').delete().eq('id', id)));
    }
    await Promise.all(workoutIds.map(id => supabase.from('workouts').delete().eq('id', id)));
    setShowDeleteDay(false); setAddingExercise(false);
    const remaining = days.filter(d => d.dayIndex !== activeDay);
    if (remaining.length > 0) setActiveDay(remaining[0].dayIndex);
    showToast(`Đã xóa buổi "${currentDay.name}"`);
    await fetchData();
  };

  const handleDeleteExercise = async (ex: any) => {
    // 1. Xóa trong DB
    const weekExIds = Object.values(ex.weeks).map((w: any) => w.id);
    await Promise.all(weekExIds.map(id => supabase.from('workout_logs').delete().eq('workout_exercise_id', id)));
    await Promise.all(weekExIds.map(id => supabase.from('workout_exercises').delete().eq('id', id)));

    // 2. Tính toán lại thứ tự cho các bài còn lại
    const currentDay = days.find(d => d.dayIndex === activeDay);
    if (currentDay) {
      const remainingExercises = currentDay.exercises.filter((e: any) => e.key !== ex.key);
      const units = groupIntoDragUnits(remainingExercises);
      const { allExercises } = renumberUnits(units);

      const updatePromises: Promise<any>[] = [];
      allExercises.forEach((e: any, i: number) => {
        Object.values(e.weeks).forEach((wEx: any) => {
          updatePromises.push(
            supabase.from('workout_exercises').update({ order_index: i + 1, group_code: e.group_code }).eq('id', wEx.id)
          );
        });
      });
      await Promise.all(updatePromises);
    }
    showToast(`Đã xóa bài tập`);
    await fetchData();
  };

  const handleDragStart = (unitIndex: number) => { dragUnit.current = unitIndex; setDragUnitIndex(unitIndex); };
  const handleDragEnter = (unitIndex: number) => { dragOverUnit.current = unitIndex; };
  const handleDragEnd = async () => {
    if (dragUnit.current === null || dragOverUnit.current === null || dragUnit.current === dragOverUnit.current) {
      setDragUnitIndex(null); return;
    }
    const currentDay = days.find(d => d.dayIndex === activeDay);
    if (!currentDay) return;
    
    let units = groupIntoDragUnits(currentDay.exercises);
    const draggedUnit = units.splice(dragUnit.current, 1)[0];
    units.splice(dragOverUnit.current, 0, draggedUnit);

    const { allExercises } = renumberUnits(units);
    setDays(prevDays => prevDays.map(day => {
      if (day.dayIndex !== activeDay) return day;
      return { ...day, exercises: allExercises.map((ex: any, i: number) => ({ ...ex, order_index: i + 1 })) };
    }));
    setDragUnitIndex(null); dragUnit.current = null; dragOverUnit.current = null;

    const updatePromises: Promise<any>[] = [];
    allExercises.forEach((ex: any, i: number) => {
      Object.values(ex.weeks).forEach((wEx: any) => {
        updatePromises.push(supabase.from('workout_exercises').update({ order_index: i + 1, group_code: ex.group_code }).eq('id', wEx.id));
      });
    });
    await Promise.all(updatePromises);
    showToast("Đã sắp xếp lại thứ tự bài tập");
    await fetchData();
  };

  // === TẠO PHASE KẾ TIẾP (SAO CHÉP BLOCK) ===
  const handleCloneBlock = async () => {
    if (!programInfo) return;
    setSaving(true);
    try {
      const sourceBlock = activeBlockId ? programInfo.blocks?.find((b: any) => b.id === activeBlockId) : null;
      const maxOrder = (programInfo.blocks && programInfo.blocks.length > 0) ? Math.max(...programInfo.blocks.map((b: any) => b.order_index)) : 0;
      const newOrder = maxOrder + 1;
      const newBlockName = `Block ${newOrder}`;

      // 1. Tạo Block mới
      const { data: newBlock, error: blockErr } = await supabase.from('blocks').insert({
        program_id: programInfo.id, name: newBlockName, order_index: newOrder
      }).select('id').single();

      if (blockErr || !newBlock) {
        console.error("Block Insert Error:", blockErr);
        throw new Error(blockErr?.message || "Không tạo được Block");
      }

      // 2. Clone Workouts & Workout_Exercises
      if (sourceBlock) {
        const sourceWorkouts = sourceBlock.workouts || [];
        for (const w of sourceWorkouts) {
          const { data: clonedWorkout, error: wErr } = await supabase.from('workouts').insert({
            block_id: newBlock.id, name: w.name, week_number: w.week_number, order_index: w.order_index, is_completed: false
          }).select('id').single();

          if (wErr || !clonedWorkout) {
             console.error("Workout Insert Error:", wErr);
             throw new Error(wErr?.message || "Không tạo được Workout");
          }

          const wExs = w.workout_exercises || [];
          for (const wex of wExs) {
            const { error: wexErr } = await supabase.from('workout_exercises').insert({
              workout_id: clonedWorkout.id, exercise_id: wex.exercise_id, custom_name: wex.custom_name,
              group_code: wex.group_code, order_index: wex.order_index,
              target_sets: wex.target_sets, target_reps: wex.target_reps, target_rpe: wex.target_rpe
            });
            if (wexErr) {
               console.error("Workout Exercise Insert Error:", wexErr);
               throw new Error(wexErr?.message || "Không tạo được bài tập");
            }
          }
        }
      }

      showToast(`Đã tạo thành công ${newBlockName}!`);
      setActiveBlockId(newBlock.id);
      await fetchData();
    } catch (e: any) {
      console.error("handleCloneBlock caught error:", e);
      showToast(e.message || "Có lỗi xảy ra khi tạo Block", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-brand-paper"><Loader2 className="animate-spin text-brand-moss" size={32} /></div>;

  const activeDayData = days.find(d => d.dayIndex === activeDay);
  const filteredExercises = exerciseLibrary.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const dragUnits = activeDayData ? groupIntoDragUnits(activeDayData.exercises) : [];
  const sortedBlocks = programInfo?.blocks?.sort((a: any, b: any) => a.order_index - b.order_index) || [];

  return (
    <div className="h-screen overflow-hidden bg-brand-paper/50 flex flex-col">
      <header className="bg-white border-b border-brand-line px-6 py-4 flex items-center justify-between z-40 relative shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => window.history.back()} className="p-2 hover:bg-brand-paper rounded-full text-brand-moss/60 hover:text-brand-moss transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-brand-moss mb-4">
              Hồ sơ: {clientInfo?.full_name || "Đang tải..."} 
            </h1>
            
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-brand-line/50 overflow-x-auto w-full">
              {phases.map((p: any) => {
                const isActivePhase = activeProgramId === p.id;
                
                if (isActivePhase && editingPhaseName) {
                  return (
                    <input 
                      key={p.id}
                      value={editPhaseValue}
                      onChange={(e) => setEditPhaseValue(e.target.value)}
                      onBlur={savePhaseName}
                      onKeyDown={(e) => e.key === 'Enter' && savePhaseName()}
                      autoFocus
                      className="text-sm font-bold px-4 py-2 rounded-xl bg-white border-2 border-brand-moss outline-none w-40"
                    />
                  )
                }

                return (
                  <div key={p.id} className="flex items-center gap-1">
                    <button 
                      onClick={() => { setActiveProgramId(p.id); setActiveBlockId(null); }}
                      className={`text-sm font-bold px-4 py-2 rounded-xl transition-all whitespace-nowrap ${isActivePhase ? 'bg-brand-mossDeep text-white shadow-md' : 'bg-white text-brand-moss/60 hover:bg-brand-paper border border-brand-line'}`}
                    >
                      {p.name}
                    </button>
                    {isActivePhase && (
                      <div className="flex flex-col gap-1 ml-1">
                        <button onClick={startEditPhaseName} className="p-1 text-brand-moss/60 hover:text-brand-moss bg-white rounded-md border border-brand-line shadow-sm" title="Sửa tên Phase"><Pencil size={10}/></button>
                        <button onClick={() => setShowDeletePhase(true)} className="p-1 text-red-400 hover:text-red-600 bg-white rounded-md border border-brand-line shadow-sm" title="Xóa Phase"><Trash2 size={10}/></button>
                      </div>
                    )}
                  </div>
                );
              })}
              
              <button 
                onClick={() => setIsAddPhaseModalOpen(true)}
                className="text-sm font-bold px-4 py-2 rounded-xl bg-brand-sand/20 text-brand-moss/60 hover:bg-brand-sand/40 flex items-center gap-1 transition-colors border border-brand-sand/30 whitespace-nowrap ml-2 h-9"
                title="Tạo thêm 1 Phase mới cho học viên này"
              >
                <Plus size={14}/> Thêm Phase Mới
              </button>
            </div>

            {/* --- BLOCK TABS --- */}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {sortedBlocks.map((b: any) => {
                const isActive = activeBlockId === b.id;
                if (isActive && editingBlockName) {
                  return (
                    <input 
                      key={b.id}
                      type="text" 
                      value={editBlockValue} 
                      onChange={(e) => setEditBlockValue(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && saveBlockName()} 
                      onBlur={saveBlockName}
                      className="text-xs font-bold px-3 py-1 bg-white text-brand-mossDeep rounded-full focus:ring-2 focus:ring-brand-sand outline-none w-32 border border-brand-sand/50 shadow-inner" 
                      autoFocus 
                    />
                  );
                }
                return (
                  <button 
                    key={b.id} 
                    onClick={() => {
                      if (isActive) {
                        startEditBlockName();
                      } else {
                        setActiveBlockId(b.id); 
                        setActiveDay(1);
                      }
                    }}
                    className={`text-xs font-bold px-3 py-1 rounded-full transition-all flex items-center gap-1 group ${isActive ? 'bg-brand-moss text-white shadow-sm' : 'bg-brand-paper text-brand-moss/60 hover:bg-brand-sand/40'}`}
                  >
                    {b.name}
                    {isActive && <Pencil size={10} className="opacity-40 group-hover:opacity-100" />}
                  </button>
                );
              })}
              
              {/* Show trash icon next to the active block if there's more than 1 block */}
              {sortedBlocks.length > 1 && !editingBlockName && (
                <button 
                  onClick={() => setShowDeleteBlock(true)} 
                  className="p-1 text-brand-moss/40 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                  title="Xóa Block hiện tại"
                >
                  <Trash2 size={12} />
                </button>
              )}

              <button onClick={handleCloneBlock} disabled={saving} className="text-xs font-bold px-3 py-1 rounded-full bg-brand-sand/20 text-brand-moss/60 hover:bg-brand-sand/40 flex items-center gap-1 transition-colors ml-1 border border-brand-sand/30">
                <Copy size={12}/> Tạo Block tiếp
              </button>
            </div>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="bg-brand-moss text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-brand-mossDeep transition-colors shadow-md disabled:opacity-70">
          {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />}
          {saving ? "Đang lưu..." : "Lưu Thay Đổi"}
        </button>
      </header>

      {/* Day Tabs */}
      <div className="px-6 py-4 flex items-center gap-3 border-b border-brand-line bg-white shadow-sm z-30 relative overflow-x-auto">
        {days.map(d => {
          const isActive = activeDay === d.dayIndex;
          if (isActive && editingDayName) {
            return (
              <div key={d.dayIndex} className="px-1 py-1 bg-brand-sand/20 rounded-full flex items-center shadow-inner">
                <input type="text" value={editDayValue} onChange={(e) => setEditDayValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveDayName()} onBlur={saveDayName}
                  className="bg-white px-5 py-1.5 rounded-full text-sm font-bold text-brand-mossDeep outline-none w-40 focus:ring-2 focus:ring-brand-sand" autoFocus />
              </div>
            );
          }
          return (
            <button key={d.dayIndex} onClick={() => { if (isActive) startEditDayName(); else setActiveDay(d.dayIndex); }}
              className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all group flex items-center gap-2 whitespace-nowrap ${isActive ? 'bg-brand-sand text-brand-mossDeep shadow-md' : 'bg-brand-paper/50 text-brand-moss/60 hover:bg-brand-paper'}`}>
              {d.name}
              {isActive && <Pencil size={12} className="opacity-40 group-hover:opacity-100 transition-opacity" title="Click để sửa tên" />}
            </button>
          );
        })}
        <button onClick={() => setShowAddDay(true)} className="px-4 py-2.5 rounded-full font-bold text-sm border-2 border-dashed border-brand-moss/20 text-brand-moss/40 hover:border-brand-moss/40 hover:text-brand-moss/60 transition-all flex items-center gap-1.5 whitespace-nowrap">
          <Plus size={14} /> Thêm Buổi
        </button>

        <div className="ml-auto flex items-center gap-2">
          {days.length > 1 && (
            <button onClick={() => setShowDeleteDay(true)} className="px-3 py-2 rounded-lg text-xs font-bold text-red-400 hover:text-red-600 hover:bg-red-50 transition-all flex items-center gap-1.5 whitespace-nowrap">
              <Trash2 size={13} /> Xóa buổi này
            </button>
          )}
        </div>
      </div>

      {/* Spreadsheet */}
      <main className="flex-1 overflow-auto bg-brand-paper/50 relative z-0">
        <div className="min-w-[1200px] min-h-full pb-20">
          <div className="grid grid-cols-[280px_1fr_1fr_1fr_1fr] bg-brand-mossDeep text-brand-sage font-bold text-sm sticky top-0 z-20 shadow-md">
            <div className="p-4 border-r border-brand-sage/20">Bài tập (Template)</div>
            {[1,2,3,4].map(w => (<div key={w} className="p-4 border-r border-brand-sage/20 text-center">Tuần {w}</div>))}
          </div>

          {dragUnits.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-brand-moss/40">
              <Dumbbell size={48} className="mb-4 opacity-30" />
              <p className="font-bold text-lg">Chưa có bài tập nào</p>
              <p className="text-sm mt-1">Bấm nút bên dưới để thêm bài tập đầu tiên</p>
            </div>
          )}

          {dragUnits.map((unit: any, unitIndex: number) => (
            <div key={unit.exercises.map((e: any) => e.key).join('-')} draggable onDragStart={() => handleDragStart(unitIndex)} onDragEnter={() => handleDragEnter(unitIndex)} onDragEnd={handleDragEnd} onDragOver={(e) => e.preventDefault()}
              className={`transition-all ${dragUnitIndex === unitIndex ? 'opacity-40 bg-brand-sand/20' : ''} ${unit.type === 'group' ? 'border-l-4 border-l-brand-sand' : ''}`}>
              {unit.exercises.map((ex: any, exInUnit: number) => (
                <div key={ex.key} className="grid grid-cols-[280px_1fr_1fr_1fr_1fr] min-w-[1200px] border-b border-brand-line group hover:bg-brand-paper/20 transition-colors cursor-grab active:cursor-grabbing">
                  {/* Cột Tên bài tập (Template Base) */}
                  <div className="p-4 border-r border-brand-line bg-brand-paper/40 flex items-center gap-2">
                    {exInUnit === 0 && <div className="text-brand-moss/20 group-hover:text-brand-moss/50 transition-colors flex-shrink-0"><GripVertical size={16} /></div>}
                    {exInUnit > 0 && <div className="w-4 flex-shrink-0" />}
                    
                    <div className="flex-1 min-w-0 pr-2">
                      {editingExKey === ex.key ? (
                        <div className="flex items-center gap-1 w-full">
                          <input type="text" value={editExValue} onChange={(e) => setEditExValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveExName(ex)} onBlur={() => saveExName(ex)}
                            className="flex-1 min-w-0 px-2 py-1.5 border-2 border-brand-sand rounded-lg text-sm font-bold focus:outline-none focus:ring-4 focus:ring-brand-sand/20" autoFocus />
                          <button onMouseDown={(e) => { e.preventDefault(); saveExName(ex); }} className="p-1.5 bg-brand-moss text-white rounded-lg hover:bg-brand-mossDeep flex-shrink-0"><Check size={14} /></button>
                        </div>
                      ) : (
                        <p className="font-bold text-brand-moss truncate group/name">
                          <span className="text-brand-moss/50 font-semibold">{ex.base_ex.group_code ? `${ex.base_ex.group_code}. ` : ''}</span>
                          <span onClick={() => startEditExName(ex)} className="cursor-pointer hover:text-brand-sand transition-colors" title="Click để sửa tên">
                            {ex.base_ex.custom_name || ex.base_ex.exercises?.name}
                          </span>
                        </p>
                      )}
                    </div>
                    {editingExKey !== ex.key && (
                      <button onClick={() => handleDeleteExercise(ex)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-all flex-shrink-0" title="Xóa bài tập này khỏi toàn bộ Phase">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {/* Cột Tuần 1 -> 4 */}
                  {[1, 2, 3, 4].map(weekNum => {
                    const wEx = ex.weeks[weekNum];
                    if (!wEx) return <div key={weekNum} className="p-4 border-r border-brand-line bg-gray-50/50 flex items-center justify-center"><span className="text-xs text-gray-400">Trống</span></div>;

                    // Kiểm tra Override: Nếu bài tập thực tế ở Tuần này khác với Template gốc
                    const isOverridden = wEx.exercise_id !== ex.base_ex.exercise_id || wEx.custom_name !== ex.base_ex.custom_name;
                    const overrideName = wEx.custom_name || wEx.exercises?.name;

                    const rawLogs = wEx.workout_logs || [];
                    const uniqueLogsMap = new Map();
                    rawLogs.forEach((l: any) => { uniqueLogsMap.set(l.set_number, l); });
                    const uniqueLogs = Array.from(uniqueLogsMap.values()).sort((a: any, b: any) => a.set_number - b.set_number);
                    
                    return (
                      <div key={weekNum} className="p-4 border-r border-brand-line flex flex-col gap-2 group/cell">
                        {/* Header của Cell (Swap button & Override Badge) */}
                        <div className="flex items-center justify-between mb-1 min-h-[20px]">
                          <p className="text-[10px] font-bold text-brand-moss/50 uppercase tracking-wider">Mục tiêu (Set x Rep @RPE)</p>
                          <button 
                            onClick={() => { setSwapTarget({ wExId: wEx.id, weekNum }); setShowAddExercise(true); }}
                            className="opacity-0 group-hover/cell:opacity-100 p-1 rounded bg-brand-paper hover:bg-brand-sand/50 text-brand-moss/60 hover:text-brand-mossDeep transition-all flex items-center gap-1"
                            title="Thay thế bài tập riêng cho tuần này"
                          >
                            <Repeat size={12} /> <span className="text-[9px] font-bold uppercase">Thay thế</span>
                          </button>
                        </div>
                        
                        {/* Override Badge */}
                        {isOverridden && (
                          <div className="bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-1 rounded-md mb-1 border border-amber-200 flex items-center gap-1 truncate">
                            <Repeat size={10} /> {overrideName}
                          </div>
                        )}

                        <div className="bg-white p-2.5 rounded-lg border border-brand-line hover:border-brand-sand focus-within:border-brand-sand focus-within:ring-2 ring-brand-sand/20 transition-all shadow-sm">
                          <div className="flex items-center gap-1">
                            <input type="text" value={wEx.target_sets || ""} onChange={(e) => handleTargetChange(activeDayData!.dayIndex, ex.key, weekNum, 'target_sets', e.target.value)}
                              className="w-6 text-sm font-bold text-brand-moss border-b border-brand-line/50 focus:border-brand-moss outline-none text-center bg-transparent" />
                            <span className="text-xs font-semibold text-brand-moss/50">x</span>
                            <input type="text" value={wEx.target_reps || ""} onChange={(e) => handleTargetChange(activeDayData!.dayIndex, ex.key, weekNum, 'target_reps', e.target.value)}
                              className="w-12 text-sm font-bold text-brand-moss border-b border-brand-line/50 focus:border-brand-moss outline-none text-center bg-transparent" />
                            <input type="text" value={wEx.target_rpe || ""} onChange={(e) => handleTargetChange(activeDayData!.dayIndex, ex.key, weekNum, 'target_rpe', e.target.value)}
                              className="w-10 text-sm font-bold text-brand-moss border-b border-brand-line/50 focus:border-brand-moss outline-none text-center bg-transparent" />
                          </div>
                        </div>

                        {uniqueLogs.length > 0 ? (
                          <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1.5">✅ Thực tế tập</p>
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
            </div>
          ))}

          <div className="p-4 border-t border-brand-line">
            <button onClick={() => { setSwapTarget(null); setShowAddExercise(true); }}
              className="px-5 py-2.5 text-sm font-bold text-brand-moss bg-white border-2 border-dashed border-brand-moss/20 hover:border-brand-moss/40 hover:bg-brand-sand/10 rounded-lg flex items-center gap-2 transition-all">
              <Plus size={16} /> Thêm bài tập vào {activeDayData?.name || 'buổi này'}
            </button>
          </div>
        </div>
      </main>

      {/* ===== MODAL: XÓA PHASE ===== */}
      {showDeletePhase && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-6">
              <div className="flex items-center gap-3 text-red-600 mb-2">
                <AlertTriangle size={24} />
                <h3 className="font-bold text-lg">Xóa Phase này?</h3>
              </div>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                Hành động này sẽ xóa toàn bộ Phase, bao gồm tất cả các Block, Buổi tập, và Bài tập bên trong.
                Dữ liệu sẽ <strong>không thể khôi phục</strong>.
              </p>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end border-t border-gray-100">
              <button onClick={() => setShowDeletePhase(false)} className="px-4 py-2 font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">Hủy</button>
              <button onClick={handleDeletePhase} disabled={saving} className="px-4 py-2 font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors flex items-center gap-2">
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />} Xác nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: THÊM / THAY THẾ BÀI TẬP ===== */}
      {showAddExercise && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => {setShowAddExercise(false); setSwapTarget(null);}}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-brand-line">
              <h2 className="text-lg font-bold text-brand-moss">{swapTarget ? `Thay thế bài tập Tuần ${swapTarget.weekNum}` : "Thêm bài tập (Template)"}</h2>
              <button onClick={() => {setShowAddExercise(false); setSwapTarget(null);}} className="p-1.5 hover:bg-brand-paper rounded-full text-brand-moss/40 hover:text-brand-moss transition-colors"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <label className="text-xs font-bold text-brand-moss/60 uppercase tracking-wider mb-2 block">1. Chọn bài tập mới</label>
                <div className="relative mb-3">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-moss/30" />
                  <input type="text" placeholder="Tìm kiếm bài tập..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-brand-line rounded-xl text-sm focus:ring-2 focus:ring-brand-sand/30 focus:border-brand-sand outline-none" />
                </div>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-2">
                  {filteredExercises.map(ex => (
                    <button key={ex.id} onClick={() => setSelectedExercise(ex)}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all ${selectedExercise?.id === ex.id ? 'bg-brand-sand text-brand-mossDeep shadow-md ring-2 ring-brand-sand' : 'bg-brand-paper/50 text-brand-moss hover:bg-brand-paper'}`}>
                      <span className="flex items-center gap-2"><Dumbbell size={14} className="opacity-50" />{ex.name}</span>
                    </button>
                  ))}
                  {filteredExercises.length === 0 && <p className="text-sm text-brand-moss/40 text-center py-4 italic">Không tìm thấy bài tập nào</p>}
                </div>
              </div>
              
              {!swapTarget && (
                <>
                  <div>
                    <label className="text-xs font-bold text-brand-moss/60 uppercase tracking-wider mb-2 block">2. Mã nhóm (Group Code)</label>
                    <input type="text" placeholder="VD: 1, 1A, 1B, 2A..." value={newGroupCode} onChange={(e) => setNewGroupCode(e.target.value)}
                      className="w-full px-4 py-2.5 border border-brand-line rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-sand/30 focus:border-brand-sand outline-none" />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="text-[10px] font-bold text-brand-moss/40 uppercase mr-1 self-center">Gợi ý:</span>
                      {['1', '2', '3', '1A', '1B', '2A', '2B', '3A', '3B', '3C'].map(code => (
                        <button key={code} onClick={() => setNewGroupCode(code)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${newGroupCode === code ? 'bg-brand-sand text-brand-mossDeep' : 'bg-brand-paper text-brand-moss/60 hover:bg-brand-sand/30'}`}>{code}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-brand-moss/60 uppercase tracking-wider mb-2 block">3. Mục tiêu (áp dụng cho cả 4 tuần)</label>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="text-[10px] font-semibold text-brand-moss/40 mb-0.5 block">Sets</label>
                        <input type="text" value={newSets} onChange={(e) => setNewSets(e.target.value)} className="w-full px-3 py-2 border border-brand-line rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-brand-sand/30 focus:border-brand-sand outline-none" />
                      </div>
                      <span className="text-brand-moss/30 font-bold mt-4">×</span>
                      <div className="flex-1">
                        <label className="text-[10px] font-semibold text-brand-moss/40 mb-0.5 block">Reps</label>
                        <input type="text" value={newReps} onChange={(e) => setNewReps(e.target.value)} className="w-full px-3 py-2 border border-brand-line rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-brand-sand/30 focus:border-brand-sand outline-none" />
                      </div>
                      <span className="text-brand-moss/30 font-bold mt-4">@</span>
                      <div className="flex-1">
                        <label className="text-[10px] font-semibold text-brand-moss/40 mb-0.5 block">RPE</label>
                        <input type="text" value={newRpe} onChange={(e) => setNewRpe(e.target.value)} className="w-full px-3 py-2 border border-brand-line rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-brand-sand/30 focus:border-brand-sand outline-none" />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-brand-line bg-brand-paper/30">
              <button onClick={handleAddOrSwapExercise} disabled={!selectedExercise || (!swapTarget && !newGroupCode.trim()) || addingExercise}
                className="w-full bg-brand-moss text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-mossDeep transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {addingExercise ? <Loader2 size={16} className="animate-spin" /> : (swapTarget ? <Repeat size={16} /> : <Plus size={16} />)}
                {addingExercise ? "Đang xử lý..." : (swapTarget ? "Xác nhận Thay Thế" : "Thêm vào Giáo án")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Các Modal khác giữ nguyên... (Thêm Buổi, Xóa Buổi, Toast) */}
      {showAddDay && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddDay(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-brand-line">
              <h2 className="text-lg font-bold text-brand-moss">Thêm buổi tập mới</h2>
              <button onClick={() => setShowAddDay(false)} className="p-1.5 hover:bg-brand-paper rounded-full text-brand-moss/40 hover:text-brand-moss transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6">
              <label className="text-xs font-bold text-brand-moss/60 uppercase tracking-wider mb-2 block">Tên buổi tập</label>
              <input type="text" placeholder="VD: Buổi 4 - Push" value={newDayName} onChange={(e) => setNewDayName(e.target.value)}
                className="w-full px-4 py-3 border border-brand-line rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-sand/30 focus:border-brand-sand outline-none" autoFocus />
              <div className="mt-3 flex flex-wrap gap-2">
                {['Push', 'Pull', 'Legs', 'Upper Body', 'Lower Body', 'Full Body', 'Arms'].map(s => (
                  <button key={s} onClick={() => setNewDayName(`Buổi ${days.length + 1} - ${s}`)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-paper text-brand-moss/60 hover:bg-brand-sand/30 transition-all">{s}</button>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-brand-line bg-brand-paper/30">
              <button onClick={handleAddDay} disabled={!newDayName.trim() || addingExercise}
                className="w-full bg-brand-moss text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-mossDeep transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {addingExercise ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {addingExercise ? "Đang tạo..." : "Tạo Buổi Tập"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteDay && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteDay(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4"><AlertTriangle size={28} className="text-red-500" /></div>
              <h2 className="text-lg font-bold text-brand-moss mb-2">Xóa buổi tập?</h2>
              <p className="text-sm text-brand-moss/60 leading-relaxed">
                Toàn bộ <strong>{activeDayData?.exercises.length || 0} bài tập</strong> và dữ liệu trong <strong>{activeDayData?.name}</strong> sẽ bị xóa vĩnh viễn.
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowDeleteDay(false)} className="flex-1 py-3 rounded-xl font-bold text-sm bg-brand-paper text-brand-moss hover:bg-brand-line transition-colors">Hủy</button>
              <button onClick={handleDeleteDay} disabled={addingExercise} className="flex-1 py-3 rounded-xl font-bold text-sm bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50">
                {addingExercise ? "Đang xóa..." : "Xóa luôn"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteBlock && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteBlock(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4"><AlertTriangle size={28} className="text-red-500" /></div>
              <h2 className="text-lg font-bold text-brand-moss mb-2">Xóa toàn bộ Block này?</h2>
              <p className="text-sm text-brand-moss/60 leading-relaxed">
                Tất cả các buổi tập, bài tập và mục tiêu trong Block này sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác!
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowDeleteBlock(false)} className="flex-1 py-3 rounded-xl font-bold text-sm bg-brand-paper text-brand-moss hover:bg-brand-line transition-colors">Hủy</button>
              <button onClick={handleDeleteBlock} disabled={saving} className="flex-1 py-3 rounded-xl font-bold text-sm bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50">
                {saving ? "Đang xóa..." : "Xóa vĩnh viễn"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddPhaseModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsAddPhaseModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-brand-line">
              <h2 className="text-lg font-bold text-brand-moss">Tạo Phase Mới</h2>
              <button onClick={() => setIsAddPhaseModalOpen(false)} className="p-1.5 hover:bg-brand-paper rounded-full text-brand-moss/40 hover:text-brand-moss transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <label className="text-xs font-bold text-brand-moss/60 uppercase tracking-wider mb-2 block">Tên Phase (VD: Phase 2 - Siết Mỡ) *</label>
              <input 
                type="text" 
                value={newPhaseName} 
                onChange={(e) => setNewPhaseName(e.target.value)}
                placeholder="Nhập tên Phase..."
                className="w-full px-4 py-3 border border-brand-line rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-sand/30 focus:border-brand-sand outline-none"
                autoFocus
              />
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setIsAddPhaseModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-sm bg-brand-paper text-brand-moss hover:bg-brand-line transition-colors">Hủy</button>
              <button onClick={handleCreatePhase} disabled={savingPhase || !newPhaseName.trim()} className="flex-1 py-3 rounded-xl font-bold text-sm bg-brand-moss text-white hover:bg-brand-mossDeep transition-colors disabled:opacity-50">
                {savingPhase ? "Đang tạo..." : "Tạo Phase"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-2xl font-bold text-sm shadow-2xl animate-[slideUp_0.3s_ease-out] ${toast.type === 'success' ? 'bg-brand-mossDeep text-white' : 'bg-red-600 text-white'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
