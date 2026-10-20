import { apiSlice } from './apiSlice';

export const reportApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getReports: builder.query({
            query: (params) => ({
                url: 'main/reports',
                params,
            }),
            providesTags: ['ReportCard'],
        }),
        generateReports: builder.mutation({
            query: (data) => ({
                url: 'main/reports/generate',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['ReportCard'],
        }),
        updateReportNotes: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `main/reports/${id}/notes`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: ['ReportCard'],
        }),
    }),
});

export const {
    useGetReportsQuery,
    useGenerateReportsMutation,
    useUpdateReportNotesMutation,
} = reportApi;
