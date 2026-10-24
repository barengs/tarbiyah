import { apiSlice } from './apiSlice';

/**
 * RTK Query API untuk Data Master Tahun Akademik & Periode Triwulan
 * Hierarki: Tahun Akademik (AcademicYear) -> Sub Akademik Periode Triwulan (AcademicQuarter)
 */
export const academicApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        // ===== TAHUN AKADEMIK =====
        getAcademicYears: builder.query({
            query: () => 'master/academic-years',
            providesTags: (result) =>
                result?.data
                    ? [
                          ...result.data.map(({ id }) => ({ type: 'AcademicYear', id })),
                          { type: 'AcademicYear', id: 'LIST' },
                      ]
                    : [{ type: 'AcademicYear', id: 'LIST' }],
        }),
        getActiveAcademicYear: builder.query({
            query: () => 'master/academic-years/active',
            providesTags: [{ type: 'AcademicYear', id: 'ACTIVE' }],
        }),
        createAcademicYear: builder.mutation({
            query: (data) => ({
                url: 'master/academic-years',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: [
                { type: 'AcademicYear', id: 'LIST' },
                { type: 'AcademicYear', id: 'ACTIVE' },
            ],
        }),
        updateAcademicYear: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `master/academic-years/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [
                { type: 'AcademicYear', id },
                { type: 'AcademicYear', id: 'LIST' },
                { type: 'AcademicYear', id: 'ACTIVE' },
            ],
        }),
        setActiveAcademicYear: builder.mutation({
            query: (id) => ({
                url: `master/academic-years/${id}/set-active`,
                method: 'PATCH',
            }),
            invalidatesTags: [
                { type: 'AcademicYear', id: 'LIST' },
                { type: 'AcademicYear', id: 'ACTIVE' },
            ],
        }),
        deleteAcademicYear: builder.mutation({
            query: (id) => ({
                url: `master/academic-years/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: [
                { type: 'AcademicYear', id: 'LIST' },
                { type: 'AcademicYear', id: 'ACTIVE' },
            ],
        }),

        // ===== PERIODE PENDIDIKAN TRIWULAN =====
        getAcademicQuarters: builder.query({
            query: (academicYearId) =>
                academicYearId
                    ? `master/academic-quarters?academic_year_id=${academicYearId}`
                    : 'master/academic-quarters',
            providesTags: (result) =>
                result?.data
                    ? [
                          ...result.data.map(({ id }) => ({ type: 'AcademicQuarter', id })),
                          { type: 'AcademicQuarter', id: 'LIST' },
                      ]
                    : [{ type: 'AcademicQuarter', id: 'LIST' }],
        }),
        createAcademicQuarter: builder.mutation({
            query: (data) => ({
                url: 'master/academic-quarters',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: [
                { type: 'AcademicQuarter', id: 'LIST' },
                { type: 'AcademicYear', id: 'LIST' },
                { type: 'AcademicYear', id: 'ACTIVE' },
            ],
        }),
        updateAcademicQuarter: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `master/academic-quarters/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [
                { type: 'AcademicQuarter', id },
                { type: 'AcademicQuarter', id: 'LIST' },
                { type: 'AcademicYear', id: 'LIST' },
                { type: 'AcademicYear', id: 'ACTIVE' },
            ],
        }),
        setActiveAcademicQuarter: builder.mutation({
            query: (id) => ({
                url: `master/academic-quarters/${id}/set-active`,
                method: 'PATCH',
            }),
            invalidatesTags: [
                { type: 'AcademicQuarter', id: 'LIST' },
                { type: 'AcademicYear', id: 'LIST' },
                { type: 'AcademicYear', id: 'ACTIVE' },
            ],
        }),
        deleteAcademicQuarter: builder.mutation({
            query: (id) => ({
                url: `master/academic-quarters/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: [
                { type: 'AcademicQuarter', id: 'LIST' },
                { type: 'AcademicYear', id: 'LIST' },
            ],
        }),
    }),
});

export const {
    useGetAcademicYearsQuery,
    useGetActiveAcademicYearQuery,
    useCreateAcademicYearMutation,
    useUpdateAcademicYearMutation,
    useSetActiveAcademicYearMutation,
    useDeleteAcademicYearMutation,
    useGetAcademicQuartersQuery,
    useCreateAcademicQuarterMutation,
    useUpdateAcademicQuarterMutation,
    useSetActiveAcademicQuarterMutation,
    useDeleteAcademicQuarterMutation,
} = academicApi;
