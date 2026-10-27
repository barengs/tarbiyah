import React, { useState, useEffect } from 'react';
import {
    LayoutGrid,
    Plus,
    Edit2,
    Trash2,
    ChevronUp,
    ChevronDown,
    CornerDownRight,
    CornerUpLeft,
    GripVertical,
    FolderPlus,
    Save,
    Loader2,
    Layers,
    Info,
    CheckCircle2,
    XCircle,
    Building2,
    Users,
    GraduationCap,
    Calendar,
    BookOpen,
    Clock,
    ClipboardCheck,
    ScrollText,
    ShieldCheck,
    Settings,
    UserCog,
    TrendingUp,
    UserCheck,
    Folder,
} from 'lucide-react';
import {
    useGetMenusQuery,
    useCreateMenuMutation,
    useUpdateMenuMutation,
    useDeleteMenuMutation,
    useReorderMenusMutation,
} from '../../store/slices/securityApi';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { toast } from 'react-toastify';

const AVAILABLE_ICONS = [
    { label: 'Dashboard Utama', value: 'LayoutDashboard' },
    { label: 'Gedung / Lembaga', value: 'Building2' },
    { label: 'Jenjang / Tingkat', value: 'Layers' },
    { label: 'Santri / Siswa', value: 'Users' },
    { label: 'Data Santri', value: 'UserCheck' },
    { label: 'Kenaikan Kelas', value: 'TrendingUp' },
    { label: 'Guru & Pendidik', value: 'GraduationCap' },
    { label: 'Tahun / Kalender', value: 'Calendar' },
    { label: 'Mata Pelajaran', value: 'BookOpen' },
    { label: 'Jam Pelajaran / Waktu', value: 'Clock' },
    { label: 'Presensi & Kehadiran', value: 'ClipboardCheck' },
    { label: 'Rapor & Nilai', value: 'ScrollText' },
    { label: 'Pengaturan', value: 'Settings' },
    { label: 'Manajemen Pengguna', value: 'UserCog' },
    { label: 'Manajemen Menu', value: 'LayoutGrid' },
    { label: 'Role & Keamanan', value: 'ShieldCheck' },
    { label: 'Folder Umum', value: 'Folder' },
];

export default function MenuManagementPage() {
    const { data: menusRes, isLoading } = useGetMenusQuery();
    const [createMenu, { isLoading: isCreating }] = useCreateMenuMutation();
    const [updateMenu, { isLoading: isUpdating }] = useUpdateMenuMutation();
    const [deleteMenu, { isLoading: isDeleting }] = useDeleteMenuMutation();
    const [reorderMenus, { isLoading: isReordering }] = useReorderMenusMutation();

    const [menusTree, setMenusTree] = useState([]);
    const [hasUnsavedOrder, setHasUnsavedOrder] = useState(false);

    // Sync state lokal saat data dari server tiba
    useEffect(() => {
        if (menusRes?.data) {
            setMenusTree(JSON.parse(JSON.stringify(menusRes.data)));
            setHasUnsavedOrder(false);
        }
    }, [menusRes]);

    // Modal state
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

    const [deleteTargetMenu, setDeleteTargetMenu] = useState(null);

    // Drag-and-drop state
    const [draggedNode, setDraggedNode] = useState(null); // { item, parentId, index }
    const [dragOverNodeId, setDragOverNodeId] = useState(null);

    // Buka Modal Tambah/Edit
    const handleOpenModal = (menu = null, defaultParentId = '') => {
        if (menu) {
            setEditingMenu(menu);
            setFormData({
                name: menu.name || '',
                slug: menu.slug || '',
                parent_id: menu.parent_id ? String(menu.parent_id) : '',
                path: menu.path || '',
                icon: menu.icon || 'Layers',
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
                icon: defaultParentId ? 'Layers' : 'LayoutDashboard',
                permission_slug: '',
                sort_order: (menusTree.length + 1) * 1,
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
            slug: editingMenu
                ? prev.slug
                : val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
            permission_slug: editingMenu
                ? prev.permission_slug
                : val.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
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
                toast.success('Menu berhasil diperbarui');
            } else {
                await createMenu(payload).unwrap();
                toast.success('Menu baru berhasil ditambahkan');
            }
            setModalOpen(false);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan menu');
        }
    };

    const handleDelete = async () => {
        if (!deleteTargetMenu) return;
        if (['dashboard', 'pengaturan', 'menu', 'role', 'user'].includes(deleteTargetMenu.slug)) {
            toast.warning('Menu sistem utama ini tidak dapat dihapus');
            setDeleteTargetMenu(null);
            return;
        }

        try {
            await deleteMenu(deleteTargetMenu.id).unwrap();
            toast.success(`Menu "${deleteTargetMenu.name}" berhasil dihapus`);
            setDeleteTargetMenu(null);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menghapus menu');
        }
    };

    // Helper: Flatten tree menjadi payload { id, parent_id, sort_order }
    const buildReorderPayload = (tree) => {
        const payload = [];
        tree.forEach((top, topIdx) => {
            payload.push({
                id: top.id,
                parent_id: null,
                sort_order: topIdx + 1,
            });
            if (Array.isArray(top.children)) {
                top.children.forEach((child, childIdx) => {
                    payload.push({
                        id: child.id,
                        parent_id: top.id,
                        sort_order: childIdx + 1,
                    });
                });
            }
        });
        return payload;
    };

    // Auto-save atau simpan manual urutan ke server
    const saveReorder = async (newTree) => {
        setMenusTree(newTree);
        const payload = buildReorderPayload(newTree);
        try {
            await reorderMenus(payload).unwrap();
            toast.success('Tata letak urutan menu berhasil diperbarui');
            setHasUnsavedOrder(false);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal memperbarui urutan menu');
        }
    };

    // === AKSI PANAH KONTROL ===

    // 1. Panah Atas (Move Up)
    const handleMoveUp = (item, parentId) => {
        const tree = JSON.parse(JSON.stringify(menusTree));
        if (parentId === null) {
            const idx = tree.findIndex((t) => t.id === item.id);
            if (idx > 0) {
                const temp = tree[idx - 1];
                tree[idx - 1] = tree[idx];
                tree[idx] = temp;
                saveReorder(tree);
            }
        } else {
            const parent = tree.find((t) => t.id === parentId);
            if (parent && Array.isArray(parent.children)) {
                const idx = parent.children.findIndex((c) => c.id === item.id);
                if (idx > 0) {
                    const temp = parent.children[idx - 1];
                    parent.children[idx - 1] = parent.children[idx];
                    parent.children[idx] = temp;
                    saveReorder(tree);
                }
            }
        }
    };

    // 2. Panah Bawah (Move Down)
    const handleMoveDown = (item, parentId) => {
        const tree = JSON.parse(JSON.stringify(menusTree));
        if (parentId === null) {
            const idx = tree.findIndex((t) => t.id === item.id);
            if (idx >= 0 && idx < tree.length - 1) {
                const temp = tree[idx + 1];
                tree[idx + 1] = tree[idx];
                tree[idx] = temp;
                saveReorder(tree);
            }
        } else {
            const parent = tree.find((t) => t.id === parentId);
            if (parent && Array.isArray(parent.children)) {
                const idx = parent.children.findIndex((c) => c.id === item.id);
                if (idx >= 0 && idx < parent.children.length - 1) {
                    const temp = parent.children[idx + 1];
                    parent.children[idx + 1] = parent.children[idx];
                    parent.children[idx] = temp;
                    saveReorder(tree);
                }
            }
        }
    };

    // 3. Panah Kanan (Indent: Jadikan sub-menu dari menu di atasnya)
    const handleIndent = (item, parentId) => {
        if (parentId !== null) return; // Sudah level anak
        const tree = JSON.parse(JSON.stringify(menusTree));
        const idx = tree.findIndex((t) => t.id === item.id);
        if (idx > 0) {
            const targetParent = tree[idx - 1];
            if (!Array.isArray(targetParent.children)) {
                targetParent.children = [];
            }
            const [removed] = tree.splice(idx, 1);
            removed.parent_id = targetParent.id;
            targetParent.children.push(removed);
            saveReorder(tree);
        }
    };

    // 4. Panah Kiri (Outdent: Naikkan sub-menu jadi menu utama tingkat atas)
    const handleOutdent = (item, parentId) => {
        if (parentId === null) return; // Sudah level atas
        const tree = JSON.parse(JSON.stringify(menusTree));
        const parentIdx = tree.findIndex((t) => t.id === parentId);
        if (parentIdx >= 0) {
            const parent = tree[parentIdx];
            const childIdx = parent.children.findIndex((c) => c.id === item.id);
            if (childIdx >= 0) {
                const [removed] = parent.children.splice(childIdx, 1);
                removed.parent_id = null;
                // Masukkan tepat di bawah parent
                tree.splice(parentIdx + 1, 0, removed);
                saveReorder(tree);
            }
        }
    };

    // === DRAG AND DROP HANDLERS ===
    const handleDragStart = (e, item, parentId) => {
        setDraggedNode({ item, parentId });
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(item.id));
    };

    const handleDragOver = (e, targetId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverNodeId !== targetId) {
            setDragOverNodeId(targetId);
        }
    };

    const handleDragLeave = () => {
        setDragOverNodeId(null);
    };

    const handleDrop = (e, targetItem, targetParentId) => {
        e.preventDefault();
        setDragOverNodeId(null);
        if (!draggedNode || draggedNode.item.id === targetItem.id) return;

        const tree = JSON.parse(JSON.stringify(menusTree));
        const sourceItem = draggedNode.item;
        const sourceParentId = draggedNode.parentId;

        // 1. Cabut source item dari posisi aslinya
        let removedItem = null;
        if (sourceParentId === null) {
            const sIdx = tree.findIndex((t) => t.id === sourceItem.id);
            if (sIdx >= 0) {
                [removedItem] = tree.splice(sIdx, 1);
            }
        } else {
            const sp = tree.find((t) => t.id === sourceParentId);
            if (sp && sp.children) {
                const sIdx = sp.children.findIndex((c) => c.id === sourceItem.id);
                if (sIdx >= 0) {
                    [removedItem] = sp.children.splice(sIdx, 1);
                }
            }
        }

        if (!removedItem) return;

        // 2. Sisipkan di posisi target
        if (targetParentId === null) {
            const tIdx = tree.findIndex((t) => t.id === targetItem.id);
            removedItem.parent_id = null;
            if (tIdx >= 0) {
                tree.splice(tIdx, 0, removedItem);
            } else {
                tree.push(removedItem);
            }
        } else {
            const tp = tree.find((t) => t.id === targetParentId);
            if (tp) {
                if (!Array.isArray(tp.children)) tp.children = [];
                const tIdx = tp.children.findIndex((c) => c.id === targetItem.id);
                removedItem.parent_id = tp.id;
                if (tIdx >= 0) {
                    tp.children.splice(tIdx, 0, removedItem);
                } else {
                    tp.children.push(removedItem);
                }
            }
        }

        setDraggedNode(null);
        saveReorder(tree);
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
            {/* Header info konsisten dengan halaman lain */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manajemen Menu Navigasi</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Atur hierarki menu sidebar, rute akses, permission, serta urutan tampilan secara fleksibel.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleOpenModal(null, '')}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#093c30] text-white font-semibold text-sm rounded-md hover:bg-[#072d24] transition shadow-xs"
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Menu Utama
                    </button>
                </div>
            </div>

            {/* Banner Edukasi Drag and Drop & Tombol Panah */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/90 rounded-md flex items-start gap-3">
                <Info className="w-5 h-5 text-[#093c30] shrink-0 mt-0.5" />
                <div className="text-xs text-slate-700 leading-relaxed">
                    <p className="font-bold text-[#093c30]">Metode Pengaturan Urutan & Tata Letak Menu:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-1 text-slate-600">
                        <p>
                            • Gunakan <strong>Panah Atas / Bawah</strong> untuk memindahkan posisi naik atau turun.
                        </p>
                        <p>
                            • Gunakan <strong>Panah Kanan (↳)</strong> untuk menjadikan menu sebagai sub-menu dari menu di atasnya.
                        </p>
                        <p>
                            • Gunakan <strong>Panah Kiri (↰)</strong> untuk menaikkan sub-menu menjadi menu tingkat atas.
                        </p>
                        <p>
                            • Atau pegang ikon <strong>Grip (⋮⋮)</strong> dan geser langsung (Drag & Drop) ke posisi tujuan.
                        </p>
                    </div>
                </div>
            </div>

            {/* Container Tree Menu Konsisten */}
            <div className="bg-white border border-slate-200 rounded-md shadow-xs p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
                    <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4 text-emerald-700" />
                        Struktur Menu Aktif ({menusTree.length} Menu Utama)
                    </span>
                    {isReordering && (
                        <span className="text-emerald-700 flex items-center gap-1 font-semibold text-xs">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Menyimpan urutan...
                        </span>
                    )}
                </div>

                {menusTree.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-xs">
                        Belum ada menu yang dikonfigurasi. Klik &quot;Tambah Menu Utama&quot; untuk memulai.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {menusTree.map((topItem, topIdx) => {
                            const isFirstTop = topIdx === 0;
                            const isLastTop = topIdx === menusTree.length - 1;
                            const hasChildren = Array.isArray(topItem.children) && topItem.children.length > 0;
                            const isOver = dragOverNodeId === topItem.id;

                            return (
                                <div key={topItem.id} className="space-y-1.5">
                                    {/* KARTU MENU UTAMA (TOP-LEVEL) */}
                                    <div
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, topItem, null)}
                                        onDragOver={(e) => handleDragOver(e, topItem.id)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, topItem, null)}
                                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-md border transition-all text-xs ${
                                            isOver
                                                ? 'bg-emerald-50 border-emerald-500 shadow-sm'
                                                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            {/* Drag Handle */}
                                            <div
                                                className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-600 rounded"
                                                title="Tahan dan geser (drag) untuk memindahkan"
                                            >
                                                <GripVertical className="w-4 h-4" />
                                            </div>

                                            {/* Tombol Kontrol Panah (Atas, Bawah, Indent) */}
                                            <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-200 rounded p-0.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleMoveUp(topItem, null)}
                                                    disabled={isFirstTop}
                                                    title="Pindah ke Atas"
                                                    className="p-1 text-slate-500 hover:text-[#093c30] hover:bg-white rounded disabled:opacity-25"
                                                >
                                                    <ChevronUp className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleMoveDown(topItem, null)}
                                                    disabled={isLastTop}
                                                    title="Pindah ke Bawah"
                                                    className="p-1 text-slate-500 hover:text-[#093c30] hover:bg-white rounded disabled:opacity-25"
                                                >
                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleIndent(topItem, null)}
                                                    disabled={isFirstTop}
                                                    title="Jadikan Sub-Menu dari menu di atasnya"
                                                    className="p-1 text-slate-500 hover:text-[#093c30] hover:bg-white rounded disabled:opacity-25"
                                                >
                                                    <CornerDownRight className="w-3.5 h-3.5 text-emerald-700" />
                                                </button>
                                            </div>

                                            {/* Ikon Menu */}
                                            <div className="w-8 h-8 rounded bg-emerald-50 text-[#093c30] flex items-center justify-center font-bold text-xs border border-emerald-200 shrink-0">
                                                <Layers className="w-4 h-4" />
                                            </div>

                                            {/* Informasi Menu */}
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-slate-900 text-[13px] truncate">
                                                        {topItem.name}
                                                    </span>
                                                    {topItem.is_active ? (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            Aktif
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                                            Nonaktif
                                                        </span>
                                                    )}
                                                    {topItem.permission_slug && (
                                                        <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200">
                                                            {topItem.permission_slug}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                                                    {topItem.path ? `Route: ${topItem.path}` : '— Folder Menu Utama'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Aksi Tambah Sub-Menu, Edit, Hapus */}
                                        <div className="flex items-center justify-end gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenModal(null, topItem.id)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-[#093c30] hover:bg-slate-100 rounded text-xs transition-colors"
                                                title="Tambah Sub-Menu ke grup ini"
                                            >
                                                <FolderPlus className="w-3.5 h-3.5" />
                                                <span>+ Sub</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleOpenModal(topItem)}
                                                className="p-1.5 text-slate-400 hover:text-[#093c30] hover:bg-slate-100 rounded transition-colors"
                                                title="Edit Menu"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDeleteTargetMenu(topItem)}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                                title="Hapus Menu"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* DAFTAR SUB-MENU (CHILDREN) */}
                                    {hasChildren && (
                                        <div className="pl-6 border-l-2 border-emerald-200/90 ml-5 space-y-1 py-0.5">
                                            {topItem.children.map((child, childIdx) => {
                                                const isFirstChild = childIdx === 0;
                                                const isLastChild = childIdx === topItem.children.length - 1;
                                                const isChildOver = dragOverNodeId === child.id;

                                                return (
                                                    <div
                                                        key={child.id}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, child, topItem.id)}
                                                        onDragOver={(e) => handleDragOver(e, child.id)}
                                                        onDragLeave={handleDragLeave}
                                                        onDrop={(e) => handleDrop(e, child, topItem.id)}
                                                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2 px-3 rounded-md border text-xs transition-all ${
                                                            isChildOver
                                                                ? 'bg-emerald-50 border-emerald-500 shadow-2xs'
                                                                : 'bg-slate-50/60 border-slate-200/80 hover:bg-white hover:border-slate-300'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div
                                                                className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-600 rounded"
                                                                title="Tahan dan geser (drag) untuk memindahkan"
                                                            >
                                                                <GripVertical className="w-3.5 h-3.5" />
                                                            </div>

                                                            {/* Tombol Kontrol Panah Sub-Menu (Atas, Bawah, Outdent) */}
                                                            <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded p-0.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleMoveUp(child, topItem.id)}
                                                                    disabled={isFirstChild}
                                                                    title="Pindah ke Atas"
                                                                    className="p-1 text-slate-500 hover:text-[#093c30] rounded disabled:opacity-25"
                                                                >
                                                                    <ChevronUp className="w-3 h-3" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleMoveDown(child, topItem.id)}
                                                                    disabled={isLastChild}
                                                                    title="Pindah ke Bawah"
                                                                    className="p-1 text-slate-500 hover:text-[#093c30] rounded disabled:opacity-25"
                                                                >
                                                                    <ChevronDown className="w-3 h-3" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleOutdent(child, topItem.id)}
                                                                    title="Naikkan menjadi Menu Utama tingkat atas"
                                                                    className="p-1 text-slate-500 hover:text-blue-700 rounded"
                                                                >
                                                                    <CornerUpLeft className="w-3 h-3 text-blue-700" />
                                                                </button>
                                                            </div>

                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold text-slate-800 truncate">
                                                                        {child.name}
                                                                    </span>
                                                                    {child.is_active ? (
                                                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                            Aktif
                                                                        </span>
                                                                    ) : (
                                                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-400 border border-slate-200">
                                                                            Nonaktif
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-[10px] text-slate-500 font-mono truncate">
                                                                    {child.path}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Aksi Edit & Hapus Sub-Menu */}
                                                        <div className="flex items-center justify-end gap-1 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenModal(child)}
                                                                className="p-1 text-slate-400 hover:text-[#093c30] hover:bg-slate-100 rounded transition-colors"
                                                                title="Edit Sub-Menu"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setDeleteTargetMenu(child)}
                                                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                                                title="Hapus Sub-Menu"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal Tambah / Edit Menu */}
            <Modal
                open={modalOpen}
                title={editingMenu ? `Edit Menu: ${editingMenu.name}` : 'Tambah Menu Baru'}
                onClose={() => setModalOpen(false)}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Nama Menu *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={handleNameChange}
                            placeholder="Contoh: Jadwal Pelajaran"
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Menu Induk (Parent)
                            </label>
                            <select
                                value={formData.parent_id}
                                onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                            >
                                <option value="">— Menu Utama (Top Level) —</option>
                                {menusTree
                                    .filter((m) => !editingMenu || m.id !== editingMenu.id)
                                    .map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.name}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Ikon Menu
                            </label>
                            <select
                                value={formData.icon}
                                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                            >
                                {AVAILABLE_ICONS.map((ic) => (
                                    <option key={ic.value} value={ic.value}>
                                        {ic.label} ({ic.value})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Rute URL (Path Halaman)
                        </label>
                        <input
                            type="text"
                            value={formData.path}
                            onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                            placeholder="/kbm atau kosongkan untuk folder grup"
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                            Kosongkan jika menu ini hanya berfungsi sebagai grup/induk tanpa halaman tersendiri.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Slug Identitas Sistem *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Permission Slug
                            </label>
                            <input
                                type="text"
                                value={formData.permission_slug}
                                onChange={(e) => setFormData({ ...formData, permission_slug: e.target.value })}
                                placeholder="kbm, presensi, dll"
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                            />
                        </div>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="menu_is_active_toggle"
                            checked={formData.is_active}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            className="w-4 h-4 text-[#093c30] border-slate-300 rounded focus:ring-emerald-500"
                        />
                        <label htmlFor="menu_is_active_toggle" className="text-xs font-medium text-slate-700 cursor-pointer">
                            Tampilkan dan aktifkan menu ini di sidebar
                        </label>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
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
                            Simpan Menu
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Confirm Dialog Hapus */}
            <ConfirmDialog
                open={Boolean(deleteTargetMenu)}
                title="Hapus Menu"
                message={`Apakah Anda yakin ingin menghapus menu "${deleteTargetMenu?.name}"? Seluruh sub-menu di dalamnya juga akan terhapus.`}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTargetMenu(null)}
                isLoading={isDeleting}
            />
        </div>
    );
}
