import React, { useState, useEffect } from 'react';
import {
    ShieldCheck,
    Plus,
    Edit2,
    Trash2,
    Save,
    Loader2,
    Lock,
    LayoutGrid,
    KeyRound,
    CheckSquare,
    Square,
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
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
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
    const permissionGroups = permsRes?.data || [];

    const [selectedRole, setSelectedRole] = useState(null);
    const [activeTab, setActiveTab] = useState('menus'); // 'menus' | 'permissions'
    const [checkedMenuIds, setCheckedMenuIds] = useState([]);
    const [checkedPermNames, setCheckedPermNames] = useState([]);

    const [roleModalOpen, setRoleModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [roleNameInput, setRoleNameInput] = useState('');

    const [deleteTargetRole, setDeleteTargetRole] = useState(null);

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

            if (children && children.length > 0) {
                const childIds = children.map((c) => c.id);
                if (!isChecked) {
                    next = Array.from(new Set([...next, ...childIds]));
                } else {
                    next = next.filter((id) => !childIds.includes(id));
                }
            }

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

    const handleSaveMenus = async () => {
        if (!selectedRole) return;
        try {
            await syncMenus({ id: selectedRole.id, menu_ids: checkedMenuIds }).unwrap();
            toast.success(`Hak akses menu untuk role ${selectedRole.name} berhasil disimpan`);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan hak akses menu');
        }
    };

    const handleSavePermissions = async () => {
        if (!selectedRole) return;
        try {
            await syncPerms({ id: selectedRole.id, permissions: checkedPermNames }).unwrap();
            toast.success(`Permission matrix untuk role ${selectedRole.name} berhasil disimpan`);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan permission matrix');
        }
    };

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
                toast.success('Role berhasil diperbarui');
            } else {
                const res = await createRole({ name: roleNameInput }).unwrap();
                toast.success('Role baru berhasil ditambahkan');
                if (res?.data) {
                    setSelectedRole(res.data);
                }
            }
            setRoleModalOpen(false);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan data role');
        }
    };

    const handleDeleteRole = async () => {
        if (!deleteTargetRole) return;
        if (['superadmin', 'admin', 'staf', 'asatidz', 'walikelas'].includes(deleteTargetRole.name)) {
            toast.warning('Role bawaan sistem tidak boleh dihapus.');
            setDeleteTargetRole(null);
            return;
        }

        try {
            await deleteRole(deleteTargetRole.id).unwrap();
            toast.success(`Role ${deleteTargetRole.name} berhasil dihapus`);
            setDeleteTargetRole(null);
            setSelectedRole(null);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menghapus role');
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
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Role & Hak Akses</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Kelola peran familiar pesantren (superadmin, admin, staf, asatidz, walikelas), akses menu, dan permission granular.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleOpenRoleModal(null)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#093c30] text-white font-semibold text-sm rounded-md hover:bg-[#072d24] transition shadow-xs"
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Role Baru
                    </button>
                </div>
            </div>

            {/* Layout 2 Kolom: Daftar Role & Konfigurasi Akses */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* KOLOM KIRI: DAFTAR ROLE */}
                <div className="lg:col-span-4 bg-white border border-slate-200 rounded-md shadow-xs overflow-hidden">
                    <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-700" />
                            Daftar Peran ({roles.length})
                        </span>
                        <span className="text-[11px] text-slate-400">Pilih untuk edit</span>
                    </div>

                    <div className="p-2 space-y-1">
                        {roles.map((r) => {
                            const isSelected = selectedRole?.id === r.id;
                            const isSystem = ['superadmin', 'admin', 'staf', 'asatidz', 'walikelas'].includes(r.name);

                            return (
                                <div
                                    key={r.id}
                                    onClick={() => setSelectedRole(r)}
                                    className={`w-full flex items-center justify-between p-2.5 rounded-md text-xs cursor-pointer transition-all ${
                                        isSelected
                                            ? 'bg-emerald-50 text-[#093c30] font-semibold border border-emerald-200 shadow-2xs'
                                            : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div
                                            className={`w-2 h-2 rounded-full shrink-0 ${
                                                isSelected ? 'bg-emerald-600' : 'bg-slate-300'
                                            }`}
                                        />
                                        <div className="min-w-0">
                                            <p className="truncate uppercase font-bold tracking-wide">{r.name}</p>
                                            <p className="text-[10px] text-slate-400 font-normal">
                                                {r.menus?.length || 0} Menu • {r.permissions?.length || 0} Permission
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                        {!isSystem && (
                                            <>
                                                <button
                                                    onClick={() => handleOpenRoleModal(r)}
                                                    className="p-1 text-slate-400 hover:text-[#093c30] rounded"
                                                    title="Edit Nama Role"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTargetRole(r)}
                                                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                                    title="Hapus Role"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </>
                                        )}
                                        {isSystem && (
                                            <span title="Role Bawaan Sistem" className="text-slate-300 p-1">
                                                <Lock className="w-3.5 h-3.5" />
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* KOLOM KANAN: MATRIKS HAK AKSES */}
                <div className="lg:col-span-8 bg-white border border-slate-200 rounded-md shadow-xs overflow-hidden">
                    {selectedRole ? (
                        <div>
                            {/* Header Panel Terpilih */}
                            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            Konfigurasi Hak Akses:
                                        </span>
                                        <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-emerald-100/70 text-[#093c30] border border-emerald-300">
                                            {selectedRole.name}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Tentukan menu sidebar yang dapat dilihat dan aksi izin operasional untuk role ini.
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {activeTab === 'menus' ? (
                                        <button
                                            onClick={handleSaveMenus}
                                            disabled={isSyncingMenus}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#093c30] hover:bg-[#072d24] text-white text-xs font-semibold rounded-md shadow-2xs transition-colors disabled:opacity-50"
                                        >
                                            {isSyncingMenus ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Save className="w-3.5 h-3.5" />
                                            )}
                                            Simpan Akses Menu
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleSavePermissions}
                                            disabled={isSyncingPerms}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#093c30] hover:bg-[#072d24] text-white text-xs font-semibold rounded-md shadow-2xs transition-colors disabled:opacity-50"
                                        >
                                            {isSyncingPerms ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Save className="w-3.5 h-3.5" />
                                            )}
                                            Simpan Permission Matrix
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Tabs Switcher Konsisten */}
                            <div className="flex border-b border-slate-200 bg-white px-4 pt-2">
                                <button
                                    onClick={() => setActiveTab('menus')}
                                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                                        activeTab === 'menus'
                                            ? 'border-[#093c30] text-[#093c30]'
                                            : 'border-transparent text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                    Hak Akses Menu ({checkedMenuIds.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('permissions')}
                                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                                        activeTab === 'permissions'
                                            ? 'border-[#093c30] text-[#093c30]'
                                            : 'border-transparent text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    <KeyRound className="w-4 h-4" />
                                    Matriks Permission ({checkedPermNames.length})
                                </button>
                            </div>

                            {/* TAB 1: MENU SIDEBAR ACCESS */}
                            {activeTab === 'menus' && (
                                <div className="p-4 space-y-4">
                                    <div className="border border-slate-200 rounded-md overflow-hidden">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                                                <tr>
                                                    <th className="px-4 py-2.5 w-10">Pilih</th>
                                                    <th className="px-4 py-2.5">Menu / Fitur Navigasi</th>
                                                    <th className="px-4 py-2.5">Rute (Path)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {menus.map((item) => {
                                                    const isChecked = checkedMenuIds.includes(item.id);
                                                    const hasChildren = Array.isArray(item.children) && item.children.length > 0;

                                                    return (
                                                        <React.Fragment key={item.id}>
                                                            <tr className="bg-slate-50/40 hover:bg-slate-100/50 transition-colors">
                                                                <td className="px-4 py-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isChecked}
                                                                        onChange={() =>
                                                                            handleToggleMenu(item.id, null, item.children)
                                                                        }
                                                                        className="w-4 h-4 text-[#093c30] rounded border-slate-300 focus:ring-emerald-500"
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-2 font-bold text-slate-800">
                                                                    {item.name}
                                                                </td>
                                                                <td className="px-4 py-2 text-slate-400 font-mono text-[11px]">
                                                                    {item.path || '— (Grup Menu)'}
                                                                </td>
                                                            </tr>

                                                            {hasChildren &&
                                                                item.children.map((child) => {
                                                                    const isChildChecked = checkedMenuIds.includes(child.id);
                                                                    return (
                                                                        <tr
                                                                            key={child.id}
                                                                            className="hover:bg-slate-50/60 transition-colors"
                                                                        >
                                                                            <td className="px-4 py-2 pl-8">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isChildChecked}
                                                                                    onChange={() =>
                                                                                        handleToggleMenu(child.id, item.id)
                                                                                    }
                                                                                    className="w-3.5 h-3.5 text-[#093c30] rounded border-slate-300 focus:ring-emerald-500"
                                                                                />
                                                                            </td>
                                                                            <td className="px-4 py-2 pl-8 text-slate-700">
                                                                                <span className="text-slate-300 mr-2">↳</span>
                                                                                {child.name}
                                                                            </td>
                                                                            <td className="px-4 py-2 text-slate-500 font-mono text-[11px]">
                                                                                {child.path}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: PERMISSION MATRIX */}
                            {activeTab === 'permissions' && (
                                <div className="p-4 space-y-4">
                                    <div className="border border-slate-200 rounded-md overflow-hidden">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                                                <tr>
                                                    <th className="px-4 py-2.5 w-40">Modul</th>
                                                    <th className="px-4 py-2.5 w-12 text-center">Semua</th>
                                                    <th className="px-4 py-2.5">Aksi / Permissions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {permissionGroups.map((group) => {
                                                    const groupPermNames = group.permissions.map((p) => p.name);
                                                    const isAllChecked = groupPermNames.every((n) =>
                                                        checkedPermNames.includes(n)
                                                    );

                                                    return (
                                                        <tr key={group.module} className="hover:bg-slate-50/60">
                                                            <td className="px-4 py-2.5 font-bold uppercase text-slate-800 tracking-wider">
                                                                {group.module}
                                                            </td>
                                                            <td className="px-4 py-2.5 text-center">
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
                                                            <td className="px-4 py-2.5">
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {group.permissions.map((perm) => {
                                                                        const isChecked = checkedPermNames.includes(perm.name);
                                                                        return (
                                                                            <label
                                                                                key={perm.id}
                                                                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] cursor-pointer transition-colors border ${
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
                        <div className="p-12 text-center text-slate-400 text-xs">
                            Pilih salah satu role di kolom kiri untuk mengatur hak aksesnya.
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Tambah / Edit Role */}
            <Modal
                open={roleModalOpen}
                title={editingRole ? `Edit Role: ${editingRole.name}` : 'Tambah Role Baru'}
                onClose={() => setRoleModalOpen(false)}
            >
                <form onSubmit={handleRoleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Nama Role *
                        </label>
                        <input
                            type="text"
                            required
                            value={roleNameInput}
                            onChange={(e) => setRoleNameInput(e.target.value)}
                            placeholder="Contoh: koordinator-tahfidz"
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                            Gunakan huruf kecil tanpa spasi (akan di-slug otomatis).
                        </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setRoleModalOpen(false)}
                            className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isCreatingRole || isUpdatingRole}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#093c30] text-white text-sm font-semibold rounded-md hover:bg-[#072d24] transition-colors disabled:opacity-50 shadow-xs"
                        >
                            {isCreatingRole || isUpdatingRole ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            Simpan Role
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Confirm Dialog Hapus */}
            <ConfirmDialog
                open={Boolean(deleteTargetRole)}
                title="Hapus Role"
                message={`Apakah Anda yakin ingin menghapus role "${deleteTargetRole?.name}"? Tindakan ini tidak dapat dibatalkan.`}
                onConfirm={handleDeleteRole}
                onCancel={() => setDeleteTargetRole(null)}
                isLoading={isDeletingRole}
            />
        </div>
    );
}
