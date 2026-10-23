import React, { useState } from 'react';
import { 
    useGetEducationClassesQuery, 
    useCreateEducationClassMutation, 
    useUpdateEducationClassMutation, 
    useDeleteEducationClassMutation 
} from '../../store/slices/educationClassApi';
import { useGetInstitutionsQuery, useGetEducationsQuery } from '../../store/slices/institutionApi';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Plus, Edit2, Trash2, GraduationCap, School, Layers, Users } from 'lucide-react';
import { toast } from 'react-toastify';

export default function EducationClassPage() {
    const [instFilter, setInstFilter] = useState('');
    const [educationFilter, setEducationFilter] = useState('');

    const { data: instData } = useGetInstitutionsQuery();
    const institutions = instData?.data || [];

    const { data: eduData } = useGetEducationsQuery(instFilter || undefined);
    const educations = eduData?.data || [];

    const { data: classesData, isLoading } = useGetEducationClassesQuery({
        ...(instFilter && { educational_institution_id: instFilter }),
        ...(educationFilter && { education_id: educationFilter }),
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
    const [educationId, setEducationId] = useState('');

    const openCreateModal = () => {
        setEditingItem(null);
        setName('');
        setCode('');
        setEducationId(educationFilter || (educations[0]?.id ? String(educations[0].id) : ''));
        setModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setName(item.name || '');
        setCode(item.code || '');
        setEducationId(item.education_id ? String(item.education_id) : '');
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            name,
            code,
            education_id: educationId ? Number(educationId) : null,
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
            key: 'education',
            label: 'Jenjang Pendidikan',
            render: (row) => (
                row.education ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <Layers className="w-3.5 h-3.5 text-emerald-600" />
                        {row.education.name} (Tingkat {row.education.level})
                    </span>
                ) : (
                    <span className="text-xs text-slate-400 italic">Tanpa Jenjang Khusus</span>
                )
            ),
        },
        {
            key: 'institution',
            label: 'Lembaga / Naungan',
            render: (row) => {
                const instName = row.education?.institution?.name;
                return (
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                        <School className="w-3.5 h-3.5 text-slate-400" />
                        {instName || 'Umum (Lintas Lembaga)'}
                    </span>
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
                        Kelola tingkatan kelas formal &amp; diniyah (contoh: Kelas 7, 8, 9, Ula 1, 2, 3, Wustha, Ulya) per jenjang pendidikan.
                    </p>
                </div>
                <div>
                    <button
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-semibold text-sm rounded-md hover:bg-emerald-700 transition shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Tingkat Kelas
                    </button>
                </div>
            </div>

            {/* Filter Section */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Lembaga:</span>
                    <select
                        value={instFilter}
                        onChange={(e) => {
                            setInstFilter(e.target.value);
                            setEducationFilter('');
                        }}
                        className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="">Semua Lembaga</option>
                        {institutions.map((inst) => (
                            <option key={inst.id} value={inst.id}>{inst.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Jenjang:</span>
                    <select
                        value={educationFilter}
                        onChange={(e) => setEducationFilter(e.target.value)}
                        className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="">Semua Jenjang</option>
                        {educations.map((edu) => (
                            <option key={edu.id} value={edu.id}>{edu.name} (Tk. {edu.level})</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={classes}
                isLoading={isLoading}
                emptyMessage="Belum ada tingkat kelas terdaftar"
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
                            placeholder="Contoh: Kelas 7, Kelas 8, Ula Kelas 1"
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
                            placeholder="Contoh: KLS-7, ULA-1, WST-2"
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Jenjang Pendidikan (Education) *
                        </label>
                        <select
                            value={educationId}
                            onChange={(e) => setEducationId(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                        >
                            <option value="">-- Pilih Jenjang Pendidikan --</option>
                            {educations.map((edu) => (
                                <option key={edu.id} value={edu.id}>
                                    {edu.name} (Tingkat {edu.level}) {edu.institution ? `- ${edu.institution.name}` : ''}
                                </option>
                            ))}
                        </select>
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
                title="Hapus Tingkat Kelas"
                message={`Yakin ingin menghapus tingkat kelas ${deleteTarget?.name} (${deleteTarget?.code})?`}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                isLoading={isDeleting}
            />
        </div>
    );
}
