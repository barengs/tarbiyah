import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../atoms/Card';
import Badge from '../atoms/Badge';
import NoticeItem from '../molecules/NoticeItem';
import { BookOpenCheck, Download } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Organism Maklumat & Disiplin Terkini (Biro Pengasuhan)
 * Memuat perizinan, sambangan wali, ta'zir & poin apresiasi.
 */
export default function NoticeDisciplineWidget({
    notices = [],
    className = '',
}) {
    return (
        <Card className={`h-full flex flex-col ${className}`}>
            <CardHeader className="flex items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <CardTitle>Maklumat &amp; Disiplin Terkini</CardTitle>
                    </div>
                    <CardDescription>
                        Log verifikasi perizinan santri, riwayat izin mahrom, dan santri teladan hari ini.
                    </CardDescription>
                </div>
                <Badge variant="terracotta" size="xs">
                    Biro Pengasuhan
                </Badge>
            </CardHeader>

            <CardContent className="space-y-4 flex-1 pt-3">
                {notices.map((n, idx) => (
                    <React.Fragment key={n.id}>
                        {idx > 0 && <div className="border-t border-slate-100" />}
                        <NoticeItem
                            type={n.type}
                            tag={n.tag}
                            tag_type={n.tag_type}
                            title={n.title}
                            desc={n.desc}
                            time={n.time}
                        />
                    </React.Fragment>
                ))}
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <Link
                    to="/siswa"
                    className="flex items-center gap-1.5 font-bold text-slate-700 hover:text-[#093c30]"
                >
                    <BookOpenCheck className="w-3.5 h-3.5 text-slate-500" />
                    Buka Buku Induk Ketertiban &amp; Ta&rsquo;zir
                </Link>

                <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-1 text-slate-500 hover:text-slate-800 font-medium"
                >
                    <Download className="w-3.5 h-3.5" />
                    Unduh Laporan Harian
                </button>
            </CardFooter>
        </Card>
    );
}
