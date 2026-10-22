import { apiSlice } from './apiSlice';

export const journalApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getJournals: builder.query({
            query: (params) => ({
                url: 'main/journals',
                params,
            }),
            providesTags: ['Journal'],
        }),
        getJournal: builder.query({
            query: (id) => `main/journals/${id}`,
            providesTags: (result, error, id) => [{ type: 'Journal', id }],
        }),
        getAttendanceSheet: builder.query({
            query: (params) => ({
                url: 'main/journals/sheet',
                params,
            }),
            providesTags: ['Journal'],
        }),
        createJournal: builder.mutation({
            query: (data) => ({
                url: 'main/journals',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Journal'],
        }),
        batchPresence: builder.mutation({
            query: (data) => ({
                url: 'main/journals/batch-presence',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Journal'],
        }),
        updateJournal: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `main/journals/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['Journal'],
        }),
        deleteJournal: builder.mutation({
            query: (id) => ({
                url: `main/journals/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Journal'],
        }),
        updatePresences: builder.mutation({
            query: ({ journal_id, journalId, ...data }) => ({
                url: `main/journals/${journal_id || journalId}/presences`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Journal'],
        }),
        getJournalRecap: builder.query({
            query: (params) => ({
                url: 'main/journals/recap',
                params,
            }),
            providesTags: ['Journal'],
        }),
    }),
});

export const {
    useGetJournalsQuery,
    useGetJournalQuery,
    useGetAttendanceSheetQuery,
    useCreateJournalMutation,
    useBatchPresenceMutation,
    useUpdateJournalMutation,
    useDeleteJournalMutation,
    useUpdatePresencesMutation,
    useGetJournalRecapQuery,
} = journalApi;
