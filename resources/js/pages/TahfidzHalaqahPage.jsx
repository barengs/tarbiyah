import React, { useState } from 'react';
import { 
    useGetClassGroupsQuery, 
    useGetClassGroupQuery,
    useCreateClassGroupMutation, 
    useUpdateClassGroupMutation, 
    useDeleteClassGroupMutation,
    useAddStudentToGroupMutation,
    useRemoveStudentFromGroupMutation,
    usePromoteTahfidzLevelMutation
} from '../store/slices/classGroupApi';
import { useGetInstitutionsQuery } from '../store/slices/institutionApi';
import { useGetTeachersQuery } from '../store/slices/teacherApi';
import { useGetStudentsQuery } from '../store/slices/studentApi';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Plus, Edit2, Trash2, Award, ArrowUpRight, Users, UserPlus, Sparkles, BookOpen } from 'lucide-react';
import { toast } from 'react-toastify';

export default function TahfidzHalaqahPage() {
    const { data: groupsData, isLoading } = useGetClassGroupsQuery({
        progression_type: 'leveling',
    });
    const groups = groupsData?.data || [];

    const { data: instData } = useGetInstitutionsQuery();
    const institutions = instData?.data || [];
    // Prioritize tahfidz institution if exists, else first
    const tahfidzInst = institutions.find(i => i.progression_type === 'leveling') || institutions[0];

    const { data: teachersData } = useGetTeachersQuery();
    const teachers = teachersData?.data || [];

    const [createGroup, { isLoading: isCreating }] = useCreateClassGroupMutation();
    const [updateGroup, { isLoading: isUpdating }] = useUpdateClassGroupMutation();
    const [deleteGroup, { isLoading: isDeleting }] = useDeleteClassGroupMutation();

    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Form fields
    const [name, setName] = useState('');
    const [targetLevel, setTargetLevel] = useState('');
    const [homeroomTeacherId, setHomeroomTeacherId] = useState('');
    const [capacity, setCapacity] = useState(15);

    // Member & Promotion Modal
    const [selectedHalaqah, setSelectedHalaqah] = useState(null);
    const { data: halaqahDetailData } = useGetClassGroupQuery(selectedHalaqah?.id, {
        skip: !selectedHalaqah,
    });
    const halaqahDetail = halaqahDetailData?.data;

    const [addStudentToGroup] = useAddStudentToGroupMutation();
    const [removeStudentFromGroup] = useRemoveStudentFromGroupMutation();
    const [promoteTahfidzLevel] = usePromoteTahfidzLevelMutation();

    const { data: allStudentsData } = useGetStudentsQuery();
    const allStudents = allStudentsData?.data || [];
    const [selectedStudentToAdd, setSelectedStudentToAdd] = useState('');

    // Promotion Modal State
    const [promotingStudent, setPromotingStudent] = useState(null);
    const [targetGroupId, setTargetGroupId] = useState('');
    const [promotionNote, setPromotionNote] = useState('');

    const openCreateModal = () => {
        setEditingItem(null);
        setName('');
        setTargetLevel('Juz 30 (An-Nas s.d An-Naba)');
        setHomeroomTeacherId('');
        setCapacity(15);
        setModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setName(item.name || '');
        setTargetLevel(item.target_level || '');
        setHomeroomTeacherId(item.homeroom_teacher_id || '');
        setCapacity(item.capacity || 15);
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            name,
            target_level: targetLevel,
            academic_year_id: 1,
            educational_institution_id: tahfidzInst?.id || 1,
            homeroom_teacher_id: homeroomTeacherId || null,
            progression_type: 'leveling',
            capacity: Number(capacity),
        };

        try {
            if (editingItem) {
                await updateGroup({ id: editingItem.id, ...payload }).unwrap();
                toast.success('Halaqah berhasil diperbarui');
            } else {
                await createGroup(payload).unwrap();
                toast.success('Halaqah Tahfidz berhasil dibuat');
            }
            setModalOpen(false);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan halaqah');
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteGroup(deleteTarget.id).unwrap();
            toast.success('Halaqah berhasil dihapus');
            setDeleteTarget(null);
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menghapus halaqah');
        }
    };

    const handleAddStudent = async (e) => {
        e.preventDefault();
        if (!selectedStudentToAdd) return;
        try {
            await addStudentToGroup({
                groupId: selectedHalaqah.id,
                student_id: selectedStudentToAdd,
            }).unwrap();
            toast.success('Santri dimasukkan ke halaqah');
            setSelectedStudentToAdd('');
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menambahkan santri');
        }
    };

    const handlePromoteLevel = async (e) => {
        e.preventDefault();
        if (!targetGroupId) return;
        try {
            await promoteTahfidzLevel({
                groupId: selectedHalaqah.id,
                student_id: promotingStudent.id,
                target_group_id: targetGroupId,
                note: promotionNote || `Lulus milestone target hafalan`,
            }).unwrap();
            toast.success(`Alhamdulillah! ${promotingStudent.name} berhasil naik level halaqah!`);
            setPromotingStudent(null);
            setTargetGroupId('');
            setPromotionNote('');
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal mempromosikan level');
        }
    };

    const columns = [
        {
            key: 'name',
            label: 'Nama Halaqah',
            render: (row) => (
                <div>
                    <span className="font-bold text-slate-900">{row.name}</span>
                    <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full inline-block mt-1 font-semibold">
                        Target: {row.target_level || 'Belum Diset'}
                    </span>
                </div>
            ),
        },
        {
            key: 'teacher',
            label: 'Musyrif / Pembimbing',
            render: (row) => (
                <span className="text-sm font-medium text-slate-800">
                    {row.homeroom_teacher?.name || <span className="text-slate-400 italic">Belum Ada</span>}
                </span>
            ),
        },
        {
            key: 'students_count',
            label: 'Santri Aktif',
            render: (row) => (
                <button
                    onClick={(e) => { e.stopPropagation(); setSelectedHalaqah(row); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition shadow-xs"
                >
                    <Users className="w-3.5 h-3.5 text-amber-600" />
                    {row.students_count || 0} Santri
                </button>
            ),
        },
        {
            key: 'actions',
            label: 'Aksi',
            render: (row) => (
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={(e) => { e.stopPropagation(); openEditModal(row); }}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Edit Halaqah"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus Halaqah"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tahfidz & Halaqah (Leveling Dinamis)</h1>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Model Mingguan
                        </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                        Model pendidikan khusus tahfidz di mana kenaikan kelas dapat terjadi setiap minggu berbasis capaian milestone hafalan santri.
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white font-semibold text-sm rounded-xl hover:bg-amber-700 transition shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Buat Halaqah Baru
                </button>
            </div>

            {/* Banner Khusus Leveling Tahfidz */}
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                    <span className="font-bold">Mekanisme Kenaikan Level Mingguan:</span> Berbeda dengan sistem formal semesteran, santri tahfidz tidak perlu menunggu akhir tahun untuk naik jenjang. Begitu santri menyelesaikan target hafalan di halaqahnya (misal Juz 30), Musyrif dapat langsung menaikkan santri ke halaqah tingkat berikutnya (misal Juz 1-5).
                </div>
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={groups}
                isLoading={isLoading}
                emptyMessage="Belum ada halaqah tahfidz terdaftar"
            />

            {/* Modal Form Halaqah */}
            <Modal
                open={modalOpen}
                title={editingItem ? 'Edit Halaqah Tahfidz' : 'Buka Halaqah Tahfidz Baru'}
                onClose={() => setModalOpen(false)}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Nama Halaqah *</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Contoh: Halaqah Abu Bakar (Level Pemula)"
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Target Level / Juz *</label>
                        <input
                            type="text"
                            required
                            value={targetLevel}
                            onChange={(e) => setTargetLevel(e.target.value)}
                            placeholder="Contoh: Juz 30 / Juz 1 s.d 5"
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Musyrif / Pembimbing</label>
                            <select
                                value={homeroomTeacherId}
                                onChange={(e) => setHomeroomTeacherId(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                            >
                                <option value="">-- Pilih Musyrif --</option>
                                {teachers.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Maksimal Santri</label>
                            <input
                                type="number"
                                value={capacity}
                                onChange={(e) => setCapacity(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating || isUpdating}
                            className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50"
                        >
                            {isCreating || isUpdating ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Detail Santri & Aksi Naik Level Mingguan */}
            <Modal
                open={!!selectedHalaqah}
                title={`Santri Halaqah: ${selectedHalaqah?.name || ''}`}
                onClose={() => { setSelectedHalaqah(null); setPromotingStudent(null); }}
            >
                <div className="space-y-4">
                    <form onSubmit={handleAddStudent} className="flex gap-2">
                        <select
                            required
                            value={selectedStudentToAdd}
                            onChange={(e) => setSelectedStudentToAdd(e.target.value)}
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                        >
                            <option value="">-- Masukkan Santri Baru ke Halaqah --</option>
                            {allStudents.map((s) => (
                                <option key={s.id} value={s.id}>{s.name} ({s.nis})</option>
                            ))}
                        </select>
                        <button
                            type="submit"
                            className="px-3 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 flex items-center gap-1 shrink-0"
                        >
                            <UserPlus className="w-4 h-4" /> Masukkan
                        </button>
                    </form>

                    <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-72 overflow-y-auto">
                        {!halaqahDetail?.student_classes?.length ? (
                            <div className="p-6 text-center text-xs text-slate-400">Belum ada santri di halaqah ini</div>
                        ) : (
                            halaqahDetail.student_classes.filter((sc) => sc.status === 'aktif').map((sc) => (
                                <div key={sc.id} className="p-3 flex items-center justify-between text-xs">
                                    <div>
                                        <p className="font-bold text-slate-800">{sc.student?.name}</p>
                                        <p className="text-slate-400 font-mono">NIS: {sc.student?.nis} • Masuk: {sc.joined_at?.substring(0, 10)}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setPromotingStudent(sc.student)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 shadow-xs text-xs"
                                            title="Promosikan Santri ke Halaqah Lebih Tinggi"
                                        >
                                            <ArrowUpRight className="w-3.5 h-3.5" /> Naik Level
                                        </button>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await removeStudentFromGroup({
                                                        groupId: selectedHalaqah.id,
                                                        studentId: sc.student_id,
                                                    }).unwrap();
                                                    toast.success('Santri dikeluarkan dari halaqah');
                                                } catch (err) {
                                                    toast.error('Gagal mengeluarkan santri');
                                                }
                                            }}
                                            className="text-slate-400 hover:text-rose-600 p-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Modal>

            {/* Modal Kenaikan Level (Promote Tahfidz) */}
            <Modal
                open={!!promotingStudent}
                title={`Kenaikan Level Hafalan: ${promotingStudent?.name || ''}`}
                onClose={() => setPromotingStudent(null)}
            >
                <form onSubmit={handlePromoteLevel} className="space-y-4">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                        Santri <span className="font-bold">{promotingStudent?.name}</span> akan dipindahkan dari <strong>{selectedHalaqah?.name}</strong> ke halaqah target berikutnya. Riwayat pencapaian akan direkam secara otomatis.
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Halaqah Tujuan *</label>
                        <select
                            required
                            value={targetGroupId}
                            onChange={(e) => setTargetGroupId(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="">-- Pilih Halaqah Tingkat Selanjutnya --</option>
                            {groups.filter(g => g.id !== selectedHalaqah?.id).map((g) => (
                                <option key={g.id} value={g.id}>
                                    {g.name} — Target: {g.target_level || 'Lanjutan'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Catatan Milestone / Pengujian</label>
                        <textarea
                            rows={2}
                            value={promotionNote}
                            onChange={(e) => setPromotionNote(e.target.value)}
                            placeholder="Contoh: Telah lulus tasmi' 1 juz sekali duduk predikat Mumtaz..."
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setPromotingStudent(null)}
                            className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                        >
                            Konfirmasi Naik Level
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Confirm Dialog */}
            <ConfirmDialog
                open={!!deleteTarget}
                title="Hapus Halaqah Tahfidz"
                message={`Yakin ingin menghapus halaqah ${deleteTarget?.name}?`}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                isLoading={isDeleting}
            />
        </div>
    );
}
