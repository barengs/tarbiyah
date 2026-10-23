import React from 'react';
import { Card } from '../atoms/Card';
import Button from '../atoms/Button';
import { Headphones, MessageCircle, Mail, MapPin, ChevronRight } from 'lucide-react';

/**
 * Organism kartu bantuan samping login:
 * Sekretariat Akademik & IT (WhatsApp Helpdesk).
 */
export default function LoginHelpdeskCard({ className = '' }) {
    return (
        <Card className={`p-7 bg-gradient-to-b from-slate-50 to-white border-slate-200 ${className}`}>
            <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-md bg-[#093c30] text-emerald-300 flex items-center justify-center shadow-sm">
                    <Headphones className="w-5 h-5" />
                </span>
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                        Bantuan Helpdesk
                    </p>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight leading-tight">
                        Sekretariat Akademik &amp; IT
                    </h3>
                </div>
            </div>

            <p className="mt-4 text-[13px] text-slate-600 leading-relaxed">
                Kendala autentikasi, lupa kata sandi, akun santri tidak aktif, atau migrasi dari
                SIM lama? Hubungi helpdesk resmi pesantren berikut:
            </p>

            <div className="mt-5 space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-md bg-white border border-slate-200 shadow-xs">
                    <span className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                        <MessageCircle className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-xs text-slate-500 font-medium">WhatsApp Helpdesk</p>
                        <p className="text-sm font-bold text-slate-800 tracking-tight">
                            +62 811-2345-6789
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-md bg-white border border-slate-200 shadow-xs">
                    <span className="w-8 h-8 rounded-md bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-xs text-slate-500 font-medium">Email Resmi</p>
                        <p className="text-sm font-bold text-slate-800 tracking-tight">
                            it@tarbiyah.pesantren.id
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-md bg-white border border-slate-200 shadow-xs">
                    <span className="w-8 h-8 rounded-md bg-orange-50 text-[#b45309] flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-xs text-slate-500 font-medium">Pos Operator Terpadu</p>
                        <p className="text-[13px] font-semibold text-slate-700 leading-snug">
                            Gedung Sekretariat Lt. 1, Komplek Ma&rsquo;had
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            Senin - Sabtu &bull; 07.00 - 16.00 WIB
                        </p>
                    </div>
                </div>
            </div>

            <Button
                type="button"
                variant="whatsapp"
                size="lg"
                icon={MessageCircle}
                className="w-full mt-6 py-3 font-bold"
                onClick={() => window.open('https://wa.me/6281123456789', '_blank')}
            >
                Chat WhatsApp Helpdesk
            </Button>

            <a
                href="#panduan"
                onClick={(e) => {
                    e.preventDefault();
                    alert('Panduan penggunaan sistem akademik akan diunduh.');
                }}
                className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#093c30] transition-colors"
            >
                Panduan Lengkap Akademik
                <ChevronRight className="w-3 h-3" />
            </a>
        </Card>
    );
}
