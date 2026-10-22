import React from 'react';
import { CalendarDays, GraduationCap } from 'lucide-react';

/**
 * Badge Kalender Hijriah & Periode Akademik Triwulan
 * Menampilkan tanggal Hijriah resmi dan periode Triwulan aktif ma'had (tanpa teks semester dummy).
 */
export default function HijriBadge({ 
    hijri = '14 Syawal 1446 H', 
    triwulan = 'Triwulan IV (Syawal - Dzulhijjah)', 
    academicYear = '1446/1447 H', 
    className = '' 
}) {
    return (
        <div
            className={`hidden lg:flex items-center gap-2 bg-emerald-50/70 border border-emerald-100/90 text-slate-700 rounded-md px-2.5 py-1 ${className}`}
            title={`Periode Akademik: ${triwulan} TA ${academicYear}`}
        >
            {/* Tanggal Hijriah */}
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[#093c30]">
                <CalendarDays className="w-3.5 h-3.5 text-emerald-700" />
                {hijri}
            </span>

            {/* Divider Halus */}
            <span className="w-px h-3 bg-emerald-200" />

            {/* Periode Triwulan Akademik */}
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
                <span>{triwulan}</span>
            </span>
        </div>
    );
}
