import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../atoms/Card';
import Badge from '../atoms/Badge';
import { Users, BookMarked, GraduationCap, Layers } from 'lucide-react';

/**
 * Organism Statistik Santri per Program & Jenjang Pendidikan
 * 100% data riil dari database:
 * - Program Kubar (Tingkat Ula, Wustho, Ulya)
 * - Program Tibyan (Tingkat Takhossus)
 */
export default function ProgramDistributionCard({
    programs = [],
    totalStudents = 0,
    className = '',
}) {
    // Warna tema pesantren e-Panyeppen
    const programColor = {
        KBR: 'bg-[#093c30]',
        TBY: 'bg-[#b45309]',
    };

    const activePrograms = programs.filter((p) => p.total_students > 0);

    return (
        <Card className={`h-full flex flex-col ${className}`}>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <CardTitle>Statistik Santri per Program & Jenjang</CardTitle>
                    <CardDescription>
                        Sebaran santri di program pesantren Tibyan & Kubar dan jenjangnya
                    </CardDescription>
                </div>
                <Badge variant="darkGreen" size="sm" dot>
                    {totalStudents.toLocaleString()} Santri Terdaftar
                </Badge>
            </CardHeader>

            <CardContent className="space-y-6 flex-1 pt-4">
                {activePrograms.length === 0 ? (
                    <div className="p-10 text-center text-slate-400 text-xs space-y-2">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
                            <Users className="w-6 h-6" />
                        </div>
                        <p>Data santri per program akan tersinkronisasi dari modul akademik (smpt).</p>
                    </div>
                ) : (
                    activePrograms.map((prog, idx) => {
                        const activeColor = programColor[prog.code] || programColor.KBR;

                        return (
                            <div key={prog.id} className="space-y-3">
                                {/* Program Header */}
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <div className="flex items-center gap-2.5">
                                        <span
                                            className="p-1.5 rounded-md text-white text-[10px] font-extrabold"
                                            style={{ backgroundColor: prog.code === 'TBY' ? '#b45309' : '#093c30' }}
                                        >
                                            {prog.code}
                                        </span>
                                        <div>
                                            <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                                Program {prog.name}
                                                {prog.name === 'Tibyan' ? <GraduationCap className="w-3 h-3 text-[#b45309]" /> : <Layers className="w-3 h-3 text-[#093c30]" />}
                                            </p>
                                            <p className="text-[11px] text-slate-500 truncate w-48 sm:w-full">{prog.description}</p>
                                        </div>
                                    </div>
                                    <span className="text-lg font-extrabold text-slate-900 shrink-0">
                                        {prog.total_students}
                                        <span className="text-[10px] font-semibold text-slate-400 ml-1">Santri</span>
                                    </span>
                                </div>

                                {/* Kelas Breakdown */}
                                <div className="space-y-2.5">
                                    {(prog.classes || []).map((cls, cIdx) => {
                                        const pct =
                                            totalStudents > 0
                                                ? Math.max(4, Math.round((cls.count / totalStudents) * 100))
                                                : 0;
                                        return (
                                            <div key={cIdx}>
                                                <div className="flex items-center justify-between text-[11px] mb-1">
                                                    <span className="font-medium text-slate-700 flex items-center gap-1.5">
                                                        <span
                                                            className="w-1.5 h-1.5 rounded-full"
                                                            style={{ backgroundColor: prog.code === 'TBY' ? '#b45309' : '#059669' }}
                                                        />
                                                        {cls.class_name}
                                                        {cls.groups > 1 && (
                                                            <span className="text-slate-400 font-normal">
                                                                ({cls.groups} Rombel)
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="font-bold text-slate-800">
                                                        {cls.count} Santri <span className="text-slate-400 font-normal">({pct}%)</span>
                                                    </span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-700"
                                                        style={{
                                                            width: `${pct}%`,
                                                            backgroundColor: prog.code === 'TBY' ? '#b45309' : '#093c30',
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })
                )}
            </CardContent>
        </Card>
    );
}
