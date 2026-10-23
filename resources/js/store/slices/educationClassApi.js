import { apiSlice } from './apiSlice';

export const educationClassApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getEducationClasses: builder.query({
            query: (params) => ({
                url: 'master/education-classes',
                params,
            }),
            providesTags: ['EducationClass'],
        }),
        getEducationClass: builder.query({
            query: (id) => `master/education-classes/${id}`,
            providesTags: (result, error, id) => [{ type: 'EducationClass', id }],
        }),
        createEducationClass: builder.mutation({
            query: (data) => ({
                url: 'master/education-classes',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['EducationClass'],
        }),
        updateEducationClass: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `master/education-classes/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['EducationClass'],
        }),
        deleteEducationClass: builder.mutation({
            query: (id) => ({
                url: `master/education-classes/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['EducationClass'],
        }),
    }),
});

export const {
    useGetEducationClassesQuery,
    useGetEducationClassQuery,
    useCreateEducationClassMutation,
    useUpdateEducationClassMutation,
    useDeleteEducationClassMutation,
} = educationClassApi;
