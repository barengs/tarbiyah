import React, { useState } from 'react';
import { 
    useGetStudiesQuery, 
    useCreateStudyMutation, 
    useUpdateStudyMutation, 
    useDeleteStudyMutation 
} from '../../store/slices/studyApi';
import { useGetInstitutionsQuery } from '../../store/slices/institutionApi';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Plus, Edit2, Trash2, BookOpen, Layers } from 'lucide-react';
import { toast } from 'react-toastify';

export default function StudyPage() {
    const [instFilter, setInstFilter] = useState('');
    const { data: instData } = useGetInstitutionsQuery();
    const institutions = instData?.data || [];

    const { data: studyData, isLoading } = useGetStudiesQuery(
        instFilter ? { educational_institution_id: instFilter } : undefined
    );
    const studies = studyData?.data || [];

    const [createStudy, { isLoading: isCreating }] = useCreateStudyMutation();
    const [updateStudy, { isLoading: isUpdating }] = useUpdateStudyMutation();
    const [deleteStudy, { isLoading: isDeleting }] = useDeleteStudyMutation();

    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Form fields
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [kkm, setKkm] = useState(75);
    const [institutionId, setInstitutionId] = useState('');
    const [description, setDescription] = useState('');

    const openCreateModal = () => {
        setEditingItem(null);
        setName('');
        setCode('');
        setKkm(75);
        setInstitutionId(instFilter || '');
        setDescription('');
        setModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setName(item.name || '');
        setCode(item.code || '');
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
            label: 'Mata Pelajaran',
            render: (row) => (
                <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
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
            key: 'institution',
            label: 'Lembaga / Jenjang',
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
                <span className="text-xs text-slate-600">
                    {row.teachers?.length ? `${row.teachers.length} Guru` : 'Belum Ditugaskan'}
                </span>
            ),
        },
        {
            key: 'actions',
            label: 'Aksi',
            render: (row) => (
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={(e) => { e.stopPropagation(); openEditModal(row); }}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                        title="Edit Mapel"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="Hapus Mapel"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <span className="p-2 bg-emerald-50 text-emerald-700 rounded-md">
                            <BookOpen className="w-5 h-5" />
                        </span>
                        Mata Pelajaran &amp; Silabus
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Kelola katalog mata pelajaran Diniyah &amp; Umum, standar KKM minimal, dan silabus madrasah.
                    </p>
                </div>
                <div>
                    <button
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-semibold text-sm rounded-md hover:bg-emerald-700 transition shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Mapel
                    </button>
                </div>
            </div>

            {/* Filter Lembaga */}
            <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Filter Lembaga:</span>
                <select
                    value={instFilter}
                    onChange={(e) => setInstFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-emerald-500"
                >
                    <option value="">Semua Lembaga</option>
                    {institutions.map((inst) => (
                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={studies}
                isLoading={isLoading}
                emptyMessage="Belum ada mata pelajaran terdaftar"
            />

            {/* Modal Tambah/Edit Mapel */}
            <Modal
                open={modalOpen}
                title={editingItem ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
                onClose={() => setModalOpen(false)}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Nama Mata Pelajaran *</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Contoh: Fiqih Ibadah / Matematika"
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Kode Mapel</label>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="Contoh: FIQ-01"
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">KKM Minimal *</label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                required
                                value={kkm}
                                onChange={(e) => setKkm(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Institusi / Lembaga</label>
                        <select
                            value={institutionId}
                            onChange={(e) => setInstitutionId(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                        >
                            <option value="">Umum (Berlaku Semua Lembaga)</option>
                            {institutions.map((inst) => (
                                <option key={inst.id} value={inst.id}>{inst.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Keterangan / Silabus</label>
                        <textarea
                            rows={2}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Deskripsi materi pelajaran..."
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating || isUpdating}
                            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50"
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
