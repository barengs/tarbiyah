import { apiSlice } from './apiSlice';

export const dashboardApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getDashboardStats: builder.query({
            query: () => '/main/dashboard/stats',
            providesTags: ['Dashboard'],
        }),
    }),
});

export const { useGetDashboardStatsQuery } = dashboardApi;
