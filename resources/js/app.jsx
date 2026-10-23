import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import MainLayout from './layouts/MainLayout';
import AuthMonitor from './components/AuthMonitor';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import KurikulumPage from './pages/master/KurikulumPage';
import InstitutionPage from './pages/master/InstitutionPage';
import TeacherPage from './pages/master/TeacherPage';
import StudentPage from './pages/StudentPage';
import StudyPage from './pages/master/StudyPage';
import ClassGroupPage from './pages/ClassGroupPage';
import TahfidzHalaqahPage from './pages/TahfidzHalaqahPage';
import ScheduleKbmPage from './pages/ScheduleKbmPage';
import AssessmentPage from './pages/AssessmentPage';
import AttendancePage from './pages/AttendancePage';
import ReportCardPage from './pages/ReportCardPage';

import '../css/app.css';

const App = () => {
    return (
        <Provider store={store}>
            <Router>
                <AuthMonitor>
                    <ToastContainer position="top-right" autoClose={3000} />
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/" element={<MainLayout />}>
                            <Route index element={<Dashboard />} />
                            
                            {/* Modul Jenjang & Kurikulum */}
                            <Route path="kurikulum" element={<KurikulumPage />} />
                            <Route path="master/institusi" element={<InstitutionPage />} />
                            <Route path="institusi" element={<InstitutionPage />} />
                            <Route path="master/mapel" element={<StudyPage />} />
                            <Route path="mapel" element={<StudyPage />} />

                            {/* Modul Guru & Pendidik */}
                            <Route path="master/guru" element={<TeacherPage />} />
                            <Route path="guru" element={<TeacherPage />} />

                            {/* Modul Siswa & Santri */}
                            <Route path="siswa" element={<StudentPage />} />

                            {/* Modul Kelas & Rombel (Mendukung path /kelas dan /rombel) */}
                            <Route path="kelas" element={<ClassGroupPage />} />
                            <Route path="rombel" element={<ClassGroupPage />} />

                            {/* Modul Tahfidz, KBM, Presensi, Nilai, Rapor */}
                            <Route path="tahfidz" element={<TahfidzHalaqahPage />} />
                            <Route path="kbm" element={<ScheduleKbmPage />} />
                            <Route path="jadwal" element={<ScheduleKbmPage />} />
                            <Route path="presensi" element={<AttendancePage />} />
                            <Route path="nilai" element={<AssessmentPage />} />
                            <Route path="rapor" element={<ReportCardPage />} />

                            {/* Fallback route */}
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Route>
                    </Routes>
                </AuthMonitor>
            </Router>
        </Provider>
    );
};

const container = document.getElementById('app');
if (container) {
    if (!container._reactRoot) {
        container._reactRoot = createRoot(container);
    }
    container._reactRoot.render(<App />);
}
