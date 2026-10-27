import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    useGetTeachersQuery, 
    useCreateTeacherMutation, 
    useUpdateTeacherMutation, 
    useDeleteTeacherMutation 
} from '../../store/slices/teacherApi';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Plus, Edit2, Trash2, ShieldAlert } from 'lucide-react';
import { toast } from 'react-toastify';

export default function TeacherPage() {
    const navigate = useNavigate();
    const [statusFilter, setStatusFilter] = useState('');
    const { data: response, isLoading } = useGetTeachersQuery(
        statusFilter ? { status: statusFilter } : undefined
    );
    const teachers = response?.data || [];

    const [createTeacher, { isLoading: isCreating }] = useCreateTeacherMutation();
    const [updateTeacher, { isLoading: isUpdating }] = useUpdateTeacherMutation();
    const [deleteTeacher, { isLoading: isDeleting }] = useDeleteTeacherMutation();

    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Form fields
    const [name, setName] = useState('');
    const [nip, setNip] = useState('');
    const [gender, setGender] = useState('L');
    const [status, setStatus] = useState('tetap');
    const [specialization, setSpecialization] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');

    const openCreateModal = () => {
        setEditingItem(null);
        setName('');
        setNip('');
        setGender('L');
        setStatus('tetap');
        setSpecialization('');
        setPhone('');
        setEmail('');
        setModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setName(item.name || '');
        setNip(item.nip || '');
        setGender(item.gender || 'L');
        setStatus(item.status || 'tetap');
        setSpecialization(item.specialization || '');
        setPhone(item.phone || '');
        setEmail(item.email || '');
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            name,
            nip: nip || null,
            gender,
            status,
            specialization: specialization || null,
            phone: phone || null,
            email: email || null,
        };

        try {
            if (editingItem) {
                await updateTeacher({ id: editingItem.id, ...payload }).unwrap();
                toast.success('Data guru berhasil diperbarui');
            } else {
                await createTeacher(payload).unwrap();
                toast.success('Guru baru berhasil didaftarkan');
            }
            setModalOpen(false);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan data guru');
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteTeacher(deleteTarget.id).unwrap();
            toast.success('Data guru berhasil dihapus');
            setDeleteTarget(null);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menghapus data guru');
        }
    };

    const columns = [
        {
            key: 'name',
            label: 'Nama & NIP',
            render: (row) => (
                <div>
                    <p className="font-semibold text-slate-900">{row.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">{row.nip ? `NIP: ${row.nip}` : 'NIP: -'}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            row.gender === 'L' ? 'bg-sky-50 text-sky-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                            {row.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            key: 'status',
            label: 'Kategori Status',
            render: (row) => {
                let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                let label = 'Guru Tetap';
                if (row.status === 'luar') {
                    badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
                    label = 'Guru Luar (Mandiri)';
                } else if (row.status === 'honorer') {
                    badgeClass = 'bg-sky-50 text-sky-700 border-sky-200';
                    label = 'Honorer';
                }
                return (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border ${badgeClass}`}>
                        {label}
                    </span>
                );
            },
        },
        {
            key: 'specialization',
            label: 'Bidang Keahlian',
            render: (row) => (
                <span className="text-sm text-slate-600 font-medium">
                    {row.specialization || '-'}
                </span>
            ),
        },
        {
            key: 'contact',
            label: 'Kontak',
            render: (row) => (
                <div className="text-xs space-y-0.5">
                    <p className="text-slate-700 font-medium">{row.phone || '-'}</p>
                    <p className="text-slate-400">{row.email || '-'}</p>
                </div>
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
                        title="Edit Guru"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="Hapus Guru"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Data Guru & Pendidik</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Kelola data dewan guru pesantren, guru honorer, dan guru luar madrasah.
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-semibold text-sm rounded-md hover:bg-emerald-700 transition shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Tambah Guru
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 border-b border-slate-200 pb-2">
                {[
                    { label: 'Semua Status', value: '' },
                    { label: 'Guru Tetap', value: 'tetap' },
                    { label: 'Guru Honorer', value: 'honorer' },
                    { label: 'Guru Luar (Mandiri)', value: 'luar' },
                ].map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => setStatusFilter(tab.value)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                            statusFilter === tab.value
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Note banner */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 leading-relaxed">
                    <span className="font-bold">Akses Guru Luar:</span> Guru bertipe <em>Guru Luar</em> dapat masuk langsung melalui portal login mandiri tanpa melihat modul-modul kepesantrenan (kamtib, asrama, perizinan) sehingga antarmuka tetap bersih dan fokus pada KBM, absensi, serta input nilai.
                </div>
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={teachers}
                isLoading={isLoading}
                emptyMessage="Belum ada data guru terdaftar"
                onRowClick={(row) => navigate("/guru/" + row.id)}
            />

            {/* Form Modal */}
            <Modal
                open={modalOpen}
                title={editingItem ? 'Edit Data Guru' : 'Daftarkan Guru Baru'}
                onClose={() => setModalOpen(false)}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Nama Lengkap & Gelar *</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ust. Ahmad Zaki, S.Pd.I"
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">NIP / NUPTK</label>
                            <input
                                type="text"
                                value={nip}
                                onChange={(e) => setNip(e.target.value)}
                                placeholder="198501..."
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Jenis Kelamin *</label>
                            <select
                                value={gender}
                                onChange={(e) => setGender(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                            >
                                <option value="L">Laki-laki</option>
                                <option value="P">Perempuan</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Status Kepegawaian *</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                            >
                                <option value="tetap">Guru Tetap Pesantren</option>
                                <option value="honorer">Guru Honorer</option>
                                <option value="luar">Guru Luar (Hanya Mengajar Mapel)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Bidang Keahlian / Mapel</label>
                            <input
                                type="text"
                                value={specialization}
                                onChange={(e) => setSpecialization(e.target.value)}
                                placeholder="Matematika / Fiqih"
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">No. WhatsApp / HP</label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="08123456789"
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="guru@tarbiyah.id"
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
                            {isCreating || isUpdating ? 'Menyimpan...' : 'Simpan Data'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Confirm Dialog */}
            <ConfirmDialog
                open={!!deleteTarget}
                title="Hapus Data Guru"
                message={`Yakin ingin menghapus guru ${deleteTarget?.name}?`}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                isLoading={isDeleting}
            />
        </div>
    );
}
