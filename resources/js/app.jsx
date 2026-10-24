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
import InstitutionPage from './pages/master/InstitutionPage';
import AcademicYearPage from './pages/master/AcademicYearPage';
import EducationClassPage from './pages/master/EducationClassPage';
import ClassGroupPage from './pages/ClassGroupPage';
import ClassPromotionPage from './pages/ClassPromotionPage';
import StudyPage from './pages/master/StudyPage';
import LessonHourPage from './pages/master/LessonHourPage';
import TeacherPage from './pages/master/TeacherPage';
import StudentPage from './pages/StudentPage';
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
                            
                            {/* Modul Kurikulum & Sub-menu */}
                            <Route path="kurikulum" element={<Navigate to="/kurikulum/jenjang" replace />} />
                            <Route path="kurikulum/tahun-akademik" element={<AcademicYearPage />} />
                            <Route path="kurikulum/triwulan" element={<AcademicYearPage />} />
                            <Route path="master/tahun-akademik" element={<AcademicYearPage />} />
                            <Route path="tahun-akademik" element={<AcademicYearPage />} />
                            <Route path="kurikulum/jenjang" element={<InstitutionPage />} />
                            <Route path="kurikulum/kelas" element={<EducationClassPage />} />
                            <Route path="kurikulum/rombel" element={<ClassGroupPage />} />
                            <Route path="kurikulum/kenaikan-kelas" element={<ClassPromotionPage />} />
                            <Route path="kurikulum/mapel" element={<StudyPage />} />
                            <Route path="kurikulum/jam-pelajaran" element={<LessonHourPage />} />
                            
                            {/* Alias Kompatibilitas Kurikulum & Master */}
                            <Route path="master/institusi" element={<InstitutionPage />} />
                            <Route path="institusi" element={<InstitutionPage />} />
                            <Route path="kelas" element={<EducationClassPage />} />
                            <Route path="master/kelas" element={<EducationClassPage />} />
                            <Route path="rombel" element={<ClassGroupPage />} />
                            <Route path="master/rombel" element={<ClassGroupPage />} />
                            <Route path="kenaikan-kelas" element={<ClassPromotionPage />} />
                            <Route path="master/kenaikan-kelas" element={<ClassPromotionPage />} />
                            <Route path="master/mapel" element={<StudyPage />} />
                            <Route path="mapel" element={<StudyPage />} />
                            <Route path="master/jam-pelajaran" element={<LessonHourPage />} />
                            <Route path="jam-pelajaran" element={<LessonHourPage />} />

                            {/* Modul Data Siswa / Santri */}
                            <Route path="siswa" element={<StudentPage />} />
                            <Route path="santri" element={<StudentPage />} />

                            {/* Modul Guru & Pendidik */}
                            <Route path="master/guru" element={<TeacherPage />} />
                            <Route path="guru" element={<TeacherPage />} />

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
