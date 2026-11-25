import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
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
import ClassroomPage from './pages/master/ClassroomPage';
import ClassGroupPage from './pages/ClassGroupPage';
import ClassGroupDetailPage from './pages/ClassGroupDetailPage';
import ClassPromotionPage from './pages/ClassPromotionPage';
import StudyPage from './pages/master/StudyPage';
import LessonHourPage from './pages/master/LessonHourPage';
import TeacherPage from './pages/master/TeacherPage';
import TeacherDetailPage from './pages/master/TeacherDetailPage';
import StudentPage from './pages/StudentPage';
import StudentDetailPage from './pages/StudentDetailPage';
import TahfidzHalaqahPage from './pages/TahfidzHalaqahPage';
import ScheduleKbmPage from './pages/ScheduleKbmPage';
import AssessmentPage from './pages/AssessmentPage';
import AttendancePage from './pages/AttendancePage';
import ReportCardPage from './pages/ReportCardPage';
import MenuManagementPage from './pages/security/MenuManagementPage';
import RoleManagementPage from './pages/security/RoleManagementPage';
import UserManagementPage from './pages/security/UserManagementPage';
import GradingPeriodPage from './pages/settings/GradingPeriodPage';
import { useGetSidebarMenusQuery } from './store/slices/securityApi';

import '../css/app.css';

function RequireAccess({ permissionPrefix, adminOnly = false, children }) {
    const { user } = useSelector((state) => state.auth);
    const { data: sidebarRes, isLoading } = useGetSidebarMenusQuery();

    if (!user) {
        return null;
    }

    const roleNames = Array.isArray(user.roles)
        ? user.roles.map((r) => (typeof r === 'string' ? r : r?.name)).filter(Boolean)
        : [];
    const primaryRole = user.role || roleNames[0] || '';
    const isSuperAdmin =
        primaryRole === 'superadmin' ||
        primaryRole === 'mudir' ||
        roleNames.includes('superadmin');
    const isAdmin = isSuperAdmin || primaryRole === 'admin' || roleNames.includes('admin');

    if (isSuperAdmin) {
        return children;
    }

    if (adminOnly && !isAdmin) {
        return <Navigate to="/" replace />;
    }

    if (permissionPrefix) {
        const perms = Array.isArray(user.permission_names) ? user.permission_names : [];
        if (perms.length > 0) {
            const hasPerm = perms.some(
                (p) => p === permissionPrefix || p.startsWith(`${permissionPrefix}.`)
            );
            if (!hasPerm) {
                return <Navigate to="/" replace />;
            }
            return children;
        }

        // Fallback cek dari daftar menu sidebar yang diizinkan untuk role user
        if (!isLoading && Array.isArray(sidebarRes?.data)) {
            const flatMenus = [];
            sidebarRes.data.forEach((m) => {
                flatMenus.push(m);
                if (Array.isArray(m.children)) {
                    flatMenus.push(...m.children);
                }
            });
            const hasMenu = flatMenus.some(
                (m) => m.permission_slug === permissionPrefix || m.slug === permissionPrefix
            );
            if (!hasMenu && !isAdmin) {
                return <Navigate to="/" replace />;
            }
        }
    }

    return children;
}

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
                            <Route path="kurikulum/ruang-kelas" element={<ClassroomPage />} />
                            <Route path="kurikulum/rombel" element={<ClassGroupPage />} />
                            <Route path="kurikulum/rombel/:id" element={<ClassGroupDetailPage />} />
                            <Route path="kurikulum/kenaikan-kelas" element={<ClassPromotionPage />} />
                            <Route path="kurikulum/mapel" element={<StudyPage />} />
                            <Route path="kurikulum/jam-pelajaran" element={<LessonHourPage />} />
                            
                            {/* Alias Kompatibilitas Kurikulum & Master */}
                            <Route path="master/institusi" element={<InstitutionPage />} />
                            <Route path="institusi" element={<InstitutionPage />} />
                            <Route path="kelas" element={<EducationClassPage />} />
                            <Route path="master/kelas" element={<EducationClassPage />} />
                            <Route path="ruang-kelas" element={<ClassroomPage />} />
                            <Route path="master/ruang-kelas" element={<ClassroomPage />} />
                            <Route path="master/classrooms" element={<ClassroomPage />} />
                            <Route path="rombel" element={<ClassGroupPage />} />
                            <Route path="rombel/:id" element={<ClassGroupDetailPage />} />
                            <Route path="master/rombel" element={<ClassGroupPage />} />
                            <Route path="master/rombel/:id" element={<ClassGroupDetailPage />} />
                            <Route path="kenaikan-kelas" element={<ClassPromotionPage />} />
                            <Route path="master/kenaikan-kelas" element={<ClassPromotionPage />} />
                            <Route path="master/mapel" element={<StudyPage />} />
                            <Route path="mapel" element={<StudyPage />} />
                            <Route path="master/jam-pelajaran" element={<LessonHourPage />} />
                            <Route path="jam-pelajaran" element={<LessonHourPage />} />

                            {/* Modul Data Siswa / Santri */}
                            <Route path="siswa" element={<StudentPage />} />
                            <Route path="siswa/:id" element={<StudentDetailPage />} />
                            <Route path="santri" element={<StudentPage />} />
                            <Route path="santri/:id" element={<StudentDetailPage />} />

                            {/* Modul Guru & Pendidik / Staff */}
                            <Route path="master/guru" element={<TeacherPage />} />
                            <Route path="master/guru/:id" element={<TeacherDetailPage />} />
                            <Route path="guru" element={<TeacherPage />} />
                            <Route path="guru/:id" element={<TeacherDetailPage />} />
                            <Route path="staff" element={<TeacherPage />} />
                            <Route path="staff/:id" element={<TeacherDetailPage />} />

                            {/* Modul Tahfidz, KBM, Presensi, Nilai, Rapor */}
                            <Route path="tahfidz" element={<TahfidzHalaqahPage />} />
                            <Route path="kbm" element={<ScheduleKbmPage />} />
                            <Route path="jadwal" element={<ScheduleKbmPage />} />
                            <Route path="presensi" element={<AttendancePage />} />
                            <Route path="nilai" element={<AssessmentPage />} />
                            <Route path="rapor" element={<ReportCardPage />} />

                            {/* Modul Keamanan & Manajemen Akses (Admin / Superadmin) */}
                            <Route path="pengaturan/masa-nilai" element={<RequireAccess permissionPrefix="pengaturan" adminOnly><GradingPeriodPage /></RequireAccess>} />
                            <Route path="admin/masa-nilai" element={<RequireAccess permissionPrefix="pengaturan" adminOnly><GradingPeriodPage /></RequireAccess>} />
                            <Route path="admin/menu" element={<RequireAccess permissionPrefix="menu" adminOnly><MenuManagementPage /></RequireAccess>} />
                            <Route path="admin/role" element={<RequireAccess permissionPrefix="role" adminOnly><RoleManagementPage /></RequireAccess>} />
                            <Route path="admin/pengguna" element={<RequireAccess permissionPrefix="user" adminOnly><UserManagementPage /></RequireAccess>} />
                            <Route path="admin/users" element={<RequireAccess permissionPrefix="user" adminOnly><UserManagementPage /></RequireAccess>} />
                            <Route path="admin/user" element={<RequireAccess permissionPrefix="user" adminOnly><UserManagementPage /></RequireAccess>} />

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
