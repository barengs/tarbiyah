import React from 'react';
import PortalHeader from '../components/organisms/PortalHeader';
import TrustBanner from '../components/organisms/TrustBanner';
import Footer from '../components/organisms/Footer';
import FeatureTrustBadge from '../components/molecules/FeatureTrustBadge';
import { Award, FileSpreadsheet, ShieldAlert, Landmark } from 'lucide-react';

/**
 * Layout Khusus Portal Login e-Panyeppen
 * Sesuai desain UI/UX mockup:
 * - Header portal dengan logo & nav PSB
 * - Banner SSO & SSL 256-bit
 * - Area konten dinamis (LoginCard + Helpdesk)
 * - 4 Fitur unggulan bawah (Akreditasi, RDM, Keamanan, Multi-Bank VA)
 * - Footer resmi pesantren
 */
export default function AuthLayout({ children }) {
    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col justify-between selection:bg-[#093c30] selection:text-white">
            <div>
                {/* 1. Header Portal */}
                <PortalHeader />

                {/* 2. Trust & Security Sub-header */}
                <TrustBanner />

                {/* 3. Main Form Canvas */}
                <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8 lg:py-14">
                    {children}
                </main>
            </div>

            {/* 4. Bottom Trust Feature Badges */}
            <div className="bg-white border-t border-slate-100 py-8 px-4 lg:px-8">
                <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <FeatureTrustBadge
                        icon={Award}
                        title="Akreditasi A Unggul"
                        subtitle="BAN-SM &amp; Kemenag RI"
                    />
                    <FeatureTrustBadge
                        icon={FileSpreadsheet}
                        title="Automasi Nilai RDM"
                        subtitle="Rapor Digital Madrasah"
                    />
                    <FeatureTrustBadge
                        icon={ShieldAlert}
                        title="Keamanan Data Santri"
                        subtitle="Backup harian terisolasi"
                    />
                    <FeatureTrustBadge
                        icon={Landmark}
                        title="Multi-Bank Virtual Account"
                        subtitle="BSI, Mandiri, BRI, BCA"
                    />
                </div>
            </div>

            {/* 5. Footer */}
            <Footer />
        </div>
    );
}
