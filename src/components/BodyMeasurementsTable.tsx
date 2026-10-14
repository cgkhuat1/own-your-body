"use client";

import { useState } from "react";
import { 
  MEASUREMENT_FIELDS, 
  getMeasurementSummary, 
  normalizeMeasurements, 
  formatDiffDisplay,
  WeeklyMeasurements,
  MeasurementKey
} from "@/lib/measurements";
import { Ruler, Plus, Pencil, Check, X, Loader2, Calendar, ChevronRight, TrendingUp, BarChart2, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface BodyMeasurementsTableProps {
  clientId: string;
  initialMeasurements?: any;
  coachingDurationWeeks?: number;
  initialTargetWeek?: number;
  isCoachView?: boolean;
  onMeasurementsUpdated?: (newMeasurements: WeeklyMeasurements) => void;
}

export default function BodyMeasurementsTable({
  clientId,
  initialMeasurements,
  coachingDurationWeeks = 12,
  initialTargetWeek = 1,
  isCoachView = false,
  onMeasurementsUpdated
}: BodyMeasurementsTableProps) {
  const [measurements, setMeasurements] = useState<WeeklyMeasurements>(() => 
    normalizeMeasurements(initialMeasurements)
  );
  const [showInputForm, setShowInputForm] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number>(initialTargetWeek || 1);
  const [formData, setFormData] = useState<Record<string, string>>({
    chest: '',
    waist: '',
    belly: '',
    hips: '',
    thigh: '',
    arm: ''
  });
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'summary' | 'all_weeks'>('summary');

  const summary = getMeasurementSummary(measurements);

  // Generate odd weeks for selection: 1, 3, 5, 7, 9, 11...
  const availableWeeks = Array.from(
    { length: Math.ceil(coachingDurationWeeks / 2) },
    (_, i) => i * 2 + 1
  );

  const openFormForWeek = (weekNum: number) => {
    setSelectedWeek(weekNum);
    const existing = measurements[weekNum] || {};
    setFormData({
      chest: existing.chest ? String(existing.chest) : '',
      waist: existing.waist ? String(existing.waist) : '',
      belly: existing.belly ? String(existing.belly) : '',
      hips: existing.hips ? String(existing.hips) : '',
      thigh: existing.thigh ? String(existing.thigh) : '',
      arm: existing.arm ? String(existing.arm) : ''
    });
    setShowInputForm(true);
  };

  const handleSave = async () => {
    if (!clientId) return;
    setSaving(true);

    try {
      const updatedWeekData = {
        chest: formData.chest ? parseFloat(formData.chest) : '',
        waist: formData.waist ? parseFloat(formData.waist) : '',
        belly: formData.belly ? parseFloat(formData.belly) : '',
        hips: formData.hips ? parseFloat(formData.hips) : '',
        thigh: formData.thigh ? parseFloat(formData.thigh) : '',
        arm: formData.arm ? parseFloat(formData.arm) : '',
        date: new Date().toISOString()
      };

      const newMeasurements: WeeklyMeasurements = {
        ...measurements,
        [selectedWeek]: updatedWeekData
      };

      // Save to client_profiles.measurements (Note: client_profiles does not have updated_at in OYB)
      const { error } = await supabase
        .from('client_profiles')
        .upsert({
          id: clientId,
          measurements: newMeasurements
        }, { onConflict: 'id' });

      if (error) {
        alert("Lỗi khi lưu số đo: " + error.message);
      } else {
        setMeasurements(newMeasurements);
        setShowInputForm(false);
        if (onMeasurementsUpdated) {
          onMeasurementsUpdated(newMeasurements);
        }
      }
    } catch (e: any) {
      console.error(e);
      alert("Lỗi: " + (e.message || "Không thể lưu số đo"));
    } finally {
      setSaving(false);
    }
  };

  const hasData = summary.weeks.length > 0;

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-moss/10 text-brand-moss flex items-center justify-center">
            <Ruler size={18} />
          </div>
          <div>
            <h3 className="font-bold text-brand-moss text-lg flex items-center gap-2">
              Số đo các vòng (cm)
            </h3>
            <p className="text-xs text-brand-moss/60 font-medium">Chu kỳ đo mỗi 2 tuần (Tuần 1, 3, 5, 7...)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasData && (
            <div className="inline-flex p-1 bg-brand-paper rounded-xl border border-brand-line text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode('summary')}
                className={`px-3 py-1 rounded-lg transition-all ${viewMode === 'summary' ? 'bg-white text-brand-moss shadow-sm' : 'text-brand-moss/60 hover:text-brand-moss'}`}
              >
                Tóm tắt
              </button>
              <button
                type="button"
                onClick={() => setViewMode('all_weeks')}
                className={`px-3 py-1 rounded-lg transition-all ${viewMode === 'all_weeks' ? 'bg-white text-brand-moss shadow-sm' : 'text-brand-moss/60 hover:text-brand-moss'}`}
              >
                Tất cả tuần
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => openFormForWeek(initialTargetWeek || 1)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-moss text-white rounded-xl text-xs font-bold hover:bg-brand-mossDeep shadow-sm transition-colors"
          >
            <Plus size={14} /> Nhập số đo
          </button>
        </div>
      </div>

      {/* Input Form Modal / Collapsible */}
      {showInputForm && (
        <div className="bg-brand-paper/60 p-4 rounded-2xl border border-brand-line/80 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-brand-line/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-brand-moss/70">Mốc đo:</span>
              <select
                value={selectedWeek}
                onChange={(e) => {
                  const w = Number(e.target.value);
                  setSelectedWeek(w);
                  const existing = measurements[w] || {};
                  setFormData({
                    chest: existing.chest ? String(existing.chest) : '',
                    waist: existing.waist ? String(existing.waist) : '',
                    belly: existing.belly ? String(existing.belly) : '',
                    hips: existing.hips ? String(existing.hips) : '',
                    thigh: existing.thigh ? String(existing.thigh) : '',
                    arm: existing.arm ? String(existing.arm) : ''
                  });
                }}
                className="bg-white border border-brand-line rounded-lg px-2.5 py-1 text-xs font-bold text-brand-moss outline-none focus:ring-2 focus:ring-brand-sand/50"
              >
                {availableWeeks.map(w => (
                  <option key={w} value={w}>
                    {w === 1 ? 'Tuần 1 (Đầu vào / Baseline)' : `Tuần ${w}`}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowInputForm(false)}
              className="text-brand-moss/50 hover:text-brand-moss p-1"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {MEASUREMENT_FIELDS.map(f => (
              <div key={f.key} className="bg-white p-2.5 rounded-xl border border-brand-line/50">
                <label className="block text-[11px] font-bold text-brand-moss/70 mb-1">
                  {f.label}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    value={formData[f.key] || ''}
                    onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
                    className="w-full pr-7 pl-2 py-1.5 text-sm font-bold text-brand-moss outline-none border border-transparent focus:border-brand-sand rounded-lg bg-brand-paper/40"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-brand-moss/40">
                    cm
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowInputForm(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-brand-moss/70 hover:bg-brand-paper transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-brand-moss text-white hover:bg-brand-mossDeep transition-colors shadow-sm disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Lưu số đo
            </button>
          </div>
        </div>
      )}

      {/* Main Table Display */}
      {!hasData && !showInputForm ? (
        <div className="p-8 text-center bg-brand-paper/40 rounded-2xl border border-dashed border-brand-line space-y-2">
          <p className="text-sm font-bold text-brand-moss/60">Chưa có dữ liệu số đo nào</p>
          <p className="text-xs text-brand-moss/40">Hãy bấm "Nhập số đo" để cập nhật số đo Tuần 1 (Đầu vào).</p>
        </div>
      ) : viewMode === 'summary' ? (
        /* Summary Mode: 4 focused columns with high-contrast typography, fully fitting mobile screens */
        <div className="overflow-x-auto rounded-2xl border border-brand-line shadow-sm bg-white">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-brand-mossDeep text-brand-sage text-[11px] uppercase tracking-wider font-bold">
                <th className="py-3 px-2 sticky left-0 z-10 bg-brand-mossDeep w-[58px] shadow-[1px_0_0_0_rgba(255,255,255,0.1)]">
                  Vòng
                </th>
                <th className="py-3 px-2 text-center">
                  <div>Tiến độ</div>
                  {summary.baselineWeek && summary.latestWeek && summary.baselineWeek !== summary.latestWeek ? (
                    <div className="text-[10px] font-medium text-brand-sage/75 normal-case tracking-normal">
                      T{summary.baselineWeek} ➔ T{summary.latestWeek}
                    </div>
                  ) : summary.latestWeek ? (
                    <div className="text-[10px] font-medium text-brand-sage/75 normal-case tracking-normal">
                      Tuần {summary.latestWeek}
                    </div>
                  ) : null}
                </th>
                <th className="py-3 px-1.5 text-center w-[85px]">
                  <div className="inline-flex items-center justify-center gap-1">
                    <TrendingUp size={13} className="text-brand-sand shrink-0" />
                    <span>Lần trước</span>
                  </div>
                </th>
                <th className="py-3 px-1.5 text-center w-[85px]">
                  <div className="inline-flex items-center justify-center gap-1">
                    <BarChart2 size={13} className="text-brand-sand shrink-0" />
                    <span>Tổng đổi</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-line/50">
              {summary.rows.map(row => {
                const diffPrevFmt = formatDiffDisplay(
                  row.diffPrev,
                  row.field.key === 'waist' || row.field.key === 'belly'
                );
                const diffBaselineFmt = formatDiffDisplay(
                  row.diffBaseline,
                  row.field.key === 'waist' || row.field.key === 'belly'
                );

                return (
                  <tr key={row.field.key} className="hover:bg-brand-paper/30 transition-colors">
                    {/* Sticky Vòng Name */}
                    <td className="py-2.5 px-2 font-bold text-sm text-brand-moss sticky left-0 z-10 bg-white shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                      {row.field.key === 'arm' ? (
                        <div className="leading-tight">
                          <span>Bắp</span>
                          <br />
                          <span>tay</span>
                        </div>
                      ) : (
                        <span>{row.field.label}</span>
                      )}
                    </td>

                    {/* Progress (Baseline -> Latest) */}
                    <td className="py-3 px-2 text-center whitespace-nowrap">
                      {row.latestVal === null ? (
                        <span className="text-brand-moss/40 text-xs font-semibold">--</span>
                      ) : row.baselineVal !== null && summary.baselineWeek !== summary.latestWeek ? (
                        <div className="inline-flex items-center justify-center gap-1">
                          <span className="text-xs font-semibold text-brand-moss/60">{row.baselineVal}</span>
                          <ArrowRight size={11} className="text-brand-moss/40 shrink-0" />
                          <span className="text-sm font-black text-brand-moss">{row.latestVal}</span>
                          <span className="text-[10px] font-medium text-brand-moss/50">cm</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center justify-center gap-1">
                          <span className="text-sm font-black text-brand-moss">{row.latestVal}</span>
                          <span className="text-[10px] font-medium text-brand-moss/50">cm</span>
                        </div>
                      )}
                    </td>

                    {/* Diff vs Previous */}
                    <td className="py-2.5 px-1.5 text-center whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold ${diffPrevFmt.color} ${diffPrevFmt.bg}`}>
                        {diffPrevFmt.text}
                      </span>
                    </td>

                    {/* Diff vs Baseline */}
                    <td className="py-2.5 px-1.5 text-center whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold ${diffBaselineFmt.color} ${diffBaselineFmt.bg}`}>
                        {diffBaselineFmt.text}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* All Weeks Mode: Scrollable across every recorded week */
        <div className="overflow-x-auto rounded-2xl border border-brand-line shadow-sm bg-white">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-brand-mossDeep text-brand-sage text-[11px] uppercase tracking-wider font-bold">
                <th className="py-3 px-2 sticky left-0 z-10 bg-brand-mossDeep min-w-[58px] shadow-[1px_0_0_0_rgba(255,255,255,0.1)]">
                  Vòng
                </th>
                {availableWeeks.map(w => (
                  <th key={w} className="py-3 px-3 text-center min-w-[70px]">
                    <div className="flex items-center justify-center gap-1">
                      <span>T{w}</span>
                      <button
                        type="button"
                        onClick={() => openFormForWeek(w)}
                        title={`Sửa số đo Tuần ${w}`}
                        className="text-brand-sage/60 hover:text-white"
                      >
                        <Pencil size={11} />
                      </button>
                    </div>
                  </th>
                ))}
                <th className="py-3 px-3 text-center min-w-[95px] bg-white/5">
                  <div className="inline-flex items-center justify-center gap-1">
                    <BarChart2 size={13} className="text-brand-sand shrink-0" />
                    <span>Tổng đổi</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-line/50">
              {summary.rows.map(row => {
                const diffBaselineFmt = formatDiffDisplay(
                  row.diffBaseline,
                  row.field.key === 'waist' || row.field.key === 'belly'
                );

                return (
                  <tr key={row.field.key} className="hover:bg-brand-paper/30 transition-colors">
                    <td className="py-2.5 px-2 font-bold text-sm text-brand-moss sticky left-0 z-10 bg-white shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                      {row.field.key === 'arm' ? (
                        <div className="leading-tight">
                          <span>Bắp</span>
                          <br />
                          <span>tay</span>
                        </div>
                      ) : (
                        <span>{row.field.label}</span>
                      )}
                    </td>

                    {availableWeeks.map(w => {
                      const val = measurements[w]?.[row.field.key as keyof typeof measurements[number]];
                      const isFilled = val !== undefined && val !== null && val !== '';
                      return (
                        <td key={w} className="py-3 px-3 text-center font-semibold text-brand-moss/80 whitespace-nowrap">
                          {isFilled ? `${val}` : <span className="text-gray-300">-</span>}
                        </td>
                      );
                    })}

                    <td className="py-2.5 px-3 text-center whitespace-nowrap bg-brand-sand/5">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold ${diffBaselineFmt.color} ${diffBaselineFmt.bg}`}>
                        {diffBaselineFmt.text}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
