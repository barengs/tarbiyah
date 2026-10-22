import React from 'react';
import { Card } from '../atoms/Card';
import Badge from '../atoms/Badge';
import Button from '../atoms/Button';
import {
    PlusCircle,
    ClipboardCheck,
    Megaphone,
    Activity,
} from 'lucide-react';

/**
 * Hero banner: sambutan Mudir & status operasional aktif.
 * `user` dari state auth, `academicMeta` dari endpoint dashboard/stats.
 */
export default function HeroBanner({ user, academicMeta, ctaHandlers, className = '' }) {
    const firstName = (user?.name || 'Mudir').replace(/^(KH|H|Hj|Ust\.|Ustzh\.|Drs|Ir|Prof)\.?\s+/gi, '').split(' ')[0];

    const systemLabel =
        academicMeta?.triwulan_detail || academicMeta?.triwulan
            ? `Sistem Operasional Aktif • ${academicMeta.triwulan_detail || academicMeta.triwulan} • TA ${academicMeta.hijri_year || '1446/1447 H'}`
            : 'Sistem Operasional Aktif • KBM Terjadwal';

    return (
        <Card className={`p-6 lg:p-8 bg-gradient-to-br from-white via-white to-emerald-50/40 border-emerald-100/60 relative overflow-hidden ${className}`}>
            {/* Decorative bg pattern */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-20 -right-12 w-72 h-72 rounded-full bg-emerald-100/20 blur-3xl" />
                <div className="absolute bottom-0 right-0 w-44 h-44 rounded-full bg-sky-100/20 blur-2xl" />
            </div>

            <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
                {/* Kiri: Status & Salam */}
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <Badge variant="darkGreen" size="sm" dot>
                            <Activity className="w-3 h-3" /> {systemLabel}
                        </Badge>
                        {academicMeta?.hijri && (
                            <Badge variant="slate" size="xs">{academicMeta.hijri}</Badge>
                        )}
                    </div>

                    <h1 className="mt-3 text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                        Ahlan wa Sahlan, {user?.name || firstName}.
                    </h1>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-2xl">
                        Pusat monitoring dan kendali akademik dual-kurikulum: Kemenag / Kemdibud,
                        Ma&rsquo;had Aly, dan Halaqah Tahfidz Quran terpadu.
                    </p>
                </div>

                {/* Kanan: Quick Action CTAs */}
                <div className="flex flex-col gap-2.5 w-full lg:w-auto">
                    <Button
                        variant="primary"
                        icon={PlusCircle}
                        className="w-full lg:w-auto"
                        onClick={ctaHandlers?.onInputNilai}
                    >
                        Input Nilai Imtihan
                    </Button>
                    <Button
                        variant="secondary"
                        icon={ClipboardCheck}
                        className="w-full lg:w-auto"
                        onClick={ctaHandlers?.onRekapPresensi}
                    >
                        Rekap Presensi Jamaah
                    </Button>
                    <Button
                        variant="terracotta"
                        icon={Megaphone}
                        className="w-full lg:w-auto"
                        onClick={ctaHandlers?.onMaklumatBaru}
                    >
                        Maklumat Baru
                    </Button>
                </div>
            </div>
        </Card>
    );
}
