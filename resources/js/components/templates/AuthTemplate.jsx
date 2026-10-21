import React from 'react';
import LoginCard from '../organisms/LoginCard';
import LoginHelpdeskCard from '../organisms/LoginHelpdeskCard';

/**
 * Template Konten Autentikasi:
 * 2 Kolom (Card Form Utama di kiri, Bantuan Helpdesk di kanan).
 */
export default function AuthTemplate({ onSubmit, isLoading }) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Card Login Kiri (7/12 kolom) */}
            <div className="lg:col-span-7">
                <LoginCard onSubmit={onSubmit} isLoading={isLoading} />
            </div>

            {/* Card Helpdesk Kanan (5/12 kolom) */}
            <div className="lg:col-span-5">
                <LoginHelpdeskCard />
            </div>
        </div>
    );
}
