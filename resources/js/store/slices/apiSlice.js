import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { logOut } from './authSlice';

const baseQuery = fetchBaseQuery({
    baseUrl: '/api/',
    prepareHeaders: (headers, { getState }) => {
        const token = localStorage.getItem('token');
        if (token) {
            headers.set('authorization', `Bearer ${token}`);
        }
        const academicContext = getState()?.academicContext;
        if (academicContext?.selectedYearId) {
            headers.set('X-Academic-Year-Id', String(academicContext.selectedYearId));
        }
        if (academicContext?.selectedQuarterId) {
            headers.set('X-Academic-Quarter-Id', String(academicContext.selectedQuarterId));
        }
        headers.set('Accept', 'application/json');
        return headers;
    },
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
    let result = await baseQuery(args, api, extraOptions);
    if (result.error && result.error.status === 401) {
        // Abaikan jika sedang memanggil endpoint auth sendiri (misal login)
        const urlStr = typeof args === 'string' ? args : args?.url || '';
        if (!urlStr.includes('auth/login')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            api.dispatch(logOut());
            if (window.location.pathname !== '/login') {
                window.location.href = '/login?expired=1';
            }
        }
    }
    return result;
};

export const apiSlice = createApi({
    reducerPath: 'api',
    baseQuery: baseQueryWithReauth,
    tagTypes: [
        'Dashboard',
        'Institution',
        'EducationLevel',
        'Teacher',
        'Student',
        'AcademicYear',
        'AcademicQuarter',
        'ClassGroup',
        'Study',
        'LessonHour',
        'Schedule',
        'Journal',
        'Presence',
        'Assessment',
        'ReportCard',
        'SecurityMenu',
        'SecurityRole',
        'SecurityPermission',
        'SecurityUser',
        'SidebarMenu',
    ],
    endpoints: () => ({}),
});
