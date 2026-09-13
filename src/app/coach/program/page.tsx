"use client";
import { ArrowLeft, Save, Copy, Plus } from "lucide-react";

export default function ProgramBuilder() {
  return (
    <div className="min-h-screen bg-brand-paper p-6 md:p-10">
      <header className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <a href="/coach" className="text-brand-moss/60 hover:text-brand-moss flex items-center gap-2 text-sm font-semibold mb-4 transition-colors">
            <ArrowLeft size={16} /> Quay lại
          </a>
          <h1 className="text-3xl font-bold text-brand-moss">Chi tiết Giáo án & Tiến độ</h1>
          <p className="text-brand-moss/70 mt-1">Học viên: <span className="font-bold text-brand-moss">Tuấn Anh</span> • Phase 1 (Tuần 1-4)</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2.5 bg-white border border-brand-line rounded-xl font-bold text-brand-moss flex items-center gap-2 hover:bg-brand-sand/30 transition-all shadow-sm">
            <Copy size={18} /> Nhân bản Block
          </button>
          <button className="px-6 py-2.5 bg-brand-moss text-white rounded-xl font-bold flex items-center gap-2 hover:bg-brand-mossDeep transition-all shadow-md">
            <Save size={18} /> Lưu Giáo Án
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto bg-white rounded-2xl shadow-sm border border-brand-line overflow-hidden overflow-x-auto">
        {/* Table Header */}
        <div className="grid grid-cols-[250px_1fr_1fr_1fr_1fr] min-w-[1000px] bg-brand-mossDeep text-brand-sage font-bold text-sm">
          <div className="p-4 border-r border-brand-sage/20 flex items-center">Bài tập (Buổi 1: Thân Trên)</div>
          <div className="p-4 border-r border-brand-sage/20 text-center">Tuần 1</div>
          <div className="p-4 border-r border-brand-sage/20 bg-brand-sage/20 text-white text-center relative">
            <span className="absolute top-0 left-0 w-full h-1 bg-brand-warn"></span>
            Tuần 2 (Hiện tại)
          </div>
          <div className="p-4 border-r border-brand-sage/20 text-center">Tuần 3</div>
          <div className="p-4 text-center">Tuần 4 (Deload)</div>
        </div>

        {/* Row 1: Bench Press */}
        <div className="grid grid-cols-[250px_1fr_1fr_1fr_1fr] min-w-[1000px] border-b border-brand-line group hover:bg-brand-paper/20 transition-colors">
          {/* Exercise Info */}
          <div className="p-4 border-r border-brand-line bg-brand-paper/40">
            <p className="font-bold text-brand-moss">1. Barbell Bench Press</p>
            <p className="text-xs font-semibold text-brand-moss/60 mt-1">Target: 3 Sets</p>
          </div>

          {/* Week 1: Past (Đã tập) */}
          <div className="p-4 border-r border-brand-line flex flex-col gap-2">
            <div className="bg-brand-paper/50 p-2.5 rounded-lg border border-brand-line/50">
              <p className="text-[10px] font-bold text-brand-moss/50 uppercase tracking-wider mb-0.5">Mục tiêu (Giao)</p>
              <p className="text-sm font-bold text-brand-moss/70">8-10 reps @ RPE 7</p>
            </div>
            {/* Lịch sử tập thực tế chi tiết từng Set */}
            <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">✅ Thực tế tập</p>
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-black text-emerald-900 bg-emerald-100/50 px-2 py-1 rounded">
                  <span className="text-emerald-700 font-semibold w-5">#1</span>
                  <span>60kg x 8</span>
                  <span className="text-emerald-600 text-[10px]">@8</span>
                </div>
                <div className="flex justify-between items-center text-xs font-black text-emerald-900 bg-emerald-100/50 px-2 py-1 rounded">
                  <span className="text-emerald-700 font-semibold w-5">#2</span>
                  <span>70kg x 6</span>
                  <span className="text-emerald-600 text-[10px]">@9</span>
                </div>
                <div className="flex justify-between items-center text-xs font-black text-emerald-900 bg-emerald-100/50 px-2 py-1 rounded">
                  <span className="text-emerald-700 font-semibold w-5">#3</span>
                  <span>60kg x 8</span>
                  <span className="text-emerald-600 text-[10px]">@9</span>
                </div>
              </div>
            </div>
          </div>

          {/* Week 2: Current (Đang sửa) */}
          <div className="p-4 border-r border-brand-line flex flex-col gap-2 bg-brand-sand/5">
            <div className="bg-white p-2.5 rounded-lg border border-brand-sand shadow-sm focus-within:ring-2 ring-brand-moss/20 transition-all">
              <p className="text-[10px] font-bold text-brand-moss/70 uppercase tracking-wider mb-0.5">Mục tiêu (Giao)</p>
              <input type="text" defaultValue="8-10 reps @ RPE 8" className="w-full text-sm font-bold text-brand-moss border-none focus:ring-0 p-0 bg-transparent" />
            </div>
            {/* Khách chưa tập */}
            <div className="bg-gray-50/50 p-2.5 rounded-lg border border-gray-200 border-dashed text-gray-400">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5">Thực tế tập</p>
              <p className="text-sm italic font-medium">Chưa tập...</p>
            </div>
          </div>

          {/* Week 3: Future */}
          <div className="p-4 border-r border-brand-line flex flex-col gap-2">
            <div className="bg-white p-2.5 rounded-lg border border-brand-line hover:border-brand-sand transition-colors">
              <p className="text-[10px] font-bold text-brand-moss/50 uppercase tracking-wider mb-0.5">Mục tiêu (Giao)</p>
              <input type="text" defaultValue="8-10 reps @ RPE 9" className="w-full text-sm font-bold text-brand-moss border-none focus:ring-0 p-0 bg-transparent" />
            </div>
          </div>

          {/* Week 4: Future */}
          <div className="p-4 flex flex-col gap-2">
            <div className="bg-white p-2.5 rounded-lg border border-brand-line hover:border-brand-sand transition-colors">
              <p className="text-[10px] font-bold text-brand-moss/50 uppercase tracking-wider mb-0.5">Mục tiêu (Giao)</p>
              <input type="text" defaultValue="10-12 reps @ RPE 6" className="w-full text-sm font-bold text-brand-moss border-none focus:ring-0 p-0 bg-transparent" />
            </div>
          </div>
        </div>

        {/* Row 2: Incline Dumbbell Press */}
        <div className="grid grid-cols-[250px_1fr_1fr_1fr_1fr] min-w-[1000px] border-b border-brand-line group hover:bg-brand-paper/20 transition-colors">
          <div className="p-4 border-r border-brand-line bg-brand-paper/40">
            <p className="font-bold text-brand-moss">2. Incline DB Press</p>
            <p className="text-xs font-semibold text-brand-moss/60 mt-1">Target: 3 Sets</p>
          </div>

          <div className="p-4 border-r border-brand-line flex flex-col gap-2">
            <div className="bg-brand-paper/50 p-2.5 rounded-lg border border-brand-line/50">
              <p className="text-[10px] font-bold text-brand-moss/50 uppercase tracking-wider mb-0.5">Mục tiêu (Giao)</p>
              <p className="text-sm font-bold text-brand-moss/70">10-12 reps @ RPE 7</p>
            </div>
            {/* Lịch sử tập thực tế chi tiết từng Set */}
            <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">✅ Thực tế tập</p>
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-black text-emerald-900 bg-emerald-100/50 px-2 py-1 rounded">
                  <span className="text-emerald-700 font-semibold w-5">#1</span>
                  <span>20kg x 12</span>
                  <span className="text-emerald-600 text-[10px]">@7</span>
                </div>
                <div className="flex justify-between items-center text-xs font-black text-emerald-900 bg-emerald-100/50 px-2 py-1 rounded">
                  <span className="text-emerald-700 font-semibold w-5">#2</span>
                  <span>20kg x 11</span>
                  <span className="text-emerald-600 text-[10px]">@8</span>
                </div>
                <div className="flex justify-between items-center text-xs font-black text-emerald-900 bg-emerald-100/50 px-2 py-1 rounded">
                  <span className="text-emerald-700 font-semibold w-5">#3</span>
                  <span>20kg x 10</span>
                  <span className="text-emerald-600 text-[10px]">@8.5</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-r border-brand-line flex flex-col gap-2 bg-brand-sand/5">
            <div className="bg-white p-2.5 rounded-lg border border-brand-sand shadow-sm focus-within:ring-2 ring-brand-moss/20 transition-all">
              <p className="text-[10px] font-bold text-brand-moss/70 uppercase tracking-wider mb-0.5">Mục tiêu (Giao)</p>
              <input type="text" defaultValue="10-12 reps @ RPE 8" className="w-full text-sm font-bold text-brand-moss border-none focus:ring-0 p-0 bg-transparent" />
            </div>
            <div className="bg-gray-50/50 p-2.5 rounded-lg border border-gray-200 border-dashed text-gray-400">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5">Thực tế tập</p>
              <p className="text-sm italic font-medium">Chưa tập...</p>
            </div>
          </div>

          <div className="p-4 border-r border-brand-line flex flex-col gap-2">
            <div className="bg-white p-2.5 rounded-lg border border-brand-line hover:border-brand-sand transition-colors">
              <p className="text-[10px] font-bold text-brand-moss/50 uppercase tracking-wider mb-0.5">Mục tiêu (Giao)</p>
              <input type="text" defaultValue="10-12 reps @ RPE 9" className="w-full text-sm font-bold text-brand-moss border-none focus:ring-0 p-0 bg-transparent" />
            </div>
          </div>

          <div className="p-4 flex flex-col gap-2">
            <div className="bg-white p-2.5 rounded-lg border border-brand-line hover:border-brand-sand transition-colors">
              <p className="text-[10px] font-bold text-brand-moss/50 uppercase tracking-wider mb-0.5">Mục tiêu (Giao)</p>
              <input type="text" defaultValue="12-15 reps @ RPE 6" className="w-full text-sm font-bold text-brand-moss border-none focus:ring-0 p-0 bg-transparent" />
            </div>
          </div>
        </div>

        {/* Nút thêm bài tập */}
        <div className="p-4 bg-brand-paper/50 border-t border-brand-line">
          <button className="px-4 py-2 text-sm font-bold text-brand-moss bg-white border border-brand-line hover:bg-brand-sand/30 rounded-lg flex items-center gap-2 transition-colors">
            <Plus size={16} /> Thêm bài tập
          </button>
        </div>
      </main>
    </div>
  );
}
