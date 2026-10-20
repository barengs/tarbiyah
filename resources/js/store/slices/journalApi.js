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
        createJournal: builder.mutation({
            query: (data) => ({
                url: 'main/journals',
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
            query: ({ journalId, ...data }) => ({
                url: `main/journals/${journalId}/presences`,
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
    useCreateJournalMutation,
    useUpdateJournalMutation,
    useDeleteJournalMutation,
    useUpdatePresencesMutation,
    useGetJournalRecapQuery,
} = journalApi;
