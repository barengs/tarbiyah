import React from 'react';
import { BookOpen } from 'lucide-react';

/**
 * Footer sistem: Alamat resmi, kontak helpdesk, dan hak cipta.
 * Digunakan baik di dalam portal login maupun di bagian bawah konten admin.
 */
export default function Footer({ simple = false, className = '' }) {
    const year = new Date().getFullYear();

    if (simple) {
        return (
            <footer className={`py-4 px-6 text-center text-xs text-slate-400 border-t border-slate-100 ${className}`}>
                &copy; {year} e-Panyeppen &bull; SIM Akademik & Pesantren Mandiri. Hak Cipta Dilindungi.
            </footer>
        );
    }

    return (
        <footer className={`bg-white border-t border-slate-200/90 py-6 px-4 lg:px-8 text-xs text-slate-500 ${className}`}>
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-md bg-[#093c30] text-emerald-300 flex items-center justify-center font-bold">
                        <BookOpen className="w-3.5 h-3.5" />
                    </span>
                    <div>
                        <span className="font-extrabold text-slate-800 text-sm">e-Panyeppen</span>
                        <span className="text-[11px] text-slate-400 block">Powered by PesantrenPro</span>
                    </div>
                </div>

                <div className="text-center md:text-left text-slate-500">
                    <span>Jl. Raya Panyeppen, Potoan Daya, Palengaan, Pamekasan, Jawa Timur</span>
                    <span className="hidden sm:inline mx-2 text-slate-300">|</span>
                    <span className="block sm:inline mt-1 sm:mt-0 font-medium text-slate-700">
                        Kontak Resmi: +62 811-2345-6789
                    </span>
                </div>

                <div className="text-slate-400 text-center md:text-right">
                    &copy; {year} e-Panyeppen. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
