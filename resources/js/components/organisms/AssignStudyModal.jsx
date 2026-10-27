import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import { useGetStudiesQuery } from '../../store/slices/studyApi';
import { useGetInstitutionsQuery } from '../../store/slices/institutionApi';
import { useAssignTeacherStudiesMutation } from '../../store/slices/teacherApi';
import { Search, BookOpen, Building2, Check, Loader2, Filter, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';

export default function AssignStudyModal({ open, onClose, teacher, onSuccess }) {
    const { data: studiesRes, isLoading: isLoadingStudies } = useGetStudiesQuery();
    const { data: instsRes } = useGetInstitutionsQuery();
    const [assignStudies, { isLoading: isAssigning }] = useAssignTeacherStudiesMutation();

    const allStudies = studiesRes?.data || [];
    const institutions = instsRes?.data || [];

    const [selectedIds, setSelectedIds] = useState([]);
    const [search, setSearch] = useState('');
    const [institutionFilter, setInstitutionFilter] = useState('');

    // Sinkronisasi state selectedIds saat teacher berubah atau modal dibuka
    useEffect(() => {
        if (open && teacher) {
            const currentStudyIds = (teacher.studies || []).map((s) => s.id);
            setSelectedIds(currentStudyIds);
            setSearch('');
            setInstitutionFilter('');
        }
    }, [open, teacher]);

    // Filter daftar mata pelajaran berdasarkan search dan lembaga
    const filteredStudies = useMemo(() => {
        return allStudies.filter((study) => {
            const matchSearch =
                !search ||
                study.name?.toLowerCase().includes(search.toLowerCase()) ||
                study.code?.toLowerCase().includes(search.toLowerCase());

            const matchInst =
                !institutionFilter ||
                String(study.educational_institution_id) === String(institutionFilter);

            return matchSearch && matchInst;
        });
    }, [allStudies, search, institutionFilter]);

    const handleToggleStudy = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleSelectAllFiltered = () => {
        const filteredIds = filteredStudies.map((s) => s.id);
        const allSelected = filteredIds.every((id) => selectedIds.includes(id));

        if (allSelected) {
            // Uncheck semua yang sedang tampil di filter
            setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
        } else {
            // Check semua yang sedang tampil di filter
            setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!teacher) return;

        try {
            await assignStudies({
                id: teacher.id,
                study_ids: selectedIds,
            }).unwrap();

            toast.success(`Mata pelajaran untuk ${teacher.name} berhasil diperbarui`);
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            toast.error(err?.data?.message || 'Gagal menyimpan penugasan mata pelajaran');
        }
    };

    const isAllFilteredSelected =
        filteredStudies.length > 0 &&
        filteredStudies.every((s) => selectedIds.includes(s.id));

    return (
        <Modal
            open={open}
            title={
                <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-emerald-50 text-[#093c30] rounded-md">
                        <BookOpen className="w-4 h-4" />
                    </span>
                    <div>
                        <h3 className="text-base font-bold text-slate-900 leading-tight">
                            Tugaskan Mata Pelajaran
                        </h3>
                        <p className="text-xs text-slate-500 font-normal">
                            Guru: <strong className="text-slate-800">{teacher?.name}</strong>{' '}
                            {teacher?.nip ? `(${teacher.nip})` : ''}
                        </p>
                    </div>
                </div>
            }
            onClose={onClose}
            maxWidth="max-w-2xl"
            footer={
                <div className="flex items-center justify-between w-full">
                    <span className="text-xs text-slate-500 font-medium">
                        <strong className="text-emerald-800 font-bold">{selectedIds.length}</strong> mata pelajaran dipilih
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isAssigning}
                            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isAssigning}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#093c30] hover:bg-[#072d24] rounded-md transition-colors disabled:opacity-50 shadow-2xs"
                        >
                            {isAssigning ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <Check className="w-3.5 h-3.5" />
                                    Simpan Penugasan Mapel
                                </>
                            )}
                        </button>
                    </div>
                </div>
            }
        >
            <div className="space-y-4">
                {/* TOOLBAR FILTER & SEARCH */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-7 relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari nama atau kode mapel..."
                            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-[#093c30] focus:border-transparent outline-none bg-white"
                        />
                    </div>
                    <div className="sm:col-span-5">
                        <select
                            value={institutionFilter}
                            onChange={(e) => setInstitutionFilter(e.target.value)}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-[#093c30] focus:border-transparent outline-none bg-white"
                        >
                            <option value="">Semua Lembaga / Umum</option>
                            {institutions.map((inst) => (
                                <option key={inst.id} value={inst.id}>
                                    {inst.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* PILIH SEMUA BARIS */}
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-md border border-slate-200/80 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 select-none">
                        <input
                            type="checkbox"
                            checked={isAllFilteredSelected}
                            onChange={handleSelectAllFiltered}
                            className="w-4 h-4 rounded border-slate-300 text-[#093c30] focus:ring-[#093c30]"
                        />
                        <span>Pilih semua yang tampil ({filteredStudies.length})</span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                        Total katalog: {allStudies.length} mapel
                    </span>
                </div>

                {/* DAFTAR CHECKBOX MAPEL */}
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-md bg-white">
                    {isLoadingStudies ? (
                        <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-[#093c30]" />
                            Memuat daftar mata pelajaran...
                        </div>
                    ) : filteredStudies.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs">
                            <AlertCircle className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                            Tidak ada mata pelajaran yang cocok dengan kriteria pencarian.
                        </div>
                    ) : (
                        filteredStudies.map((study) => {
                            const isChecked = selectedIds.includes(study.id);
                            return (
                                <label
                                    key={study.id}
                                    className={`flex items-start gap-3 p-3 text-xs transition-colors cursor-pointer select-none ${
                                        isChecked
                                            ? 'bg-emerald-50/40 hover:bg-emerald-50/60'
                                            : 'hover:bg-slate-50'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleToggleStudy(study.id)}
                                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#093c30] focus:ring-[#093c30]"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="font-bold text-slate-900 truncate">
                                                {study.name}
                                            </p>
                                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                                {study.code || '-'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Building2 className="w-3 h-3 text-slate-400" />
                                                {study.educational_institution?.name || 'Umum (Semua Lembaga)'}
                                            </span>
                                            <span>•</span>
                                            <span>KKM: <strong className="text-slate-700">{study.kkm}</strong></span>
                                        </div>
                                    </div>
                                </label>
                            );
                        })
                    )}
                </div>
            </div>
        </Modal>
    );
}
