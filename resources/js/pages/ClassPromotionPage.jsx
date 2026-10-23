import React, { useState, useEffect } from 'react';
import { 
    useGetClassGroupsQuery,
    useGetPromotionCandidatesQuery,
    useBulkPromoteStudentsMutation
} from '../store/slices/classGroupApi';
import { useGetInstitutionsQuery } from '../store/slices/institutionApi';
import { 
    TrendingUp, 
    ArrowRight, 
    Users, 
    CheckCircle2, 
    GraduationCap, 
    AlertCircle, 
    RotateCcw,
    Sparkles,
    ShieldAlert
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function ClassPromotionPage() {
    const [instFilter, setInstFilter] = useState('');
    const { data: instData } = useGetInstitutionsQuery();
    const institutions = instData?.data || [];

    // Mengambil daftar rombel berdasarkan lembaga
    const { data: groupsData, isLoading: isLoadingGroups } = useGetClassGroupsQuery({
        progression_type: 'semester',
        ...(instFilter && { educational_institution_id: instFilter }),
    });
    const groups = groupsData?.data || [];

    const [sourceGroupId, setSourceGroupId] = useState('');
    const [targetGroupId, setTargetGroupId] = useState('');

    // Fetch kandidat siswa dari rombel asal
    const { 
        data: candidatesData, 
        isLoading: isLoadingCandidates,
        refetch: refetchCandidates 
    } = useGetPromotionCandidatesQuery(sourceGroupId, {
        skip: !sourceGroupId,
    });

    const candidates = candidatesData?.data?.candidates || [];
    const sourceGroupDetail = candidatesData?.data?.class_group;

    // State baris santri: { [studentId]: { selected: boolean, action: 'naik_kelas' | 'tinggal_kelas' | 'lulus', note: string } }
    const [studentActions, setStudentActions] = useState({});

    // Reset dan inisialisasi state santri ketika rombel asal berubah
    useEffect(() => {
        if (candidates.length > 0) {
            const initial = {};
            candidates.forEach((c) => {
                initial[c.student_id] = {
                    selected: true,
                    action: 'naik_kelas',
                    note: '',
                };
            });
            setStudentActions(initial);
        } else {
            setStudentActions({});
        }
    }, [candidates]);

    const [bulkPromote, { isLoading: isPromoting }] = useBulkPromoteStudentsMutation();
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);

    // Filter daftar rombel tujuan (tidak boleh sama dengan rombel asal)
    const targetGroupOptions = groups.filter((g) => String(g.id) !== String(sourceGroupId));

    const toggleSelectAll = (select) => {
        setStudentActions((prev) => {
            const updated = { ...prev };
            Object.keys(updated).forEach((id) => {
                updated[id] = { ...updated[id], selected: select };
            });
            return updated;
        });
    };

    const setAllActions = (action) => {
        setStudentActions((prev) => {
            const updated = { ...prev };
            Object.keys(updated).forEach((id) => {
                updated[id] = { ...updated[id], action };
            });
            return updated;
        });
    };

    const updateStudentAction = (studentId, key, value) => {
        setStudentActions((prev) => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [key]: value,
            },
        }));
    };

    const selectedStudents = candidates.filter((c) => studentActions[c.student_id]?.selected);

    const counts = {
        naik: selectedStudents.filter((c) => studentActions[c.student_id]?.action === 'naik_kelas').length,
        tinggal: selectedStudents.filter((c) => studentActions[c.student_id]?.action === 'tinggal_kelas').length,
        lulus: selectedStudents.filter((c) => studentActions[c.student_id]?.action === 'lulus').length,
    };

    const handleExecutePromotion = async () => {
        if (selectedStudents.length === 0) {
            toast.warn('Pilih minimal satu siswa untuk diproses.');
            return;
        }

        if (counts.naik > 0 && !targetGroupId) {
            toast.error('Rombel tujuan wajib dipilih jika terdapat siswa yang Naik Kelas.');
            return;
        }

        const payload = {
            source_class_group_id: Number(sourceGroupId),
            target_class_group_id: targetGroupId ? Number(targetGroupId) : null,
            students: selectedStudents.map((c) => ({
                student_id: c.student_id,
                action: studentActions[c.student_id]?.action || 'naik_kelas',
                note: studentActions[c.student_id]?.note || null,
            })),
        };

        try {
            const res = await bulkPromote(payload).unwrap();
            toast.success(res.message || 'Kenaikan kelas berhasil diproses!');
            setConfirmModalOpen(false);
            refetchCandidates();
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal memproses kenaikan kelas.');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <span className="p-2 bg-emerald-50 text-emerald-700 rounded-md">
                            <TrendingUp className="w-5 h-5" />
                        </span>
                        Kenaikan Kelas &amp; Mutasi Rombel
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Proses promosi santri ke tingkat rombel berikutnya, kenaikan status kelulusan, atau penetapan tinggal kelas secara massal.
                    </p>
                </div>
            </div>

            {/* Selector Panel: Lembaga, Rombel Asal & Rombel Tujuan */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    {/* Filter Lembaga */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            1. Lembaga Pendidikan
                        </label>
                        <select
                            value={instFilter}
                            onChange={(e) => {
                                setInstFilter(e.target.value);
                                setSourceGroupId('');
                                setTargetGroupId('');
                            }}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
                        >
                            <option value="">Semua Lembaga</option>
                            {institutions.map((inst) => (
                                <option key={inst.id} value={inst.id}>{inst.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Rombel Asal */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            2. Rombel Asal (Sumber) *
                        </label>
                        <select
                            value={sourceGroupId}
                            onChange={(e) => setSourceGroupId(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800"
                        >
                            <option value="">-- Pilih Rombel Asal --</option>
                            {groups.map((g) => (
                                <option key={g.id} value={g.id}>
                                    {g.name} {g.educational_institution ? `(${g.educational_institution.name})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Rombel Tujuan */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                            <span>3. Rombel Tujuan (Target) *</span>
                            <span className="text-[10px] text-emerald-600 font-normal">Tingkat Selanjutnya</span>
                        </label>
                        <select
                            value={targetGroupId}
                            onChange={(e) => setTargetGroupId(e.target.value)}
                            disabled={!sourceGroupId}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800 disabled:opacity-50"
                        >
                            <option value="">-- Pilih Rombel Tujuan --</option>
                            {targetGroupOptions.map((g) => (
                                <option key={g.id} value={g.id}>
                                    {g.name} (Kapasitas: {g.capacity || 32})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Info Rombel Terpilih */}
                {sourceGroupDetail && (
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="font-semibold text-slate-800">
                                Rombel: {sourceGroupDetail.name}
                            </span>
                            <span className="text-slate-500">
                                ({sourceGroupDetail.educational_institution?.name || 'Umum'})
                            </span>
                            <span className="text-slate-400">|</span>
                            <span className="text-slate-600">
                                Total Santri Aktif: <strong>{candidates.length} Jiwa</strong>
                            </span>
                        </div>

                        {targetGroupId && (
                            <div className="flex items-center gap-2 font-semibold text-emerald-800">
                                <span>Arah Kenaikan:</span>
                                <span className="bg-white px-2 py-0.5 rounded border border-emerald-300 font-bold">
                                    {sourceGroupDetail.name}
                                </span>
                                <ArrowRight className="w-3.5 h-3.5" />
                                <span className="bg-emerald-600 text-white px-2 py-0.5 rounded font-bold">
                                    {groups.find((g) => String(g.id) === String(targetGroupId))?.name}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Daftar Siswa & Aksi Kenaikan Kelas */}
            {!sourceGroupId ? (
                <div className="p-12 text-center bg-white border border-slate-200 rounded-xl text-slate-400 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                        <Users className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">Pilih Rombel Asal Terlebih Dahulu</p>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                        Silakan pilih lembaga dan rombel asal di atas untuk menampilkan daftar santri yang akan diproses kenaikan kelasnya.
                    </p>
                </div>
            ) : isLoadingCandidates ? (
                <div className="p-12 text-center bg-white border border-slate-200 rounded-xl text-slate-400">
                    <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm font-medium">Memuat data santri rombel...</p>
                </div>
            ) : candidates.length === 0 ? (
                <div className="p-12 text-center bg-white border border-slate-200 rounded-xl text-slate-400">
                    <p className="text-sm font-semibold text-slate-600">Tidak ada santri aktif di rombel ini.</p>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden space-y-0">
                    {/* Action Bar Atas */}
                    <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Aksi Massal:</span>
                            <button
                                type="button"
                                onClick={() => setAllActions('naik_kelas')}
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-100/80 text-emerald-800 hover:bg-emerald-200 transition"
                            >
                                Set Semua Naik Kelas
                            </button>
                            <button
                                type="button"
                                onClick={() => setAllActions('lulus')}
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-indigo-100/80 text-indigo-800 hover:bg-indigo-200 transition"
                            >
                                Set Semua Lulus
                            </button>
                            <button
                                type="button"
                                onClick={() => setAllActions('tinggal_kelas')}
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-100/80 text-amber-800 hover:bg-amber-200 transition"
                            >
                                Set Semua Tinggal Kelas
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => toggleSelectAll(true)}
                                className="text-xs text-slate-600 hover:text-slate-900 font-medium underline"
                            >
                                Pilih Semua
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                                type="button"
                                onClick={() => toggleSelectAll(false)}
                                className="text-xs text-slate-600 hover:text-slate-900 font-medium underline"
                            >
                                Batal Pilih
                            </button>
                        </div>
                    </div>

                    {/* Table Siswa */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px] font-bold">
                                    <th className="p-3 w-10 text-center">Pilih</th>
                                    <th className="p-3">Santri / Murid</th>
                                    <th className="p-3">NIS / Identitas</th>
                                    <th className="p-3">Jenis Kelamin</th>
                                    <th className="p-3 w-48">Keputusan Kenaikan</th>
                                    <th className="p-3">Catatan / Keterangan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {candidates.map((c) => {
                                    const s = c.student;
                                    const actionState = studentActions[c.student_id] || { selected: false, action: 'naik_kelas', note: '' };

                                    return (
                                        <tr
                                            key={c.id}
                                            className={`transition-colors ${
                                                actionState.selected ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50/50 opacity-60'
                                            }`}
                                        >
                                            <td className="p-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={actionState.selected}
                                                    onChange={(e) => updateStudentAction(c.student_id, 'selected', e.target.checked)}
                                                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                />
                                            </td>
                                            <td className="p-3 font-semibold text-slate-900">
                                                <div className="flex items-center gap-2">
                                                    <span>{s?.name}</span>
                                                    {s?.is_mukim ? (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            Mukim
                                                        </span>
                                                    ) : (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200">
                                                            Luar
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-3 font-mono text-slate-600">
                                                NIS: {s?.nis || '-'}
                                            </td>
                                            <td className="p-3 text-slate-600">
                                                {s?.gender === 'L' ? 'Putra (Banin)' : 'Putri (Banat)'}
                                            </td>
                                            <td className="p-3">
                                                <select
                                                    value={actionState.action}
                                                    onChange={(e) => updateStudentAction(c.student_id, 'action', e.target.value)}
                                                    disabled={!actionState.selected}
                                                    className={`w-full px-2.5 py-1.5 rounded-md border text-xs font-semibold focus:ring-2 focus:ring-emerald-500 ${
                                                        actionState.action === 'naik_kelas'
                                                            ? 'border-emerald-300 bg-emerald-50/60 text-emerald-800'
                                                            : actionState.action === 'lulus'
                                                            ? 'border-indigo-300 bg-indigo-50/60 text-indigo-800'
                                                            : 'border-amber-300 bg-amber-50/60 text-amber-800'
                                                    }`}
                                                >
                                                    <option value="naik_kelas">Naik Kelas (ke Tujuan)</option>
                                                    <option value="tinggal_kelas">Tinggal Kelas</option>
                                                    <option value="lulus">Lulus Jenjang</option>
                                                </select>
                                            </td>
                                            <td className="p-3">
                                                <input
                                                    type="text"
                                                    value={actionState.note || ''}
                                                    onChange={(e) => updateStudentAction(c.student_id, 'note', e.target.value)}
                                                    placeholder="Catatan..."
                                                    disabled={!actionState.selected}
                                                    className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded bg-white text-slate-700"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Bottom Submit Bar */}
                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-xs">
                            <span className="font-bold text-slate-800">
                                Total Terpilih: {selectedStudents.length} Santri
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="text-emerald-700 font-semibold">
                                {counts.naik} Naik Kelas
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="text-indigo-700 font-semibold">
                                {counts.lulus} Lulus
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="text-amber-700 font-semibold">
                                {counts.tinggal} Tinggal Kelas
                            </span>
                        </div>

                        <div>
                            <button
                                type="button"
                                disabled={selectedStudents.length === 0 || isPromoting}
                                onClick={() => setConfirmModalOpen(true)}
                                className="px-5 py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm flex items-center gap-2"
                            >
                                <TrendingUp className="w-4 h-4" />
                                Proses Kenaikan Kelas ({selectedStudents.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Konfirmasi Eksekusi Kenaikan Kelas */}
            {confirmModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-base">Konfirmasi Kenaikan Kelas</h3>
                                <p className="text-xs text-slate-500">Periksa ringkasan sebelum menyimpan mutasi rombel.</p>
                            </div>
                        </div>

                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Rombel Asal:</span>
                                <span className="font-bold text-slate-800">{sourceGroupDetail?.name}</span>
                            </div>
                            {counts.naik > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Rombel Tujuan:</span>
                                    <span className="font-bold text-emerald-700">
                                        {groups.find((g) => String(g.id) === String(targetGroupId))?.name}
                                    </span>
                                </div>
                            )}
                            <div className="pt-2 border-t border-slate-200 flex justify-between font-bold">
                                <span>Total Santri:</span>
                                <span>{selectedStudents.length} Santri</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>Rincian:</span>
                                <span>
                                    {counts.naik} Naik, {counts.tinggal} Tinggal, {counts.lulus} Lulus
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setConfirmModalOpen(false)}
                                disabled={isPromoting}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleExecutePromotion}
                                disabled={isPromoting}
                                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {isPromoting ? 'Memproses...' : 'Ya, Eksekusi Kenaikan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
