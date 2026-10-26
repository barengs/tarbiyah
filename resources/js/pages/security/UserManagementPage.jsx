import React, { useState } from 'react';
import {
    UserCog,
    Plus,
    Edit2,
    Trash2,
    KeyRound,
    Search,
    Shield,
    Loader2,
    Mail,
    User as UserIcon,
    Save,
    X,
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
import { toast } from 'react-toastify';

export default function UserManagementPage() {
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [page, setPage] = useState(1);

    const { data: usersRes, isLoading: usersLoading } = useGetUsersQuery({
        search,
        role: roleFilter,
        page,
        per_page: 15,
    });
    const { data: rolesRes } = useGetRolesQuery();

    const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
    const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
    const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();
    const [resetPassword, { isLoading: isResetting }] = useResetUserPasswordMutation();

    const usersData = usersRes?.data?.data || [];
    const totalUsers = usersRes?.data?.total || 0;
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
                toast.success('Pengguna berhasil diperbarui.');
            } else {
                await createUser({
                    name: userForm.name,
                    email: userForm.email,
                    password: userForm.password,
                    roles: userForm.roles,
                    role: userForm.roles[0] || 'staf',
                }).unwrap();
                toast.success('Pengguna baru berhasil ditambahkan.');
            }
            setUserModalOpen(false);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan pengguna.');
        }
    };

    const handleDeleteUser = async (user) => {
        if (window.confirm(`Yakin ingin menghapus pengguna "${user.name}" (${user.email})?`)) {
            try {
                await deleteUser(user.id).unwrap();
                toast.success('Pengguna berhasil dihapus.');
            } catch (err) {
                toast.error(err?.data?.message || 'Gagal menghapus pengguna.');
            }
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
            toast.success(`Password untuk ${resetTargetUser.name} berhasil diubah.`);
            setResetModalOpen(false);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal me-reset password.');
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <UserCog className="w-5 h-5 text-[#093c30]" />
                        Manajemen Pengguna (User Management)
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Kelola akun pengguna, hak akses peran sistem pesantren, dan pengaturan kata sandi.
                    </p>
                </div>
                <button
                    onClick={() => handleOpenUserModal(null)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#093c30] hover:bg-[#072d24] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors shrink-0"
                >
                    <Plus className="w-4 h-4" />
                    Tambah Pengguna
                </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari nama atau email pengguna..."
                        className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#093c30]"
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#093c30] bg-white w-full sm:w-48"
                    >
                        <option value="">Semua Role ({roles.length})</option>
                        {roles.map((r) => (
                            <option key={r.id} value={r.name}>
                                {r.name.toUpperCase()}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table Users */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-5 py-3">Nama & Kontak</th>
                                <th className="px-4 py-3">Peran (Role)</th>
                                <th className="px-4 py-3">Status Autentikasi</th>
                                <th className="px-5 py-3 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {usersLoading ? (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center text-slate-400">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#093c30] mb-2" />
                                        Memuat daftar pengguna...
                                    </td>
                                </tr>
                            ) : usersData.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center text-slate-400">
                                        Tidak ada pengguna yang cocok dengan kriteria pencarian.
                                    </td>
                                </tr>
                            ) : (
                                usersData.map((u) => {
                                    const userRoles = u.roles || [];
                                    const isSuper = userRoles.some((r) => r.name === 'superadmin');

                                    return (
                                        <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#093c30] font-bold text-xs flex items-center justify-center border border-emerald-200 shrink-0">
                                                        {u.name?.charAt(0)?.toUpperCase() || 'U'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-slate-900 truncate">{u.name}</p>
                                                        <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                                                            <Mail className="w-3 h-3 text-slate-400" />
                                                            {u.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex flex-wrap gap-1">
                                                    {userRoles.length > 0 ? (
                                                        userRoles.map((r) => (
                                                            <span
                                                                key={r.id}
                                                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                                                    r.name === 'superadmin'
                                                                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                                                        : r.name === 'admin'
                                                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                                                        : r.name === 'asatidz'
                                                                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                                                        : r.name === 'walikelas'
                                                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                                                                }`}
                                                            >
                                                                {r.name}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                                                            {u.role || 'staf'}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    Akun Aktif
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleOpenResetModal(u)}
                                                        title="Reset Password"
                                                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                                                    >
                                                        <KeyRound className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenUserModal(u)}
                                                        title="Edit Pengguna"
                                                        className="p-1.5 text-slate-500 hover:text-[#093c30] hover:bg-emerald-50 rounded-md transition-colors"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(u)}
                                                        title="Hapus Pengguna"
                                                        disabled={isSuper && u.email === 'superadmin@tarbiyah.id'}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Total Pengguna: {totalUsers}</span>
                </div>
            </div>

            {/* Modal Tambah / Edit User */}
            {userModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-sm font-bold text-slate-800">
                                {editingUser ? `Edit Pengguna: ${editingUser.name}` : 'Tambah Pengguna Baru'}
                            </h3>
                            <button
                                onClick={() => setUserModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleUserSubmit} className="p-5 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700">Nama Lengkap *</label>
                                <input
                                    type="text"
                                    required
                                    value={userForm.name}
                                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                                    placeholder="Contoh: Ust. Abdullah Syukri"
                                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#093c30]"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700">Alamat Email *</label>
                                <input
                                    type="email"
                                    required
                                    value={userForm.email}
                                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                                    placeholder="email@pesantren.id"
                                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#093c30]"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700">
                                    {editingUser ? 'Kata Sandi Baru (Kosongkan jika tidak diubah)' : 'Kata Sandi Awal *'}
                                </label>
                                <input
                                    type="password"
                                    required={!editingUser}
                                    value={userForm.password}
                                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                                    placeholder="Minimal 6 karakter"
                                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#093c30]"
                                />
                            </div>

                            <div className="space-y-2 pt-1">
                                <label className="text-xs font-semibold text-slate-700">Pilih Peran (Role) *</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {roles.map((r) => {
                                        const isChecked = userForm.roles.includes(r.name);
                                        return (
                                            <label
                                                key={r.id}
                                                className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                                    isChecked
                                                        ? 'bg-emerald-50 border-[#093c30] text-[#093c30] font-bold'
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

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setUserModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating || isUpdating}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#093c30] hover:bg-[#072d24] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors disabled:opacity-50"
                                >
                                    {(isCreating || isUpdating) ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Save className="w-3.5 h-3.5" />
                                    )}
                                    Simpan Pengguna
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Reset Password */}
            {resetModalOpen && resetTargetUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <KeyRound className="w-4 h-4 text-amber-600" />
                                Reset Kata Sandi
                            </h3>
                            <button
                                onClick={() => setResetModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleResetSubmit} className="p-5 space-y-4">
                            <p className="text-xs text-slate-600">
                                Masukkan kata sandi baru untuk pengguna{' '}
                                <strong className="text-slate-900">{resetTargetUser.name}</strong> ({resetTargetUser.email}):
                            </p>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700">Kata Sandi Baru *</label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Minimal 6 karakter"
                                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#093c30]"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setResetModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isResetting}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors disabled:opacity-50"
                                >
                                    {isResetting ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <KeyRound className="w-3.5 h-3.5" />
                                    )}
                                    Ubah Kata Sandi
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
