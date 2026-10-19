import { apiSlice } from './apiSlice';

export const institutionApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getInstitutions: builder.query({
            query: () => 'master/institutions',
            providesTags: (result) =>
                result?.data
                    ? [
                          ...result.data.map(({ id }) => ({ type: 'Institution', id })),
                          { type: 'Institution', id: 'LIST' },
                      ]
                    : [{ type: 'Institution', id: 'LIST' }],
        }),
        createInstitution: builder.mutation({
            query: (data) => ({
                url: 'master/institutions',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: [{ type: 'Institution', id: 'LIST' }],
        }),
        updateInstitution: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `master/institutions/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [
                { type: 'Institution', id },
                { type: 'Institution', id: 'LIST' },
            ],
        }),
        deleteInstitution: builder.mutation({
            query: (id) => ({
                url: `master/institutions/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: [{ type: 'Institution', id: 'LIST' }],
        }),
        getEducations: builder.query({
            query: (institutionId) =>
                institutionId
                    ? `master/educations?educational_institution_id=${institutionId}`
                    : 'master/educations',
            providesTags: [{ type: 'EducationLevel', id: 'LIST' }],
        }),
        createEducation: builder.mutation({
            query: (data) => ({
                url: 'master/educations',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: [{ type: 'EducationLevel', id: 'LIST' }, { type: 'Institution', id: 'LIST' }],
        }),
        deleteEducation: builder.mutation({
            query: (id) => ({
                url: `master/educations/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: [{ type: 'EducationLevel', id: 'LIST' }, { type: 'Institution', id: 'LIST' }],
        }),
    }),
});

export const {
    useGetInstitutionsQuery,
    useCreateInstitutionMutation,
    useUpdateInstitutionMutation,
    useDeleteInstitutionMutation,
    useGetEducationsQuery,
    useCreateEducationMutation,
    useDeleteEducationMutation,
} = institutionApi;
