import React, { useState } from 'react';
import {
    LayoutGrid,
    Plus,
    Edit2,
    Trash2,
    ChevronDown,
    ChevronRight,
    Loader2,
    Shield,
    CheckCircle2,
    XCircle,
    Layers,
    ExternalLink,
    FolderPlus,
    Save,
    X,
} from 'lucide-react';
import {
    useGetMenusQuery,
    useCreateMenuMutation,
    useUpdateMenuMutation,
    useDeleteMenuMutation,
} from '../../store/slices/securityApi';
import { toast } from 'react-toastify';

export default function MenuManagementPage() {
    const { data: menusRes, isLoading } = useGetMenusQuery();
    const [createMenu, { isLoading: isCreating }] = useCreateMenuMutation();
    const [updateMenu, { isLoading: isUpdating }] = useUpdateMenuMutation();
    const [deleteMenu, { isLoading: isDeleting }] = useDeleteMenuMutation();

    const [modalOpen, setModalOpen] = useState(false);
    const [editingMenu, setEditingMenu] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        parent_id: '',
        path: '',
        icon: 'LayoutDashboard',
        permission_slug: '',
        sort_order: 1,
        is_active: true,
    });

    const menus = menusRes?.data || [];

    const handleOpenModal = (menu = null, defaultParentId = '') => {
        if (menu) {
            setEditingMenu(menu);
            setFormData({
                name: menu.name || '',
                slug: menu.slug || '',
                parent_id: menu.parent_id ? String(menu.parent_id) : '',
                path: menu.path || '',
                icon: menu.icon || 'LayoutDashboard',
                permission_slug: menu.permission_slug || '',
                sort_order: menu.sort_order ?? 1,
                is_active: Boolean(menu.is_active),
            });
        } else {
            setEditingMenu(null);
            setFormData({
                name: '',
                slug: '',
                parent_id: defaultParentId ? String(defaultParentId) : '',
                path: '',
                icon: 'Layers',
                permission_slug: '',
                sort_order: (menus.length + 1) * 1,
                is_active: true,
            });
        }
        setModalOpen(true);
    };

    const handleNameChange = (e) => {
        const val = e.target.value;
        setFormData((prev) => ({
            ...prev,
            name: val,
            slug: editingMenu ? prev.slug : val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
            permission_slug: editingMenu ? prev.permission_slug : val.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                parent_id: formData.parent_id ? parseInt(formData.parent_id, 10) : null,
                sort_order: parseInt(formData.sort_order, 10) || 1,
            };

            if (editingMenu) {
                await updateMenu({ id: editingMenu.id, ...payload }).unwrap();
                toast.success('Menu berhasil diperbarui.');
            } else {
                await createMenu(payload).unwrap();
                toast.success('Menu baru berhasil dibuat.');
            }
            setModalOpen(false);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan menu.');
        }
    };

    const handleDelete = async (menu) => {
        if (['dashboard', 'pengaturan', 'menu', 'role', 'user'].includes(menu.slug)) {
            toast.warning('Menu sistem utama ini tidak boleh dihapus.');
            return;
        }

        if (window.confirm(`Yakin ingin menghapus menu "${menu.name}"? Semua sub-menu juga akan ikut terhapus.`)) {
            try {
                await deleteMenu(menu.id).unwrap();
                toast.success('Menu berhasil dihapus.');
            } catch (err) {
                toast.error(err?.data?.message || 'Gagal menghapus menu.');
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-[#093c30] mb-3" />
                <p className="text-sm font-medium">Memuat struktur hierarki menu...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <LayoutGrid className="w-5 h-5 text-[#093c30]" />
                        Manajemen Menu & Navigasi
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Atur hierarki sidebar, urutan tampilan, path router, dan hak akses permission slug secara dinamis.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleOpenModal(null, '')}
                        className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#093c30] hover:bg-[#072d24] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Menu Utama
                    </button>
                </div>
            </div>

            {/* Tree View Container */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-3 pb-2 border-b border-slate-100">
                    <span>HIERARKI & NAMA MENU</span>
                    <span>PATH / SLUG / PERMISSION / AKSI</span>
                </div>

                <div className="space-y-2">
                    {menus.map((menu) => (
                        <MenuItemNode
                            key={menu.id}
                            menu={menu}
                            onEdit={handleOpenModal}
                            onAddChild={(parentId) => handleOpenModal(null, parentId)}
                            onDelete={handleDelete}
                        />
                    ))}

                    {menus.length === 0 && (
                        <div className="text-center py-12 text-slate-400 text-sm">
                            Belum ada menu yang terdaftar di database.
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Tambah / Edit Menu */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-sm font-bold text-slate-800">
                                {editingMenu ? `Edit Menu: ${editingMenu.name}` : 'Tambah Menu Baru'}
                            </h3>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1 sm:col-span-2">
                                    <label className="text-xs font-semibold text-slate-700">Nama Menu *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={handleNameChange}
                                        placeholder="Contoh: Jadwal Pelajaran"
                                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#093c30]"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">Slug (Unik) *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.slug}
                                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                        placeholder="jadwal-pelajaran"
                                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#093c30] font-mono"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">Menu Induk (Parent)</label>
                                    <select
                                        value={formData.parent_id}
                                        onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#093c30]"
                                    >
                                        <option value="">-- Menu Utama (Top-Level) --</option>
                                        {menus
                                            .filter((m) => !editingMenu || m.id !== editingMenu.id)
                                            .map((m) => (
                                                <option key={m.id} value={m.id}>
                                                    {m.name}
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">Path / Route URL</label>
                                    <input
                                        type="text"
                                        value={formData.path}
                                        onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                                        placeholder="/kurikulum/jadwal (kosong jika grup)"
                                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#093c30] font-mono"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">Nama Ikon Lucide</label>
                                    <input
                                        type="text"
                                        value={formData.icon}
                                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                        placeholder="LayoutDashboard, Clock, dll"
                                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#093c30] font-mono"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">Permission Slug</label>
                                    <input
                                        type="text"
                                        value={formData.permission_slug}
                                        onChange={(e) => setFormData({ ...formData, permission_slug: e.target.value })}
                                        placeholder="jadwal, mapel, dll"
                                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#093c30] font-mono"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">Urutan (Sort Order)</label>
                                    <input
                                        type="number"
                                        value={formData.sort_order}
                                        onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#093c30]"
                                    />
                                </div>

                                <div className="sm:col-span-2 pt-2 flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="is_active_toggle"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-4 h-4 text-[#093c30] border-slate-300 rounded focus:ring-emerald-500"
                                    />
                                    <label htmlFor="is_active_toggle" className="text-xs font-medium text-slate-700 cursor-pointer">
                                        Aktifkan menu ini di sidebar
                                    </label>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors"
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
                                    Simpan Menu
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function MenuItemNode({ menu, depth = 0, onEdit, onAddChild, onDelete }) {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = Array.isArray(menu.children) && menu.children.length > 0;

    return (
        <div className="space-y-1.5">
            <div
                className={`flex items-center justify-between p-3 rounded-lg border transition-all text-xs ${
                    depth === 0
                        ? 'bg-slate-50/80 border-slate-200 font-semibold'
                        : 'bg-white border-slate-150 ml-6 text-slate-700 hover:bg-emerald-50/30'
                }`}
            >
                <div className="flex items-center gap-3 min-w-0">
                    {hasChildren ? (
                        <button
                            type="button"
                            onClick={() => setExpanded(!expanded)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded transition-transform"
                        >
                            {expanded ? (
                                <ChevronDown className="w-4 h-4 text-[#093c30]" />
                            ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                        </button>
                    ) : (
                        <span className="w-4 h-4" />
                    )}

                    <div className="w-7 h-7 rounded-md bg-white border border-slate-200 text-[#093c30] flex items-center justify-center shrink-0 shadow-2xs">
                        <Layers className="w-3.5 h-3.5" />
                    </div>

                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-slate-900 font-bold truncate">{menu.name}</span>
                            {menu.is_active ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Aktif
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                    Nonaktif
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                            {menu.path ? `Route: ${menu.path}` : 'Folder Grup (Tidak ada URL)'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {menu.permission_slug && (
                        <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200">
                            {menu.permission_slug}
                        </span>
                    )}

                    <span className="text-[11px] text-slate-400 font-mono w-6 text-center">
                        #{menu.sort_order}
                    </span>

                    <div className="flex items-center gap-1">
                        {depth === 0 && (
                            <button
                                onClick={() => onAddChild(menu.id)}
                                title="Tambah Sub-Menu"
                                className="p-1.5 text-slate-500 hover:text-[#093c30] hover:bg-white rounded-md transition-colors"
                            >
                                <FolderPlus className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <button
                            onClick={() => onEdit(menu)}
                            title="Edit Menu"
                            className="p-1.5 text-slate-500 hover:text-[#093c30] hover:bg-white rounded-md transition-colors"
                        >
                            <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => onDelete(menu)}
                            title="Hapus Menu"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            {expanded && hasChildren && (
                <div className="space-y-1.5">
                    {menu.children.map((child) => (
                        <MenuItemNode
                            key={child.id}
                            menu={child}
                            depth={depth + 1}
                            onEdit={onEdit}
                            onAddChild={onAddChild}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
