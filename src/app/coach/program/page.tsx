"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Save, Plus, MessageSquareText, Loader2, PlayCircle, MessageCircle, Trash2, X, Search, Dumbbell, GripVertical, AlertTriangle, Pencil, Check, Copy, Repeat, CheckCircle2, TrendingUp, ChevronUp, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

// Formula Epley: 1RM = W * (1 + R/30)
const estimate1RM = (weight: number, reps: number) => {
  if (!weight || !reps) return 0;
  return Math.round(weight * (1 + reps / 30));
};

// === HELPER: Đánh lại số thông minh bảo toàn Superset (1, 2A, 2B, 3A, 3B, 3C...) ===
function renumberSmart(exercises: any[]) {
  const letters = 'ABCDEFGHIJ';
  let unitCounter = 1;
  let i = 0;
  const result: any[] = [];

  while (i < exercises.length) {
    const cur = exercises[i];
    const curCode = String(cur.group_code || cur.base_ex?.group_code || '').trim();
    const curHasLetter = /[a-zA-Z]/.test(curCode);

    if (curHasLetter) {
      // Nhóm này có chữ cái (Superset / Triset)
      // Tìm xem có bao nhiêu bài liền tiếp cùng nhóm chữ cái (cùng số prefix)
      const curNumPrefix = parseInt(curCode.replace(/\D/g, '')) || 0;
      let j = i + 1;
      while (j < exercises.length) {
        const nextCode = String(exercises[j].group_code || exercises[j].base_ex?.group_code || '').trim();
        const nextHasLetter = /[a-zA-Z]/.test(nextCode);
        const nextNumPrefix = parseInt(nextCode.replace(/\D/g, '')) || 0;

        // Nếu bài tiếp theo cũng có chữ và cùng số prefix (hoặc prefix = 0)
        if (nextHasLetter && (nextNumPrefix === curNumPrefix || nextNumPrefix === 0 || curNumPrefix === 0)) {
          j++;
        } else {
          break;
        }
      }

      const count = j - i;
      if (count > 1) {
        // Cụm Superset / Triset từ 2 bài trở lên
        for (let k = 0; k < count; k++) {
          const ex = exercises[i + k];
          const newCode = `${unitCounter}${letters[k] || ''}`;
          const newOrder = result.length + 1;
          ex.order_index = newOrder;
          ex.group_code = newCode;
          if (ex.base_ex) {
            ex.base_ex.order_index = newOrder;
            ex.base_ex.group_code = newCode;
          }
          if (ex.weeks) {
            Object.values(ex.weeks).forEach((wEx: any) => {
              wEx.order_index = newOrder;
              wEx.group_code = newCode;
            });
          }
          result.push(ex);
        }
        i = j;
      } else {
        // Đứng một mình không có bạn đồng hành: chuyển thành bài đơn bình thường
        const newCode = String(unitCounter);
        const newOrder = result.length + 1;
        cur.order_index = newOrder;
        cur.group_code = newCode;
        if (cur.base_ex) {
          cur.base_ex.order_index = newOrder;
          cur.base_ex.group_code = newCode;
        }
        if (cur.weeks) {
          Object.values(cur.weeks).forEach((wEx: any) => {
            wEx.order_index = newOrder;
            wEx.group_code = newCode;
          });
        }
        result.push(cur);
        i++;
      }
    } else {
      // Bài đơn thuần túy (không có chữ cái)
      const newCode = String(unitCounter);
      const newOrder = result.length + 1;
      cur.order_index = newOrder;
      cur.group_code = newCode;
      if (cur.base_ex) {
        cur.base_ex.order_index = newOrder;
        cur.base_ex.group_code = newCode;
      }
      if (cur.weeks) {
        Object.values(cur.weeks).forEach((wEx: any) => {
          wEx.order_index = newOrder;
          wEx.group_code = newCode;
        });
      }
      result.push(cur);
      i++;
    }
    unitCounter++;
  }

  return result;
}

function ProgramBuilderInner() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId');
  // Không còn bắt buộc phải có programId từ URL
  const initialProgramId = searchParams.get('programId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingVideo, setEditingVideo] = useState<{workoutId: string, url: string} | null>(null);
  const [editingNotes, setEditingNotes] = useState<{wExId: string, notes: string} | null>(null);

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
  const [exerciseToDelete, setExerciseToDelete] = useState<any>(null);
  const [weekToDelete, setWeekToDelete] = useState<{ wExId: string, weekNum: number } | null>(null);
  const [exerciseLibrary, setExerciseLibrary] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [newGroupCode, setNewGroupCode] = useState("");
  const [newSets, setNewSets] = useState("3");
  const [newReps, setNewReps] = useState("8-10");
  const [newRpe, setNewRpe] = useState("8");
  const [newDayName, setNewDayName] = useState("");
  const [addingExercise, setAddingExercise] = useState(false);

  // Trạng thái Swap riêng lẻ cho 1 tuần
  const [swapTarget, setSwapTarget] = useState<{ wExId: string, weekNum: number } | null>(null);
  // Trạng thái Swap TOÀN BỘ Phase (Đổi hẳn bài tập cho tất cả 4 tuần)
  const [swapGlobalTarget, setSwapGlobalTarget] = useState<{ exKey: string; baseEx: any; ex: any } | null>(null);
  // Trạng thái Chèn bài tập ở trên / ở dưới (Giống Google Sheets)
  const [insertTarget, setInsertTarget] = useState<{ targetIndex: number; placement: 'above' | 'below'; refEx: any } | null>(null);

  // Modal Tiến độ mức tạ qua các tuần 📈
  const [progressModal, setProgressModal] = useState<{ exId: string; exName: string } | null>(null);
  const [progressLogs, setProgressLogs] = useState<any[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(false);

  const [modifiedWExIds, setModifiedWExIds] = useState<Set<string>>(new Set());
  const [modifiedLogWExIds, setModifiedLogWExIds] = useState<Set<string>>(new Set());

  // Inline edit state
  const [editingDayName, setEditingDayName] = useState(false);
  const [editDayValue, setEditDayValue] = useState("");
  const [editingExKey, setEditingExKey] = useState<string | null>(null);
  const [editExValue, setEditExValue] = useState("");
  const [editingGroupCodeKey, setEditingGroupCodeKey] = useState<string | null>(null);
  const [editGroupCodeValue, setEditGroupCodeValue] = useState("");

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
    if (!clientId) {
      setLoading(false);
      return;
    }

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
              id, name, week_number, order_index, is_completed, rpe_score, joint_pain, notes, coach_video_url,
              workout_exercises (
                  id, exercise_id, custom_name, group_code, order_index, coach_notes,
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
        const feedbackByWeek: Record<number, any> = {};
        dayWorkouts.forEach((w: any) => {
          if (w.rpe_score || w.joint_pain || w.notes) {
            feedbackByWeek[w.week_number] = {
              rpe: w.rpe_score,
              jointPain: w.joint_pain,
              notes: w.notes
            };
          }
        });
        
        // Pass 1: Gom nhóm theo order_index
        dayWorkouts.forEach((w: any) => {
          w.workout_exercises?.forEach((ex: any) => {
            let key = String(ex.order_index);
            // Self-healing: Nếu đụng độ order_index do lỗi mạng khi drag-and-drop, tách ra hàng mới để user thấy thay vì bị nuốt mất (ô Trống)
            while (masterExercises.has(key) && masterExercises.get(key).weeks[w.week_number]) {
              key = key + "_dup";
            }

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

        // Pass 2: Xác định base_ex bằng cách tìm bài tập xuất hiện nhiều nhất (Majority vote) + Tính ổn định (Ưu tiên Tuần nhỏ nhất)
        Array.from(masterExercises.values()).forEach((group: any) => {
          const freqMap = new Map();
          let maxFreq = 0;
          
          // Sắp xếp các tuần từ nhỏ đến lớn (1 -> 4) để đảm bảo tính ổn định (Deterministic)
          const sortedWeeks = Object.keys(group.weeks).map(Number).sort((a, b) => a - b);
          let bestBaseEx = group.weeks[sortedWeeks[0]]; // Mặc định lấy bài của tuần đầu tiên xuất hiện

          for (const weekNum of sortedWeeks) {
            const ex = group.weeks[weekNum];
            const keyToCount = `${ex.exercise_id}_${ex.custom_name || ''}`; // Tính count chính xác theo cả ID và tên custom
            const count = (freqMap.get(keyToCount) || 0) + 1;
            freqMap.set(keyToCount, count);
            
            // Chỉ đổi bestBaseEx nếu count LỚN HƠN. Nếu hòa, nó sẽ giữ bài của tuần nhỏ hơn làm gốc.
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
          workoutsByWeek: Object.fromEntries(dayWorkouts.map((w: any) => [w.week_number, w])),
          feedbackByWeek,
          exercises: exercisesArray
        };
      });

      // Khôi phục bản nháp nếu Coach lỡ ấn Back hoặc F5
      if (clientId) {
        try {
          const draftKey = `coach_draft_logs_${clientId}`;
          const draftStr = typeof window !== 'undefined' ? localStorage.getItem(draftKey) : null;
          if (draftStr) {
            const draftData = JSON.parse(draftStr);
            let hasAnyDraft = false;
            newDays.forEach((day: any) => {
              day.exercises.forEach((ex: any) => {
                Object.values(ex.weeks).forEach((wEx: any) => {
                  if (draftData[wEx.id]) {
                    hasAnyDraft = true;
                    setModifiedLogWExIds(prev => new Set(prev).add(wEx.id));
                    const draftLogs = draftData[wEx.id];
                    const logsMap = new Map();
                    (wEx.workout_logs || []).forEach((l: any) => logsMap.set(l.set_number, l));
                    draftLogs.forEach((dl: any) => {
                      const existing = logsMap.get(dl.set_number) || { id: `temp-${wEx.id}-${dl.set_number}`, set_number: dl.set_number };
                      logsMap.set(dl.set_number, {
                        ...existing,
                        weight: dl.weight !== undefined ? dl.weight : existing.weight,
                        reps: dl.reps !== undefined ? dl.reps : existing.reps,
                        rpe: dl.rpe !== undefined ? dl.rpe : existing.rpe
                      });
                    });
                    wEx.workout_logs = Array.from(logsMap.values()).sort((a: any, b: any) => a.set_number - b.set_number);
                  }
                });
              });
            });
            if (hasAnyDraft) {
              console.log("Đã khôi phục bản nháp số tạ từ localStorage!");
            }
          }
        } catch (e) {
          console.error("Lỗi đọc draft:", e);
        }
      }

      setDays(newDays);
      if (newDays.length > 0 && !newDays.find(d => d.dayIndex === activeDay)) {
        setActiveDay(newDays[0].dayIndex);
      }
    } else {
      setActiveBlockId(null);
      setDays([]);
    }
  }
    setModifiedWExIds(new Set());
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
          if (newWeeks[week]) {
            newWeeks[week] = { ...newWeeks[week], [field]: value };
            setModifiedWExIds(prev => new Set(prev).add(newWeeks[week].id));
          }
          return { ...ex, weeks: newWeeks };
        })
      };
    }));
  };

  const handleLogChange = (dayIndex: number, exKey: string, weekNum: number, setNumber: number, field: 'weight' | 'reps' | 'rpe', value: string) => {
    let targetWExId = '';
    let updatedWExLogs: any[] = [];

    setDays(prevDays => prevDays.map(day => {
      if (day.dayIndex !== dayIndex) return day;
      return {
        ...day,
        exercises: day.exercises.map((ex: any) => {
          if (ex.key !== exKey) return ex;
          const newWeeks = { ...ex.weeks };
          if (newWeeks[weekNum]) {
            const wEx = newWeeks[weekNum];
            targetWExId = wEx.id;
            const currentLogs = [...(wEx.workout_logs || [])];
            const logIdx = currentLogs.findIndex((l: any) => l.set_number === setNumber);
            if (logIdx >= 0) {
              currentLogs[logIdx] = { ...currentLogs[logIdx], [field]: value };
            } else {
              currentLogs.push({
                id: `temp-${wEx.id}-${setNumber}`,
                workout_exercise_id: wEx.id,
                set_number: setNumber,
                weight: field === 'weight' ? value : '',
                reps: field === 'reps' ? value : '',
                rpe: field === 'rpe' ? value : ''
              });
            }
            updatedWExLogs = currentLogs;
            newWeeks[weekNum] = { ...wEx, workout_logs: currentLogs };
            setModifiedLogWExIds(prev => new Set(prev).add(wEx.id));
          }
          return { ...ex, weeks: newWeeks };
        })
      };
    }));

    // Lớp 1: Lưu nháp tức thời vào localStorage (0 request, 0 byte Supabase)
    if (clientId && targetWExId) {
      try {
        const draftKey = `coach_draft_logs_${clientId}`;
        const currentDraft = JSON.parse(localStorage.getItem(draftKey) || '{}');
        currentDraft[targetWExId] = updatedWExLogs;
        localStorage.setItem(draftKey, JSON.stringify(currentDraft));
      } catch (e) {
        console.error("Lỗi lưu draft:", e);
      }
    }
  };

  const handleSave = async () => {
    if (modifiedWExIds.size === 0 && modifiedLogWExIds.size === 0) {
      showToast("Không có thay đổi nào cần lưu!");
      return;
    }
    
    setSaving(true);
    let hasError = false;
    let errorMsg = "";

    try {
      // 1. Lưu Mục tiêu (targets) nếu có thay đổi
      if (modifiedWExIds.size > 0) {
        const targetUpdates: any[] = [];
        days.forEach(day => {
          day.exercises.forEach((ex: any) => {
            Object.values(ex.weeks).forEach((wEx: any) => {
              if (modifiedWExIds.has(wEx.id)) {
                targetUpdates.push({
                  id: wEx.id,
                  target_sets: parseInt(wEx.target_sets) || 3,
                  target_reps: wEx.target_reps,
                  target_rpe: wEx.target_rpe
                });
              }
            });
          });
        });

        for (const u of targetUpdates) {
          const { error } = await supabase.from('workout_exercises').update({ 
            target_sets: u.target_sets, 
            target_reps: u.target_reps, 
            target_rpe: u.target_rpe 
          }).eq('id', u.id);
          
          if (error) throw error;
        }
      }

      // 2. Lưu Kết quả tập thực tế (workout_logs) nếu có thay đổi
      if (modifiedLogWExIds.size > 0) {
        const workoutsToComplete = new Set<string>();

        for (const day of days) {
          for (const ex of day.exercises) {
            for (const [wStr, wEx] of Object.entries<any>(ex.weeks)) {
              if (modifiedLogWExIds.has(wEx.id)) {
                const weekNum = parseInt(wStr);
                const workoutId = day.workoutIds ? day.workoutIds[weekNum] : null;

                const logs = wEx.workout_logs || [];
                let hasFilledSets = false;

                for (const l of logs) {
                  const hasWeight = l.weight !== undefined && l.weight !== null && String(l.weight).trim() !== '';
                  const hasReps = l.reps !== undefined && l.reps !== null && String(l.reps).trim() !== '';
                  const hasRpe = l.rpe !== undefined && l.rpe !== null && String(l.rpe).trim() !== '';

                  if (hasWeight || hasReps || hasRpe) {
                    hasFilledSets = true;
                    const logPayload = {
                      workout_exercise_id: wEx.id,
                      set_number: l.set_number,
                      weight: hasWeight ? (parseFloat(l.weight) || 0) : 0,
                      reps: hasReps ? (parseInt(l.reps) || 0) : 0,
                      rpe: hasRpe ? (parseFloat(l.rpe) || null) : null
                    };

                    if (l.id && !String(l.id).startsWith('temp-')) {
                      // Đã có id trong DB -> update
                      const { error: upErr } = await supabase.from('workout_logs')
                        .update({ weight: logPayload.weight, reps: logPayload.reps, rpe: logPayload.rpe })
                        .eq('id', l.id);
                      if (upErr) throw upErr;
                    } else {
                      // Chưa có id -> insert
                      const { data: insData, error: insErr } = await supabase.from('workout_logs')
                        .insert(logPayload)
                        .select('id')
                        .single();
                      if (insErr) throw insErr;
                      if (insData) l.id = insData.id;
                    }
                  } else if (l.id && !String(l.id).startsWith('temp-')) {
                    // Nếu người dùng xóa trắng dữ liệu của set đã có trước đó -> xóa khỏi DB
                    await supabase.from('workout_logs').delete().eq('id', l.id);
                  }
                }

                // Nếu có bài tập được điền kết quả, đánh dấu buổi tập là hoàn thành
                if (hasFilledSets && workoutId) {
                  workoutsToComplete.add(workoutId);
                }
              }
            }
          }
        }

        // Tự động cập nhật is_completed: true cho các buổi tập đã điền tạ
        for (const wId of workoutsToComplete) {
          await supabase.from('workouts')
            .update({ 
              is_completed: true, 
              completed_at: new Date().toISOString() 
            })
            .eq('id', wId)
            .eq('is_completed', false);
        }
      }

      // Xóa bản nháp trong localStorage sau khi lưu thành công
      if (clientId) {
        localStorage.removeItem(`coach_draft_logs_${clientId}`);
      }

      setModifiedWExIds(new Set());
      setModifiedLogWExIds(new Set());
      showToast("Đã lưu thành công tất cả thay đổi!");
      await fetchData();

    } catch (e: any) {
      console.error("handleSave error:", e);
      window.alert(`🛑 LỖI LƯU DỮ LIỆU:\n\n${e.message || e}\n\nVui lòng thử lại hoặc báo lại nhé!`);
    } finally {
      setSaving(false);
    }
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

  const startEditGroupCode = (ex: any) => {
    setEditingGroupCodeKey(ex.key);
    setEditGroupCodeValue(String(ex.base_ex?.group_code || ex.group_code || ''));
  };

  const saveGroupCode = async (ex: any) => {
    if (!editingGroupCodeKey) return;
    const newCode = editGroupCodeValue.trim().toUpperCase();
    if (!newCode) {
      setEditingGroupCodeKey(null);
      return;
    }

    setSaving(true);
    // Cập nhật local state
    setDays(prevDays => prevDays.map(day => {
      if (day.dayIndex !== activeDay) return day;
      const updatedExercises = day.exercises.map((item: any) => {
        if (item.key !== ex.key) return item;
        const updatedWeeks = { ...item.weeks };
        Object.keys(updatedWeeks).forEach(weekNum => {
          updatedWeeks[weekNum] = { ...updatedWeeks[weekNum], group_code: newCode };
        });
        return {
          ...item,
          group_code: newCode,
          base_ex: item.base_ex ? { ...item.base_ex, group_code: newCode } : item.base_ex,
          weeks: updatedWeeks
        };
      });
      return { ...day, exercises: updatedExercises };
    }));

    // Cập nhật Supabase cho tất cả các tuần của bài tập này
    const wExList = Object.values(ex.weeks) as any[];
    for (const wEx of wExList) {
      await supabase.from('workout_exercises').update({ group_code: newCode }).eq('id', wEx.id);
    }

    setEditingGroupCodeKey(null);
    setSaving(false);
    showToast(`Đã đổi mã nhóm thành "${newCode}"`);
    await fetchData();
  };

  // === THÊM BÀI TẬP / ĐỔI BÀI TOÀN PHASE / CHÈN BÀI / SWAP TUẦN ===
  const handleAddOrSwapExercise = async () => {
    if (!selectedExercise) return;
    setAddingExercise(true);
    setSaving(true);

    if (swapGlobalTarget) {
      // 1. Đổi hẳn bài tập cho toàn bộ 4 tuần của Phase
      const currentDay = days.find(d => d.dayIndex === activeDay);
      if (!currentDay) { setAddingExercise(false); setSaving(false); return; }

      const targetEx = currentDay.exercises.find((e: any) => e.key === swapGlobalTarget.exKey);
      if (targetEx) {
        const wExList = Object.values(targetEx.weeks) as any[];
        const codeToUse = newGroupCode.trim().toUpperCase() || targetEx.group_code || targetEx.base_ex?.group_code || '';
        const setsToUse = parseInt(newSets) || 3;
        const repsToUse = newReps;
        const rpeToUse = newRpe;

        for (const wEx of wExList) {
          await supabase.from('workout_exercises').update({
            exercise_id: selectedExercise.id,
            custom_name: null, // reset custom_name để hiển thị tên gốc từ bảng exercises
            group_code: codeToUse,
            target_sets: setsToUse,
            target_reps: repsToUse,
            target_rpe: rpeToUse
          }).eq('id', wEx.id);
        }
      }
      showToast(`Đã đổi bài tập thành "${selectedExercise.name}" cho toàn bộ Phase`);
      setSwapGlobalTarget(null);
    } else if (insertTarget) {
      // 2. Chèn bài tập ở trên hoặc ở dưới (Google Sheets style)
      const currentDay = days.find(d => d.dayIndex === activeDay);
      if (!currentDay) { setAddingExercise(false); setSaving(false); return; }

      const exercises = [...currentDay.exercises];
      const targetIndex = insertTarget.targetIndex;
      const insertIndex = insertTarget.placement === 'above' ? targetIndex : targetIndex + 1;

      // Đảm bảo workouts tồn tại cho cả 4 tuần
      for (let week = 1; week <= 4; week++) {
        if (!currentDay.workoutIds[week]) {
          const { data: newWorkout } = await supabase.from('workouts').insert({
            block_id: activeBlockId,
            name: currentDay.name,
            week_number: week,
            order_index: activeDay,
            is_completed: false
          }).select('id').single();
          if (newWorkout) currentDay.workoutIds[week] = newWorkout.id;
        }
      }

      const codeToUse = newGroupCode.trim().toUpperCase() || String(insertIndex + 1);

      // Tạo workout_exercises mới cho cả 4 tuần
      const createdWExIds: { week: number; id: string }[] = [];
      for (let week = 1; week <= 4; week++) {
        const { data: newWEx } = await supabase.from('workout_exercises').insert({
          workout_id: currentDay.workoutIds[week],
          exercise_id: selectedExercise.id,
          group_code: codeToUse,
          order_index: 9990 + week,
          target_sets: parseInt(newSets) || 3,
          target_reps: newReps,
          target_rpe: newRpe
        }).select('id').single();
        if (newWEx) createdWExIds.push({ week, id: newWEx.id });
      }

      // Cập nhật cấu trúc local
      const newWeeksMap: any = {};
      createdWExIds.forEach(item => {
        newWeeksMap[item.week] = {
          id: item.id,
          exercise_id: selectedExercise.id,
          exercises: { id: selectedExercise.id, name: selectedExercise.name },
          group_code: codeToUse,
          order_index: insertIndex + 1,
          target_sets: parseInt(newSets) || 3,
          target_reps: newReps,
          target_rpe: newRpe,
          workout_logs: []
        };
      });

      const newExerciseItem = {
        key: `ex_new_${Date.now()}`,
        order_index: insertIndex + 1,
        group_code: codeToUse,
        base_ex: newWeeksMap[1] || Object.values(newWeeksMap)[0],
        weeks: newWeeksMap
      };

      exercises.splice(insertIndex, 0, newExerciseItem);

      // Đánh lại số thông minh bảo toàn Superset
      const renumbered = renumberSmart(exercises);

      // Cập nhật database Supabase
      for (const ex of renumbered) {
        for (const wEx of Object.values(ex.weeks) as any[]) {
          await supabase.from('workout_exercises').update({
            order_index: ex.order_index,
            group_code: ex.group_code
          }).eq('id', wEx.id);
        }
      }

      showToast(`Đã chèn "${selectedExercise.name}" vào giáo án`);
      setInsertTarget(null);
    } else if (swapTarget) {
      // 3. Logic: Swap chỉ cho 1 tuần duy nhất
      await supabase.from('workout_exercises').update({
        exercise_id: selectedExercise.id,
        custom_name: null
      }).eq('id', swapTarget.wExId);
      
      showToast(`Đã thay thế thành "${selectedExercise.name}" cho Tuần ${swapTarget.weekNum}`);
      setSwapTarget(null);
    } else {
      // 4. Logic: Thêm mới ở cuối danh sách cho cả 4 tuần
      const currentDay = days.find(d => d.dayIndex === activeDay);
      if (!currentDay) { setAddingExercise(false); setSaving(false); return; }
  
      const maxOrder = currentDay.exercises.reduce((max: number, ex: any) => Math.max(max, ex.order_index || 0), 0);
      const codeToUse = newGroupCode.trim().toUpperCase() || String(maxOrder + 1);

      for (let week = 1; week <= 4; week++) {
        if (!currentDay.workoutIds[week]) {
          const { data: newWorkout } = await supabase.from('workouts').insert({
            block_id: activeBlockId, name: currentDay.name, week_number: week, order_index: activeDay, is_completed: false
          }).select('id').single();
          if (newWorkout) currentDay.workoutIds[week] = newWorkout.id;
        }
        await supabase.from('workout_exercises').insert({
          workout_id: currentDay.workoutIds[week], exercise_id: selectedExercise.id,
          group_code: codeToUse, order_index: maxOrder + 1,
          target_sets: parseInt(newSets) || 3, target_reps: newReps, target_rpe: newRpe
        });
      }
      showToast(`Đã thêm "${selectedExercise.name}"`);
    }

    setShowAddExercise(false); setSelectedExercise(null); setSwapTarget(null); setSwapGlobalTarget(null); setInsertTarget(null);
    setNewGroupCode(""); setNewSets("3"); setNewReps("8-10"); setNewRpe("8"); setSearchQuery(""); setAddingExercise(false);
    setSaving(false);
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
  const handleDeleteSingleWeek = async () => {
    if (!weekToDelete) return;
    setSaving(true);
    
    // Xóa ngầm DB
    const logRes = await supabase.from('workout_logs').delete().eq('workout_exercise_id', weekToDelete.wExId);
    if (logRes.error) {
      window.alert(`🛑 LỖI XÓA LOGS:\n\n${logRes.error.message}`);
    } else {
      const exRes = await supabase.from('workout_exercises').delete().eq('id', weekToDelete.wExId);
      if (exRes.error) {
        window.alert(`🛑 LỖI XÓA BÀI TẬP:\n\n${exRes.error.message}`);
      } else {
        showToast(`Đã xóa bài tập khỏi Tuần ${weekToDelete.weekNum}`);
      }
    }
    
    await fetchData();
    setWeekToDelete(null);
    setSaving(false);
  };


  const handleDeleteExercise = async () => {
    if (!exerciseToDelete) return;
    const ex = exerciseToDelete;
    setSaving(true);
    
    // 1. Cập nhật giao diện ngay lập tức (Optimistic UI - Load 0s)
    let updatedAllExercises: any[] = [];
    setDays(prevDays => prevDays.map(day => {
      if (day.dayIndex !== activeDay) return day;
      const remainingExercises = day.exercises.filter((e: any) => e.key !== ex.key);
      const renumbered = renumberSmart(remainingExercises);
      updatedAllExercises = renumbered;
      return { ...day, exercises: renumbered };
    }));
    setExerciseToDelete(null); // Đóng modal ngay lập tức

    // 2. Chạy ngầm Database
    const weekExIds = Object.values(ex.weeks).map((w: any) => w.id);
    
    const logDeletes = await Promise.all(weekExIds.map(id => supabase.from('workout_logs').delete().eq('workout_exercise_id', id)));
    if (logDeletes.some(r => r.error)) {
      const errMsg = logDeletes.find(r => r.error)?.error?.message;
      showToast(`Lỗi xóa Logs: ${errMsg}`, "error");
      console.error("Log delete error", logDeletes);
    }

    const exDeletes = await Promise.all(weekExIds.map(id => supabase.from('workout_exercises').delete().eq('id', id)));
    if (exDeletes.some(r => r.error)) {
      const errMsg = exDeletes.find(r => r.error)?.error?.message;
      showToast(`Lỗi DB: ${errMsg}`, "error");
      console.error("Ex delete error", exDeletes);
      setSaving(false);
      
      // Rollback Optimistic UI
      await fetchData();
      return;
    }

    // 3. Cập nhật thứ tự và group_code cho các bài còn lại
    for (const item of updatedAllExercises) {
      for (const wEx of Object.values(item.weeks) as any[]) {
        await supabase.from('workout_exercises').update({ 
          order_index: item.order_index, 
          group_code: item.group_code 
        }).eq('id', wEx.id);
      }
    }

    showToast(`Đã xóa bài tập`);
    await fetchData(); // Fetch lại ngầm để đồng bộ
    setSaving(false);
  };

  // === DI CHUYỂN BÀI TẬP LÊN / XUỐNG (THAY CHO KÉO THẢ) ===
  const handleMoveExercise = async (index: number, direction: 'up' | 'down') => {
    const currentDay = days.find(d => d.dayIndex === activeDay);
    if (!currentDay) return;
    const exercises = [...currentDay.exercises];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= exercises.length) return;

    setSaving(true);
    const temp = exercises[index];
    exercises[index] = exercises[targetIndex];
    exercises[targetIndex] = temp;

    // Đánh lại số thông minh bảo toàn Superset (1, 2A, 2B, 3A, 3B...)
    const renumbered = renumberSmart(exercises);

    setDays(prevDays => prevDays.map(d => d.dayIndex === activeDay ? { ...d, exercises: renumbered } : d));

    // Cập nhật Supabase
    for (const ex of renumbered) {
      for (const wEx of Object.values(ex.weeks) as any[]) {
        await supabase.from('workout_exercises').update({
          order_index: ex.order_index,
          group_code: ex.group_code
        }).eq('id', wEx.id);
      }
    }

    setSaving(false);
    showToast("Đã di chuyển vị trí bài tập");
    await fetchData();
  };

  // === MỞ MODAL CHÈN BÀI TẬP TRÊN / DƯỚI ===
  const handleStartInsert = (index: number, placement: 'above' | 'below', ex: any) => {
    setInsertTarget({ targetIndex: index, placement, refEx: ex });
    setSwapGlobalTarget(null);
    setSwapTarget(null);
    setSelectedExercise(null);
    setSearchQuery("");
    setNewSets("3");
    setNewReps("8-10");
    setNewRpe("8");

    // Gợi ý mã nhóm thông minh:
    const refCode = String(ex.base_ex?.group_code || ex.group_code || '');
    const refHasLetter = /[a-zA-Z]/.test(refCode);
    const refNum = parseInt(refCode.replace(/\D/g, '')) || (index + 1);

    if (refHasLetter) {
      if (placement === 'below') {
        const match = refCode.match(/([0-9]+)([a-zA-Z]+)/);
        if (match) {
          const letter = match[2].toUpperCase();
          const nextLetter = String.fromCharCode(letter.charCodeAt(0) + 1);
          setNewGroupCode(`${match[1]}${nextLetter}`);
        } else {
          setNewGroupCode(`${refNum}B`);
        }
      } else {
        setNewGroupCode(`${refNum}A`);
      }
    } else {
      setNewGroupCode(placement === 'above' ? String(refNum) : String(refNum + 1));
    }

    setShowAddExercise(true);
  };

  // === MỞ MODAL ĐỔI HẲN BÀI TẬP (TOÀN PHASE) ===
  const handleStartGlobalSwap = (ex: any) => {
    setSwapGlobalTarget({ exKey: ex.key, baseEx: ex.base_ex, ex });
    setInsertTarget(null);
    setSwapTarget(null);
    setSelectedExercise(null);
    setSearchQuery("");

    // Pre-fill từ bài tập hiện tại
    const currentCode = String(ex.base_ex?.group_code || ex.group_code || '');
    const currentSets = String(ex.base_ex?.target_sets ?? 3);
    const currentReps = String(ex.base_ex?.target_reps ?? "8-10");
    const currentRpe = String(ex.base_ex?.target_rpe ?? "8");

    setNewGroupCode(currentCode);
    setNewSets(currentSets);
    setNewReps(currentReps);
    setNewRpe(currentRpe);

    setShowAddExercise(true);
  };

  // === MỞ MODAL XEM TIẾN ĐỘ BÀI TẬP QUA CÁC TUẦN 📈 ===
  const handleOpenProgress = async (ex: any) => {
    const exId = ex.base_ex?.exercise_id || ex.base_ex?.exercises?.id;
    const exName = ex.base_ex?.custom_name || ex.base_ex?.exercises?.name || 'Bài tập';
    setProgressModal({ exId, exName });
    setLoadingProgress(true);

    try {
      const { data: progs } = await supabase.from('programs')
        .select(`
          name, created_at,
          blocks (
            name, order_index,
            workouts (
              name, week_number, order_index, completed_at, is_completed,
              workout_exercises (
                custom_name, exercise_id,
                exercises (id, name),
                workout_logs (id, set_number, weight, reps, rpe)
              )
            )
          )
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });

      if (progs) {
        const list: any[] = [];
        progs.forEach((prog: any) => {
          prog.blocks?.forEach((block: any) => {
            block.workouts?.forEach((workout: any) => {
              workout.workout_exercises?.forEach((wex: any) => {
                const thisExId = wex.exercise_id || wex.exercises?.id;
                const thisExName = wex.custom_name || wex.exercises?.name;
                const matches = (thisExId && exId && thisExId === exId) ||
                  (exName && thisExName && thisExName.trim().toLowerCase() === exName.trim().toLowerCase());

                if (matches) {
                  const logs = (wex.workout_logs || []).filter((l: any) => 
                    (l.weight !== undefined && l.weight !== null && String(l.weight).trim() !== '') ||
                    (l.reps !== undefined && l.reps !== null && String(l.reps).trim() !== '')
                  );
                  if (logs.length > 0) {
                    const sortedSets = logs.sort((a: any, b: any) => a.set_number - b.set_number);
                    let max1RM = 0;
                    sortedSets.forEach((l: any) => {
                      const rm = estimate1RM(Number(l.weight) || 0, Number(l.reps) || 0);
                      if (rm > max1RM) max1RM = rm;
                    });

                    list.push({
                      programName: prog.name,
                      progCreatedAt: prog.created_at,
                      blockName: block.name || 'Block 1',
                      blockOrderIndex: block.order_index ?? 0,
                      workoutName: workout.name,
                      weekNumber: workout.week_number ?? 1,
                      workoutOrderIndex: workout.order_index ?? 0,
                      isCompleted: workout.is_completed,
                      completedAt: workout.completed_at,
                      max1RM,
                      sets: sortedSets
                    });
                  }
                }
              });
            });
          });
        });

        // Sắp xếp lịch sử theo thứ tự thời gian: Mới nhất lên đầu
        list.sort((a, b) => {
          const timeA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          const timeB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          if (timeA > 0 && timeB > 0 && timeA !== timeB) {
            return timeB - timeA;
          }
          if (timeA > 0 && timeB === 0) return -1;
          if (timeB > 0 && timeA === 0) return 1;

          const progA = a.progCreatedAt ? new Date(a.progCreatedAt).getTime() : 0;
          const progB = b.progCreatedAt ? new Date(b.progCreatedAt).getTime() : 0;
          if (progA !== progB) return progB - progA;

          if (b.blockOrderIndex !== a.blockOrderIndex) return (b.blockOrderIndex || 0) - (a.blockOrderIndex || 0);
          if (b.weekNumber !== a.weekNumber) return (b.weekNumber || 0) - (a.weekNumber || 0);
          return (b.workoutOrderIndex || 0) - (a.workoutOrderIndex || 0);
        });

        setProgressLogs(list);
      }
    } catch (err) {
      console.error("Lỗi tải tiến độ bài tập:", err);
    } finally {
      setLoadingProgress(false);
    }
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
  const sortedBlocks = programInfo?.blocks?.sort((a: any, b: any) => a.order_index - b.order_index) || [];

  return (
    <div className="flex-1 h-full overflow-hidden bg-brand-paper flex flex-col">
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
        <button 
          onClick={handleSave} 
          disabled={saving} 
          className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md disabled:opacity-70 ${
            (modifiedWExIds.size > 0 || modifiedLogWExIds.size > 0)
              ? 'bg-brand-moss hover:bg-brand-mossDeep text-white ring-2 ring-brand-sand shadow-lg' 
              : 'bg-brand-moss text-white hover:bg-brand-mossDeep'
          }`}
        >
          {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />}
          {saving 
            ? "Đang lưu..." 
            : (modifiedWExIds.size > 0 || modifiedLogWExIds.size > 0)
              ? `Lưu Thay Đổi (${modifiedWExIds.size + modifiedLogWExIds.size})`
              : "Lưu Thay Đổi"
          }
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
              {isActive && <Pencil size={12} className="opacity-40 group-hover:opacity-100 transition-opacity"  />}
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
      <main className="flex-1 overflow-y-auto bg-brand-paper relative z-0">
        <div className="w-full min-h-full pb-20">
          <div className="grid grid-cols-[260px_1fr_1fr_1fr_1fr] bg-brand-mossDeep text-brand-sage font-bold text-sm sticky top-0 z-20 shadow-md">
            <div className="p-4 border-r border-brand-sage/20">Bài tập (Template)</div>
            {[1,2,3,4].map(w => {
              const activeDayData = days.find(d => d.dayIndex === activeDay);
              const fb = activeDayData?.feedbackByWeek ? (activeDayData.feedbackByWeek as any)[w] : null;
              const wData = activeDayData?.workoutsByWeek ? (activeDayData.workoutsByWeek as any)[w] : null;
              return (
                <div key={w} className="p-4 border-r border-brand-sage/20 flex flex-col items-center justify-center gap-1 relative group cursor-default">
                  <div className="flex items-center gap-2">
                    <span>Tuần {w}</span>
                    {wData && (
                      <button 
                        onClick={() => setEditingVideo({workoutId: wData.id, url: wData.coach_video_url || ''})}
                        className={`hover:scale-110 transition-transform ${wData.coach_video_url ? 'text-blue-500' : 'text-gray-300 hover:text-blue-400'}`}
                        title={wData.coach_video_url ? `Đã gắn Video: ${wData.coach_video_url}` : "Chưa có Video Phân Tích (Click để thêm)"}
                      >
                        <PlayCircle size={16} />
                      </button>
                    )}
                  </div>
                  {fb && (
                    <div className="flex items-center gap-1 text-xs text-brand-sand cursor-help" title="Có Feedback">
                       <MessageSquareText size={14} /> 
                       <span style={{color: fb.rpe <= 6 ? '#9ca3af' : fb.rpe <= 8 ? '#4ade80' : fb.rpe === 9 ? '#fde047' : '#f87171'}}>
                         RPE: {fb.rpe}
                       </span>
                    </div>
                  )}
                  {fb && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-white text-brand-moss p-4 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 text-left font-normal border border-brand-line">
                      <div className="font-bold text-sm mb-2 pb-2 border-b border-brand-line">Feedback Tuần {w}</div>
                      <div className="space-y-2 text-xs">
                        <p><strong>Nỗ lực (RPE):</strong> <span style={{color: fb.rpe <= 6 ? '#6b7280' : fb.rpe <= 8 ? '#22c55e' : fb.rpe === 9 ? '#eab308' : '#ef4444'}} className="font-black">{fb.rpe}/10</span></p>
                        {fb.jointPain && <p><strong>Cơ/Khớp:</strong> <span className="text-red-500 font-semibold">{fb.jointPain}</span></p>}
                        {fb.notes && <p><strong>Ghi chú:</strong> <span className="italic">{fb.notes}</span></p>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {activeDayData && activeDayData.exercises.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-brand-moss/40">
              <Dumbbell size={48} className="mb-4 opacity-30" />
              <p className="font-bold text-lg">Chưa có bài tập nào</p>
              <p className="text-sm mt-1">Bấm nút bên dưới để thêm bài tập đầu tiên</p>
            </div>
          )}

          {activeDayData?.exercises.map((ex: any, exIndex: number) => {
            const hasLetter = /[a-zA-Z]/.test(String(ex.group_code || ''));
            return (
              <div key={ex.key} className={`grid grid-cols-[260px_1fr_1fr_1fr_1fr] w-full border-b border-brand-line group hover:bg-white/40 transition-colors ${hasLetter ? 'border-l-4 border-l-brand-sand' : ''}`}>
                {/* Cột Tên bài tập (Template Base) */}
                <div className="p-3.5 border-r border-brand-line bg-white/40 flex flex-col justify-between gap-2.5">
                  {/* Dòng 1: STT, Tên bài, Nút Tiến độ 📈 */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 flex items-start gap-1.5">
                      {/* Badge / Ô sửa Mã Nhóm (group_code) */}
                      {editingGroupCodeKey === ex.key ? (
                        <div className="flex items-center gap-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editGroupCodeValue}
                            onChange={(e) => setEditGroupCodeValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveGroupCode(ex);
                              if (e.key === 'Escape') setEditingGroupCodeKey(null);
                            }}
                            onBlur={() => saveGroupCode(ex)}
                            className="w-12 px-1 py-0.5 border-2 border-brand-sand rounded bg-white text-xs font-black uppercase text-center focus:outline-none shadow-xs"
                            placeholder="VD: 2A"
                            autoFocus
                          />
                          <button
                            onMouseDown={(e) => { e.preventDefault(); saveGroupCode(ex); }}
                            className="p-1 bg-brand-moss text-white rounded hover:bg-brand-mossDeep"
                          >
                            <Check size={11} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); startEditGroupCode(ex); }}
                          className="px-1.5 py-0.5 rounded bg-brand-moss/10 hover:bg-brand-sand/50 text-brand-moss font-black text-xs cursor-pointer transition-colors flex-shrink-0 border border-brand-moss/10 hover:border-brand-sand mt-0.5"
                          title="Click để đổi mã nhóm (VD: 1, 1A, 1B, 2A, 2B...)"
                        >
                          {ex.base_ex.group_code ? `${ex.base_ex.group_code}.` : `${exIndex + 1}.`}
                        </button>
                      )}

                      {/* Tên bài tập (bấm để đổi tên) */}
                      <div className="flex-1 min-w-0">
                        {editingExKey === ex.key ? (
                          <div className="flex items-center gap-1 w-full">
                            <input 
                              type="text" 
                              value={editExValue} 
                              onChange={(e) => setEditExValue(e.target.value)} 
                              onKeyDown={(e) => e.key === 'Enter' && saveExName(ex)} 
                              onBlur={() => saveExName(ex)}
                              className="flex-1 min-w-0 px-2 py-1 border-2 border-brand-sand rounded-lg text-xs font-bold focus:outline-none" 
                              autoFocus 
                            />
                            <button 
                              onMouseDown={(e) => { e.preventDefault(); saveExName(ex); }} 
                              className="p-1 bg-brand-moss text-white rounded hover:bg-brand-mossDeep flex-shrink-0"
                            >
                              <Check size={13} />
                            </button>
                          </div>
                        ) : (
                          <div 
                            className="font-bold text-brand-moss text-sm group/name flex items-start gap-1 cursor-pointer"
                            onClick={() => startEditExName(ex)}
                            title="Bấm để sửa tên hiển thị bài tập"
                          >
                            <span className="hover:text-brand-sand transition-colors break-words leading-tight line-clamp-2">
                              {ex.base_ex.custom_name || ex.base_ex.exercises?.name}
                            </span>
                            <Pencil size={11} className="text-brand-moss/30 opacity-0 group-hover/name:opacity-100 transition-opacity mt-0.5 flex-shrink-0" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Nút Xem Tiến Độ Mức Tạ 📈 */}
                    <button
                      onClick={() => handleOpenProgress(ex)}
                      className="p-1.5 rounded-lg bg-brand-moss/10 hover:bg-brand-moss hover:text-white text-brand-moss transition-all flex-shrink-0 shadow-2xs"
                      title="Xem tiến độ mức tạ qua từng tuần"
                    >
                      <TrendingUp size={15} />
                    </button>
                  </div>

                  {/* Dòng 2: Thanh công cụ thao tác bài tập (Chèn trên/dưới, Đổi bài, Di chuyển, Xóa) */}
                  <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-brand-line/40">
                    <div className="flex items-center gap-1">
                      {/* Nút Chèn trên */}
                      <button
                        onClick={() => handleStartInsert(exIndex, 'above', ex)}
                        className="px-1.5 py-1 rounded bg-brand-paper hover:bg-brand-sand/40 text-brand-moss/70 hover:text-brand-moss text-[10px] font-bold flex items-center gap-0.5 transition-colors"
                        title="Chèn bài tập ở trên bài này (như Google Sheet)"
                      >
                        <Plus size={11} /> <span>Trên</span>
                      </button>

                      {/* Nút Chèn dưới */}
                      <button
                        onClick={() => handleStartInsert(exIndex, 'below', ex)}
                        className="px-1.5 py-1 rounded bg-brand-paper hover:bg-brand-sand/40 text-brand-moss/70 hover:text-brand-moss text-[10px] font-bold flex items-center gap-0.5 transition-colors"
                        title="Chèn bài tập ở dưới bài này (như Google Sheet)"
                      >
                        <Plus size={11} /> <span>Dưới</span>
                      </button>

                      {/* Nút Đổi hẳn bài tập */}
                      <button
                        onClick={() => handleStartGlobalSwap(ex)}
                        className="px-1.5 py-1 rounded bg-brand-paper hover:bg-amber-100 text-brand-moss/70 hover:text-amber-800 text-[10px] font-bold flex items-center gap-0.5 transition-colors"
                        title="Đổi hẳn bài tập này thành bài khác cho cả 4 tuần"
                      >
                        <Repeat size={11} /> <span>Đổi</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-0.5">
                      {/* Nút Move Up */}
                      <button
                        onClick={() => handleMoveExercise(exIndex, 'up')}
                        disabled={exIndex === 0}
                        className="p-1 rounded hover:bg-brand-paper text-brand-moss/50 hover:text-brand-moss disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                        title="Di chuyển lên trên"
                      >
                        <ChevronUp size={14} />
                      </button>

                      {/* Nút Move Down */}
                      <button
                        onClick={() => handleMoveExercise(exIndex, 'down')}
                        disabled={!activeDayData || exIndex === activeDayData.exercises.length - 1}
                        className="p-1 rounded hover:bg-brand-paper text-brand-moss/50 hover:text-brand-moss disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                        title="Di chuyển xuống dưới"
                      >
                        <ChevronDown size={14} />
                      </button>

                      {/* Nút Xóa bài tập */}
                      <button
                        onClick={() => setExerciseToDelete(ex)}
                        className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors ml-0.5"
                        title="Xóa bài tập này khỏi toàn bộ Phase"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                  {/* Cột Tuần 1 -> 4 */}
                  {[1, 2, 3, 4].map(weekNum => {
                    const wEx = ex.weeks[weekNum];
                    if (!wEx) return <div key={weekNum} className="p-4 border-r border-brand-line bg-gray-50 flex items-center justify-center"><span className="text-xs text-gray-400">Trống</span></div>;

                    // Kiểm tra Override: Nếu bài tập thực tế ở Tuần này khác với Template gốc
                    const isOverridden = wEx.exercise_id !== ex.base_ex.exercise_id || wEx.custom_name !== ex.base_ex.custom_name;
                    const overrideName = wEx.custom_name || wEx.exercises?.name;

                    const rawLogs = wEx.workout_logs || [];
                    const uniqueLogsMap = new Map();
                    rawLogs.forEach((l: any) => { uniqueLogsMap.set(l.set_number, l); });
                    const uniqueLogs = Array.from(uniqueLogsMap.values()).sort((a: any, b: any) => a.set_number - b.set_number);

                    const targetSetsCount = parseInt(wEx.target_sets) || 1;
                    const numSetRows = Math.max(targetSetsCount, uniqueLogs.length);
                    const hasAnyLogged = uniqueLogs.some((l: any) => (l.weight !== undefined && l.weight !== null && String(l.weight).trim() !== '') || (l.reps !== undefined && l.reps !== null && String(l.reps).trim() !== ''));
                    
                    return (
                      <div key={weekNum} className="p-4 border-r border-brand-line flex flex-col gap-2 group/cell">
                        {/* Header của Cell (Swap button & Override Badge) */}
                        <div className="flex items-center justify-between mb-1 min-h-[20px]">
                          <p className="text-[10px] font-bold text-brand-moss/50 uppercase tracking-wider">Mục tiêu (Set x Rep @RPE)</p>
                          <div className="flex items-center gap-1 opacity-0 group-hover/cell:opacity-100 transition-all">
                            <button 
                              onClick={() => { setSwapTarget({ wExId: wEx.id, weekNum }); setShowAddExercise(true); }}
                              className="p-1 rounded bg-brand-paper hover:bg-brand-sand/50 text-brand-moss/60 hover:text-brand-mossDeep flex items-center gap-1"
                              title="Thay thế bài tập riêng cho tuần này"
                            >
                              <Repeat size={12} /> <span className="text-[9px] font-bold uppercase">Thay thế</span>
                            </button>
                            <button 
                              onClick={() => setWeekToDelete({ wExId: wEx.id, weekNum })}
                              className="p-1 rounded bg-brand-paper hover:bg-red-50 text-brand-moss/60 hover:text-red-500"
                              title="Xóa bài tập tuần này (Trống)"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
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

                        {/* Khung Thực tế tập - Cho phép Coach điền/sửa trực tiếp Inline */}
                        <div className={`p-2 rounded-lg border transition-all ${
                          hasAnyLogged ? 'bg-emerald-50/70 border-emerald-200' : 'bg-gray-50/70 border-gray-200 border-dashed'
                        }`}>
                          <div className="flex justify-between items-center mb-1.5">
                            <p className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                              hasAnyLogged ? 'text-emerald-700' : 'text-brand-moss/50'
                            }`}>
                              {hasAnyLogged ? <CheckCircle2 size={11} className="text-emerald-600" /> : null}
                              <span>Thực tế tập</span>
                            </p>
                            {wEx && (
                              <button 
                                onClick={() => setEditingNotes({wExId: wEx.id, notes: wEx.coach_notes || ''})}
                                className={`p-1 rounded hover:bg-black/5 transition-colors ${wEx.coach_notes ? 'text-amber-500' : 'text-brand-moss/30'}`}
                                title="Ghi chú kỹ thuật cho bài này"
                              >
                                <MessageCircle size={13} />
                              </button>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            {Array.from({ length: numSetRows }, (_, idx) => {
                              const setNum = idx + 1;
                              const log = uniqueLogsMap.get(setNum) || {};
                              const weightVal = log.weight !== undefined && log.weight !== null ? (log.weight === 0 ? '' : String(log.weight)) : '';
                              const repsVal = log.reps !== undefined && log.reps !== null ? String(log.reps) : '';
                              const rpeVal = log.rpe !== undefined && log.rpe !== null ? String(log.rpe) : '';

                              return (
                                <div key={setNum} className="flex items-center gap-1 text-xs">
                                  <span className={`w-5 font-black text-[10px] shrink-0 ${hasAnyLogged ? 'text-emerald-700' : 'text-brand-moss/50'}`}>
                                    #{setNum}
                                  </span>
                                  <div className="flex items-center flex-1 bg-white border border-brand-line focus-within:border-brand-moss focus-within:ring-1 ring-brand-sand/30 rounded px-1 py-0.5 shadow-2xs">
                                    <input 
                                      type="text" 
                                      inputMode="decimal"
                                      placeholder="kg" 
                                      value={weightVal} 
                                      onChange={(e) => handleLogChange(activeDayData!.dayIndex, ex.key, weekNum, setNum, 'weight', e.target.value)}
                                      className="w-full text-center font-bold text-brand-moss outline-none text-xs bg-transparent" 
                                    />
                                  </div>
                                  <span className="text-brand-moss/40 text-[10px] shrink-0">x</span>
                                  <div className="flex items-center w-12 bg-white border border-brand-line focus-within:border-brand-moss focus-within:ring-1 ring-brand-sand/30 rounded px-1 py-0.5 shadow-2xs">
                                    <input 
                                      type="text" 
                                      inputMode="numeric"
                                      placeholder="rep" 
                                      value={repsVal} 
                                      onChange={(e) => handleLogChange(activeDayData!.dayIndex, ex.key, weekNum, setNum, 'reps', e.target.value)}
                                      className="w-full text-center font-bold text-brand-moss outline-none text-xs bg-transparent" 
                                    />
                                  </div>
                                  <div className="flex items-center w-11 bg-white border border-brand-line focus-within:border-brand-moss focus-within:ring-1 ring-brand-sand/30 rounded px-1 py-0.5 shadow-2xs">
                                    <span className="text-[9px] text-brand-moss/40 font-bold pl-0.5 shrink-0">@</span>
                                    <input 
                                      type="text" 
                                      inputMode="decimal"
                                      placeholder="rpe" 
                                      value={rpeVal} 
                                      onChange={(e) => handleLogChange(activeDayData!.dayIndex, ex.key, weekNum, setNum, 'rpe', e.target.value)}
                                      className="w-full text-center font-bold text-brand-moss outline-none text-xs bg-transparent" 
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

          <div className="p-4 border-t border-brand-line">
            <button onClick={() => { setSwapTarget(null); setSwapGlobalTarget(null); setInsertTarget(null); setSelectedExercise(null); setShowAddExercise(true); }}
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

      {/* ===== MODAL: THÊM / THAY THẾ / ĐỔI / CHÈN BÀI TẬP ===== */}
      {showAddExercise && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs" 
          onClick={() => { setShowAddExercise(false); setSwapTarget(null); setSwapGlobalTarget(null); setInsertTarget(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-brand-line">
              <div>
                <h2 className="text-lg font-bold text-brand-moss flex items-center gap-2">
                  {swapGlobalTarget ? (
                    <>
                      <Repeat size={18} className="text-amber-600" />
                      <span>Đổi hẳn bài tập (Toàn Phase)</span>
                    </>
                  ) : insertTarget ? (
                    <>
                      <Plus size={18} className="text-brand-moss" />
                      <span>{insertTarget.placement === 'above' ? 'Chèn bài tập ở trên' : 'Chèn bài tập ở dưới'}</span>
                    </>
                  ) : swapTarget ? (
                    <>
                      <Repeat size={18} className="text-brand-moss" />
                      <span>Thay thế bài tập Tuần {swapTarget.weekNum}</span>
                    </>
                  ) : (
                    <>
                      <Plus size={18} className="text-brand-moss" />
                      <span>Thêm bài tập mới (Template)</span>
                    </>
                  )}
                </h2>
                {swapGlobalTarget && (
                  <p className="text-xs text-brand-moss/60 mt-0.5">
                    Đang đổi bài: <span className="font-bold text-brand-moss">{swapGlobalTarget.baseEx.custom_name || swapGlobalTarget.baseEx.exercises?.name}</span>
                  </p>
                )}
                {insertTarget && (
                  <p className="text-xs text-brand-moss/60 mt-0.5">
                    Chèn {insertTarget.placement === 'above' ? 'trên' : 'dưới'} bài: <span className="font-bold text-brand-moss">{insertTarget.refEx.base_ex.custom_name || insertTarget.refEx.base_ex.exercises?.name}</span>
                  </p>
                )}
              </div>
              <button 
                onClick={() => { setShowAddExercise(false); setSwapTarget(null); setSwapGlobalTarget(null); setInsertTarget(null); }} 
                className="p-1.5 hover:bg-brand-paper rounded-full text-brand-moss/40 hover:text-brand-moss transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <label className="text-xs font-bold text-brand-moss/60 uppercase tracking-wider mb-2 block">
                  {swapGlobalTarget ? '1. Chọn bài tập thay thế mới' : '1. Chọn bài tập từ thư viện'}
                </label>
                <div className="relative mb-3">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-moss/30" />
                  <input 
                    type="text" 
                    placeholder="Tìm kiếm bài tập..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-brand-line rounded-xl text-sm focus:ring-2 focus:ring-brand-sand/30 focus:border-brand-sand outline-none" 
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-2">
                  {filteredExercises.map(ex => (
                    <button 
                      key={ex.id} 
                      onClick={() => setSelectedExercise(ex)}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all ${selectedExercise?.id === ex.id ? 'bg-brand-sand text-brand-mossDeep shadow-md ring-2 ring-brand-sand' : 'bg-brand-paper/50 text-brand-moss hover:bg-brand-paper'}`}
                    >
                      <span className="flex items-center gap-2"><Dumbbell size={14} className="opacity-50" />{ex.name}</span>
                    </button>
                  ))}
                  {filteredExercises.length === 0 && <p className="text-sm text-brand-moss/40 text-center py-4 italic">Không tìm thấy bài tập nào</p>}
                </div>
              </div>
              
              {/* Nếu là Swap Tuần thì không cần nhập Sets/Reps/GroupCode, chỉ đổi bài tập cho riêng tuần đó */}
              {!swapTarget && (
                <>
                  <div>
                    <label className="text-xs font-bold text-brand-moss/60 uppercase tracking-wider mb-2 block">2. Mã nhóm (Group Code)</label>
                    <input 
                      type="text" 
                      placeholder="VD: 1, 1A, 1B, 2A..." 
                      value={newGroupCode} 
                      onChange={(e) => setNewGroupCode(e.target.value)}
                      className="w-full px-4 py-2.5 border border-brand-line rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-sand/30 focus:border-brand-sand outline-none uppercase" 
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="text-[10px] font-bold text-brand-moss/40 uppercase mr-1 self-center">Gợi ý:</span>
                      {['1', '2', '3', '1A', '1B', '2A', '2B', '3A', '3B', '3C'].map(code => (
                        <button key={code} type="button" onClick={() => setNewGroupCode(code)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${newGroupCode.toUpperCase() === code ? 'bg-brand-sand text-brand-mossDeep' : 'bg-brand-paper text-brand-moss/60 hover:bg-brand-sand/30'}`}>{code}</button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-brand-moss/60 uppercase tracking-wider mb-2 block">
                      3. Mục tiêu (áp dụng cho cả 4 tuần)
                    </label>
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
              <button 
                onClick={handleAddOrSwapExercise} 
                disabled={!selectedExercise || (!swapTarget && !newGroupCode.trim()) || addingExercise}
                className="w-full bg-brand-moss text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-mossDeep transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
              >
                {addingExercise ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : swapGlobalTarget ? (
                  <Repeat size={16} />
                ) : insertTarget ? (
                  <Plus size={16} />
                ) : swapTarget ? (
                  <Repeat size={16} />
                ) : (
                  <Plus size={16} />
                )}
                {addingExercise ? "Đang xử lý..." : (
                  swapGlobalTarget ? "Xác nhận Đổi Bài (Toàn Phase)" :
                  insertTarget ? "Xác nhận Chèn Bài Tập" :
                  swapTarget ? "Xác nhận Thay Thế" : 
                  "Thêm vào Giáo án"
                )}
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

      {exerciseToDelete && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setExerciseToDelete(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={28} className="text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-brand-moss mb-2">Xóa bài tập này?</h2>
              <p className="text-sm text-brand-moss/60 leading-relaxed">
                Bài tập <span className="font-bold text-brand-moss">"{exerciseToDelete.base_ex?.custom_name || exerciseToDelete.base_ex?.exercises?.name || 'này'}"</span> sẽ bị xóa khỏi toàn bộ 4 tuần của Phase. Hành động này không thể hoàn tác!
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setExerciseToDelete(null)} className="flex-1 py-3 rounded-xl font-bold text-sm bg-brand-paper text-brand-moss hover:bg-brand-line transition-colors">Hủy</button>
              <button onClick={handleDeleteExercise} disabled={saving} className="flex-1 py-3 rounded-xl font-bold text-sm bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50">
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}

      {weekToDelete && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setWeekToDelete(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={28} className="text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-brand-moss mb-2">Xóa bài tập Tuần {weekToDelete.weekNum}?</h2>
              <p className="text-sm text-brand-moss/60 leading-relaxed">
                Bài tập này sẽ bị xóa khỏi <span className="font-bold text-brand-moss">Tuần {weekToDelete.weekNum}</span> và trở thành ô Trống. Các tuần khác vẫn giữ nguyên. Bạn chắc chắn chứ?
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setWeekToDelete(null)} className="flex-1 py-3 rounded-xl font-bold text-sm bg-brand-paper text-brand-moss hover:bg-brand-line transition-colors">Hủy</button>
              <button onClick={handleDeleteSingleWeek} disabled={saving} className="flex-1 py-3 rounded-xl font-bold text-sm bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50">
                Xóa Tuần {weekToDelete.weekNum}
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

      {/* Video URL Modal */}
      {editingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-brand-moss mb-4 flex items-center gap-2">
              <PlayCircle className="text-blue-500"/> Link Video Phân Tích
            </h3>
            <input 
              type="text" 
              placeholder="Dán link Loom hoặc YouTube vào đây..."
              className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-brand-sage mb-4"
              value={editingVideo.url}
              onChange={e => setEditingVideo({...editingVideo, url: e.target.value})}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setEditingVideo(null)} className="px-4 py-2 bg-gray-100 rounded-xl font-medium hover:bg-gray-200">Huỷ</button>
              <button 
                onClick={async () => {
                  setSaving(true);
                  await supabase.from('workouts').update({ coach_video_url: editingVideo.url }).eq('id', editingVideo.workoutId);
                  await fetchData();
                  setEditingVideo(null);
                  setSaving(false);
                }} 
                disabled={saving}
                className="px-4 py-2 bg-brand-moss text-white rounded-xl font-bold flex items-center gap-2 hover:bg-brand-mossDeep disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin w-4 h-4"/> : <Save className="w-4 h-4"/>} Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {editingNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-brand-moss mb-4 flex items-center gap-2">
              <MessageCircle className="text-amber-500"/> Lời nhắc Kỹ thuật (Cues)
            </h3>
            <textarea 
              rows={3}
              placeholder="VD: Nhớ gồng chặt core, hơi bênh gót chân nhé..."
              className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-brand-sage mb-4 resize-none"
              value={editingNotes.notes}
              onChange={e => setEditingNotes({...editingNotes, notes: e.target.value})}
            ></textarea>
            <div className="flex justify-end gap-3">
              <button onClick={() => setEditingNotes(null)} className="px-4 py-2 bg-gray-100 rounded-xl font-medium hover:bg-gray-200">Huỷ</button>
              <button 
                onClick={async () => {
                  setSaving(true);
                  await supabase.from('workout_exercises').update({ coach_notes: editingNotes.notes }).eq('id', editingNotes.wExId);
                  await fetchData();
                  setEditingNotes(null);
                  setSaving(false);
                }} 
                disabled={saving}
                className="px-4 py-2 bg-brand-moss text-white rounded-xl font-bold flex items-center gap-2 hover:bg-brand-mossDeep disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin w-4 h-4"/> : <Save className="w-4 h-4"/>} Lưu
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ===== MODAL: TIẾN ĐỘ MỨC TẠ QUA TỪNG TUẦN 📈 ===== */}
      {progressModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs" onClick={() => setProgressModal(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-brand-line" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-5 border-b border-brand-line flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-moss/10 text-brand-moss flex items-center justify-center flex-shrink-0">
                  <TrendingUp size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-brand-moss leading-tight">Tiến độ: {progressModal.exName}</h2>
                  <p className="text-xs font-semibold text-brand-moss/60 mt-0.5">Lịch sử mức tạ và số rep qua từng tuần của học viên</p>
                </div>
              </div>
              <button 
                onClick={() => setProgressModal(null)} 
                className="p-2 hover:bg-brand-paper rounded-full text-brand-moss/40 hover:text-brand-moss transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingProgress ? (
                <div className="py-20 flex flex-col items-center justify-center text-brand-moss/50 gap-3">
                  <Loader2 size={32} className="animate-spin text-brand-moss" />
                  <p className="text-sm font-bold">Đang tải lịch sử bài tập...</p>
                </div>
              ) : progressLogs.length === 0 ? (
                <div className="py-16 text-center text-brand-moss/50 bg-brand-paper/50 rounded-2xl border border-brand-line border-dashed p-8">
                  <Dumbbell size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-bold text-base text-brand-moss">Chưa có dữ liệu tập luyện</p>
                  <p className="text-xs text-brand-moss/60 mt-1">Học viên chưa có buổi tập nào được lưu kết quả cho bài này.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {progressLogs.map((log: any, index: number) => {
                    let topSetId: string | null = null;
                    let maxW = -1;
                    let maxR = -1;
                    log.sets.forEach((s: any) => {
                      const w = Number(s.weight) || 0;
                      const r = Number(s.reps) || 0;
                      if (w > maxW || (w === maxW && r > maxR)) {
                        maxW = w;
                        maxR = r;
                        topSetId = s.id;
                      }
                    });

                    // So sánh với buổi tập liền trước theo thời gian
                    const prevLog = progressLogs[index + 1];

                    return (
                      <div key={index} className="bg-white rounded-2xl border border-brand-line p-4 shadow-sm hover:shadow transition-shadow relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-1.5 h-full ${log.isCompleted ? 'bg-emerald-500' : 'bg-brand-sand'}`} />

                        <div className="flex items-center justify-between gap-3 mb-3 pl-2 pb-2.5 border-b border-brand-line/50">
                          <div>
                            <h3 className="font-bold text-brand-moss text-base flex items-center gap-2">
                              <span>{log.blockName || 'Block 1'} • Tuần {log.weekNumber || 1}</span>
                              {log.isCompleted && (
                                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                                  ✓ Đã hoàn thành
                                </span>
                              )}
                            </h3>
                            <p className="text-xs font-semibold text-brand-moss/60 mt-0.5 flex items-center gap-1.5">
                              {log.workoutName}
                              {log.completedAt && (
                                <span className="text-brand-moss/40">
                                  ({new Date(log.completedAt).toLocaleDateString('vi-VN')})
                                </span>
                              )}
                            </p>
                          </div>

                          {log.max1RM > 0 && (
                            <div className="bg-brand-mossDeep text-brand-sage px-3 py-1.5 rounded-xl text-center shadow-xs">
                              <p className="text-[9px] font-bold uppercase tracking-wider opacity-80">1RM ước tính</p>
                              <p className="text-base font-black">{log.max1RM} kg</p>
                            </div>
                          )}
                        </div>

                        {/* Danh sách Set */}
                        <div className="pl-2 space-y-1.5">
                          <div className="grid grid-cols-4 gap-2 text-[10px] font-bold text-brand-moss/50 uppercase tracking-wider px-2">
                            <div>Set</div>
                            <div>Trọng lượng</div>
                            <div>Số Reps</div>
                            <div>RPE</div>
                          </div>

                          {log.sets.map((set: any) => {
                            let wDiffNode = null;
                            let rDiffNode = null;
                            if (prevLog) {
                              const prevSet = prevLog.sets.find((s: any) => s.set_number === set.set_number);
                              if (prevSet) {
                                const wDiff = (Number(set.weight) || 0) - (Number(prevSet.weight) || 0);
                                const rDiff = (Number(set.reps) || 0) - (Number(prevSet.reps) || 0);

                                if (wDiff > 0) {
                                  wDiffNode = <span className="ml-1.5 text-xs font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">+{wDiff}</span>;
                                } else if (wDiff < 0) {
                                  wDiffNode = <span className="ml-1.5 text-xs font-black text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">{wDiff}</span>;
                                }

                                if (rDiff > 0) {
                                  rDiffNode = <span className="ml-1.5 text-xs font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">+{rDiff}</span>;
                                } else if (rDiff < 0) {
                                  rDiffNode = <span className="ml-1.5 text-xs font-black text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{rDiff}</span>;
                                }
                              }
                            }

                            const isTopSet = set.id === topSetId;

                            return (
                              <div key={set.id} className={`grid grid-cols-4 gap-2 items-center text-xs font-bold rounded-lg px-2 py-2 ${isTopSet ? 'bg-brand-moss/10 border border-brand-moss/20' : 'bg-brand-paper/50'}`}>
                                <div className={`${isTopSet ? 'text-brand-mossDeep' : 'text-brand-moss/70'} flex items-center gap-1`}>
                                  Set {set.set_number}
                                  {isTopSet && <span title="Top Set" className="text-xs">🔥</span>}
                                </div>
                                <div className={`${isTopSet ? 'text-brand-mossDeep' : 'text-brand-moss'} flex items-center`}>
                                  {set.weight} kg
                                  {wDiffNode}
                                </div>
                                <div className={`${isTopSet ? 'text-brand-mossDeep' : 'text-brand-moss'} flex items-center`}>
                                  {set.reps} reps
                                  {rDiffNode}
                                </div>
                                <div className={isTopSet ? 'text-brand-mossDeep' : 'text-brand-moss'}>
                                  {set.rpe ? <span className="bg-white px-2 py-0.5 rounded shadow-2xs border border-brand-line/50">@{set.rpe}</span> : '-'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-brand-line bg-gray-50 flex justify-end">
              <button 
                onClick={() => setProgressModal(null)} 
                className="px-5 py-2.5 bg-brand-moss text-white rounded-xl font-bold text-sm hover:bg-brand-mossDeep transition-colors shadow-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {saving && <div className="fixed inset-0 z-[9999] cursor-wait" />}
    </div>
  );
}

import { Suspense } from 'react';
export default function ProgramBuilder() {
  return <Suspense fallback={<div>Đang tải...</div>}><ProgramBuilderInner /></Suspense>;
}
