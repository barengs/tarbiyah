import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import { 
    useCopyPeriodScheduleMutation, 
    useCopyAcademicYearScheduleMutation 
} from '../../store/slices/scheduleApi';
import { 
    Copy, Calendar, CalendarSync, Layers, ArrowRight, 
    AlertCircle, CheckCircle2, Loader2, Sparkles, School 
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function CopyScheduleModal({
    open,
    onClose,
    academicYears = [],
    activeYearId,
    quarters = [],
    activeQuarterId,
    educations = [],
    currentEducation = 'all',
    onSuccess,
}) {
    const [tab, setTab] = useState('period'); // 'period' | 'academic_year'

    // Form State Tab 1: Antar Periode
    const [periodSourceYearId, setPeriodSourceYearId] = useState('');
    const [periodEducationId, setPeriodEducationId] = useState('all');
    const [fromQuarterId, setFromQuarterId] = useState('');
    const [toQuarterId, setToQuarterId] = useState('');
    const [periodMode, setPeriodMode] = useState('overwrite'); // 'overwrite' | 'skip_existing'

    // Form State Tab 2: Antar Tahun Akademik
    const [fromAcademicYearId, setFromAcademicYearId] = useState('');
    const [toAcademicYearId, setToAcademicYearId] = useState('');
    const [yearEducationId, setYearEducationId] = useState('all');
    const [yearFromQuarterId, setYearFromQuarterId] = useState('all');
    const [autoCreateGroups, setAutoCreateGroups] = useState(true);
    const [yearMode, setYearMode] = useState('overwrite');

    const [copyPeriodSchedule, { isLoading: isCopyingPeriod }] = useCopyPeriodScheduleMutation();
    const [copyAcademicYearSchedule, { isLoading: isCopyingYear }] = useCopyAcademicYearScheduleMutation();

    // Inisialisasi default values saat modal dibuka
    useEffect(() => {
        if (open) {
            const yrId = activeYearId || academicYears[0]?.id || '';
            setPeriodSourceYearId(yrId);
            setFromAcademicYearId(yrId);

            // Cari target year berikutnya jika ada
            const targetYears = academicYears.filter(y => String(y.id) !== String(yrId));
            setToAcademicYearId(targetYears[0]?.id || '');

            // Pre-fill education jika ada
            if (currentEducation && currentEducation !== 'all') {
                const matchedEdu = educations.find(e => e.name?.toLowerCase() === currentEducation?.toLowerCase());
                setPeriodEducationId(matchedEdu ? String(matchedEdu.id) : 'all');
                setYearEducationId(matchedEdu ? String(matchedEdu.id) : 'all');
            } else {
                setPeriodEducationId('all');
                setYearEducationId('all');
            }

            // Quarters
            const qList = quarters.filter(q => String(q.academic_year_id) === String(yrId));
            if (qList.length > 0) {
                const activeQ = qList.find(q => q.active) || qList[0];
                const fromQId = activeQuarterId || activeQ?.id || qList[0]?.id;
                setFromQuarterId(String(fromQId));
                // Default target quarter: cari quarter berikutnya
                const currentIdx = qList.findIndex(q => String(q.id) === String(fromQId));
                const nextQ = qList[(currentIdx + 1) % qList.length] || qList[0];
                setToQuarterId(String(nextQ?.id));
            }
        }
    }, [open, activeYearId, activeQuarterId, currentEducation, academicYears, quarters, educations]);

    // Daftar Quarter untuk Periode Tab 1
    const periodQuarters = useMemo(() => {
        return quarters.filter(q => String(q.academic_year_id) === String(periodSourceYearId));
    }, [quarters, periodSourceYearId]);

    // Handle Submit Tab 1: Copy Period
    const handleCopyPeriod = async (e) => {
        e.preventDefault();

        if (fromQuarterId === toQuarterId) {
            toast.warning('Periode asal dan periode tujuan tidak boleh sama.');
            return;
        }

        try {
            const payload = {
                academic_year_id: Number(periodSourceYearId),
                from_quarter_id: Number(fromQuarterId),
                to_quarter_id: Number(toQuarterId),
                education_id: periodEducationId === 'all' ? null : Number(periodEducationId),
                mode: periodMode,
            };

            const res = await copyPeriodSchedule(payload).unwrap();
            toast.success(res?.message || 'Jadwal periode berhasil disalin!');
            if (onSuccess) {
                onSuccess({ type: 'period', targetQuarterId: Number(toQuarterId) });
            }
            onClose();
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyalin jadwal periode.');
        }
    };

    // Handle Submit Tab 2: Copy Academic Year
    const handleCopyAcademicYear = async (e) => {
        e.preventDefault();

        if (!toAcademicYearId || fromAcademicYearId === toAcademicYearId) {
            toast.warning('Silakan pilih tahun akademik tujuan yang berbeda.');
            return;
        }

        try {
            const payload = {
                from_academic_year_id: Number(fromAcademicYearId),
                to_academic_year_id: Number(toAcademicYearId),
                education_id: yearEducationId === 'all' ? null : Number(yearEducationId),
                from_quarter_id: yearFromQuarterId === 'all' ? null : Number(yearFromQuarterId),
                auto_create_class_groups: autoCreateGroups,
                mode: yearMode,
            };

            const res = await copyAcademicYearSchedule(payload).unwrap();
            toast.success(res?.message || 'Jadwal ke tahun akademik baru berhasil disalin!');
            if (onSuccess) {
                onSuccess({ type: 'year', targetYearId: Number(toAcademicYearId) });
            }
            onClose();
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyalin jadwal ke tahun akademik baru.');
        }
    };

    const fromQuarterObj = quarters.find(q => String(q.id) === String(fromQuarterId));
    const toQuarterObj = quarters.find(q => String(q.id) === String(toQuarterId));
    const selectedEduObj = educations.find(e => String(e.id) === String(periodEducationId));

    const fromYearObj = academicYears.find(y => String(y.id) === String(fromAcademicYearId));
    const toYearObj = academicYears.find(y => String(y.id) === String(toAcademicYearId));

    return (
        <Modal
            open={open}
            title={
                <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-md bg-emerald-100 text-emerald-800">
                        <Copy className="w-4 h-4" />
                    </span>
                    <span>Salin Matriks Jadwal Pelajaran (KBM)</span>
                </div>
            }
            onClose={onClose}
            maxWidth="max-w-2xl"
        >
            <div className="space-y-5">
                {/* ═══════════════════════════════════════════════════════════
                    TAB NAVIGATION (PERIODE VS TAHUN AKADEMIK)
                    ═══════════════════════════════════════════════════════════ */}
                <div className="flex border-b border-slate-200">
                    <button
                        type="button"
                        onClick={() => setTab('period')}
                        className={`flex-1 py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition ${
                            tab === 'period'
                                ? 'border-[#093c30] text-[#093c30] bg-emerald-50/50'
                                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                        }`}
                    >
                        <Layers className="w-4 h-4" />
                        <span>Salin Antar Periode (Caturwulan)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab('academic_year')}
                        className={`flex-1 py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition ${
                            tab === 'academic_year'
                                ? 'border-[#093c30] text-[#093c30] bg-emerald-50/50'
                                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                        }`}
                    >
                        <CalendarSync className="w-4 h-4" />
                        <span>Salin ke Tahun Akademik Baru</span>
                    </button>
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    TAB 1: COPY JADWAL ANTAR PERIODE (CATURWULAN / TRIWULAN)
                    ═══════════════════════════════════════════════════════════ */}
                {tab === 'period' && (
                    <form onSubmit={handleCopyPeriod} className="space-y-4">
                        <div className="p-3 bg-slate-50 rounded-md border border-slate-200 text-xs text-slate-600">
                            Salin susunan jadwal satu jenjang pendidikan (misal: <b>Ula Caturwulan 1</b> disalin ke <b>Ula Caturwulan 2</b>) 
                            atau seluruh jenjang sekaligus dalam satu periode triwulan.
                        </div>

                        {/* Pilihan Jenjang Pendidikan */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Jenjang Pendidikan
                            </label>
                            <select
                                value={periodEducationId}
                                onChange={(e) => setPeriodEducationId(e.target.value)}
                                className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            >
                                <option value="all">Semua Jenjang Pendidikan (Seluruh Rombel)</option>
                                {educations.map((edu) => (
                                    <option key={edu.id} value={edu.id}>
                                        Jenjang {edu.name} ({edu.description || 'Pendidikan'})
                                    </option>
                                ))}
                            </select>
                            <p className="text-[11px] text-slate-500 mt-1">
                                Pilih jenjang spesifik (seperti <b>Ula</b>) untuk hanya menyalin jadwal kelas-kelas di jenjang tersebut.
                            </p>
                        </div>

                        {/* Periode Asal -> Periode Tujuan */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-slate-50 p-3 rounded-md border border-slate-200">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                                    Dari Periode (Sumber)
                                </label>
                                <select
                                    value={fromQuarterId}
                                    onChange={(e) => setFromQuarterId(e.target.value)}
                                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded bg-white text-slate-800"
                                >
                                    {periodQuarters.map((q) => (
                                        <option key={q.id} value={q.id}>
                                            {q.name} {q.active ? '• (Aktif)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                                    Ke Periode (Tujuan)
                                </label>
                                <select
                                    value={toQuarterId}
                                    onChange={(e) => setToQuarterId(e.target.value)}
                                    className="w-full px-3 py-2 text-xs font-bold border border-emerald-400 rounded bg-white text-emerald-950 ring-1 ring-emerald-200"
                                >
                                    {periodQuarters.map((q) => (
                                        <option key={q.id} value={q.id}>
                                            {q.name} {q.active ? '• (Aktif)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {fromQuarterId === toQuarterId && (
                            <div className="flex items-center gap-2 p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>Periode asal dan tujuan harus berbeda.</span>
                            </div>
                        )}

                        {/* Opsi Penimpaan */}
                        <div className="space-y-2 pt-1">
                            <label className="block text-xs font-bold text-slate-700">
                                Opsi Penimpaan Jadwal:
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <label className={`flex items-start gap-2 p-2.5 rounded border cursor-pointer transition ${
                                    periodMode === 'overwrite'
                                        ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 font-semibold'
                                        : 'bg-white border-slate-200 text-slate-600'
                                }`}>
                                    <input
                                        type="radio"
                                        name="periodMode"
                                        value="overwrite"
                                        checked={periodMode === 'overwrite'}
                                        onChange={() => setPeriodMode('overwrite')}
                                        className="mt-0.5 text-emerald-600"
                                    />
                                    <div>
                                        <span className="font-bold">Timpa Jadwal (Overwrite)</span>
                                        <p className="text-[11px] text-slate-500 font-normal">Perbarui jadwal jika rombel sudah memiliki jam di periode tujuan.</p>
                                    </div>
                                </label>

                                <label className={`flex items-start gap-2 p-2.5 rounded border cursor-pointer transition ${
                                    periodMode === 'skip_existing'
                                        ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 font-semibold'
                                        : 'bg-white border-slate-200 text-slate-600'
                                }`}>
                                    <input
                                        type="radio"
                                        name="periodMode"
                                        value="skip_existing"
                                        checked={periodMode === 'skip_existing'}
                                        onChange={() => setPeriodMode('skip_existing')}
                                        className="mt-0.5 text-emerald-600"
                                    />
                                    <div>
                                        <span className="font-bold">Lewati Jika Sudah Ada</span>
                                        <p className="text-[11px] text-slate-500 font-normal">Hanya isi jam-jam yang masih kosong di periode tujuan.</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Ringkasan Aksi */}
                        <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-md text-xs text-emerald-950 flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                                <b>Ringkasan Aksi:</b> Jadwal untuk{' '}
                                <span className="font-bold underline">
                                    {selectedEduObj ? `Jenjang ${selectedEduObj.name}` : 'Semua Jenjang'}
                                </span>{' '}
                                akan diduplikasi dari <b>{fromQuarterObj?.name || 'Periode Asal'}</b> menuju{' '}
                                <b>{toQuarterObj?.name || 'Periode Tujuan'}</b>.
                            </div>
                        </div>

                        {/* Tombol Aksi */}
                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={isCopyingPeriod || fromQuarterId === toQuarterId}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#093c30] hover:bg-[#064e3b] text-white text-xs font-bold rounded shadow-xs transition disabled:opacity-50"
                            >
                                {isCopyingPeriod ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" /> Menyalin Jadwal...
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4" /> Mulai Salin Jadwal Periode
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    TAB 2: COPY JADWAL KE TAHUN AKADEMIK BERIKUTNYA
                    ═══════════════════════════════════════════════════════════ */}
                {tab === 'academic_year' && (
                    <form onSubmit={handleCopyAcademicYear} className="space-y-4">
                        <div className="p-3 bg-slate-50 rounded-md border border-slate-200 text-xs text-slate-600">
                            Salin susunan jadwal pelajaran dari tahun akademik aktif ke tahun akademik berikutnya.
                            Sistem secara otomatis akan membuat rombel dan periode triwulan di tahun tujuan jika belum tersedia.
                        </div>

                        {/* Pilihan Tahun Asal & Tahun Tujuan */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-slate-50 p-3 rounded-md border border-slate-200">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                                    Dari Tahun Akademik
                                </label>
                                <select
                                    value={fromAcademicYearId}
                                    onChange={(e) => setFromAcademicYearId(e.target.value)}
                                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded bg-white text-slate-800"
                                >
                                    {academicYears.map((y) => (
                                        <option key={y.id} value={y.id}>
                                            Tahun {y.year} {y.active ? '• (Aktif)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                                    Ke Tahun Akademik (Tujuan)
                                </label>
                                <select
                                    value={toAcademicYearId}
                                    onChange={(e) => setToAcademicYearId(e.target.value)}
                                    className="w-full px-3 py-2 text-xs font-bold border border-emerald-400 rounded bg-white text-emerald-950 ring-1 ring-emerald-200"
                                >
                                    <option value="">-- Pilih Tahun Akademik Tujuan --</option>
                                    {academicYears
                                        .filter(y => String(y.id) !== String(fromAcademicYearId))
                                        .map((y) => (
                                            <option key={y.id} value={y.id}>
                                                Tahun {y.year} {y.active ? '• (Aktif)' : ''}
                                            </option>
                                        ))}
                                </select>
                            </div>
                        </div>

                        {academicYears.length <= 1 && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                                <div>
                                    Hanya terdapat 1 tahun akademik di database. Buat tahun akademik baru terlebih dahulu di menu{' '}
                                    <b>Jenjang & Kurikulum &gt; Tahun & Periode Triwulan</b> agar dapat menyalin ke tahun berikutnya.
                                </div>
                            </div>
                        )}

                        {/* Opsi Jenjang Pendidikan */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Cakupan Jenjang Pendidikan
                            </label>
                            <select
                                value={yearEducationId}
                                onChange={(e) => setYearEducationId(e.target.value)}
                                className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded bg-white text-slate-800"
                            >
                                <option value="all">Semua Jenjang Pendidikan (Seluruh Rombel Pesantren)</option>
                                {educations.map((edu) => (
                                    <option key={edu.id} value={edu.id}>
                                        Jenjang {edu.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Checkbox Otomatis Buat Rombel */}
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-2">
                            <label className="flex items-start gap-2 text-xs text-slate-800 font-semibold cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={autoCreateGroups}
                                    onChange={(e) => setAutoCreateGroups(e.target.checked)}
                                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                                />
                                <span>
                                    Otomatis buat Rombongan Belajar (Rombel) di tahun tujuan jika belum ada
                                </span>
                            </label>
                            <p className="text-[11px] text-slate-500 ml-5 font-normal">
                                Sistem akan mereplikasi struktur rombel (nama, kode, jenjang, wali kelas & ruangan) dari tahun asal ke tahun tujuan.
                            </p>
                        </div>

                        {/* Opsi Penimpaan */}
                        <div className="space-y-2 pt-1">
                            <label className="block text-xs font-bold text-slate-700">
                                Opsi Penimpaan Jadwal:
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <label className={`flex items-start gap-2 p-2.5 rounded border cursor-pointer transition ${
                                    yearMode === 'overwrite'
                                        ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 font-semibold'
                                        : 'bg-white border-slate-200 text-slate-600'
                                }`}>
                                    <input
                                        type="radio"
                                        name="yearMode"
                                        value="overwrite"
                                        checked={yearMode === 'overwrite'}
                                        onChange={() => setYearMode('overwrite')}
                                        className="mt-0.5 text-emerald-600"
                                    />
                                    <div>
                                        <span className="font-bold">Timpa Jadwal (Overwrite)</span>
                                        <p className="text-[11px] text-slate-500 font-normal">Perbarui jadwal jika rombel sudah ada di tahun tujuan.</p>
                                    </div>
                                </label>

                                <label className={`flex items-start gap-2 p-2.5 rounded border cursor-pointer transition ${
                                    yearMode === 'skip_existing'
                                        ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 font-semibold'
                                        : 'bg-white border-slate-200 text-slate-600'
                                }`}>
                                    <input
                                        type="radio"
                                        name="yearMode"
                                        value="skip_existing"
                                        checked={yearMode === 'skip_existing'}
                                        onChange={() => setYearMode('skip_existing')}
                                        className="mt-0.5 text-emerald-600"
                                    />
                                    <div>
                                        <span className="font-bold">Lewati Jika Sudah Ada</span>
                                        <p className="text-[11px] text-slate-500 font-normal">Hanya salin jadwal pada jam yang belum terisi.</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Ringkasan Aksi */}
                        <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-md text-xs text-emerald-950 flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                                <b>Ringkasan Aksi:</b> Master jadwal dari Tahun{' '}
                                <b>{fromYearObj?.year || 'Tahun Asal'}</b> akan disalin ke Tahun{' '}
                                <b>{toYearObj?.year || 'Tahun Tujuan'}</b> untuk{' '}
                                <b>{yearEducationId === 'all' ? 'Semua Jenjang Pendidikan' : 'Jenjang Terpilih'}</b>.
                            </div>
                        </div>

                        {/* Tombol Aksi */}
                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={isCopyingYear || !toAcademicYearId || fromAcademicYearId === toAcademicYearId}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#093c30] hover:bg-[#064e3b] text-white text-xs font-bold rounded shadow-xs transition disabled:opacity-50"
                            >
                                {isCopyingYear ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" /> Menyalin ke Tahun Baru...
                                    </>
                                ) : (
                                    <>
                                        <CalendarSync className="w-4 h-4" /> Mulai Salin ke Tahun Baru
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </Modal>
    );
}
