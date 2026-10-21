import React from 'react';
import { ShieldCheck, RefreshCw, Lock } from 'lucide-react';

/**
 * Baris banner kepercayaan portal:
 * SSO Terpadu, sinkronisasi EMIS/SIMPATIKA, dan enkripsi TLS/SSL.
 */
export default function TrustBanner({ className = '' }) {
    return (
        <div className={`bg-white border-b border-slate-100 ${className}`}>
            <div className="max-w-7xl mx-auto px-4 lg:px-8 py-2.5 flex items-center justify-between gap-4 overflow-x-auto">
                <div className="flex items-center gap-4 sm:gap-6 text-xs whitespace-nowrap">
                    <span className="flex items-center gap-1.5 font-bold text-[#093c30]">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        SSO TERPADU MA&rsquo;HAD V4.2
                    </span>
                    <span className="text-slate-300 hidden sm:block">&bull;</span>
                    <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                        <RefreshCw className="w-3.5 h-3.5 text-sky-500" />
                        Tersinkronisasi EMIS Kemenag &amp; SIMPATIKA
                    </span>
                </div>

                <span className="flex items-center gap-1.5 text-xs font-semibold text-[#b45309] bg-orange-50 border border-orange-100 px-2.5 py-1 rounded whitespace-nowrap shrink-0">
                    <Lock className="w-3 h-3" />
                    Enkripsi TLS 1.3 / SSL 256-bit
                </span>
            </div>
        </div>
    );
}
