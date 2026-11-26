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
                            <Route path="kurikulum/tahun-akademik" element={<RequireAccess permissionPrefix="tahun-akademik"><AcademicYearPage /></RequireAccess>} />
                            <Route path="kurikulum/triwulan" element={<RequireAccess permissionPrefix="tahun-akademik"><AcademicYearPage /></RequireAccess>} />
                            <Route path="master/tahun-akademik" element={<RequireAccess permissionPrefix="tahun-akademik"><AcademicYearPage /></RequireAccess>} />
                            <Route path="tahun-akademik" element={<RequireAccess permissionPrefix="tahun-akademik"><AcademicYearPage /></RequireAccess>} />
                            <Route path="kurikulum/jenjang" element={<RequireAccess permissionPrefix="jenjang"><InstitutionPage /></RequireAccess>} />
                            <Route path="kurikulum/kelas" element={<RequireAccess permissionPrefix="kelas"><EducationClassPage /></RequireAccess>} />
                            <Route path="kurikulum/ruang-kelas" element={<RequireAccess permissionPrefix="kelas"><ClassroomPage /></RequireAccess>} />
                            <Route path="kurikulum/rombel" element={<RequireAccess permissionPrefix="rombel"><ClassGroupPage /></RequireAccess>} />
                            <Route path="kurikulum/rombel/:id" element={<RequireAccess permissionPrefix="rombel"><ClassGroupDetailPage /></RequireAccess>} />
                            <Route path="kurikulum/kenaikan-kelas" element={<RequireAccess permissionPrefix="kenaikan-kelas"><ClassPromotionPage /></RequireAccess>} />
                            <Route path="kurikulum/mapel" element={<RequireAccess permissionPrefix="mapel"><StudyPage /></RequireAccess>} />
                            <Route path="kurikulum/jam-pelajaran" element={<RequireAccess permissionPrefix="jam-pelajaran"><LessonHourPage /></RequireAccess>} />
                            
                            {/* Alias Kompatibilitas Kurikulum & Master */}
                            <Route path="master/institusi" element={<RequireAccess permissionPrefix="jenjang"><InstitutionPage /></RequireAccess>} />
                            <Route path="institusi" element={<RequireAccess permissionPrefix="jenjang"><InstitutionPage /></RequireAccess>} />
                            <Route path="kelas" element={<RequireAccess permissionPrefix="kelas"><EducationClassPage /></RequireAccess>} />
                            <Route path="master/kelas" element={<RequireAccess permissionPrefix="kelas"><EducationClassPage /></RequireAccess>} />
                            <Route path="ruang-kelas" element={<RequireAccess permissionPrefix="kelas"><ClassroomPage /></RequireAccess>} />
                            <Route path="master/ruang-kelas" element={<RequireAccess permissionPrefix="kelas"><ClassroomPage /></RequireAccess>} />
                            <Route path="master/classrooms" element={<RequireAccess permissionPrefix="kelas"><ClassroomPage /></RequireAccess>} />
                            <Route path="rombel" element={<RequireAccess permissionPrefix="rombel"><ClassGroupPage /></RequireAccess>} />
                            <Route path="rombel/:id" element={<RequireAccess permissionPrefix="rombel"><ClassGroupDetailPage /></RequireAccess>} />
                            <Route path="master/rombel" element={<RequireAccess permissionPrefix="rombel"><ClassGroupPage /></RequireAccess>} />
                            <Route path="master/rombel/:id" element={<RequireAccess permissionPrefix="rombel"><ClassGroupDetailPage /></RequireAccess>} />
                            <Route path="kenaikan-kelas" element={<RequireAccess permissionPrefix="kenaikan-kelas"><ClassPromotionPage /></RequireAccess>} />
                            <Route path="master/kenaikan-kelas" element={<RequireAccess permissionPrefix="kenaikan-kelas"><ClassPromotionPage /></RequireAccess>} />
                            <Route path="master/mapel" element={<RequireAccess permissionPrefix="mapel"><StudyPage /></RequireAccess>} />
                            <Route path="mapel" element={<RequireAccess permissionPrefix="mapel"><StudyPage /></RequireAccess>} />
                            <Route path="master/jam-pelajaran" element={<RequireAccess permissionPrefix="jam-pelajaran"><LessonHourPage /></RequireAccess>} />
                            <Route path="jam-pelajaran" element={<RequireAccess permissionPrefix="jam-pelajaran"><LessonHourPage /></RequireAccess>} />

                            {/* Modul Data Siswa / Santri */}
                            <Route path="siswa" element={<RequireAccess permissionPrefix="siswa"><StudentPage /></RequireAccess>} />
                            <Route path="siswa/:id" element={<RequireAccess permissionPrefix="siswa"><StudentDetailPage /></RequireAccess>} />
                            <Route path="santri" element={<RequireAccess permissionPrefix="siswa"><StudentPage /></RequireAccess>} />
                            <Route path="santri/:id" element={<RequireAccess permissionPrefix="siswa"><StudentDetailPage /></RequireAccess>} />

                            {/* Modul Guru & Pendidik / Staff */}
                            <Route path="master/guru" element={<RequireAccess permissionPrefix="guru"><TeacherPage /></RequireAccess>} />
                            <Route path="master/guru/:id" element={<RequireAccess permissionPrefix="guru"><TeacherDetailPage /></RequireAccess>} />
                            <Route path="guru" element={<RequireAccess permissionPrefix="guru"><TeacherPage /></RequireAccess>} />
                            <Route path="guru/:id" element={<RequireAccess permissionPrefix="guru"><TeacherDetailPage /></RequireAccess>} />
                            <Route path="staff" element={<RequireAccess permissionPrefix="guru"><TeacherPage /></RequireAccess>} />
                            <Route path="staff/:id" element={<RequireAccess permissionPrefix="guru"><TeacherDetailPage /></RequireAccess>} />

                            {/* Modul Tahfidz, KBM, Presensi, Nilai, Rapor */}
                            <Route path="tahfidz" element={<TahfidzHalaqahPage />} />
                            <Route path="kbm" element={<RequireAccess permissionPrefix="kbm"><ScheduleKbmPage /></RequireAccess>} />
                            <Route path="jadwal" element={<RequireAccess permissionPrefix="kbm"><ScheduleKbmPage /></RequireAccess>} />
                            <Route path="presensi" element={<RequireAccess permissionPrefix="presensi"><AttendancePage /></RequireAccess>} />
                            <Route path="nilai" element={<RequireAccess permissionPrefix="rapor"><AssessmentPage /></RequireAccess>} />
                            <Route path="rapor" element={<RequireAccess permissionPrefix="rapor"><ReportCardPage /></RequireAccess>} />

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
