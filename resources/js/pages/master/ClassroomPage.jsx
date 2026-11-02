import React, { useState } from 'react';
import {
    useGetClassroomsQuery,
    useCreateClassroomMutation,
    useUpdateClassroomMutation,
    useDeleteClassroomMutation,
} from '../../store/slices/classroomApi';
import { useGetInstitutionsQuery } from '../../store/slices/institutionApi';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import {
    Plus,
    Edit2,
    Trash2,
    DoorOpen,
    Building2,
    Users,
    Layers,
    Calendar,
    Sparkles,
    Search,
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function ClassroomPage() {
    const [instFilter, setInstFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const { data: instData } = useGetInstitutionsQuery();
    const institutions = instData?.data || [];

    const { data: classroomsData, isLoading } = useGetClassroomsQuery({
        ...(instFilter && { educational_institution_id: instFilter }),
        ...(searchQuery && { search: searchQuery }),
    });
    const classrooms = classroomsData?.data || [];

    const [createClassroom, { isLoading: isCreating }] = useCreateClassroomMutation();
    const [updateClassroom, { isLoading: isUpdating }] = useUpdateClassroomMutation();
    const [deleteClassroom, { isLoading: isDeleting }] = useDeleteClassroomMutation();

    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Form fields
    const [name, setName] = useState('');
    const [capacity, setCapacity] = useState(30);
    const [institutionId, setInstitutionId] = useState('');
    const [description, setDescription] = useState('');

    const openCreateModal = () => {
        setEditingItem(null);
        setName('');
        setCapacity(30);
        setInstitutionId(instFilter || (institutions[0]?.id ? String(institutions[0].id) : ''));
        setDescription('');
        setModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setName(item.name || '');
        setCapacity(item.capacity || 30);
        setInstitutionId(item.educational_institution_id ? String(item.educational_institution_id) : '');
        setDescription(item.description || '');
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            name,
            capacity: Number(capacity) || 30,
            educational_institution_id: institutionId ? Number(institutionId) : null,
            description,
        };

        try {
            if (editingItem) {
                await updateClassroom({ id: editingItem.id, ...payload }).unwrap();
                toast.success('Ruang kelas berhasil diperbarui');
            } else {
                await createClassroom(payload).unwrap();
                toast.success('Ruang kelas berhasil ditambahkan');
            }
            setModalOpen(false);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan ruang kelas');
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteClassroom(deleteTarget.id).unwrap();
            toast.success('Ruang kelas berhasil dihapus');
            setDeleteTarget(null);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menghapus ruang kelas');
        }
    };

    const columns = [
        {
            key: 'name',
            label: 'Nama Ruang Belajar',
            render: (row) => (
                <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100 shadow-2xs">
                        <DoorOpen className="w-5 h-5 text-emerald-700" />
                    </span>
                    <div>
                        <span className="font-bold text-slate-800 block text-sm">{row.name}</span>
                        {row.description && (
                            <span className="text-[11px] text-slate-400 block line-clamp-1">
                                {row.description}
                            </span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'institution',
            label: 'Institusi / Gedung',
            render: (row) => {
                const inst = row.educational_institution;
                return (
                    <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                            <Building2 className="w-3.5 h-3.5" />
                        </span>
                        <div>
                            <span className="font-semibold text-slate-800 text-xs block">
                                {inst?.name || 'Umum / Semua Institusi'}
                            </span>
                            {inst?.short_name && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                    {inst.short_name}
                                </span>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'capacity',
            label: 'Kapasitas',
            render: (row) => (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{row.capacity || 30} Santri</span>
                </div>
            ),
        },
        {
            key: 'usage',
            label: 'Penggunaan Aktif',
            render: (row) => (
                <div className="flex items-center gap-2">
                    <span
                        className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1"
                        title="Jumlah Rombel yang ditempatkan di ruang ini"
                    >
                        <Layers className="w-3 h-3" />
                        {row.class_groups_count || 0} Rombel
                    </span>
                    <span
                        className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1"
                        title="Jadwal Pelajaran KBM mingguan"
                    >
                        <Calendar className="w-3 h-3" />
                        {row.schedules_count || 0} Sesi KBM
                    </span>
                </div>
            ),
        },
        {
            key: 'actions',
            label: 'Aksi',
            render: (row) => (
                <div className="flex items-center justify-end gap-1">
                    <button
                        onClick={() => openEditModal(row)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                        title="Edit Ruang Kelas"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setDeleteTarget(row)}
                        disabled={row.class_groups_count > 0 || row.schedules_count > 0}
                        className={`p-1.5 rounded transition-colors ${
                            row.class_groups_count > 0 || row.schedules_count > 0
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                        }`}
                        title={
                            row.class_groups_count > 0 || row.schedules_count > 0
                                ? 'Tidak dapat dihapus karena masih digunakan'
                                : 'Hapus Ruang Kelas'
                        }
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header & Title */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <DoorOpen className="w-6 h-6 text-[#093c30]" />
                        Ruang Kelas & Tempat Belajar
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Kelola data fisik ruang belajar, gedung, dan laboratorium yang digunakan dalam penjadwalan KBM dan rombel santri.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={openCreateModal}
                        className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0b57d0] rounded-md hover:bg-[#0842a0] flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                        <Plus className="w-4 h-4" /> Tambah Ruang Kelas
                    </button>
                </div>
            </div>

            {/* Filter & Data Table */}
            <DataTable
                columns={columns}
                data={classrooms}
                isLoading={isLoading}
                searchPlaceholder="Cari nama ruang kelas atau deskripsi..."
                filterElement={
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-600">Filter Lembaga:</label>
                        <select
                            value={instFilter}
                            onChange={(e) => setInstFilter(e.target.value)}
                            className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-md bg-white text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-[#093c30] focus:border-[#093c30] transition-colors cursor-pointer shadow-2xs"
                        >
                            <option value="">Semua Institusi / Gedung</option>
                            {institutions.map((inst) => (
                                <option key={inst.id} value={inst.id}>
                                    {inst.name}
                                </option>
                            ))}
                        </select>
                    </div>
                }
            />

            {/* Modal Tambah/Edit Ruang Kelas */}
            <Modal
                open={modalOpen}
                title={editingItem ? 'Edit Ruang Belajar' : 'Tambah Ruang Belajar Baru'}
                onClose={() => setModalOpen(false)}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Nama Ruang Belajar *
                        </label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Contoh: Ruang 101, Gedung A-2, Lab Komputer, Aula Utama"
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Institusi / Lembaga
                            </label>
                            <select
                                value={institutionId}
                                onChange={(e) => setInstitutionId(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                            >
                                <option value="">-- Umum (Dapat digunakan semua) --</option>
                                {institutions.map((inst) => (
                                    <option key={inst.id} value={inst.id}>
                                        {inst.name} ({inst.short_name || inst.name})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Kapasitas Santri (Orang)
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="200"
                                value={capacity}
                                onChange={(e) => setCapacity(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Keterangan / Lokasi Gedung
                        </label>
                        <textarea
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Contoh: Lantai 2 Sayap Timur, Gedung Putra Asrama Utama"
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
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
                            className="px-4 py-2 text-sm font-semibold text-white bg-[#0b57d0] rounded-md hover:bg-[#0842a0] disabled:opacity-50 cursor-pointer shadow-xs"
                        >
                            {isCreating || isUpdating ? 'Menyimpan...' : 'Simpan Ruang'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                open={!!deleteTarget}
                title="Hapus Ruang Kelas"
                message={`Yakin ingin menghapus ruang belajar ${deleteTarget?.name}? Data historis penggunaan ruang mungkin akan terpengaruh.`}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                isLoading={isDeleting}
            />
        </div>
    );
}

