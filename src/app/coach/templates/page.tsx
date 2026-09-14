"use client";

import { useState, useEffect } from "react";
import { Search, Plus, BookOpen, ArrowLeft, Copy, Loader2, ChevronRight, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ProgramTemplates() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Clone Modal State
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [newProgramName, setNewProgramName] = useState("");
  const [cloning, setCloning] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    
    // Lấy session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = "/login";
      return;
    }

    // Lấy tất cả giáo án (để làm mẫu)
    const { data: progs } = await supabase.from('programs').select(`
      id, name, created_at,
      client:users!client_id(id, full_name),
      blocks(id)
    `).order('created_at', { ascending: false });
    
    // Lấy danh sách clients để cho phép gán (assign) giáo án
    const { data: cls } = await supabase.from('users').select('id, full_name').eq('role', 'client').order('full_name');
    
    setPrograms(progs || []);
    setClients(cls || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCloneModal = (prog: any) => {
    setSelectedProgram(prog);
    setNewProgramName(`${prog.name} (Copy)`);
    setSelectedClientId(clients[0]?.id || "");
    setIsCloneModalOpen(true);
  };

  const handleCloneProgram = async () => {
    if (!selectedProgram || !selectedClientId || !newProgramName.trim()) return;
    setCloning(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Chưa đăng nhập");

      // 1. Tạo Program mới
      const { data: newProg, error: progErr } = await supabase.from('programs').insert({
        name: newProgramName.trim(),
        client_id: selectedClientId,
        pt_id: session.user.id,
        start_date: new Date().toISOString().split('T')[0]
      }).select('id').single();
      
      if (progErr) throw progErr;

      // 2. Fetch full cấu trúc của Program gốc
      const { data: sourceProg } = await supabase.from('programs').select(`
        blocks (
          name, order_index,
          workouts (
            name, week_number, order_index,
            workout_exercises (
              exercise_id, custom_name, group_code, order_index,
              target_sets, target_reps, target_rpe, rest_time, notes
            )
          )
        )
      `).eq('id', selectedProgram.id).single();

      if (sourceProg?.blocks) {
        // Clone Blocks
        for (const block of sourceProg.blocks) {
          const { data: newBlock } = await supabase.from('blocks').insert({
            program_id: newProg.id, name: block.name, order_index: block.order_index
          }).select('id').single();

          if (newBlock && block.workouts) {
            // Clone Workouts
            for (const workout of block.workouts) {
              const { data: newWorkout } = await supabase.from('workouts').insert({
                block_id: newBlock.id, name: workout.name, week_number: workout.week_number, order_index: workout.order_index
              }).select('id').single();

              if (newWorkout && workout.workout_exercises) {
                // Clone Exercises
                const wExsToInsert = workout.workout_exercises.map((wex: any) => ({
                  workout_id: newWorkout.id,
                  exercise_id: wex.exercise_id, custom_name: wex.custom_name,
                  group_code: wex.group_code, order_index: wex.order_index,
                  target_sets: wex.target_sets, target_reps: wex.target_reps, target_rpe: wex.target_rpe,
                  rest_time: wex.rest_time, notes: wex.notes
                }));
                if (wExsToInsert.length > 0) {
                  await supabase.from('workout_exercises').insert(wExsToInsert);
                }
              }
            }
          }
        }
      }

      showToast("Đã nhân bản giáo án thành công!");
      setTimeout(() => {
        window.location.href = `/coach/program?clientId=${selectedClientId}&programId=${newProg.id}`;
      }, 1000);
    } catch (e: any) {
      console.error(e);
      showToast("Lỗi khi nhân bản giáo án", "error");
      setCloning(false);
    }
  };

  const filteredPrograms = programs.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.client?.full_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-brand-paper/50 pb-20">
      <header className="bg-white border-b border-brand-line px-6 py-6 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => window.location.href = '/coach'} className="p-2 hover:bg-brand-paper rounded-full text-brand-moss/60 hover:text-brand-moss transition-colors">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-black text-brand-moss tracking-tight">Giáo Án Mẫu (Templates)</h1>
              <p className="text-brand-moss/60 text-sm font-semibold mt-1">Sao chép (Clone) các giáo án cũ cho học viên mới</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-8 text-amber-800 text-sm font-medium flex items-start gap-3 shadow-sm">
          <BookOpen className="flex-shrink-0 mt-0.5 text-amber-600" size={18} />
          <p>
            <strong>Mẹo:</strong> Mọi giáo án bạn từng tạo cho bất kỳ học viên nào đều có thể dùng làm "Giáo Án Mẫu". 
            Bạn có thể tạo một học viên ảo tên là <strong>"Kho Giáo Án Mẫu"</strong> để chuyên lưu trữ các template gốc!
          </p>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-moss/40" size={20} />
          <input 
            type="text" 
            placeholder="Tìm theo tên giáo án hoặc tên học viên..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-brand-line rounded-2xl font-bold text-brand-moss focus:ring-4 focus:ring-brand-sand/30 focus:border-brand-sand outline-none transition-all shadow-sm"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-moss" size={32} /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPrograms.map(prog => (
              <div key={prog.id} className="bg-white p-5 rounded-2xl border border-brand-line shadow-sm hover:shadow-md hover:border-brand-sand/60 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-brand-moss text-lg leading-tight">{prog.name}</h3>
                    <span className="bg-brand-paper text-brand-moss/60 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                      {prog.blocks?.[0]?.count || prog.blocks?.length || 0} Blocks
                    </span>
                  </div>
                  <p className="text-sm font-medium text-brand-moss/60 flex items-center gap-1.5">
                    Gốc: <strong className="text-brand-moss">{prog.client?.full_name || "Không rõ"}</strong>
                  </p>
                </div>
                
                <div className="mt-5 pt-4 border-t border-brand-line/50 flex justify-end">
                  <button onClick={() => openCloneModal(prog)} className="px-4 py-2 bg-brand-moss text-white text-sm font-bold rounded-xl flex items-center gap-2 hover:bg-brand-mossDeep transition-colors shadow-sm">
                    <Copy size={16} /> Dùng làm Mẫu (Clone)
                  </button>
                </div>
              </div>
            ))}

            {filteredPrograms.length === 0 && (
              <div className="col-span-full py-20 text-center flex flex-col items-center justify-center text-brand-moss/40">
                <BookOpen size={48} className="mb-4 opacity-30" />
                <p className="font-bold text-lg">Không tìm thấy giáo án nào</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Clone Modal */}
      {isCloneModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsCloneModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-brand-line">
              <h2 className="text-lg font-bold text-brand-moss">Nhân bản Giáo án</h2>
              <button onClick={() => setIsCloneModalOpen(false)} className="p-1.5 hover:bg-brand-paper rounded-full text-brand-moss/40 hover:text-brand-moss transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="text-xs font-bold text-brand-moss/60 uppercase tracking-wider mb-2 block">Từ giáo án mẫu</label>
                <div className="bg-brand-paper p-3 rounded-xl border border-brand-line">
                  <p className="font-bold text-brand-moss">{selectedProgram?.name}</p>
                  <p className="text-xs text-brand-moss/60 mt-1">Gốc: {selectedProgram?.client?.full_name}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-brand-moss/60 uppercase tracking-wider mb-2 block">1. Tên giáo án mới *</label>
                <input 
                  type="text" 
                  value={newProgramName} 
                  onChange={(e) => setNewProgramName(e.target.value)}
                  className="w-full px-4 py-3 border border-brand-line rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-sand/30 focus:border-brand-sand outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-brand-moss/60 uppercase tracking-wider mb-2 block">2. Gán cho học viên *</label>
                <select 
                  value={selectedClientId} 
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-4 py-3 border border-brand-line rounded-xl text-sm font-bold text-brand-moss focus:ring-2 focus:ring-brand-sand/30 focus:border-brand-sand outline-none bg-white"
                >
                  <option value="" disabled>-- Chọn học viên --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.full_name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-brand-line bg-brand-paper/30">
              <button 
                onClick={handleCloneProgram} 
                disabled={!newProgramName.trim() || !selectedClientId || cloning}
                className="w-full bg-brand-moss text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-mossDeep transition-colors disabled:opacity-40"
              >
                {cloning ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                {cloning ? "Đang nhân bản..." : "Tạo Giáo Án"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
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
