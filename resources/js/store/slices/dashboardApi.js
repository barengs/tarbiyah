import { apiSlice } from './apiSlice';

export const dashboardApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getDashboardStats: builder.query({
            query: (params) => {
                const searchParams = new URLSearchParams();
                if (params?.academic_year_id) {
                    searchParams.append('academic_year_id', params.academic_year_id);
                }
                if (params?.academic_quarter_id) {
                    searchParams.append('academic_quarter_id', params.academic_quarter_id);
                }
                const queryString = searchParams.toString();
                return queryString ? `/main/dashboard/stats?${queryString}` : '/main/dashboard/stats';
            },
            providesTags: ['Dashboard'],
        }),
    }),
});

export const { useGetDashboardStatsQuery } = dashboardApi;
