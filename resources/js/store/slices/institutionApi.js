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
            query: ({ id, body, ...rest }) => ({
                url: `master/institutions/${id}`,
                method: 'POST',
                body: body !== undefined ? body : rest,
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
        importInstitutions: builder.mutation({
            query: (formData) => ({
                url: 'master/institutions/import',
                method: 'POST',
                body: formData,
            }),
            invalidatesTags: [{ type: 'Institution', id: 'LIST' }, { type: 'EducationLevel', id: 'LIST' }, { type: 'EducationType', id: 'LIST' }],
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
        // Kelompok Pendidikan (Formal, Nonformal, Diniyah, Salafiyah, dll)
        getEducationTypes: builder.query({
            query: () => 'master/education-types',
            providesTags: (result) =>
                result?.data
                    ? [
                          ...result.data.map(({ id }) => ({ type: 'EducationType', id })),
                          { type: 'EducationType', id: 'LIST' },
                      ]
                    : [{ type: 'EducationType', id: 'LIST' }],
        }),
        createEducationType: builder.mutation({
            query: (data) => ({
                url: 'master/education-types',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: [{ type: 'EducationType', id: 'LIST' }],
        }),
        updateEducationType: builder.mutation({
            query: ({ id, ...body }) => ({
                url: `master/education-types/${id}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: (result, error, { id }) => [
                { type: 'EducationType', id },
                { type: 'EducationType', id: 'LIST' },
            ],
        }),
        deleteEducationType: builder.mutation({
            query: (id) => ({
                url: `master/education-types/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: [{ type: 'EducationType', id: 'LIST' }],
        }),
    }),
});

export const {
    useGetInstitutionsQuery,
    useCreateInstitutionMutation,
    useUpdateInstitutionMutation,
    useDeleteInstitutionMutation,
    useImportInstitutionsMutation,
    useGetEducationsQuery,
    useCreateEducationMutation,
    useDeleteEducationMutation,
    useGetEducationTypesQuery,
    useCreateEducationTypeMutation,
    useUpdateEducationTypeMutation,
    useDeleteEducationTypeMutation,
} = institutionApi;
