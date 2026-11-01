import { apiSlice } from './apiSlice';

export const assessmentApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getGradingPeriod: builder.query({
            query: (params) => ({
                url: 'main/assessments/grading-period',
                params,
            }),
            providesTags: ['AcademicQuarter'],
        }),
        updateGradingPeriod: builder.mutation({
            query: (data) => ({
                url: 'main/assessments/grading-period',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['AcademicQuarter', 'Assessment'],
        }),
        getQuarterlySheet: builder.query({
            query: (params) => ({
                url: 'main/assessments/quarterly-sheet',
                params,
            }),
            providesTags: ['Assessment', 'ReportCard'],
        }),
        saveQuarterlySheet: builder.mutation({
            query: (data) => ({
                url: 'main/assessments/quarterly-sheet',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Assessment', 'ReportCard', 'ClassGroup'],
        }),
        toggleScoreLock: builder.mutation({
            query: (data) => ({
                url: 'main/assessments/toggle-lock',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Assessment', 'ReportCard'],
        }),
        saveRemedialScores: builder.mutation({
            query: (data) => ({
                url: 'main/assessments/remedial-scores',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Assessment', 'ReportCard', 'ClassGroup'],
        }),
        getGradebook: builder.query({
            query: (params) => ({
                url: 'main/assessments/gradebook',
                params,
            }),
            providesTags: ['Assessment'],
        }),
        importCollectiveExcel: builder.mutation({
            query: (formData) => ({
                url: 'main/assessments/collective-import',
                method: 'POST',
                body: formData,
            }),
            invalidatesTags: ['Assessment', 'ReportCard'],
        }),
        getClassExamEligibility: builder.query({
            query: (classGroupId) => `main/assessments/class-exam-eligibility/${classGroupId}`,
            providesTags: ['Assessment'],
        }),
        getStudentExamEligibility: builder.query({
            query: (nis) => ({
                url: 'main/assessments/exam-eligibility',
                params: { nis },
            }),
        }),
    }),
});

export const {
    useGetGradingPeriodQuery,
    useUpdateGradingPeriodMutation,
    useGetQuarterlySheetQuery,
    useSaveQuarterlySheetMutation,
    useToggleScoreLockMutation,
    useSaveRemedialScoresMutation,
    useGetGradebookQuery,
    useImportCollectiveExcelMutation,
    useGetClassExamEligibilityQuery,
    useLazyGetStudentExamEligibilityQuery,
} = assessmentApi;
