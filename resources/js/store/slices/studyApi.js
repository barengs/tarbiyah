import { apiSlice } from './apiSlice';

export const studyApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getStudies: builder.query({
            query: (params) => ({
                url: 'master/studies',
                params,
            }),
            providesTags: ['Study'],
        }),
        createStudy: builder.mutation({
            query: (data) => ({
                url: 'master/studies',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Study'],
        }),
        updateStudy: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `master/studies/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['Study'],
        }),
        deleteStudy: builder.mutation({
            query: (id) => ({
                url: `master/studies/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Study'],
        }),
    }),
});

export const {
    useGetStudiesQuery,
    useCreateStudyMutation,
    useUpdateStudyMutation,
    useDeleteStudyMutation,
} = studyApi;
