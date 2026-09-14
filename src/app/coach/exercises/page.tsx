"use client";
import { useState, useEffect } from "react";
import { Users, BookOpen, Dumbbell, Settings, Search, Plus, LogOut, Loader2, Edit2, Trash2, X, Save, PlayCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ExerciseLibrary() {
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEx, setEditingEx] = useState<any>(null);
  const [form, setForm] = useState({ name: "", youtube_id: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('name', { ascending: true });
      
    if (data) {
      setExercises(data);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const openModal = (ex: any = null) => {
    if (ex) {
      setEditingEx(ex);
      setForm({ name: ex.name, youtube_id: ex.youtube_id || "" });
    } else {
      setEditingEx(null);
      setForm({ name: "", youtube_id: "" });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEx(null);
  };

  const saveExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    
    setSaving(true);
    try {
      if (editingEx) {
        // Update
        await supabase
          .from('exercises')
          .update({ name: form.name, youtube_id: form.youtube_id })
          .eq('id', editingEx.id);
      } else {
        // Insert
        await supabase
          .from('exercises')
          .insert([{ name: form.name, youtube_id: form.youtube_id }]);
      }
      await fetchExercises();
      closeModal();
    } catch (err) {
      console.error(err);
      alert("Đã có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  };

  const deleteExercise = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xoá bài tập này?")) return;
    
    try {
      await supabase.from('exercises').delete().eq('id', id);
      setExercises(exercises.filter(ex => ex.id !== id));
    } catch (err) {
      console.error(err);
      alert("Đã có lỗi xảy ra");
    }
  };

  const filteredExercises = exercises.filter(ex => 
    ex.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-brand-paper/50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-brand-mossDeep text-brand-sage hidden md:flex flex-col shadow-2xl z-10">
        <div className="p-6 border-b border-brand-sage/10">
          <div className="inline-flex items-center px-3 py-1.5 border border-brand-sand/80 rounded-md shadow-sm mb-2">
            <span className="text-brand-sand text-[12px] font-bold uppercase tracking-[0.15em]">
              CK Coaching
            </span>
          </div>
          <p className="text-[11px] font-semibold opacity-60 uppercase tracking-widest text-brand-sage">Trang Quản Trị</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <a href="/coach" className="flex items-center space-x-3 text-brand-sage/70 hover:text-white hover:bg-brand-moss/30 px-4 py-3 rounded-xl transition-all">
            <Users size={20} />
            <span>Khách hàng</span>
          </a>
          <a href="#" className="flex items-center space-x-3 text-brand-sage/70 hover:text-white hover:bg-brand-moss/30 px-4 py-3 rounded-xl transition-all">
            <BookOpen size={20} />
            <span>Giáo án mẫu</span>
          </a>
          <a href="/coach/exercises" className="flex items-center space-x-3 bg-brand-moss text-white px-4 py-3 rounded-xl font-bold shadow-md">
            <Dumbbell size={20} />
            <span>Kho bài tập</span>
          </a>
        </nav>

        <div className="p-4 border-t border-brand-sage/10">
          <a href="#" className="flex items-center space-x-3 text-brand-sage/70 hover:text-white px-4 py-2 mb-2 transition-all">
            <Settings size={20} />
            <span>Cài đặt</span>
          </a>
          <button onClick={handleLogout} className="flex w-full items-center space-x-3 text-brand-sage/70 hover:text-red-400 px-4 py-2 transition-colors">
            <LogOut size={20} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full">
        <header className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-brand-moss">Kho bài tập</h1>
            <p className="text-sm text-brand-moss/60 mt-1">Quản lý thư viện bài tập và video hướng dẫn</p>
          </div>
          <button 
            onClick={() => openModal()}
            className="bg-brand-sand text-brand-mossDeep px-6 py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-[#ebd8b7] transition-all shadow-md"
          >
            <Plus size={20} />
            <span>Thêm Bài Tập</span>
          </button>
        </header>

        {/* Tìm kiếm */}
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-brand-line flex items-center mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-moss/40" size={20} />
            <input 
              type="text" 
              placeholder="Tìm kiếm bài tập..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-transparent border-none focus:outline-none focus:ring-0 text-brand-moss font-medium placeholder:font-normal"
            />
          </div>
        </div>

        {/* Danh sách Bài tập */}
        <div className="bg-white rounded-2xl shadow-sm border border-brand-line overflow-hidden">
          {loading ? (
            <div className="p-10 flex justify-center items-center text-brand-moss/60">
              <Loader2 className="animate-spin mr-2" size={24}/> Đang tải...
            </div>
          ) : filteredExercises.length === 0 ? (
            <div className="p-10 text-center text-brand-moss/60 border-dashed">
              Không tìm thấy bài tập nào.
            </div>
          ) : (
            <div className="divide-y divide-brand-line">
              {filteredExercises.map(ex => (
                <div key={ex.id} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-brand-paper/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-paper rounded-xl flex items-center justify-center text-brand-moss/40 border border-brand-line">
                      <Dumbbell size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-brand-moss text-lg">{ex.name}</h3>
                      {ex.youtube_id ? (
                        <a 
                          href={`https://youtube.com/watch?v=${ex.youtube_id}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-1 text-xs font-semibold text-brand-moss/50 hover:text-brand-moss mt-1 transition-colors"
                        >
                          <PlayCircle size={14} /> Video Hướng Dẫn
                        </a>
                      ) : (
                        <p className="text-xs text-brand-moss/40 mt-1 italic">Chưa có video</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 self-start md:self-auto">
                    <button 
                      onClick={() => openModal(ex)}
                      className="p-2 text-brand-moss/60 hover:text-brand-moss hover:bg-brand-sand/30 rounded-lg transition-colors"
                      title="Sửa"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => deleteExercise(ex.id)}
                      className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Xoá"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal Thêm/Sửa */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-brand-line">
              <h2 className="text-xl font-bold text-brand-moss">
                {editingEx ? "Sửa bài tập" : "Thêm bài tập mới"}
              </h2>
              <button onClick={closeModal} className="text-brand-moss/40 hover:text-brand-moss">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={saveExercise} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-brand-moss/60 uppercase tracking-wider mb-2">
                    Tên bài tập *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                    className="w-full border border-brand-line rounded-xl px-4 py-3 focus:outline-none focus:ring-2 ring-brand-moss/20 transition-all font-medium text-brand-moss"
                    placeholder="VD: Barbell Bench Press"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-brand-moss/60 uppercase tracking-wider mb-2">
                    Youtube ID (Tuỳ chọn)
                  </label>
                  <input
                    type="text"
                    value={form.youtube_id}
                    onChange={e => setForm({...form, youtube_id: e.target.value})}
                    className="w-full border border-brand-line rounded-xl px-4 py-3 focus:outline-none focus:ring-2 ring-brand-moss/20 transition-all font-medium text-brand-moss"
                    placeholder="VD: dQw4w9WgXcQ"
                  />
                  <p className="text-[11px] text-brand-moss/40 mt-1.5">
                    Ví dụ link youtube.com/watch?v=<strong className="text-brand-moss/70">rxD321l2svE</strong> thì ID là <strong className="text-brand-moss/70">rxD321l2svE</strong>.
                  </p>
                </div>
              </div>
              
              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-brand-moss border border-brand-line hover:bg-brand-paper transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-brand-mossDeep bg-brand-sand hover:bg-[#ebd8b7] transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
