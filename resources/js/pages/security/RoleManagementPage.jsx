import React, { useState, useEffect, useMemo } from 'react';
import {
    ShieldCheck,
    Plus,
    Edit2,
    Trash2,
    Check,
    Save,
    Loader2,
    Lock,
    LayoutGrid,
    KeyRound,
    CheckSquare,
    Square,
    AlertCircle,
    X,
} from 'lucide-react';
import {
    useGetRolesQuery,
    useGetMenusQuery,
    useGetPermissionsQuery,
    useCreateRoleMutation,
    useUpdateRoleMutation,
    useDeleteRoleMutation,
    useSyncRoleMenusMutation,
    useSyncRolePermissionsMutation,
} from '../../store/slices/securityApi';
import { toast } from 'react-toastify';

export default function RoleManagementPage() {
    const { data: rolesRes, isLoading: rolesLoading } = useGetRolesQuery();
    const { data: menusRes, isLoading: menusLoading } = useGetMenusQuery();
    const { data: permsRes, isLoading: permsLoading } = useGetPermissionsQuery();

    const [createRole, { isLoading: isCreatingRole }] = useCreateRoleMutation();
    const [updateRole, { isLoading: isUpdatingRole }] = useUpdateRoleMutation();
    const [deleteRole, { isLoading: isDeletingRole }] = useDeleteRoleMutation();
    const [syncMenus, { isLoading: isSyncingMenus }] = useSyncRoleMenusMutation();
    const [syncPerms, { isLoading: isSyncingPerms }] = useSyncRolePermissionsMutation();

    const roles = rolesRes?.data || [];
    const menus = menusRes?.data || [];
    const permissionGroups = permsRes?.data || []; // Array of { module, permissions: [{id, name, action}] }

    const [selectedRole, setSelectedRole] = useState(null);
    const [activeTab, setActiveTab] = useState('menus'); // 'menus' | 'permissions'
    const [checkedMenuIds, setCheckedMenuIds] = useState([]);
    const [checkedPermNames, setCheckedPermNames] = useState([]);

    const [roleModalOpen, setRoleModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [roleNameInput, setRoleNameInput] = useState('');

    // Default ke role pertama jika belum ada yang dipilih
    useEffect(() => {
        if (!selectedRole && roles.length > 0) {
            setSelectedRole(roles[0]);
        } else if (selectedRole) {
            const refreshed = roles.find((r) => r.id === selectedRole.id);
            if (refreshed) {
                setSelectedRole(refreshed);
            }
        }
    }, [roles]);

    // Saat selectedRole berganti, isi checked state
    useEffect(() => {
        if (selectedRole) {
            setCheckedMenuIds(selectedRole.menus?.map((m) => m.id) || []);
            setCheckedPermNames(selectedRole.permissions?.map((p) => p.name) || []);
        }
    }, [selectedRole]);

    // Toggle menu check
    const handleToggleMenu = (menuId, parentId = null, children = []) => {
        setCheckedMenuIds((prev) => {
            const isChecked = prev.includes(menuId);
            let next = isChecked ? prev.filter((id) => id !== menuId) : [...prev, menuId];

            // Jika parent dicentang, otomatis centang semua anaknya
            if (children && children.length > 0) {
                const childIds = children.map((c) => c.id);
                if (!isChecked) {
                    // check all children
                    next = Array.from(new Set([...next, ...childIds]));
                } else {
                    // uncheck all children
                    next = next.filter((id) => !childIds.includes(id));
                }
            }

            // Jika child dicentang, pastikan parent_id juga ikut tercentang
            if (!isChecked && parentId) {
                if (!next.includes(parentId)) {
                    next.push(parentId);
                }
            }

            return next;
        });
    };

    // Toggle single permission check
    const handleTogglePerm = (permName) => {
        setCheckedPermNames((prev) =>
            prev.includes(permName) ? prev.filter((n) => n !== permName) : [...prev, permName]
        );
    };

    // Toggle all permissions for a module row
    const handleToggleModuleRow = (modulePerms) => {
        const names = modulePerms.map((p) => p.name);
        const allChecked = names.every((n) => checkedPermNames.includes(n));

        if (allChecked) {
            setCheckedPermNames((prev) => prev.filter((n) => !names.includes(n)));
        } else {
            setCheckedPermNames((prev) => Array.from(new Set([...prev, ...names])));
        }
    };

    // Simpan Hak Akses Menu
    const handleSaveMenus = async () => {
        if (!selectedRole) return;
        try {
            await syncMenus({ id: selectedRole.id, menu_ids: checkedMenuIds }).unwrap();
            toast.success(`Hak akses menu untuk role ${selectedRole.name} berhasil disimpan.`);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan hak akses menu.');
        }
    };

    // Simpan Matriks Permission
    const handleSavePermissions = async () => {
        if (!selectedRole) return;
        try {
            await syncPerms({ id: selectedRole.id, permissions: checkedPermNames }).unwrap();
            toast.success(`Permission matrix untuk role ${selectedRole.name} berhasil disimpan.`);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan permission matrix.');
        }
    };

    // Modal Add / Edit Role
    const handleOpenRoleModal = (role = null) => {
        if (role) {
            setEditingRole(role);
            setRoleNameInput(role.name);
        } else {
            setEditingRole(null);
            setRoleNameInput('');
        }
        setRoleModalOpen(true);
    };

    const handleRoleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingRole) {
                await updateRole({ id: editingRole.id, name: roleNameInput }).unwrap();
                toast.success('Role berhasil diperbarui.');
            } else {
                const res = await createRole({ name: roleNameInput }).unwrap();
                toast.success('Role baru berhasil ditambahkan.');
                if (res?.data) {
                    setSelectedRole(res.data);
                }
            }
            setRoleModalOpen(false);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan data role.');
        }
    };

    const handleDeleteRole = async (role) => {
        if (['superadmin', 'admin', 'staf', 'asatidz', 'walikelas'].includes(role.name)) {
            toast.warning('Role bawaan sistem tidak boleh dihapus.');
            return;
        }

        if (window.confirm(`Yakin ingin menghapus role "${role.name}"?`)) {
            try {
                await deleteRole(role.id).unwrap();
                toast.success('Role berhasil dihapus.');
                setSelectedRole(null);
            } catch (err) {
                toast.error(err?.data?.message || 'Gagal menghapus role.');
            }
        }
    };

    if (rolesLoading || menusLoading || permsLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-[#093c30] mb-3" />
                <p className="text-sm font-medium">Memuat data role dan konfigurasi keamanan...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-[#093c30]" />
                        Role & Hak Akses (Matrix Keamanan)
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Kelola peran familiar pesantren (superadmin, admin, staf, asatidz, walikelas), hak akses menu sidebar, dan permission granular.
                    </p>
                </div>
                <button
                    onClick={() => handleOpenRoleModal(null)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#093c30] hover:bg-[#072d24] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors shrink-0"
                >
                    <Plus className="w-4 h-4" />
                    Tambah Role Baru
                </button>
            </div>

            {/* Layout 2 Kolom: Kiri Daftar Role, Kanan Matriks & Menu */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Kolom Kiri: Daftar Role */}
                <div className="lg:col-span-4 space-y-3">
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                            Daftar Role ({roles.length})
                        </h2>
                        <div className="space-y-1.5">
                            {roles.map((role) => {
                                const isSelected = selectedRole?.id === role.id;
                                const isSystem = ['superadmin', 'admin', 'staf', 'asatidz', 'walikelas'].includes(role.name);

                                return (
                                    <div
                                        key={role.id}
                                        onClick={() => setSelectedRole(role)}
                                        className={`w-full flex items-center justify-between p-3 rounded-lg border text-left cursor-pointer transition-all ${
                                            isSelected
                                                ? 'bg-emerald-50/80 border-[#093c30] text-[#093c30] shadow-xs font-bold'
                                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs capitalize">{role.name}</span>
                                                {isSystem && (
                                                    <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-slate-100 text-slate-600 border border-slate-200">
                                                        Sistem
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                                                {role.menus?.length || 0} Menu • {role.permissions?.length || 0} Permission
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                            {!isSystem && (
                                                <>
                                                    <button
                                                        onClick={() => handleOpenRoleModal(role)}
                                                        title="Edit Role"
                                                        className="p-1 text-slate-400 hover:text-slate-700 rounded"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteRole(role)}
                                                        title="Hapus Role"
                                                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Kolom Kanan: Pengaturan Hak Akses Role Terpilih */}
                <div className="lg:col-span-8 space-y-4">
                    {selectedRole ? (
                        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
                            {/* Header Panel Role */}
                            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500">Konfigurasi Hak Akses:</span>
                                        <span className="text-sm font-bold text-slate-900 uppercase px-2 py-0.5 rounded bg-emerald-100/70 text-[#093c30]">
                                            {selectedRole.name}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Pilih menu yang muncul di sidebar dan aksi granular yang diizinkan untuk peran ini.
                                    </p>
                                </div>

                                {/* Tab Switcher */}
                                <div className="flex items-center gap-1 p-1 bg-slate-200/60 rounded-lg">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('menus')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                            activeTab === 'menus'
                                                ? 'bg-white text-[#093c30] shadow-xs'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <LayoutGrid className="w-3.5 h-3.5" />
                                        Hak Akses Menu
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('permissions')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                            activeTab === 'permissions'
                                                ? 'bg-white text-[#093c30] shadow-xs'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <KeyRound className="w-3.5 h-3.5" />
                                        Matriks Permission
                                    </button>
                                </div>
                            </div>

                            {/* TAB 1: HAK AKSES MENU */}
                            {activeTab === 'menus' && (
                                <div className="p-5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500">
                                            Centang menu yang diizinkan untuk tampil di navigasi sidebar:
                                        </span>
                                        <button
                                            onClick={handleSaveMenus}
                                            disabled={isSyncingMenus}
                                            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#093c30] hover:bg-[#072d24] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors disabled:opacity-50"
                                        >
                                            {isSyncingMenus ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Save className="w-3.5 h-3.5" />
                                            )}
                                            Simpan Akses Menu
                                        </button>
                                    </div>

                                    <div className="space-y-2 border border-slate-100 rounded-lg p-3 bg-slate-50/30">
                                        {menus.map((menu) => {
                                            const isChecked = checkedMenuIds.includes(menu.id);
                                            const hasChildren = Array.isArray(menu.children) && menu.children.length > 0;

                                            return (
                                                <div key={menu.id} className="space-y-1 bg-white p-3 rounded-lg border border-slate-200">
                                                    <label className="flex items-center gap-2.5 cursor-pointer font-bold text-xs text-slate-800">
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => handleToggleMenu(menu.id, null, menu.children)}
                                                            className="w-4 h-4 text-[#093c30] rounded border-slate-300 focus:ring-emerald-500"
                                                        />
                                                        <span>{menu.name}</span>
                                                        <span className="text-[10px] text-slate-400 font-mono font-normal">
                                                            ({menu.path || 'Grup'})
                                                        </span>
                                                    </label>

                                                    {/* Children Checkboxes */}
                                                    {hasChildren && (
                                                        <div className="pl-6 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-slate-100 mt-2">
                                                            {menu.children.map((child) => {
                                                                const isChildChecked = checkedMenuIds.includes(child.id);
                                                                return (
                                                                    <label
                                                                        key={child.id}
                                                                        className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 hover:text-slate-900"
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isChildChecked}
                                                                            onChange={() => handleToggleMenu(child.id, menu.id, null)}
                                                                            className="w-3.5 h-3.5 text-[#093c30] rounded border-slate-300 focus:ring-emerald-500"
                                                                        />
                                                                        <span className="truncate">{child.name}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: MATRIKS PERMISSION */}
                            {activeTab === 'permissions' && (
                                <div className="p-5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500">
                                            Matriks aksi granular (view, create, update, delete, print, approve) per modul:
                                        </span>
                                        <button
                                            onClick={handleSavePermissions}
                                            disabled={isSyncingPerms}
                                            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#093c30] hover:bg-[#072d24] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors disabled:opacity-50"
                                        >
                                            {isSyncingPerms ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Save className="w-3.5 h-3.5" />
                                            )}
                                            Simpan Matriks Permission
                                        </button>
                                    </div>

                                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                                <tr>
                                                    <th className="px-4 py-2.5">Modul / Permission Key</th>
                                                    <th className="px-2 py-2.5 text-center">Pilih Semua</th>
                                                    <th className="px-3 py-2.5">Aksi Terkait</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {permissionGroups.map((group) => {
                                                    const groupPermNames = group.permissions.map((p) => p.name);
                                                    const isAllChecked = groupPermNames.every((n) => checkedPermNames.includes(n));

                                                    return (
                                                        <tr key={group.module} className="hover:bg-slate-50/50">
                                                            <td className="px-4 py-2.5 font-bold text-slate-800 font-mono text-[11px]">
                                                                {group.module}
                                                            </td>
                                                            <td className="px-2 py-2.5 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleModuleRow(group.permissions)}
                                                                    className="p-1 text-slate-400 hover:text-[#093c30] rounded"
                                                                >
                                                                    {isAllChecked ? (
                                                                        <CheckSquare className="w-4 h-4 text-[#093c30]" />
                                                                    ) : (
                                                                        <Square className="w-4 h-4 text-slate-300" />
                                                                    )}
                                                                </button>
                                                            </td>
                                                            <td className="px-3 py-2.5">
                                                                <div className="flex flex-wrap gap-2">
                                                                    {group.permissions.map((perm) => {
                                                                        const isChecked = checkedPermNames.includes(perm.name);
                                                                        return (
                                                                            <label
                                                                                key={perm.id}
                                                                                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] cursor-pointer transition-colors border ${
                                                                                    isChecked
                                                                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                                                                                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                                                                }`}
                                                                            >
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isChecked}
                                                                                    onChange={() => handleTogglePerm(perm.name)}
                                                                                    className="w-3 h-3 text-[#093c30] rounded border-slate-300 focus:ring-emerald-500"
                                                                                />
                                                                                <span>{perm.action}</span>
                                                                            </label>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
                            Pilih salah satu role di kolom kiri untuk mengatur hak aksesnya.
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Tambah / Edit Role */}
            {roleModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-sm font-bold text-slate-800">
                                {editingRole ? `Edit Role: ${editingRole.name}` : 'Tambah Role Baru'}
                            </h3>
                            <button
                                onClick={() => setRoleModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleRoleSubmit} className="p-5 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700">Nama Role *</label>
                                <input
                                    type="text"
                                    required
                                    value={roleNameInput}
                                    onChange={(e) => setRoleNameInput(e.target.value)}
                                    placeholder="Contoh: koordinator-tahfidz"
                                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#093c30]"
                                />
                                <p className="text-[10px] text-slate-400">
                                    Gunakan huruf kecil tanpa spasi (akan di-slug otomatis).
                                </p>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setRoleModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreatingRole || isUpdatingRole}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#093c30] hover:bg-[#072d24] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors disabled:opacity-50"
                                >
                                    {(isCreatingRole || isUpdatingRole) ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Save className="w-3.5 h-3.5" />
                                    )}
                                    Simpan Role
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
