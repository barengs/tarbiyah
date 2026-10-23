import React, { useState } from 'react';
import InstitutionPage from './InstitutionPage';
import StudyPage from './StudyPage';
import FlatTabs from '../../components/atoms/FlatTabs';
import { Layers, BookOpen } from 'lucide-react';

/**
 * Halaman Modul: Jenjang & Kurikulum
 * Menggabungkan konfigurasi Lembaga & Tingkat Pendidikan (MTs, MA, SMP, Tahfidz)
 * dan Kurikulum Mata Pelajaran Diniyah/Kemenag dalam satu antarmuka tab terintegrasi.
 */
export default function KurikulumPage() {
    const [activeTab, setActiveTab] = useState('institusi');

    const tabs = [
        { id: 'institusi', label: 'Lembaga & Jenjang Pendidikan', icon: Layers },
        { id: 'mapel', label: 'Mata Pelajaran & Kurikulum Kitab', icon: BookOpen },
    ];

    return (
        <div className="space-y-6">
            {/* Header Modul */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4 bg-white p-5 rounded-md border shadow-xs">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <span className="p-2 bg-emerald-50 text-emerald-700 rounded-md">
                            <Layers className="w-5 h-5" />
                        </span>
                        Jenjang &amp; Kurikulum Akademik
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Pusat pengelolaan struktur lembaga madrasah, tingkatan santri, dan daftar silabus mata pelajaran.
                    </p>
                </div>

                <div className="w-full sm:w-auto">
                    <FlatTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
                </div>
            </div>

            {/* Konten Tab Terpilih */}
            <div className="transition-all">
                {activeTab === 'institusi' ? <InstitutionPage /> : <StudyPage />}
            </div>
        </div>
    );
}
