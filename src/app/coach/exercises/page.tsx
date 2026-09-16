"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Dumbbell, Pencil, Trash2, Video, X, Loader2, Play, ArrowLeft, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ExerciseLibrary() {
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Modal state
  const [editingEx, setEditingEx] = useState<any>(null);
  const [name, setName] = useState("");
  const [youtubeLink, setYoutubeLink] = useState("");
  const [exerciseToDelete, setExerciseToDelete] = useState<{id: string, name: string} | null>(null);
  
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchExercises = async () => {
    setLoading(true);
    const { data } = await supabase.from('exercises').select('*').order('name');
    setExercises(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchExercises();
  }, []);

  const openModal = (ex: any = null) => {
    setEditingEx(ex);
    if (ex) {
      setName(ex.name);
      setYoutubeLink(ex.youtube_id ? `https://youtube.com/watch?v=${ex.youtube_id}` : "");
    } else {
      setName("");
      setYoutubeLink("");
    }
    setIsModalOpen(true);
  };

  const extractYoutubeId = (url: string) => {
    if (!url.trim()) return null;
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  const handleBulkSave = async () => {
    if (!bulkText.trim()) return;
    setSaving(true);
    
    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l);
    const exercisesToInsert = [];
    
    for (const line of lines) {
      const httpIndex = line.indexOf('http');
      if (httpIndex !== -1) {
        const namePart = line.substring(0, httpIndex).replace(/[\-\,\:\s]+$/, '').trim();
        const linkPart = line.substring(httpIndex).trim();
        const ytId = extractYoutubeId(linkPart);
        if (namePart) exercisesToInsert.push({ name: namePart, youtube_id: ytId });
      } else {
        exercisesToInsert.push({ name: line, youtube_id: null });
      }
    }

    if (exercisesToInsert.length > 0) {
      const { error } = await supabase.from('exercises').insert(exercisesToInsert);
      if (!error) {
         showToast(`Đã thêm ${exercisesToInsert.length} bài tập!`);
         setShowBulkModal(false);
         setBulkText("");
         await fetchExercises();
      } else {
         showToast("Có lỗi xảy ra khi thêm", "error");
      }
    }
    setSaving(false);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    
    const ytId = extractYoutubeId(youtubeLink);

    if (editingEx) {
      // Update
      const { error } = await supabase.from('exercises')
        .update({ name: name.trim(), youtube_id: ytId })
        .eq('id', editingEx.id);
      if (!error) showToast("Đã cập nhật bài tập");
    } else {
      // Insert
      const { error } = await supabase.from('exercises')
        .insert({ name: name.trim(), youtube_id: ytId });
      if (!error) showToast("Đã thêm bài tập mới");
    }

    setSaving(false);
    setIsModalOpen(false);
    fetchExercises();
  };

  const confirmDelete = (id: string, exName: string) => {
    setExerciseToDelete({ id, name: exName });
  };

  const executeDelete = async () => {
    if (!exerciseToDelete) return;
    setSaving(true);
    const { error } = await supabase.from('exercises').delete().eq('id', exerciseToDelete.id);
    setSaving(false);
    setExerciseToDelete(null);

    if (error) {
      showToast("Lỗi: Bài tập đang được sử dụng ở giáo án nào đó.", "error");
    } else {
      showToast("Đã xóa bài tập");
      fetchExercises();
    }
  };

  const filteredExercises = exercises.filter(ex => 
    ex.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-brand-paper pb-20">
      <header className="bg-white border-b border-brand-line px-6 py-6 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => window.location.href = '/coach'} className="p-2 hover:bg-brand-paper rounded-full text-brand-moss/60 hover:text-brand-moss transition-colors">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-black text-brand-moss tracking-tight">Kho Bài Tập</h1>
              <p className="text-brand-moss/60 text-sm font-semibold mt-1">Quản lý danh sách bài tập và video hướng dẫn</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowBulkModal(true)} className="bg-brand-sand/20 text-brand-moss border border-brand-sand/50 px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-sand/40 transition-colors shadow-sm">
              <Plus size={18} /> Thêm Hàng Loạt
            </button>
            <button onClick={() => openModal()} className="bg-brand-moss text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-mossDeep transition-colors shadow-md">
              <Plus size={18} /> Thêm 1 Bài
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-moss/40" size={20} />
          <input 
            type="text" 
            placeholder="Tìm kiếm bài tập..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-brand-line rounded-2xl font-bold text-brand-moss focus:ring-4 focus:ring-brand-sand/30 focus:border-brand-sand outline-none transition-all shadow-sm"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-moss" size={32} /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExercises.map(ex => (
              <div key={ex.id} className="bg-white rounded-2xl border border-brand-line overflow-hidden hover:border-brand-sand transition-colors group shadow-sm flex flex-col">
                <div className="relative aspect-video bg-gray-100 flex-shrink-0">
                  {ex.youtube_id ? (
                    <>
                      <img src={`https://img.youtube.com/vi/${ex.youtube_id}/mqdefault.jpg`} alt={ex.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={`https://youtube.com/watch?v=${ex.youtube_id}`} target="_blank" rel="noreferrer" className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center text-red-600 hover:scale-110 transition-transform">
                          <Play size={20} className="ml-1" />
                        </a>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <Video size={32} />
                    </div>
                  )}
                </div>
                
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-brand-moss text-lg leading-tight mb-1">{ex.name}</h3>
                    {ex.youtube_id ? (
                      <p className="text-xs text-brand-moss/50 font-semibold flex items-center gap-1"><Video size={12}/> Đã có video</p>
                    ) : (
                      <p className="text-xs text-amber-600/70 font-semibold italic">Chưa có video</p>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mt-4 pt-4 border-t border-brand-line/50">
                    <button onClick={() => openModal(ex)} className="flex-1 py-2 bg-brand-paper rounded-lg text-sm font-bold text-brand-moss/70 hover:bg-brand-sand hover:text-brand-mossDeep transition-colors flex items-center justify-center gap-1.5">
                      <Pencil size={14}/> Sửa
                    </button>
                    <button onClick={() => confirmDelete(ex.id, ex.name)} className="px-3 py-2 bg-red-50 rounded-lg text-red-500 hover:bg-red-500 hover:text-white transition-colors">
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredExercises.length === 0 && (
              <div className="col-span-full py-20 text-center flex flex-col items-center justify-center text-brand-moss/40">
                <Dumbbell size={48} className="mb-4 opacity-30" />
                <p className="font-bold text-lg">Không tìm thấy bài tập nào</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal Bulk Import */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowBulkModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-brand-line">
              <h2 className="text-lg font-bold text-brand-moss">Thêm Hàng Loạt Bài Tập</h2>
              <button onClick={() => setShowBulkModal(false)} className="p-1.5 hover:bg-brand-paper rounded-full text-brand-moss/40 hover:text-brand-moss transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <p className="text-sm text-brand-moss/70 mb-4 font-semibold">
                Mỗi bài tập nằm trên 1 dòng. Có thể dán kèm link YouTube theo định dạng:<br/>
                <span className="text-brand-moss bg-brand-sand/20 px-2 py-1 rounded">Tên bài tập - https://youtube.com/watch?v=...</span>
              </p>
              <textarea 
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={"Squat - https://youtu.be/...\nBench Press - https://youtube.com/shorts/..."}
                className="w-full h-[40vh] p-4 border border-brand-line rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-sand/30 focus:border-brand-sand outline-none whitespace-pre"
              ></textarea>
            </div>
            <div className="px-6 py-4 border-t border-brand-line bg-brand-paper/30 flex justify-end">
              <button 
                onClick={handleBulkSave} 
                disabled={!bulkText.trim() || saving}
                className="bg-brand-moss text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-brand-mossDeep transition-colors disabled:opacity-40"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Lưu Hàng Loạt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-brand-line">
              <h2 className="text-lg font-bold text-brand-moss">{editingEx ? "Sửa bài tập" : "Thêm bài tập mới"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-brand-paper rounded-full text-brand-moss/40 hover:text-brand-moss transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-brand-moss/60 uppercase tracking-wider mb-2 block">Tên bài tập *</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Barbell Bench Press"
                  className="w-full px-4 py-3 border border-brand-line rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-sand/30 focus:border-brand-sand outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-bold text-brand-moss/60 uppercase tracking-wider mb-2 block">Link YouTube Hướng dẫn</label>
                <input 
                  type="text" 
                  value={youtubeLink} 
                  onChange={(e) => setYoutubeLink(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-4 py-3 border border-brand-line rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-sand/30 focus:border-brand-sand outline-none"
                />
                {youtubeLink && extractYoutubeId(youtubeLink) && (
                  <div className="mt-3 relative aspect-video bg-gray-100 rounded-lg overflow-hidden border border-brand-line">
                    <img src={`https://img.youtube.com/vi/${extractYoutubeId(youtubeLink)}/mqdefault.jpg`} className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-brand-line bg-brand-paper/30">
              <button 
                onClick={handleSave} 
                disabled={!name.trim() || saving}
                className="w-full bg-brand-moss text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-mossDeep transition-colors disabled:opacity-40"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? "Đang lưu..." : "Lưu Bài Tập"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {exerciseToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setExerciseToDelete(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={28} className="text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-brand-moss mb-2">Xóa bài tập?</h2>
              <p className="text-sm text-brand-moss/60 leading-relaxed">
                Bạn có chắc chắn muốn xóa bài tập <strong>"{exerciseToDelete.name}"</strong> khỏi thư viện?
              </p>
              <p className="text-xs text-red-500 font-semibold mt-3 italic bg-red-50 py-2 px-3 rounded-lg border border-red-100">
                Lưu ý: Không thể xóa nếu bài tập này đang được sử dụng trong giáo án của bất kỳ học viên nào.
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setExerciseToDelete(null)} className="flex-1 py-3 rounded-xl font-bold text-sm bg-brand-paper text-brand-moss hover:bg-brand-line transition-colors">
                Hủy
              </button>
              <button onClick={executeDelete} disabled={saving} className="flex-1 py-3 rounded-xl font-bold text-sm bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                {saving ? "Đang xóa..." : "Xóa bài tập"}
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
