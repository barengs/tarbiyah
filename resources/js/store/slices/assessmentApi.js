import { apiSlice } from './apiSlice';

export const assessmentApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getAssessmentCategories: builder.query({
            query: () => 'main/assessments/categories',
            providesTags: ['Assessment'],
        }),
        getAssessments: builder.query({
            query: (params) => ({
                url: 'main/assessments',
                params,
            }),
            providesTags: ['Assessment'],
        }),
        getAssessment: builder.query({
            query: (id) => `main/assessments/${id}`,
            providesTags: (result, error, id) => [{ type: 'Assessment', id }],
        }),
        createAssessment: builder.mutation({
            query: (data) => ({
                url: 'main/assessments',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Assessment'],
        }),
        updateAssessment: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `main/assessments/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['Assessment'],
        }),
        deleteAssessment: builder.mutation({
            query: (id) => ({
                url: `main/assessments/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Assessment'],
        }),
        saveScores: builder.mutation({
            query: ({ assessmentId, ...data }) => ({
                url: `main/assessments/${assessmentId}/scores`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Assessment'],
        }),
        getGradebook: builder.query({
            query: (params) => ({
                url: 'main/assessments/gradebook',
                params,
            }),
            providesTags: ['Assessment'],
        }),
    }),
});

export const {
    useGetAssessmentCategoriesQuery,
    useGetAssessmentsQuery,
    useGetAssessmentQuery,
    useCreateAssessmentMutation,
    useUpdateAssessmentMutation,
    useDeleteAssessmentMutation,
    useSaveScoresMutation,
    useGetGradebookQuery,
} = assessmentApi;
