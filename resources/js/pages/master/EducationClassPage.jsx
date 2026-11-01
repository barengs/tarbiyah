import React, { useState } from 'react';
import { 
    useGetEducationClassesQuery, 
    useCreateEducationClassMutation, 
    useUpdateEducationClassMutation, 
    useDeleteEducationClassMutation 
} from '../../store/slices/educationClassApi';
import { useGetInstitutionsQuery } from '../../store/slices/institutionApi';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Plus, Edit2, Trash2, GraduationCap, School, Users } from 'lucide-react';
import { toast } from 'react-toastify';

export default function EducationClassPage() {
    const [instFilter, setInstFilter] = useState('');

    const { data: instData } = useGetInstitutionsQuery();
    const institutions = instData?.data || [];

    const { data: classesData, isLoading } = useGetEducationClassesQuery({
        ...(instFilter && { educational_institution_id: instFilter }),
    });
    const classes = classesData?.data || [];

    const [createClass, { isLoading: isCreating }] = useCreateEducationClassMutation();
    const [updateClass, { isLoading: isUpdating }] = useUpdateEducationClassMutation();
    const [deleteClass, { isLoading: isDeleting }] = useDeleteEducationClassMutation();

    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Form fields
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [institutionId, setInstitutionId] = useState('');

    const openCreateModal = () => {
        setEditingItem(null);
        setName('');
        setCode('');
        setInstitutionId(instFilter || (institutions[0]?.id ? String(institutions[0].id) : ''));
        setModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setName(item.name || '');
        setCode(item.code || '');
        setInstitutionId(
            item.educational_institution_id 
                ? String(item.educational_institution_id) 
                : (item.education?.educational_institution_id ? String(item.education.educational_institution_id) : '')
        );
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            name,
            code,
            educational_institution_id: institutionId ? Number(institutionId) : null,
        };

        try {
            if (editingItem) {
                await updateClass({ id: editingItem.id, ...payload }).unwrap();
                toast.success('Tingkat kelas berhasil diperbarui');
            } else {
                await createClass(payload).unwrap();
                toast.success('Tingkat kelas berhasil ditambahkan');
            }
            setModalOpen(false);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan tingkat kelas');
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteClass(deleteTarget.id).unwrap();
            toast.success('Tingkat kelas berhasil dihapus');
            setDeleteTarget(null);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menghapus tingkat kelas');
        }
    };

    const columns = [
        {
            key: 'name',
            label: 'Nama Tingkat Kelas',
            render: (row) => (
                <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                        <GraduationCap className="w-4 h-4" />
                    </span>
                    <div>
                        <span className="font-bold text-slate-800 block text-sm">{row.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">
                            Kode: {row.code}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            key: 'institution',
            label: 'Institusi / Lembaga',
            render: (row) => {
                const inst = row.institution || row.education?.institution;
                return (
                    <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                            <School className="w-3.5 h-3.5 text-emerald-700" />
                        </span>
                        <div>
                            <span className="font-semibold text-slate-800 text-xs block">
                                {inst?.name || row.education?.name || 'Umum'}
                            </span>
                            {inst?.registration_number && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                    NSP: {inst.registration_number}
                                </span>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'groups_count',
            label: 'Rombel Aktif',
            render: (row) => (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-semibold bg-slate-100 px-2.5 py-1 rounded">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    {row.class_groups ? `${row.class_groups.length} Rombel` : '0 Rombel'}
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
                        title="Edit Kelas"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="Hapus Kelas"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <span className="p-2 bg-emerald-50 text-emerald-700 rounded-md">
                            <GraduationCap className="w-5 h-5" />
                        </span>
                        Tingkat Kelas (Jenjang Belajar)
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Kelola tingkatan kelas diniyah &amp; formal (contoh: Ula Kelas 1, 2, 3, Wustha, Ulya, Takhossus) per institusi pendidikan.
                    </p>
                </div>
                <div>
                    <button
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0b57d0] text-white font-semibold text-sm rounded-md hover:bg-[#0842a0] transition shadow-sm cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Tingkat Kelas
                    </button>
                </div>
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={classes}
                isLoading={isLoading}
                emptyMessage="Belum ada tingkat kelas terdaftar"
                filters={
                    <div className="flex items-center gap-1.5">
                        <select
                            value={instFilter}
                            onChange={(e) => setInstFilter(e.target.value)}
                            className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-md bg-white text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-[#093c30] focus:border-[#093c30] transition-colors cursor-pointer shadow-2xs"
                        >
                            <option value="">Semua Lembaga</option>
                            {institutions.map((inst) => (
                                <option key={inst.id} value={inst.id}>{inst.name}</option>
                            ))}
                        </select>
                    </div>
                }
            />

            {/* Modal Tambah/Edit Kelas */}
            <Modal
                open={modalOpen}
                title={editingItem ? 'Edit Tingkat Kelas' : 'Tambah Tingkat Kelas Baru'}
                onClose={() => setModalOpen(false)}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Nama Tingkat Kelas *
                        </label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Contoh: Ula Kelas 1, Wustha Kelas 2, Kelas 7"
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Kode Kelas *
                        </label>
                        <input
                            type="text"
                            required
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="Contoh: ULA-1, WST-2, TK-1"
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Institusi / Lembaga *
                        </label>
                        <select
                            required
                            value={institutionId}
                            onChange={(e) => setInstitutionId(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                        >
                            <option value="">-- Pilih Institusi / Lembaga --</option>
                            {institutions.map((inst) => (
                                <option key={inst.id} value={inst.id}>
                                    {inst.name} ({inst.short_name || inst.name})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating || isUpdating}
                            className="px-4 py-2 text-sm font-semibold text-white bg-[#0b57d0] rounded-md hover:bg-[#0842a0] disabled:opacity-50 cursor-pointer"
                        >
                            {isCreating || isUpdating ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Confirm Dialog */}
            <ConfirmDialog
                open={!!deleteTarget}
                title="Hapus Tingkat Kelas"
                message={`Yakin ingin menghapus tingkat kelas ${deleteTarget?.name} (${deleteTarget?.code})?`}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                isLoading={isDeleting}
            />
        </div>
    );
}
