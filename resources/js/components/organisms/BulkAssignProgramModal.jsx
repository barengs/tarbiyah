import React, { useState, useMemo } from 'react';
import Modal from '../ui/Modal';
import { GraduationCap, Users, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useBulkAssignProgramMutation } from '../../store/slices/studentApi';
import { useGetClassGroupsQuery } from '../../store/slices/classGroupApi';
import { useGetEducationsQuery } from '../../store/slices/institutionApi';

export default function BulkAssignProgramModal({ open, onClose, selectedStudents, onDone, programsFromParent }) {
    const [programId, setProgramId] = useState('');
    const [classGroupId, setClassGroupId] = useState('');
    const [note, setNote] = useState('');

    const [bulkAssignProgram, { isLoading: isSubmitting }] = useBulkAssignProgramMutation();
    const { data: classGroupsData } = useGetClassGroupsQuery({ all: 'true' });
    const classGroups = classGroupsData?.data || classGroupsData || [];
    const { data: educationsData } = useGetEducationsQuery();
    const educations = educationsData?.data || educationsData || [];

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

    // Kelompok rombel per jenjang untuk tampilan rapi
    const classGroupsByEducation = useMemo(() => {
        const map = {};
        (filteredClassGroups || []).forEach((cg) => {
            const key = cg.education_id || 'unset';
            if (!map[key]) map[key] = { label: key === 'unset' ? 'Belum ditentukan jenjang' : (cg.education?.name || 'Jenjang lain'), groups: [] };
            map[key].groups.push(cg);
        });
        // Urutkan: jenjang yang sudah ada dulu, "unset" terakhir
        return Object.entries(map).sort(([aKey, a], [bKey, b]) => {
            if (aKey === 'unset') return 1;
            if (bKey === 'unset') return -1;
            const aName = educations.find((e) => String(e.id) === aKey)?.name || aKey;
            const bName = educations.find((e) => String(e.id) === bKey)?.name || bKey;
            return aName.localeCompare(bName);
        });
    }, [filteredClassGroups, educations]);

    // Program list: dari props (sudah difetch di parent) atau derive dari rombel
    const availablePrograms = programsFromParent?.length ? programsFromParent : programs;

    const handleReset = () => { setProgramId(''); setClassGroupId(''); setNote(''); };
    const handleProgramChange = (v) => { setProgramId(v); setClassGroupId(''); }

    // Tampilkan nama program terpilih
    const selectedProgramName = programId === '' ? '—' : (programId === '0' ? 'Belum diatur' : (availablePrograms.find((pg) => String(pg.id) === String(programId))?.name || '#'+programId));
    const selectedGroup = filteredClassGroups.find((cg) => String(cg.id) === String(classGroupId));
    const selectedGroupLabel = classGroupId === '' ? 'Belum ditentukan' : (selectedGroup ? `${selectedGroup.name} • ${selectedGroup.education?.name || 'Jenjang lain'}` : 'Rombel');;

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

    const selectClass = 'pl-3 pr-9 py-2.5 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Atur Program / Jenjang / Rombel Massal"
            maxWidth="max-w-2xl"
            footer={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
                    <div className="text-xs text-slate-500">
                        {selectedStudents?.length === 0
                            ? <span>Belum ada santri terpilih.</span>
                            : <>
                                <span className="font-medium text-slate-700">{selectedStudents.length} santri terpilih</span>
                                {' — '}
                                <span>{selectedStudents.slice(0, 3).map((s) => s.name).join(', ')}{selectedStudents.length > 3 ? '…' : ''}</span>
                            </>}
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={handleReset} className="px-3.5 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition">Reset</button>
                        <button type="button" onClick={onClose} className="px-3.5 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition">Batal</button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !selectedStudents || selectedStudents.length === 0}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white font-semibold text-xs rounded-md hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                        >
                            {isSubmitting ? (
                                <span className="animate-spin w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" />
                            ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            Terapkan
                        </button>
                    </div>
                </div>
            }
        >
            <div className="space-y-4">
                {/* Ringkasan tujuan */}
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Program</div>
                        <div className="text-sm font-semibold text-slate-800 mt-0.5">{selectedProgramName}</div>
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Jenjang / Rombel</div>
                        <div className="text-sm font-semibold text-slate-800 mt-0.5">{classGroupId === '' ? 'Belum ditentukan' : (selectedGroup?.name || 'Rombel')}{classGroupId !== '' && selectedGroup?.education?.name ? <span className="text-slate-500 font-normal"> • {selectedGroup.education.name}</span> : null}</div>
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Jumlah</div>
                        <div className="text-sm font-semibold text-slate-800 mt-0.5">{selectedStudents?.length || 0} santri</div>
                    </div>
                </div>

                <div className="p-2.5 bg-amber-50/60 border border-amber-200/60 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                    <GraduationCap className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                    <p className="leading-relaxed">
                        Rombel bersifat <em>single-rombel policy</em>: rombel aktif sebelumnya di tahun ajaran yang sama
                        otomatis ditandai <code className="font-mono bg-amber-100 px-1 rounded text-[11px]">pindah_level</code>.
                    </p>
                </div>

                {/* Form grid 2 kolom */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Program</label>
                        <select value={programId} onChange={(e) => handleProgramChange(e.target.value)} className={selectClass}>
                            <option value="">Pilih Program</option>
                            {availablePrograms.map((pg) => (<option key={pg.id} value={pg.id}>{pg.name}</option>))}
                            <option value="0">Kosongkan (Belum diatur)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Kelas / Rombel</label>
                        <select value={classGroupId} onChange={(e) => setClassGroupId(e.target.value)} className={selectClass}>
                            <option value="">Pilih Rombel</option>
                            {classGroupsByEducation.map(([key, bucket]) => (
                                <optgroup key={key} label={bucket.label}>
                                    {bucket.groups.map((cg) => (
                                        <option key={cg.id} value={cg.id}>
                                            {cg.name}{cg.academic_year?.year ? ` (TA ${cg.academic_year.year})` : ''}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>

                    <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Catatan</label>
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Contoh: Penataan rombel awal tahun ajaran 1447 H"
                            className={selectClass}
                        />
                    </div>
                </div>
            </div>
        </Modal>
    );
}
