"use client";
import { useState, useEffect, Suspense } from "react";
import { ArrowLeft, PlayCircle, Check, Plus, Trash2, Clock, X, Target, Link as LinkIcon, TimerReset, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from 'swr';
import { useSearchParams } from 'next/navigation';

function WorkoutExecutionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workoutId = searchParams ? searchParams.get('id') : null;
    const [saving, setSaving] = useState(false);
  const [workoutData, setWorkoutData] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  
  const [showVideo, setShowVideo] = useState<string | null>(null);
  
  // Feedback States
  const [showFeedback, setShowFeedback] = useState(false);
  const [rpeScore, setRpeScore] = useState(7);
  const [jointPain, setJointPain] = useState("");
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [errorSetId, setErrorSetId] = useState<string | null>(null);
  const [restTime, setRestTime] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Hẹn giờ đếm tổng thời gian buổi tập
  const [workoutDuration, setWorkoutDuration] = useState(0);

  useEffect(() => {
    // Tự động tắt Toast thông báo sau 3 giây
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    // Đếm giờ tổng
    const durationInterval = setInterval(() => setWorkoutDuration(prev => prev + 1), 1000);
    return () => clearInterval(durationInterval);
  }, []);

  useEffect(() => {
    // Đếm lùi giờ nghỉ
    let restInterval: NodeJS.Timeout;
    if (restTime !== null && restTime > 0) {
      restInterval = setInterval(() => setRestTime(prev => prev! - 1), 1000);
    } else if (restTime === 0) {
      setRestTime(null);
    }
    return () => clearInterval(restInterval);
  }, [restTime]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  
  const fetcher = async (id: string) => {
    if (!id) return null;

    const [workoutRes, wExRes] = await Promise.all([
      supabase.from('workouts').select('id, block_id, order_index, name, week_number, is_completed, rpe_score, joint_pain, notes, coach_video_url').eq('id', id).single(),
      supabase.from('workout_exercises').select('id, order_index, group_code, custom_name, target_sets, target_reps, target_rpe, exercise_id, coach_notes, exercises(name, youtube_id)').eq('workout_id', id).order('order_index', { ascending: true })
    ]);

    const workout = workoutRes.data;
    const wExercises = wExRes.data;

    let prevVideoUrl = null;
    let prevNotesMap: Record<string, string> = {};
    let prevLogsMap: Record<string, any[]> = {};
    let currentLogs: any[] = [];

    const parallelTasks = [];

    if (wExercises && wExercises.length > 0) {
      const wExIds = wExercises.map((ex: any) => ex.id);
      parallelTasks.push(
        supabase.from('workout_logs').select('*').in('workout_exercise_id', wExIds).then(res => {
          currentLogs = res.data || [];
        })
      );
    }

    if (workout?.week_number > 1 && workout?.block_id) {
      parallelTasks.push(
        (async () => {
          const { data: prevWorkout } = await supabase.from('workouts')
            .select('id, coach_video_url')
            .eq('block_id', workout.block_id)
            .eq('order_index', workout.order_index)
            .eq('week_number', workout.week_number - 1)
            .single();

          if (prevWorkout) {
            prevVideoUrl = prevWorkout.coach_video_url;
            const { data: prevExs } = await supabase.from('workout_exercises')
              .select('exercise_id, coach_notes, workout_logs(set_number, weight, reps, rpe)')
              .eq('workout_id', prevWorkout.id);
              
            if (prevExs) {
              prevExs.forEach((px: any) => {
                if (px.coach_notes && px.exercise_id) prevNotesMap[px.exercise_id] = px.coach_notes;
                if (px.workout_logs && px.workout_logs.length > 0 && px.exercise_id) prevLogsMap[px.exercise_id] = px.workout_logs;
              });
            }
          }
        })()
      );
    }

    await Promise.all(parallelTasks);

    if (workout) {
      workout.coach_video_url = prevVideoUrl;
    }

    let exState: any[] = [];
    if (wExercises) {
      const logs = currentLogs;
      exState = wExercises.map((ex: any) => {
        const name = ex.custom_name || ex.exercises?.name || "Bài tập";
        const sets = [];
        const exLogs = logs?.filter((l: any) => l.workout_exercise_id === ex.id) || [];
        
        const numSets = Math.max(ex.target_sets || 3, exLogs.length);
        
        for (let i = 1; i <= numSets; i++) {
          const log = exLogs.find((l: any) => l.set_number === i);
          sets.push({
            id: `${ex.id}-${i}`,
            set_number: i,
            target: `${ex.target_reps} reps @${ex.target_rpe}`,
            weight: log && log.weight !== undefined && log.weight !== null ? (log.weight === 0 ? '' : String(log.weight)) : '',
            reps: log && log.reps ? String(log.reps) : "",
            rpe: log && log.rpe ? String(log.rpe) : "",
            completed: !!log,
            prev_log: prevLogsMap[ex.exercise_id]?.find((l:any) => l.set_number === i) || null
          });
        }
        return {
          w_ex_id: ex.id,
          group_code: ex.group_code || String(ex.order_index),
          name: name,
          youtube_id: ex.exercises?.youtube_id,
          coach_notes: prevNotesMap[ex.exercise_id] || null,
          sets: sets
        };
      });
    }

    return { workout, exState };
  };

  const { data: swrData, isLoading: swrLoading } = useSWR(
    workoutId ? `workout_${workoutId}` : null,
    () => fetcher(workoutId as string),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  useEffect(() => {
    if (!workoutId) {
      router.push("/program");
    }
  }, [workoutId, router]);

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (swrData && workoutId && !isInitialized) {
      setWorkoutData(swrData.workout);
      if (swrData.workout?.rpe_score !== null && swrData.workout?.rpe_score !== undefined) setRpeScore(swrData.workout.rpe_score);
      if (swrData.workout?.joint_pain) setJointPain(swrData.workout.joint_pain);
      if (swrData.workout?.notes) setWorkoutNotes(swrData.workout.notes);
      
      // Khôi phục bản nháp nếu có
      const draftStr = localStorage.getItem(`draft_workout_${workoutId}`);
      if (draftStr) {
        try {
          const draftData = JSON.parse(draftStr);
          setExercises(draftData);
        } catch(e) {
          setExercises(swrData.exState);
        }
      } else {
        setExercises(swrData.exState);
      }
      
      setIsInitialized(true);
    }
  }, [swrData, workoutId, isInitialized]);

  // Tự động lưu nháp mỗi khi exercises thay đổi
  useEffect(() => {
    if (isInitialized && exercises.length > 0 && workoutId) {
      localStorage.setItem(`draft_workout_${workoutId}`, JSON.stringify(exercises));
    }
  }, [exercises, isInitialized, workoutId]);


  const calculateRestTimeByRPE = (rpeVal: number) => {
    if (rpeVal >= 9) return 240;
    if (rpeVal >= 8) return 180;
    return 60;
  };

  const updateSet = (exId: string, setId: string, field: string, value: string) => {
    setExercises(exercises.map(ex => {
      if (ex.w_ex_id !== exId) return ex;
      return {
        ...ex,
        sets: ex.sets.map((s: any) => s.id === setId ? { ...s, [field]: value } : s)
      };
    }));
    if (errorSetId === setId) setErrorSetId(null);
  };

  const toggleComplete = (exId: string, setId: string) => {
    let nextRestTime = 0;
    let showSupersetToast = false;
    
    // Tìm thông tin bài hiện tại và bài tiếp theo để check Superset
    const exIndex = exercises.findIndex(e => e.w_ex_id === exId);
    const currentEx = exercises[exIndex];
    const nextEx = exercises[exIndex + 1];
    
    const isSuperset = String(currentEx.group_code).match(/[a-zA-Z]/i);
    const currentGroupNum = parseInt(currentEx.group_code);
    const nextGroupNum = nextEx ? parseInt(nextEx.group_code) : null;
    const isLinkedToNext = isSuperset && currentGroupNum === nextGroupNum;

    const newExercises = exercises.map(ex => {
      if (ex.w_ex_id !== exId) return ex;
      
      const newSets = ex.sets.map((s: any) => {
        if (s.id !== setId) return s;
        if (!s.completed && !s.reps) {
          setErrorSetId(setId);
          return s; // Failed validation
        }
        if (!s.completed) {
          setErrorSetId(null);
          
          if (isLinkedToNext) {
            // Không tính giờ nghỉ chính, báo hiệu chuyển bài
            showSupersetToast = true;
            nextRestTime = 0;
          } else {
            // Tính giờ nghỉ dựa trên RPE khách hàng vừa nhập (ưu tiên RPE thực tế)
            const actualRPE = parseFloat(s.rpe);
            const targetRPE = parseFloat(s.target.split('@')[1]); 
            const rpeToUse = !isNaN(actualRPE) ? actualRPE : (!isNaN(targetRPE) ? targetRPE : 7);
            
            nextRestTime = calculateRestTimeByRPE(rpeToUse);
          }
        }
        return { ...s, completed: !s.completed };
      });
      return { ...ex, sets: newSets };
    });

    setExercises(newExercises);
    
    if (showSupersetToast) {
      setToastMessage("🔥 Hít thở 15s rồi qua bài tiếp theo luôn nhé!");
      setRestTime(null);
    } else if (nextRestTime > 0 && !errorSetId) {
      setRestTime(nextRestTime);
    }
  };

  const addSet = (exId: string) => {
    setExercises(exercises.map(ex => {
      if (ex.w_ex_id !== exId) return ex;
      const newNum = ex.sets.length + 1;
      const newSet = {
        id: `${exId}-${newNum}-${Date.now()}`,
        set_number: newNum,
        target: "Tùy chọn",
        weight: "", reps: "", rpe: "", completed: false
      };
      return { ...ex, sets: [...ex.sets, newSet] };
    }));
  };

  const removeSet = (exId: string) => {
    setExercises(exercises.map(ex => {
      if (ex.w_ex_id !== exId) return ex;
      if (ex.sets.length <= 1) {
        alert("Phải có ít nhất 1 set!");
        return ex;
      }
      return { ...ex, sets: ex.sets.slice(0, -1) };
    }));
  };

  // Mở modal feedback hoặc xoá buổi tập nếu trống
  const openFeedback = async () => {
    const stats = getCompletedSetsCount();
    if (stats.completed === 0) {
      // Un-complete the workout silently
      setSaving(true);
      try {
        const wExIds = exercises.map(ex => ex.w_ex_id);
        if (wExIds.length > 0) {
          const { error: delError } = await supabase.from('workout_logs').delete().in('workout_exercise_id', wExIds);
          if (delError) throw delError;
        }
        const { error: upError } = await supabase.from('workouts')
          .update({ 
            is_completed: false,
            is_perfect: false, 
            completed_at: null,
            rpe_score: null,
            joint_pain: null,
            notes: null
          })
          .eq('id', workoutData.id);
        
        if (upError) throw upError;

        await mutate('program_dashboard');
        await mutate(`workout_${workoutData.id}`);
        if (workoutId) localStorage.removeItem(`draft_workout_${workoutId}`);
        router.refresh();
        router.push("/program");
      } catch(e: any) {
        console.error(e);
        alert("Lỗi khi xoá dữ liệu! " + (e.message || ""));
      }
      setSaving(false);
    } else {
      setShowFeedback(true);
    }
  };

  // Nộp buổi tập lên Supabase
  const submitFinalWorkout = async () => {
    setSaving(true);
    try {
      const logsToInsert: any[] = [];
      exercises.forEach(ex => {
        ex.sets.forEach((set: any) => {
          if (set.completed) {
            logsToInsert.push({
              workout_exercise_id: ex.w_ex_id,
              set_number: set.set_number,
              weight: parseFloat(set.weight) || 0,
              reps: parseInt(set.reps) || 0,
              rpe: parseFloat(set.rpe) || null
            });
          }
        });
      });

      const wExIds = exercises.map(ex => ex.w_ex_id);
      if (wExIds.length > 0) {
        const { error: delError } = await supabase.from('workout_logs').delete().in('workout_exercise_id', wExIds);
        if (delError) throw delError;
      }

      if (logsToInsert.length > 0) {
        const { error: insError } = await supabase.from('workout_logs').insert(logsToInsert);
        if (insError) throw insError;
      }

      let isPerfect = true;
      exercises.forEach(ex => {
        ex.sets.forEach((set: any) => {
          if (!set.completed) isPerfect = false;
        });
      });

      const { error: upError } = await supabase.from('workouts')
        .update({ 
          is_completed: true,
          is_perfect: isPerfect, 
          completed_at: new Date().toISOString(),
          rpe_score: rpeScore,
          joint_pain: jointPain || null,
          notes: workoutNotes || null
        })
        .eq('id', workoutData.id);

      if (upError) throw upError;

      await mutate('program_dashboard');
      await mutate(`workout_${workoutData.id}`);
      if (workoutId) localStorage.removeItem(`draft_workout_${workoutId}`);
      router.refresh();
      router.push("/program");
    } catch (err: any) {
      console.error(err);
      alert("Lỗi khi lưu kết quả! " + (err.message || ""));
    }
    setSaving(false);
  };
  
  // Helper tính số set hoàn thành
  const getCompletedSetsCount = () => {
    let total = 0;
    let completed = 0;
    exercises.forEach(ex => {
      ex.sets.forEach((s: any) => {
        total++;
        if (s.completed) completed++;
      });
    });
    return { total, completed };
  };

  if (swrLoading || !workoutData) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-brand-paper shadow-2xl relative pb-32 animate-pulse">
        {/* Header Skeleton */}
        <div className="bg-white px-5 py-4 flex items-center justify-between border-b border-brand-line sticky top-0 z-50 pt-[max(env(safe-area-inset-top),16px)]">
          <div className="w-8 h-8 bg-brand-line/40 rounded-full"></div>
          <div className="flex-1 px-4 text-center space-y-2">
            <div className="w-24 h-4 bg-brand-line/50 mx-auto rounded"></div>
            <div className="w-32 h-5 bg-brand-line/40 mx-auto rounded"></div>
          </div>
          <div className="w-8 h-8 bg-brand-line/40 rounded-full"></div>
        </div>
        
        {/* Progress Bar Skeleton */}
        <div className="h-1.5 w-full bg-brand-line/30"></div>

        {/* Content Skeleton */}
        <div className="p-4 space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-brand-line/50 p-4">
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-2">
                  <div className="w-16 h-4 bg-brand-line/50 rounded"></div>
                  <div className="w-40 h-6 bg-brand-line/40 rounded"></div>
                </div>
                <div className="w-8 h-8 rounded-full bg-brand-line/30"></div>
              </div>
              <div className="space-y-2">
                <div className="w-full h-10 bg-brand-line/20 rounded-xl"></div>
                <div className="w-full h-10 bg-brand-line/20 rounded-xl"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-brand-paper shadow-2xl relative pb-32">
      {/* Header */}
      <div className="bg-brand-mossDeep text-white px-5 pb-5 pt-[max(env(safe-area-inset-top),32px)] rounded-b-2xl shadow-md sticky top-0 z-20">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => router.push('/program')} className="text-brand-sage hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center space-x-2 bg-brand-moss px-3 py-1.5 rounded-full border border-brand-sage/20">
            <Clock size={16} className="text-brand-sand" />
            <span className="text-sm font-bold font-mono text-brand-sand tracking-widest">{formatTime(workoutDuration)}</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold mt-2">{workoutData?.name || "Buổi Tập"}</h1>
        <p className="text-brand-sage text-sm mt-1">Tuần {workoutData?.week_number}</p>
      </div>

      {workoutData?.coach_video_url && (
        <a 
          href={workoutData.coach_video_url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="mx-5 mt-5 bg-brand-moss border border-brand-mossDeep p-4 rounded-2xl flex gap-3 items-center shadow-lg hover:shadow-xl transition-shadow cursor-pointer block"
        >
          <div className="w-12 h-12 bg-white/20 rounded-full flex justify-center items-center text-white flex-shrink-0 animate-pulse">
            <PlayCircle size={24} className="ml-1" />
          </div>
          <div>
            <h3 className="text-white font-black text-sm uppercase tracking-wide">Video Phân Tích</h3>
            <p className="text-brand-paper/90 text-[13px] font-semibold leading-snug">Xem Coach nhận xét bài tập tuần trước trước khi bắt đầu.</p>
          </div>
        </a>
      )}

      <div className="p-4 space-y-6 mt-2 relative">
        {exercises.map((ex, exIndex) => {
          const isSuperset = String(ex.group_code).match(/[a-zA-Z]/i);
          const currentGroupNum = parseInt(ex.group_code);
          const nextGroupNum = exercises[exIndex + 1] ? parseInt(exercises[exIndex + 1].group_code) : null;
          const isLinkedToNext = isSuperset && currentGroupNum === nextGroupNum;
          
          return (
            <div key={ex.w_ex_id} className="relative">
              {/* Vẽ đường line nối Superset nếu bài tiếp theo cùng group */}
              {isLinkedToNext && (
                <div className="absolute left-[22px] top-12 bottom-[-40px] w-1 bg-brand-sand rounded-full z-0"></div>
              )}

              <div className="bg-white rounded-2xl shadow-sm border border-brand-line overflow-hidden relative z-10 mb-6">
                <div className="p-4 bg-brand-moss/5 border-b border-brand-line flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-brand-sand text-brand-moss font-black w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-brand-sand/50">
                      {ex.group_code}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-brand-mossDeep leading-tight">{ex.name}</h2>
                      {isSuperset && (
                        <span className="text-[10px] font-bold text-brand-sand bg-brand-moss px-2 py-0.5 rounded-md mt-1 inline-flex items-center gap-1">
                          <LinkIcon size={10}/> Superset
                        </span>
                      )}
                    </div>
                  </div>
                  {ex.youtube_id && (
                    <button 
                      onClick={() => setShowVideo(ex.youtube_id)}
                      className="text-brand-warn bg-brand-warn/10 p-2.5 rounded-full hover:bg-brand-warn hover:text-white transition-colors"
                    >
                      <PlayCircle size={22} />
                    </button>
                  )}
                </div>

                {ex.coach_notes && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 mx-4 mt-4 rounded-xl flex items-start gap-2 shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 w-1 h-full bg-amber-400"></div>
                    <span className="text-lg leading-none mt-0.5">💡</span>
                    <div className="text-sm font-semibold leading-relaxed">
                      <span className="font-bold uppercase tracking-wider text-[10px] block text-amber-600 mb-0.5">Coach dặn:</span>
                      {ex.coach_notes}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-brand-paper/20">
                  <div className="flex items-center text-[10px] font-bold text-brand-moss/50 uppercase tracking-wider px-2 mb-2">
                    <div className="flex-1 text-center">TẠ</div>
                    <div className="flex-1 text-center">Rep</div>
                    <div className="flex-1 text-center">RPE</div>
                    <div className="w-[45px]"></div>
                  </div>

                  <div className="space-y-3">
                    {ex.sets.map((set: any) => {
                      const isError = errorSetId === set.id;
                      return (
                        <div key={set.id} className={`flex flex-col p-3 rounded-xl border shadow-sm transition-all ${
                          set.completed ? "bg-orange-100 border-[2px] border-orange-300 shadow-[0_0_15px_rgba(253,186,116,0.5)]" : isError ? "bg-red-50/80 border-red-300" : "bg-white border-brand-line"
                        }`}>
                          <div className="mb-3 px-1 flex flex-col gap-2 items-start">
                            <div>
                              <span className={`text-base font-black ${set.completed ? "text-orange-950" : "text-brand-moss"}`}>
                                Set {set.set_number}:
                              </span>
                              <span className={`text-base font-bold ml-1.5 ${set.completed ? "text-orange-900" : "text-brand-moss/70"}`}>
                                {set.target}
                              </span>
                            </div>
                            {set.prev_log && (
                               <div className="text-[15px] font-bold text-brand-moss/80 flex items-center gap-1.5 mt-0.5 pl-0.5">
                                 <span className="text-brand-moss/60 text-lg leading-none transform -translate-y-[2px]">↳</span> 
                                 <span>Tuần trước:</span> 
                                 <span className="text-brand-mossDeep font-black">
                                   {set.prev_log.weight == 0 ? 'BW' : `${set.prev_log.weight}`} x {set.prev_log.reps}{set.prev_log.rpe ? ` @${set.prev_log.rpe}` : ''}
                                 </span>
                               </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <input type="number" placeholder="kg/lbs" disabled={set.completed} value={set.weight} onChange={(e) => updateSet(ex.w_ex_id, set.id, "weight", e.target.value)} className={`flex-1 w-full text-center py-3 rounded-lg font-black text-lg ${set.completed ? "bg-transparent text-orange-950" : isError && !set.weight ? "bg-red-100" : "bg-brand-paper/50"}`} />
                            <input type="number" placeholder="rep" disabled={set.completed} value={set.reps} onChange={(e) => updateSet(ex.w_ex_id, set.id, "reps", e.target.value)} className={`flex-1 w-full text-center py-3 rounded-lg font-black text-lg ${set.completed ? "bg-transparent text-orange-950" : isError && !set.reps ? "bg-red-100" : "bg-brand-paper/50"}`} />
                            <input type="number" placeholder="rpe" disabled={set.completed} value={set.rpe} onChange={(e) => updateSet(ex.w_ex_id, set.id, "rpe", e.target.value)} className={`flex-1 w-full text-center py-3 rounded-lg font-black text-lg ${set.completed ? "bg-transparent text-orange-950" : "bg-brand-paper/50"}`} />
                            <div className="w-[45px] flex justify-end">
                              <button onClick={() => toggleComplete(ex.w_ex_id, set.id)} className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${set.completed ? "bg-orange-950 text-orange-200 shadow-lg scale-105" : "bg-brand-moss text-white hover:bg-brand-mossDeep shadow-md"}`}>
                                <Check size={24} strokeWidth={set.completed ? 3 : 2.5} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {errorSetId && ex.sets.find((s:any) => s.id === errorSetId) && (
                    <div className="mt-3 text-center text-xs font-bold text-red-500 bg-red-50 py-2 rounded-lg border border-red-100">
                      ⚠️ Cần nhập số Rep để hoàn thành Set!
                    </div>
                  )}

                  <div className="flex justify-between mt-4 pt-4 border-t border-brand-line border-dashed">
                     <button onClick={() => removeSet(ex.w_ex_id)} className="text-xs font-bold text-brand-moss/40 hover:text-red-500 flex items-center gap-1 transition-colors">
                      <Trash2 size={14} /> Xóa set cuối
                    </button>
                    <button onClick={() => addSet(ex.w_ex_id)} className="text-xs font-bold text-brand-sand hover:text-brand-moss flex items-center gap-1 transition-colors bg-brand-sand/10 px-4 py-2 rounded-lg">
                      <Plus size={14} /> Thêm Set
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-brand-mossDeep text-brand-sand px-6 py-3 rounded-full shadow-2xl z-50 border border-brand-sand/30 animate-bounce">
          <span className="text-sm font-bold whitespace-nowrap">{toastMessage}</span>
        </div>
      )}

      {/* Floating Rest Timer */}
      {restTime !== null && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-brand-mossDeep text-brand-sand px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 z-40 border border-brand-sand/30 animate-bounce">
          <TimerReset size={20} className="animate-spin-slow" />
          <div className="font-mono text-xl font-black">{formatTime(restTime)}</div>
          <button onClick={() => setRestTime(null)} className="ml-2 text-white/50 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Button Nộp Bài */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent pb-8 z-30">
        <button 
          onClick={openFeedback}
          disabled={saving}
          className="w-full max-w-md mx-auto bg-brand-moss text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-brand-moss/30 hover:bg-brand-mossDeep transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
        >
           {saving ? <Loader2 className="animate-spin" size={24} /> : <Check size={24} />} 
           {saving ? "Đang lưu..." : "Hoàn Thành Buổi Tập"}
        </button>
      </div>

      
      {/* Modal Feedback (Đánh giá buổi tập) */}
      {showFeedback && (
        <div className="fixed inset-0 z-[100] bg-brand-paper animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="absolute inset-0 w-full px-6 pt-6 pb-[120px] flex flex-col gap-6 overflow-y-auto" style={{ paddingTop: 'max(env(safe-area-inset-top), 32px)' }}>
            {/* Header */}
            <div className="text-center">
              <h2 className="text-2xl font-black text-brand-mossDeep mb-1 leading-tight text-balance">Chúc mừng bạn đã hoàn thành buổi tập! 🎉</h2>
              <p className="text-brand-moss/70 font-semibold text-sm">Bạn đã tập được {getCompletedSetsCount().completed}/{getCompletedSetsCount().total} Set hôm nay.</p>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-brand-line text-center flex flex-col gap-1.5">
              <h3 className="text-lg font-extrabold text-brand-mossDeep leading-snug">
                Bạn cảm thấy buổi tập hôm nay thế nào?
              </h3>
              <p className="text-[13px] font-semibold text-brand-moss/60 leading-relaxed px-1">
                Việc đánh giá sẽ giúp Coach theo dõi khả năng phục hồi và đưa ra chiến thuật tăng tiến phù hợp cho tuần tới.
              </p>
            </div>

            {/* Slider RPE */}
            <div className="space-y-4 pt-2">
              <div className="text-center h-8 flex items-center justify-center">
                <span className="text-2xl font-black transition-colors duration-200" style={{ 
                  color: rpeScore <= 6 ? '#6b7280' : rpeScore <= 8 ? '#22c55e' : rpeScore === 9 ? '#eab308' : '#ef4444' 
                }}>
                  {rpeScore} - {rpeScore <= 6 ? 'Nhẹ nhàng' : rpeScore <= 8 ? 'Vừa sức' : rpeScore === 9 ? 'Nỗ lực cao' : 'Hết sức luôn'}
                </span>
              </div>
              <div className="relative px-2">
                <input 
                  type="range" min="1" max="10" step="1" 
                  value={rpeScore} 
                  onChange={(e) => setRpeScore(parseInt(e.target.value))}
                  className="w-full relative z-10 appearance-none bg-transparent focus:outline-none cursor-pointer h-2 rounded-full border border-brand-line/50"
                  style={{
                    background: rpeScore <= 6 ? '#e5e7eb' : rpeScore <= 8 ? '#dcfce7' : rpeScore === 9 ? '#fef08a' : '#fee2e2'
                  }}
                />
                <style dangerouslySetInnerHTML={{__html: `
                  input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    height: 28px; width: 28px; border-radius: 50%; background: #fff;
                    border: 3px solid ${rpeScore <= 6 ? '#6b7280' : rpeScore <= 8 ? '#22c55e' : rpeScore === 9 ? '#eab308' : '#ef4444'};
                    margin-top: -10px; box-shadow: 0 2px 4px rgba(0,0,0,0.15);
                  }
                `}} />
                <div className="flex justify-between w-full mt-3 px-1 text-[11px] font-bold text-brand-moss/40">
                  <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span>
                </div>
              </div>
            </div>

            {/* Khớp & Ghi chú */}
            <div className="space-y-4 pt-4 border-t border-brand-line border-dashed">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-moss/60 uppercase tracking-wider ml-1">MỨC ĐỘ ĐAU/KHÓ CHỊU KHỚP (NẾU CÓ)</label>
                <input 
                  type="text" 
                  value={jointPain} onChange={(e) => setJointPain(e.target.value)}
                  placeholder="Ví dụ: Đau nhẹ đầu gối phải" 
                  className="w-full p-4 bg-white border border-brand-line rounded-xl font-medium text-brand-moss focus:ring-2 focus:ring-brand-sand outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-moss/60 uppercase tracking-wider ml-1">Ghi chú bổ sung (nếu có)</label>
                <textarea 
                  value={workoutNotes} onChange={(e) => setWorkoutNotes(e.target.value)}
                  placeholder="Ví dụ: Cảm nhận trọng tâm trong bài squat tốt hơn, chưa tự tin về kĩ thuật trong bài Deadlift" 
                  rows={3}
                  className="w-full p-4 bg-white border border-brand-line rounded-xl font-medium text-brand-moss focus:ring-2 focus:ring-brand-sand outline-none resize-none"
                ></textarea>
              </div>
            </div>

          </div>
          
          {/* Nút gửi (Floating Bottom) */}
          <div className="absolute bottom-0 left-0 right-0 px-6 pt-8 pb-[max(env(safe-area-inset-bottom),32px)] bg-gradient-to-t from-brand-paper via-brand-paper/95 to-transparent pointer-events-none">
            <div className="flex gap-3 pointer-events-auto">
               <button onClick={() => setShowFeedback(false)} className="px-6 py-4 rounded-xl font-bold text-brand-moss bg-brand-line/50 hover:bg-brand-line transition-colors">
                 Quay lại
               </button>
               <button 
                onClick={submitFinalWorkout}
                disabled={saving}
                className="flex-1 bg-brand-moss text-white font-bold text-lg py-4 rounded-xl shadow-lg hover:bg-brand-mossDeep transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
               >
                 {saving ? <Loader2 className="animate-spin" size={24} /> : <Check size={24} />} 
                 {saving ? "Đang gửi..." : "Gửi cho Coach"}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Video YouTube */}
      {showVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-brand-mossDeep rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <div className="flex justify-between items-center p-4 border-b border-white/10">
              <h3 className="text-white font-bold">Hướng dẫn Kỹ thuật</h3>
              <button onClick={() => setShowVideo(null)} className="text-brand-sage hover:text-white bg-white/10 rounded-full p-1 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center relative">
               <iframe 
                  width="100%" 
                  height="100%" 
                  src={`https://www.youtube.com/embed/${showVideo}?autoplay=1`} 
                  title="YouTube video player" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                ></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default function WorkoutExecution() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-brand-paper"></div>}>
      <WorkoutExecutionContent />
    </Suspense>
  );
}
