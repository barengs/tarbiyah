import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

/**
 * Breadcrumb dinamis: label diambil dari map route,
 * bisa dioverride via props `items` per halaman.
 */
const ROUTE_LABELS = {
    '': 'Dashboard Utama',
    master: 'Master Data',
    kurikulum: 'Kurikulum',
    jenjang: 'Jenjang Pendidikan',
    institusi: 'Jenjang Pendidikan',
    guru: 'Guru & Pendidik',
    mapel: 'Mata Pelajaran',
    'jam-pelajaran': 'Jam Pelajaran',
    siswa: 'Santri & Kenaikan Kelas',
    kelas: 'Kelas & Rombel',
    rombel: 'Kelas & Rombel',
    tahfidz: 'Tahfidz & Halaqah',
    kbm: 'Jadwal Pelajaran & Halaqah',
    jadwal: 'Jadwal Pelajaran & Halaqah',
    presensi: 'Presensi & Disiplin',
    nilai: 'Penilaian & Ujian',
    rapor: 'Rekap Tahfizh & Nilai',
};

export default function Breadcrumb({ items, className = '' }) {
    const location = useLocation();

    // Auto-generate dari path bila tidak ada override
    const segments = location.pathname.split('/').filter(Boolean);
    const crumbs =
        items ||
        [
            { label: 'Sistem Akademik', to: '/' },
            ...segments.map((seg, i) => ({
                label: ROUTE_LABELS[seg] || seg.replace(/-/g, ' '),
                to: '/' + segments.slice(0, i + 1).join('/'),
            })),
        ];

    if (crumbs.length <= 1) {
        return (
            <div className={`flex items-center gap-1.5 text-sm ${className}`}>
                <Home className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-700">{crumbs[0]?.label}</span>
            </div>
        );
    }

    return (
        <nav aria-label="Breadcrumb" className={`flex items-center gap-1.5 text-sm min-w-0 ${className}`}>
            {crumbs.map((crumb, i) => {
                const isLast = i === crumbs.length - 1;
                return (
                    <React.Fragment key={`${crumb.label}-${i}`}>
                        {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                        {isLast ? (
                            <span className="font-semibold text-slate-800 truncate">{crumb.label}</span>
                        ) : (
                            <Link
                                to={crumb.to || '/'}
                                className="text-slate-500 hover:text-[#093c30] transition-colors truncate hover:underline underline-offset-2"
                            >
                                {crumb.label}
                            </Link>
                        )}
                    </React.Fragment>
                );
            })}
        </nav>
    );
}
