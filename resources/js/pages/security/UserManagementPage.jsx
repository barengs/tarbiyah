import React, { useState, useMemo } from 'react';
import {
    Plus,
    Edit2,
    Trash2,
    KeyRound,
    Mail,
    Shield,
    Save,
    Loader2,
    Filter,
} from 'lucide-react';
import {
    useGetUsersQuery,
    useGetRolesQuery,
    useCreateUserMutation,
    useUpdateUserMutation,
    useDeleteUserMutation,
    useResetUserPasswordMutation,
} from '../../store/slices/securityApi';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { toast } from 'react-toastify';

export default function UserManagementPage() {
    const [roleFilter, setRoleFilter] = useState('');

    const { data: usersRes, isLoading: usersLoading } = useGetUsersQuery({
        role: roleFilter,
        all: 'true',
    });
    const { data: rolesRes } = useGetRolesQuery();

    const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
    const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
    const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();
    const [resetPassword, { isLoading: isResetting }] = useResetUserPasswordMutation();

    const usersData = usersRes?.data?.data || usersRes?.data || [];
    const roles = rolesRes?.data || [];

    // Modal Add / Edit User
    const [userModalOpen, setUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [userForm, setUserForm] = useState({
        name: '',
        email: '',
        password: '',
        roles: ['staf'],
    });

    // Modal Reset Password
    const [resetModalOpen, setResetModalOpen] = useState(false);
    const [resetTargetUser, setResetTargetUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');

    // Confirm Delete
    const [deleteTargetUser, setDeleteTargetUser] = useState(null);

    const handleOpenUserModal = (user = null) => {
        if (user) {
            setEditingUser(user);
            setUserForm({
                name: user.name || '',
                email: user.email || '',
                password: '',
                roles: user.roles?.map((r) => r.name) || [user.role || 'staf'],
            });
        } else {
            setEditingUser(null);
            setUserForm({
                name: '',
                email: '',
                password: '',
                roles: ['staf'],
            });
        }
        setUserModalOpen(true);
    };

    const handleUserSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingUser) {
                const payload = {
                    id: editingUser.id,
                    name: userForm.name,
                    email: userForm.email,
                    roles: userForm.roles,
                    role: userForm.roles[0] || 'staf',
                };
                if (userForm.password) {
                    payload.password = userForm.password;
                }
                await updateUser(payload).unwrap();
                toast.success('Pengguna berhasil diperbarui');
            } else {
                await createUser({
                    name: userForm.name,
                    email: userForm.email,
                    password: userForm.password,
                    roles: userForm.roles,
                    role: userForm.roles[0] || 'staf',
                }).unwrap();
                toast.success('Pengguna baru berhasil ditambahkan');
            }
            setUserModalOpen(false);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan data pengguna');
        }
    };

    const handleDeleteUser = async () => {
        if (!deleteTargetUser) return;
        try {
            await deleteUser(deleteTargetUser.id).unwrap();
            toast.success(`Pengguna ${deleteTargetUser.name} berhasil dihapus`);
            setDeleteTargetUser(null);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menghapus pengguna');
        }
    };

    const handleOpenResetModal = (user) => {
        setResetTargetUser(user);
        setNewPassword('');
        setResetModalOpen(true);
    };

    const handleResetSubmit = async (e) => {
        e.preventDefault();
        if (!resetTargetUser) return;

        try {
            await resetPassword({ id: resetTargetUser.id, password: newPassword }).unwrap();
            toast.success(`Kata sandi untuk ${resetTargetUser.name} berhasil diubah`);
            setResetModalOpen(false);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal memperbarui kata sandi');
        }
    };

    const toggleFormRole = (roleName) => {
        setUserForm((prev) => {
            const has = prev.roles.includes(roleName);
            if (has) {
                if (prev.roles.length === 1) return prev; // Minimal 1 role
                return { ...prev, roles: prev.roles.filter((r) => r !== roleName) };
            }
            return { ...prev, roles: [...prev.roles, roleName] };
        });
    };

    const getRoleBadgeClass = (roleName) => {
        switch (roleName?.toLowerCase()) {
            case 'superadmin':
                return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'admin':
                return 'bg-emerald-50 text-emerald-800 border-emerald-200';
            case 'asatidz':
            case 'guru':
                return 'bg-amber-50 text-amber-800 border-amber-200';
            case 'walikelas':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const columns = useMemo(
        () => [
            {
                key: 'name',
                label: 'Nama & Kontak Pengguna',
                render: (row) => (
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#093c30] font-bold text-xs flex items-center justify-center border border-emerald-200 shrink-0">
                            {row.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-slate-900 leading-tight">{row.name}</p>
                            <p className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{row.email}</span>
                            </p>
                        </div>
                    </div>
                ),
            },
            {
                key: 'roles',
                label: 'Peran (Role)',
                render: (row) => {
                    const userRoles = row.roles || [];
                    const displayRoles = userRoles.length > 0 ? userRoles : [{ id: 0, name: row.role || 'staf' }];
                    return (
                        <div className="flex flex-wrap gap-1">
                            {displayRoles.map((r) => (
                                <span
                                    key={r.id || r.name}
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border uppercase tracking-wider ${getRoleBadgeClass(
                                        r.name
                                    )}`}
                                >
                                    {r.name}
                                </span>
                            ))}
                        </div>
                    );
                },
            },
            {
                key: 'status',
                label: 'Status Akun',
                render: () => (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Akun Aktif
                    </span>
                ),
            },
            {
                key: 'actions',
                label: 'Aksi',
                render: (row) => (
                    <div className="flex items-center justify-end gap-1">
                        <button
                            type="button"
                            onClick={() => handleOpenResetModal(row)}
                            title="Reset Kata Sandi"
                            className="p-1.5 rounded-md text-slate-400 hover:text-amber-600 hover:bg-slate-100 transition-colors"
                        >
                            <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => handleOpenUserModal(row)}
                            title="Edit Pengguna"
                            className="p-1.5 rounded-md text-slate-400 hover:text-[#093c30] hover:bg-slate-100 transition-colors"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setDeleteTargetUser(row)}
                            title="Hapus Pengguna"
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ),
            },
        ],
        []
    );

    return (
        <div className="space-y-6">
            {/* Header info konsisten dengan modul lainnya */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manajemen Pengguna</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Kelola akun pengguna, hak akses peran sistem pesantren, dan pengaturan kata sandi.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleOpenUserModal(null)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#093c30] text-white font-semibold text-sm rounded-md hover:bg-[#072d24] transition shadow-xs"
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Pengguna
                    </button>
                </div>
            </div>

            {/* Filter Lanjutan */}
            <div className="p-3 bg-white border border-slate-200 rounded-md shadow-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <Filter className="w-4 h-4 text-emerald-700" />
                    <span>Filter Peran:</span>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="px-3 py-1.5 border border-slate-300 rounded-md text-xs font-normal focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                        <option value="">Semua Peran ({roles.length})</option>
                        {roles.map((r) => (
                            <option key={r.id} value={r.name}>
                                {r.name.toUpperCase()}
                            </option>
                        ))}
                    </select>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                    Total: <strong className="text-slate-800">{usersData.length}</strong> pengguna
                </span>
            </div>

            {/* Tabel Data Konsisten TanStack */}
            <DataTable
                columns={columns}
                data={usersData}
                isLoading={usersLoading}
                searchPlaceholder="Cari nama atau email pengguna..."
                emptyMessage="Tidak ada data pengguna yang cocok"
            />

            {/* Modal Tambah / Edit Pengguna */}
            <Modal
                open={userModalOpen}
                title={editingUser ? `Edit Pengguna: ${editingUser.name}` : 'Tambah Pengguna Baru'}
                onClose={() => setUserModalOpen(false)}
            >
                <form onSubmit={handleUserSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Nama Lengkap *
                        </label>
                        <input
                            type="text"
                            required
                            value={userForm.name}
                            onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                            placeholder="Contoh: Ust. Abdullah Syukri, M.Pd."
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Alamat Email (Login) *
                        </label>
                        <input
                            type="email"
                            required
                            value={userForm.email}
                            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                            placeholder="nama@tarbiyah.id"
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            {editingUser ? 'Kata Sandi Baru (Kosongkan bila tidak diubah)' : 'Kata Sandi Awal *'}
                        </label>
                        <input
                            type="password"
                            required={!editingUser}
                            minLength={6}
                            value={userForm.password}
                            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                            placeholder="Minimal 6 karakter"
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div className="pt-1">
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                            Pilih Peran Sistem (Role) *
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {roles.map((r) => {
                                const isChecked = userForm.roles.includes(r.name);
                                return (
                                    <label
                                        key={r.id}
                                        className={`flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer transition-all ${
                                            isChecked
                                                ? 'bg-emerald-50 border-emerald-500 text-[#093c30] font-semibold'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => toggleFormRole(r.name)}
                                            className="w-3.5 h-3.5 text-[#093c30] rounded border-slate-300 focus:ring-emerald-500"
                                        />
                                        <span className="capitalize">{r.name}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setUserModalOpen(false)}
                            className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating || isUpdating}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#093c30] text-white text-sm font-semibold rounded-md hover:bg-[#072d24] transition-colors disabled:opacity-50 shadow-xs"
                        >
                            {isCreating || isUpdating ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            Simpan Pengguna
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Reset Password */}
            <Modal
                open={resetModalOpen && Boolean(resetTargetUser)}
                title={`Reset Kata Sandi: ${resetTargetUser?.name || ''}`}
                onClose={() => setResetModalOpen(false)}
            >
                <form onSubmit={handleResetSubmit} className="space-y-4">
                    <p className="text-xs text-slate-600 leading-relaxed">
                        Masukkan kata sandi baru untuk pengguna{' '}
                        <strong className="text-slate-900">{resetTargetUser?.name}</strong> (
                        <span className="font-mono text-slate-500">{resetTargetUser?.email}</span>):
                    </p>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Kata Sandi Baru *
                        </label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Minimal 6 karakter"
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setResetModalOpen(false)}
                            className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isResetting}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-md hover:bg-amber-700 transition-colors disabled:opacity-50 shadow-xs"
                        >
                            {isResetting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <KeyRound className="w-4 h-4" />
                            )}
                            Perbarui Kata Sandi
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Confirm Dialog Hapus */}
            <ConfirmDialog
                open={Boolean(deleteTargetUser)}
                title="Hapus Pengguna"
                message={`Apakah Anda yakin ingin menghapus akun pengguna "${deleteTargetUser?.name}" (${deleteTargetUser?.email})? Tindakan ini tidak dapat dibatalkan.`}
                onConfirm={handleDeleteUser}
                onCancel={() => setDeleteTargetUser(null)}
                isLoading={isDeleting}
            />
        </div>
    );
}
