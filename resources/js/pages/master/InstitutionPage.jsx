import React, { useState } from 'react';
import { 
    useGetInstitutionsQuery, 
    useCreateInstitutionMutation, 
    useUpdateInstitutionMutation, 
    useDeleteInstitutionMutation,
    useGetEducationsQuery,
    useCreateEducationMutation,
    useDeleteEducationMutation
} from '../../store/slices/institutionApi';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Plus, Edit2, Trash2, Layers, BookOpen } from 'lucide-react';
import { toast } from 'react-toastify';

export default function InstitutionPage() {
    const { data: response, isLoading } = useGetInstitutionsQuery();
    const institutions = response?.data || [];

    const [createInstitution, { isLoading: isCreating }] = useCreateInstitutionMutation();
    const [updateInstitution, { isLoading: isUpdating }] = useUpdateInstitutionMutation();
    const [deleteInstitution, { isLoading: isDeleting }] = useDeleteInstitutionMutation();

    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Form state
    const [name, setName] = useState('');
    const [shortName, setShortName] = useState('');
    const [progressionType, setProgressionType] = useState('semester');
    const [regNumber, setRegNumber] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');

    // Jenjang management modal state
    const [selectedInstForLevels, setSelectedInstForLevels] = useState(null);
    const [newLevelName, setNewLevelName] = useState('');
    const [newLevelOrder, setNewLevelOrder] = useState(1);
    const { data: educationsRes } = useGetEducationsQuery(selectedInstForLevels?.id, {
        skip: !selectedInstForLevels,
    });
    const educations = educationsRes?.data || [];
    const [createEducation] = useCreateEducationMutation();
    const [deleteEducation] = useDeleteEducationMutation();

    const openCreateModal = () => {
        setEditingItem(null);
        setName('');
        setShortName('');
        setProgressionType('semester');
        setRegNumber('');
        setPhone('');
        setEmail('');
        setAddress('');
        setModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setName(item.name);
        setShortName(item.short_name || '');
        setProgressionType(item.progression_type || 'semester');
        setRegNumber(item.registration_number || '');
        setPhone(item.phone || '');
        setEmail(item.email || '');
        setAddress(item.address || '');
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            name,
            short_name: shortName,
            progression_type: progressionType,
            registration_number: regNumber,
            phone,
            email,
            address,
        };

        try {
            if (editingItem) {
                await updateInstitution({ id: editingItem.id, ...payload }).unwrap();
                toast.success('Institusi berhasil diperbarui');
            } else {
                await createInstitution(payload).unwrap();
                toast.success('Institusi berhasil ditambahkan');
            }
            setModalOpen(false);
        } catch (err) {
            toast.error(err.data?.message || 'Gagal menyimpan institusi');
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteInstitution(deleteTarget.id).unwrap();
            toast.success('Institusi berhasil dihapus');
            setDeleteTarget(null);
        } catch (err) {
            toast.error(err.data?.message || 'Gagal menghapus institusi');
        }
    };

    const handleAddEducation = async (e) => {
        e.preventDefault();
        if (!newLevelName) return;
        try {
            await createEducation({
                educational_institution_id: selectedInstForLevels.id,
                name: newLevelName,
                level: parseInt(newLevelOrder, 10),
            }).unwrap();
            setNewLevelName('');
            setNewLevelOrder(educations.length + 2);
            toast.success('Jenjang berhasil ditambahkan');
        } catch (err) {
            toast.error(err.data?.message || 'Gagal menambah jenjang');
        }
    };

    const columns = [
        {
            key: 'name',
            label: 'Nama Lembaga',
            render: (row) => (
                <div>
                    <div className="font-semibold text-slate-900">{row.name}</div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">NSP/NPSN: {row.registration_number || '-'}</div>
                </div>
            ),
        },
        {
            key: 'short_name',
            label: 'Singkatan',
            render: (row) => <span className="font-medium text-slate-700">{row.short_name || '-'}</span>,
        },
        {
            key: 'progression_type',
            label: 'Model Kenaikan',
            render: (row) =>
                row.progression_type === 'leveling' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        Leveling Dinamis (Tahfidz)
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        Semesteran (Formal)
                    </span>
                ),
        },
        {
            key: 'educations',
            label: 'Tingkat / Jenjang',
            render: (row) => (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectedInstForLevels(row);
                        setNewLevelOrder((row.educations?.length || 0) + 1);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                >
                    <Layers className="w-3.5 h-3.5" />
                    {row.educations?.length || 0} Tingkat
                </button>
            ),
        },
        {
            key: 'actions',
            label: 'Aksi',
            render: (row) => (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => openEditModal(row)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-slate-100 transition-colors"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setDeleteTarget(row)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6 max-w-7xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Institusi & Jenjang Pendidikan</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Kelola data lembaga pendidikan (MTs, MA, SMP, Tahfidz) beserta model kenaikan kelasnya.
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-md text-sm font-semibold hover:bg-emerald-700 shadow-sm transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Tambah Lembaga
                </button>
            </div>

            <DataTable columns={columns} data={institutions} isLoading={isLoading} emptyMessage="Belum ada lembaga terdaftar" />

            {/* Modal Tambah/Edit Institusi */}
            <Modal
                open={modalOpen}
                title={editingItem ? 'Edit Institusi Pendidikan' : 'Tambah Institusi Pendidikan'}
                onClose={() => setModalOpen(false)}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Nama Lembaga *</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Contoh: Madrasah Tsanawiyah Al-Hikmah"
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Singkatan</label>
                            <input
                                type="text"
                                value={shortName}
                                onChange={(e) => setShortName(e.target.value)}
                                placeholder="MTs / MA / Tahfidz"
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">NSP / NPSN</label>
                            <input
                                type="text"
                                value={regNumber}
                                onChange={(e) => setRegNumber(e.target.value)}
                                placeholder="121232..."
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Model Kenaikan Kelas *</label>
                        <select
                            value={progressionType}
                            onChange={(e) => setProgressionType(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                        >
                            <option value="semester">Semesteran (Formal - SMP/SMA/MTs/MA)</option>
                            <option value="leveling">Leveling Dinamis (Tahfidz / Milestone Mingguan)</option>
                        </select>
                        <p className="text-xs text-slate-400 mt-1">
                            {progressionType === 'leveling'
                                ? 'Siswa dapat naik level sewaktu-waktu ketika target hafalan tercapai.'
                                : 'Kenaikan kelas berlangsung setahun sekali / berbasis semester genap.'}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Telepon</label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="021-..."
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="mts@pesantren.id"
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
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
                            {isCreating || isUpdating ? 'Menyimpan...' : 'Simpan Institusi'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Kelola Jenjang / Tingkat per Institusi */}
            <Modal
                open={!!selectedInstForLevels}
                title={`Jenjang / Tingkat: ${selectedInstForLevels?.name || ''}`}
                onClose={() => setSelectedInstForLevels(null)}
            >
                <div className="space-y-5">
                    <form onSubmit={handleAddEducation} className="flex gap-2">
                        <input
                            type="text"
                            required
                            placeholder={selectedInstForLevels?.progression_type === 'leveling' ? 'Contoh: Juz 30' : 'Contoh: Kelas 7'}
                            value={newLevelName}
                            onChange={(e) => setNewLevelName(e.target.value)}
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                        <input
                            type="number"
                            min="1"
                            required
                            placeholder="Level"
                            value={newLevelOrder}
                            onChange={(e) => setNewLevelOrder(e.target.value)}
                            className="w-20 px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                        <button
                            type="submit"
                            className="px-3.5 py-2 bg-emerald-600 text-white rounded-md text-sm font-semibold hover:bg-emerald-700 flex items-center gap-1"
                        >
                            <Plus className="w-4 h-4" /> Tambah
                        </button>
                    </form>

                    <div className="border border-slate-200 rounded-md divide-y divide-slate-100 max-h-64 overflow-y-auto">
                        {educations.length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-400">Belum ada tingkat terdaftar</div>
                        ) : (
                            educations.map((item) => (
                                <div key={item.id} className="p-3 flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-3">
                                        <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">
                                            {item.level}
                                        </span>
                                        <span className="font-semibold text-slate-800">{item.name}</span>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            try {
                                                await deleteEducation(item.id).unwrap();
                                                toast.success('Jenjang dihapus');
                                            } catch (err) {
                                                toast.error('Gagal menghapus');
                                            }
                                        }}
                                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Modal>

            {/* Confirm Delete */}
            <ConfirmDialog
                open={!!deleteTarget}
                title="Hapus Institusi Pendidikan"
                message={`Yakin ingin menghapus ${deleteTarget?.name}? Data tingkat kelas terkait juga akan terhapus.`}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                isLoading={isDeleting}
            />
        </div>
    );
}
