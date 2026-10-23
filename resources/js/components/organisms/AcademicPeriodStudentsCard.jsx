import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../atoms/Card';
import Badge from '../atoms/Badge';
import { Calendar } from 'lucide-react';

/**
 * Organism Jumlah Siswa Tiap Periode Triwulan
 * 100% Mengikuti kalender Triwulan Hijriah pesantren
 */
export default function AcademicPeriodStudentsCard({
    periods = [],
    className = '',
}) {
    return (
        <Card className={`h-full flex flex-col ${className}`}>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                    <CardTitle>Jumlah Siswa Tiap Periode Triwulan</CardTitle>
                    <CardDescription>
                        Monitoring santri aktif per periode Triwulan kalender Hijriah pesantren
                    </CardDescription>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-md font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Kalender Triwulan</span>
                </div>
            </CardHeader>

            <CardContent className="pt-3 pb-5 flex-1">
                <div className="space-y-3">
                    {periods.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-6">
                            Belum ada riwayat periode akademik.
                        </p>
                    ) : (
                        periods.map((period) => (
                            <div
                                key={period.id}
                                className={`p-3.5 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                                    period.is_active
                                        ? 'bg-emerald-50/60 border-emerald-300 shadow-sm'
                                        : 'bg-slate-50/60 border-slate-200/80'
                                }`}
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-xs text-slate-900">
                                            {period.periode || period.label}
                                        </span>
                                        {period.is_active && (
                                            <Badge variant="emerald" size="xs" dot>
                                                Triwulan Aktif
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-500">
                                        Tahun Ajaran: {period.year} • Sistem Triwulan Pesantren
                                    </p>
                                </div>

                                <div className="text-right">
                                    <span className="text-lg font-extrabold text-slate-900 leading-none">
                                        {period.total_siswa?.toLocaleString() || 0}
                                    </span>
                                    <p className="text-[10px] text-slate-400 font-medium">Santri Terdaftar</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
