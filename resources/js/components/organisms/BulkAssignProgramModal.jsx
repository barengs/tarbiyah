import React, { useState, useMemo } from 'react';
import Modal from '../ui/Modal';
import { GraduationCap, Users, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useBulkAssignProgramMutation } from '../../store/slices/studentApi';
import { useGetClassGroupsQuery } from '../../store/slices/classGroupApi';

export default function BulkAssignProgramModal({ open, onClose, selectedStudents, onDone }) {
    const [programId, setProgramId] = useState('');
    const [classGroupId, setClassGroupId] = useState('');
    const [note, setNote] = useState('');

    const [bulkAssignProgram, { isLoading: isSubmitting }] = useBulkAssignProgramMutation();
    const { data: classGroupsData } = useGetClassGroupsQuery({ all: 'true' });
    const classGroups = classGroupsData?.data || classGroupsData || [];

    const programs = useMemo(() => {
        const map = {};
        (classGroups || []).forEach((cg) => {
            if (cg.program) map[cg.program.id] = cg.program;
        });
        return Object.values(map);
    }, [classGroups]);

    const filteredClassGroups = useMemo(() => {
        if (!programId) return classGroups;
        return classGroups.filter((cg) => String(cg.program_id) === String(programId));
    }, [classGroups, programId]);

    const handleReset = () => { setProgramId(''); setClassGroupId(''); setNote(''); };
    const handleProgramChange = (v) => { setProgramId(v); setClassGroupId(''); };

    const handleSubmit = async () => {
        if (!selectedStudents || selectedStudents.length === 0) {
            toast.warning('Pilih minimal satu santri terlebih dahulu.');
            return;
        }
        if (!programId && !classGroupId) {
            toast.warning('Pilih Program atau Kelas/Rombel tujuan.');
            return;
        }

        try {
            const res = await bulkAssignProgram({
                student_ids: selectedStudents.map((s) => s.id),
                program_id: programId !== '' ? Number(programId) : undefined,
                class_group_id: classGroupId !== '' ? Number(classGroupId) : undefined,
                note: note || undefined,
            }).unwrap();
            toast.success(res?.message || 'Pengaturan massal berhasil disimpan.');
            handleReset();
            if (onDone) onDone();
            onClose();
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan pengaturan massal.');
        }
    };

    const selectClass = 'px-3 py-2.5 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Atur Program / Jenjang / Rombel Massal"
            maxWidth="max-w-2xl"
            footer={
                <div className="flex items-center justify-end gap-2">
                    <button type="button" onClick={handleReset} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition">Reset</button>
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition">Batal</button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !selectedStudents || selectedStudents.length === 0}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white font-semibold text-sm rounded-md hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                    >
                        {isSubmitting ? (
                            <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                        ) : (
                            <CheckCircle2 className="w-4 h-4" />
                        )}
                        Terapkan ke {selectedStudents?.length || 0} Santri
                    </button>
                </div>
            }
        >
            <div className="space-y-5">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                    <GraduationCap className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>
                        Pengaturan ini akan diterapkan secara massal ke <strong>{selectedStudents?.length || 0}</strong> santri terpilih.
                        Rombel tujuan bersifat <em>single-rombel policy</em>: rombel aktif sebelumnya di tahun ajaran yang sama
                        akan ditandai <code className="font-mono bg-amber-100 px-1 rounded">pindah_level</code>.
                    </p>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">Program (Pilihan)</label>
                    <select value={programId} onChange={(e) => handleProgramChange(e.target.value)} className={selectClass}>
                        <option value="">-- Pilih / Ubah Program --</option>
                        {programs.map((pg) => (<option key={pg.id} value={pg.id}>{pg.name}</option>))}
                        <option value="0">Kosongkan (Belum diatur)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">Kelas / Rombel Aktif (Opsional)</label>
                    <select value={classGroupId} onChange={(e) => setClassGroupId(e.target.value)} className={selectClass}>
                        <option value="">-- Tidak mengubah rombel --</option>
                        {filteredClassGroups.map((cg) => (
                            <option key={cg.id} value={cg.id}>
                                {cg.name} {cg.academic_year?.year ? `(TA ${cg.academic_year.year})` : ''}
                                {cg.education?.name ? ` • ${cg.education.name}` : ''}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">Catatan (Pilihan)</label>
                    <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Contoh: Penataan rombel awal tahun ajaran 1447 H"
                        className="px-3 py-2.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                </div>

                <div className="border-t border-slate-100 pt-3 text-xs text-slate-500 flex items-start gap-2">
                    <Users className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                    <p>
                        {selectedStudents?.length === 0
                            ? 'Belum ada santri terpilih.'
                            : `${selectedStudents.length} santri terpilih — ${selectedStudents.slice(0, 3).map((s) => s.name).join(', ')}${selectedStudents.length > 3 ? '…' : ''}`}
                    </p>
                </div>
            </div>
        </Modal>
    );
}
