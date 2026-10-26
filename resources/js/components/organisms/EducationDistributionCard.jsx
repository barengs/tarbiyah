import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../atoms/Card';

const JENJANG_COLORS = [
    { bg: 'bg-[#093c30]', dot: 'bg-[#093c30]' },
    { bg: 'bg-emerald-600', dot: 'bg-emerald-600' },
];

/**
 * Organism Distribusi Jenjang Santri
 * Data diterima dinamis dari database.
 */
export default function EducationDistributionCard({
    institutions = [],
    className = '',
}) {
    const totalSantri = institutions.reduce((acc, i) => acc + (i.count || 0), 0);

    return (
        <Card className={`h-full flex flex-col ${className}`}>
            <CardHeader className="flex items-start justify-between pb-3">
                <div>
                    <CardTitle>Distribusi Jenjang</CardTitle>
                    <CardDescription>
                        Komposisi madrasah formal
                    </CardDescription>
                </div>
                {totalSantri > 0 && (
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {totalSantri.toLocaleString()} Santri
                    </span>
                )}
            </CardHeader>

            <CardContent className="space-y-4 pt-3">
                {totalSantri > 0 && (
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        {institutions.map((inst, idx) => {
                            const pct = Math.max(5, (inst.count / totalSantri) * 100);
                            const c = JENJANG_COLORS[idx % JENJANG_COLORS.length];
                            return (
                                <div
                                    key={inst.name}
                                    style={{ width: `${pct}%` }}
                                    className={`${c.bg} transition-all duration-500`}
                                    title={`${inst.name}: ${inst.count} Santri (${Math.round(pct)}%)`}
                                />
                            );
                        })}
                    </div>
                )}

                <div className="space-y-3">
                    {institutions.map((inst, idx) => {
                        const c = JENJANG_COLORS[idx % JENJANG_COLORS.length];
                        return (
                            <div key={inst.name} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-800 truncate">{inst.name}</p>
                                    </div>
                                </div>
                                <span className="font-extrabold text-slate-900 text-sm shrink-0">
                                    {inst.count.toLocaleString()}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
