import React, { useState } from 'react';
import { 
    useGetStudentsQuery, 
    useCreateStudentMutation, 
    useUpdateStudentMutation, 
    useDeleteStudentMutation,
    usePullStudentsFromSmptMutation
} from '../store/slices/studentApi';
import DataTable from '../components/ui/DataTable';
import FlatTabs from '../components/atoms/FlatTabs';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Plus, Edit2, Trash2, Users, Home, School, Search, Info, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';

export default function StudentPage() {
    const [mukimFilter, setMukimFilter] = useState('all'); // 'all', 'mukim', 'luar'
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');

    const queryParams = {
        ...(mukimFilter === 'mukim' && { is_mukim: 'true' }),
        ...(mukimFilter === 'luar' && { is_mukim: 'false' }),
        ...(statusFilter && { status: statusFilter }),
        ...(search && { search }),
    };

    const { data: response, isLoading } = useGetStudentsQuery(queryParams);
    const students = response?.data || [];
    const meta = response?.meta || {};

    const [createStudent, { isLoading: isCreating }] = useCreateStudentMutation();
    const [updateStudent, { isLoading: isUpdating }] = useUpdateStudentMutation();
    const [deleteStudent, { isLoading: isDeleting }] = useDeleteStudentMutation();
    const [pullStudents, { isLoading: isPulling }] = usePullStudentsFromSmptMutation();

    const handlePullFromSmpt = async () => {
        try {
            const res = await pullStudents().unwrap();
            toast.success(res?.message || 'Data santri berhasil ditarik dari SMPT');
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menarik data dari SMPT');
        }
    };

    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Form fields
    const [nis, setNis] = useState('');
    const [nisn, setNisn] = useState('');
    const [nik, setNik] = useState('');
    const [name, setName] = useState('');
    const [gender, setGender] = useState('L');
    const [isMukim, setIsMukim] = useState(false); // default form pendaftaran manual: siswa reguler luar
    const [bornIn, setBornIn] = useState('');
    const [bornAt, setBornAt] = useState('');
    const [parentName, setParentName] = useState('');
    const [parentPhone, setParentPhone] = useState('');
    const [address, setAddress] = useState('');
    const [status, setStatus] = useState('aktif');

    const openCreateModal = () => {
        setEditingItem(null);
        setNis('');
        setNisn('');
        setNik('');
        setName('');
        setGender('L');
        setIsMukim(false); // form manual dikhususkan untuk siswa luar
        setBornIn('');
        setBornAt('');
        setParentName('');
        setParentPhone('');
        setAddress('');
        setStatus('aktif');
        setModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setNis(item.nis || '');
        setNisn(item.nisn || '');
        setNik(item.nik || '');
        setName(item.name || '');
        setGender(item.gender || 'L');
        setIsMukim(Boolean(item.is_mukim));
        setBornIn(item.born_in || '');
        setBornAt(item.born_at ? item.born_at.substring(0, 10) : '');
        setParentName(item.parent_name || '');
        setParentPhone(item.parent_phone || '');
        setAddress(item.address || '');
        setStatus(item.status || 'aktif');
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            nis,
            nisn: nisn || null,
            nik: nik || null,
            name,
            gender,
            is_mukim: isMukim,
            born_in: bornIn || null,
            born_at: bornAt || null,
            parent_name: parentName || null,
            parent_phone: parentPhone || null,
            address: address || null,
            status,
        };

        try {
            if (editingItem) {
                await updateStudent({ id: editingItem.id, ...payload }).unwrap();
                toast.success('Data siswa berhasil diperbarui');
            } else {
                await createStudent(payload).unwrap();
                toast.success('Siswa berhasil didaftarkan');
            }
            setModalOpen(false);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan data siswa');
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteStudent(deleteTarget.id).unwrap();
            toast.success('Data siswa berhasil dihapus');
            setDeleteTarget(null);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menghapus data siswa');
        }
    };

    const columns = [
        {
            key: 'nis',
            label: 'Identitas Siswa',
            render: (row) => (
                <div>
                    <p className="font-semibold text-slate-900">{row.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500 font-mono">NIS: {row.nis}</span>
                        {row.nisn && <span className="text-xs text-slate-400 font-mono">NISN: {row.nisn}</span>}
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
            key: 'mukim_type',
            label: 'Tipe Kesiswaan',
            render: (row) => (
                row.is_mukim ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Home className="w-3.5 h-3.5 text-emerald-600" />
                        Santri Mukim (90%)
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <School className="w-3.5 h-3.5 text-indigo-600" />
                        Siswa Reguler Luar (10%)
                    </span>
                )
            ),
        },
        {
            key: 'parent',
            label: 'Wali / Orang Tua',
            render: (row) => (
                <div className="text-xs space-y-0.5">
                    <p className="text-slate-700 font-medium">{row.parent_name || '-'}</p>
                    <p className="text-slate-400">{row.parent_phone || '-'}</p>
                </div>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            render: (row) => {
                let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                if (row.status === 'lulus') badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
                if (row.status === 'mutasi') badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
                if (row.status === 'keluar') badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';

                return (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border capitalize ${badgeClass}`}>
                        {row.status || 'aktif'}
                    </span>
                );
            },
        },
        {
            key: 'actions',
            label: 'Aksi',
            render: (row) => (
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={(e) => { e.stopPropagation(); openEditModal(row); }}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                        title="Edit Siswa"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="Hapus Siswa"
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
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Data Siswa / Murid</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Daftar seluruh siswa madrasah, memisahkan perlakuan santri mukim pesantren dan murid reguler luar (kalong).
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePullFromSmpt}
                        disabled={isPulling}
                        className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-300 text-slate-700 font-semibold text-sm rounded-md hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
                        title="Tarik seluruh santri aktif dari sistem kepesantrenan (SMPT)"
                    >
                        <RefreshCw className={`w-4 h-4 text-emerald-600 ${isPulling ? "animate-spin" : ""}`} />
                        {isPulling ? "Menarik Data..." : "Tarik Data dari SMPT"}
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 text-white font-semibold text-sm rounded-md hover:bg-emerald-800 transition shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Daftar Siswa Luar
                    </button>
                </div>
            </div>

            {/* Banner Penjelasan Dualitas Kesiswaan */}
            <div className="p-4 bg-slate-100 border border-slate-200 rounded-md flex items-start gap-3">
                <Info className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 leading-relaxed space-y-1">
                    <p>
                        <span className="font-bold text-slate-800">Santri Mukim (~90%):</span> Terintegrasi otomatis melalui sinkronisasi data master santri pesantren (<code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">smpt</code>) dengan ID referensi santri.
                    </p>
                    <p>
                        <span className="font-bold text-slate-800">Siswa Reguler Luar (~10%):</span> Siswa non-mukim yang hanya bersekolah formal/madrasah dan tidak tinggal di asrama pesantren. Pendaftaran dilakukan langsung di modul ini.
                    </p>
                </div>
            </div>

            {/* Flat Tab & Tabel Kesiswaan Ramping */}
            <div className="space-y-2.5">
                <FlatTabs
                    tabs={[
                        { label: 'Semua Siswa', value: 'all' },
                        { label: 'Santri Mukim (90%)', value: 'mukim' },
                        { label: 'Siswa Luar (10%)', value: 'luar' },
                    ]}
                    activeTab={mukimFilter}
                    onChange={(val) => setMukimFilter(val || 'all')}
                />

                {/* Table */}
                <DataTable
                    columns={columns}
                    data={students}
                    isLoading={isLoading}
                    emptyMessage="Belum ada data siswa ditemukan"
                />
            </div>

            {/* Form Modal */}
            <Modal
                open={modalOpen}
                title={editingItem ? 'Edit Data Siswa' : 'Pendaftaran Siswa Baru'}
                onClose={() => setModalOpen(false)}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Tipe Kesiswaan *</label>
                        <div className="mt-1 grid grid-cols-2 gap-3">
                            <label className={`flex items-center gap-2 p-3 border rounded-md cursor-pointer text-xs font-semibold ${
                                !isMukim ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-slate-200 text-slate-600'
                            }`}>
                                <input
                                    type="radio"
                                    name="is_mukim"
                                    checked={!isMukim}
                                    onChange={() => setIsMukim(false)}
                                    className="text-indigo-600"
                                />
                                Siswa Reguler Luar (Kalong)
                            </label>
                            <label className={`flex items-center gap-2 p-3 border rounded-md cursor-pointer text-xs font-semibold ${
                                isMukim ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 text-slate-600'
                            }`}>
                                <input
                                    type="radio"
                                    name="is_mukim"
                                    checked={isMukim}
                                    onChange={() => setIsMukim(true)}
                                    className="text-emerald-600"
                                />
                                Santri Mukim Pesantren
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Nama Lengkap Siswa *</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Contoh: Muhammad Farhan"
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">NIS (Nomor Induk Siswa) *</label>
                            <input
                                type="text"
                                required
                                value={nis}
                                onChange={(e) => setNis(e.target.value)}
                                placeholder="Contoh: 20260001"
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">NISN</label>
                            <input
                                type="text"
                                value={nisn}
                                onChange={(e) => setNisn(e.target.value)}
                                placeholder="Contoh: 0081234567"
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Jenis Kelamin *</label>
                            <select
                                value={gender}
                                onChange={(e) => setGender(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                            >
                                <option value="L">Laki-laki (Ikhwan)</option>
                                <option value="P">Perempuan (Akhwat)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Status Siswa *</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                            >
                                <option value="aktif">Aktif</option>
                                <option value="lulus">Lulus</option>
                                <option value="mutasi">Mutasi</option>
                                <option value="keluar">Keluar / Dikeluarkan</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Tempat Lahir</label>
                            <input
                                type="text"
                                value={bornIn}
                                onChange={(e) => setBornIn(e.target.value)}
                                placeholder="Jakarta"
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Tanggal Lahir</label>
                            <input
                                type="date"
                                value={bornAt}
                                onChange={(e) => setBornAt(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Nama Orang Tua / Wali</label>
                            <input
                                type="text"
                                value={parentName}
                                onChange={(e) => setParentName(e.target.value)}
                                placeholder="Nama ayah / ibu / wali"
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">No. WhatsApp Wali</label>
                            <input
                                type="text"
                                value={parentPhone}
                                onChange={(e) => setParentPhone(e.target.value)}
                                placeholder="08..."
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Alamat Domisili</label>
                        <textarea
                            rows={2}
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Alamat tempat tinggal siswa saat ini..."
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
                            {isCreating || isUpdating ? 'Menyimpan...' : 'Simpan Siswa'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Confirm Dialog */}
            <ConfirmDialog
                open={!!deleteTarget}
                title="Hapus Data Siswa"
                message={`Yakin ingin menghapus siswa ${deleteTarget?.name}?`}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                isLoading={isDeleting}
            />
        </div>
    );
}
