import React, { useState, useMemo } from 'react';
import {
    useGetStudiesQuery,
    useCreateStudyMutation,
    useUpdateStudyMutation,
    useDeleteStudyMutation,
} from '../../store/slices/studyApi';
import { useGetInstitutionsQuery } from '../../store/slices/institutionApi';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ActionDropdown from '../../components/molecules/ActionDropdown';
import { Plus, Edit2, Trash2, BookOpen, Layers, ShieldAlert, Sparkles } from 'lucide-react';
import { toast } from 'react-toastify';

const STUDY_TYPE_META = {
    khusus: {
        label: 'Mapel Khusus (Inti)',
        desc: 'Masuk Jadwal KBM • Wajib Remidi bila nilai < KKM',
        badgeClass: 'bg-emerald-50 text-[#093c30] border-emerald-300',
    },
    reguler: {
        label: 'Mapel Reguler',
        desc: 'Masuk Jadwal KBM • Penilaian Akhir Triwulan',
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
    },
    muatan_lokal: {
        label: 'Muatan Lokal (Non-Kelas)',
        desc: 'Tidak Masuk Jadwal KBM • Penunjang Nilai Triwulan',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
    },
};

export default function StudyPage() {
    const [instFilter, setInstFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const { data: instData } = useGetInstitutionsQuery();
    const institutions = instData?.data || [];

    const { data: studyData, isLoading } = useGetStudiesQuery(
        instFilter ? { educational_institution_id: instFilter } : undefined
    );
    const studies = useMemo(() => {
        const raw = studyData?.data || [];
        if (typeFilter === 'all') return raw;
        return raw.filter((s) => (s.study_type || 'reguler') === typeFilter);
    }, [studyData, typeFilter]);

    const [createStudy, { isLoading: isCreating }] = useCreateStudyMutation();
    const [updateStudy, { isLoading: isUpdating }] = useUpdateStudyMutation();
    const [deleteStudy, { isLoading: isDeleting }] = useDeleteStudyMutation();

    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Form fields
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [studyType, setStudyType] = useState('reguler');
    const [kkm, setKkm] = useState(75);
    const [institutionId, setInstitutionId] = useState('');
    const [description, setDescription] = useState('');

    const openCreateModal = () => {
        setEditingItem(null);
        setName('');
        setCode('');
        setStudyType('reguler');
        setKkm(75);
        setInstitutionId(instFilter || '');
        setDescription('');
        setModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setName(item.name || '');
        setCode(item.code || '');
        setStudyType(item.study_type || 'reguler');
        setKkm(item.kkm || 75);
        setInstitutionId(item.educational_institution_id || '');
        setDescription(item.description || '');
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            name,
            code: code || null,
            study_type: studyType,
            kkm: Number(kkm),
            educational_institution_id: institutionId || null,
            description: description || null,
        };

        try {
            if (editingItem) {
                await updateStudy({ id: editingItem.id, ...payload }).unwrap();
                toast.success('Mata pelajaran berhasil diperbarui');
            } else {
                await createStudy(payload).unwrap();
                toast.success('Mata pelajaran berhasil dibuat');
            }
            setModalOpen(false);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan mata pelajaran');
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteStudy(deleteTarget.id).unwrap();
            toast.success('Mata pelajaran berhasil dihapus');
            setDeleteTarget(null);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menghapus mata pelajaran');
        }
    };

    const columns = [
        {
            key: 'name',
            label: 'Mata Pelajaran / Fan Kitab',
            render: (row) => (
                <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-md bg-emerald-50 text-[#093c30] flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4" />
                    </span>
                    <div>
                        <span className="font-bold text-slate-800 block text-sm">{row.name}</span>
                        {row.code && (
                            <span className="text-[11px] font-mono text-slate-400">Kode: {row.code}</span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'study_type',
            label: 'Jenis Mata Pelajaran',
            render: (row) => {
                const t = row.study_type || 'reguler';
                const meta = STUDY_TYPE_META[t] || STUDY_TYPE_META.reguler;
                return (
                    <div>
                        <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded border text-xs font-bold ${meta.badgeClass}`}
                        >
                            {t === 'khusus' && <ShieldAlert className="w-3 h-3" />}
                            {t === 'muatan_lokal' && <Sparkles className="w-3 h-3" />}
                            {meta.label}
                        </span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">{meta.desc}</span>
                    </div>
                );
            },
        },
        {
            key: 'institution',
            label: 'Lembaga / Program',
            render: (row) => {
                const inst = institutions.find((i) => i.id === row.educational_institution_id);
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                        <Layers className="w-3 h-3 text-slate-400" />
                        {inst ? inst.name : 'Umum (Semua Lembaga)'}
                    </span>
                );
            },
        },
        {
            key: 'kkm',
            label: 'KKM Minimal',
            render: (row) => (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    {Number(row.kkm).toFixed(0)}
                </span>
            ),
        },
        {
            key: 'teachers',
            label: 'Guru Pengampu',
            render: (row) => (
                <span className="text-xs text-slate-600 font-medium">
                    {row.teachers?.length ? `${row.teachers.length} Guru` : 'Belum Ditugaskan'}
                </span>
            ),
        },
        {
            key: 'actions',
            label: 'Aksi',
            render: (row) => (
                <div onClick={(e) => e.stopPropagation()}>
                    <ActionDropdown
                        label="Aksi"
                        size="sm"
                        variant="outline"
                        items={[
                            {
                                id: 'edit',
                                label: 'Edit Mata Pelajaran',
                                icon: Edit2,
                                iconColor: 'text-[#093c30]',
                                onClick: () => openEditModal(row),
                            },
                            {
                                id: 'delete',
                                label: 'Hapus Mata Pelajaran',
                                icon: Trash2,
                                danger: true,
                                dividerBefore: true,
                                onClick: () => setDeleteTarget(row),
                            },
                        ]}
                    />
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <span className="p-2 bg-emerald-50 text-[#093c30] rounded-md">
                            <BookOpen className="w-5 h-5" />
                        </span>
                        Mata Pelajaran &amp; Silabus
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Kelola Mata Pelajaran Khusus (Inti &amp; Remidi), Mata Pelajaran Reguler, serta Muatan Lokal (Non-Kelas / Penunjang Nilai).
                    </p>
                </div>
                <div>
                    <button
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0b57d0] text-white font-semibold text-sm rounded-md hover:bg-[#0842a0] transition shadow-sm cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Mapel
                    </button>
                </div>
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={studies}
                isLoading={isLoading}
                emptyMessage="Belum ada mata pelajaran terdaftar"
                filters={
                    <div className="flex flex-wrap items-center gap-1.5">
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-md bg-white text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-[#093c30] focus:border-[#093c30] transition-colors cursor-pointer shadow-2xs"
                        >
                            <option value="all">Semua Jenis Mapel</option>
                            <option value="khusus">Mapel Khusus (Wajib Tuntas / Remidi)</option>
                            <option value="reguler">Mapel Reguler (Jadwal KBM)</option>
                            <option value="muatan_lokal">Muatan Lokal (Non-Kelas / Penunjang)</option>
                        </select>

                        <select
                            value={instFilter}
                            onChange={(e) => setInstFilter(e.target.value)}
                            className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-md bg-white text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-[#093c30] focus:border-[#093c30] transition-colors cursor-pointer shadow-2xs"
                        >
                            <option value="">Semua Lembaga</option>
                            {institutions.map((inst) => (
                                <option key={inst.id} value={inst.id}>
                                    {inst.name}
                                </option>
                            ))}
                        </select>
                    </div>
                }
            />

            {/* Modal Tambah/Edit Mapel */}
            <Modal
                open={modalOpen}
                title={editingItem ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
                onClose={() => setModalOpen(false)}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Nama Mata Pelajaran / Fan Kitab *
                        </label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Contoh: Fiqih Ibadah / Nahwu Shorof / Muhadharah"
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Jenis Mata Pelajaran *
                        </label>
                        <select
                            required
                            value={studyType}
                            onChange={(e) => setStudyType(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white font-semibold"
                        >
                            <option value="khusus">
                                Mata Pelajaran Khusus (Masuk Jadwal KBM • Wajib Remidi bila tidak memenuhi KKM)
                            </option>
                            <option value="reguler">
                                Mata Pelajaran Reguler (Masuk Jadwal KBM • Penilaian Akhir Triwulan)
                            </option>
                            <option value="muatan_lokal">
                                Mata Pelajaran Non-Kelas / Muatan Lokal (Tidak masuk Jadwal KBM • Penunjang Nilai)
                            </option>
                        </select>
                        <p className="text-[11px] text-slate-500 mt-1">
                            {STUDY_TYPE_META[studyType]?.desc}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Kode Mapel
                            </label>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="Contoh: FQH-07 / MLK-01"
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                KKM Minimal *
                            </label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                required
                                value={kkm}
                                onChange={(e) => setKkm(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Institusi / Lembaga
                        </label>
                        <select
                            value={institutionId}
                            onChange={(e) => setInstitutionId(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white"
                        >
                            <option value="">Umum (Berlaku Semua Lembaga)</option>
                            {institutions.map((inst) => (
                                <option key={inst.id} value={inst.id}>
                                    {inst.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Keterangan / Silabus
                        </label>
                        <textarea
                            rows={2}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Deskripsi kitab atau materi pelajaran..."
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating || isUpdating}
                            className="px-4 py-2 text-xs font-bold text-white bg-[#0b57d0] rounded-md hover:bg-[#0842a0] disabled:opacity-50"
                        >
                            {isCreating || isUpdating ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Confirm Dialog */}
            <ConfirmDialog
                open={!!deleteTarget}
                title="Hapus Mata Pelajaran"
                message={`Yakin ingin menghapus ${deleteTarget?.name}?`}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                isLoading={isDeleting}
            />
        </div>
    );
}
