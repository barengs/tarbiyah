import { apiSlice } from './apiSlice';

export const securityApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        // Sidebar dinamis berdasarkan role user login
        getSidebarMenus: builder.query({
            query: () => 'auth/menus',
            providesTags: ['SidebarMenu'],
        }),

        // Manajemen Menu (Hierarki pohon lengkap)
        getMenus: builder.query({
            query: () => 'security/menus',
            providesTags: ['SecurityMenu'],
        }),
        createMenu: builder.mutation({
            query: (body) => ({
                url: 'security/menus',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['SecurityMenu', 'SidebarMenu'],
        }),
        updateMenu: builder.mutation({
            query: ({ id, ...body }) => ({
                url: `security/menus/${id}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: ['SecurityMenu', 'SidebarMenu'],
        }),
        deleteMenu: builder.mutation({
            query: (id) => ({
                url: `security/menus/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['SecurityMenu', 'SidebarMenu'],
        }),

        // Manajemen Role & Matrix
        getRoles: builder.query({
            query: () => 'security/roles',
            providesTags: ['SecurityRole'],
        }),
        createRole: builder.mutation({
            query: (body) => ({
                url: 'security/roles',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['SecurityRole', 'SidebarMenu'],
        }),
        updateRole: builder.mutation({
            query: ({ id, ...body }) => ({
                url: `security/roles/${id}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: ['SecurityRole', 'SidebarMenu'],
        }),
        deleteRole: builder.mutation({
            query: (id) => ({
                url: `security/roles/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['SecurityRole', 'SidebarMenu'],
        }),
        syncRoleMenus: builder.mutation({
            query: ({ id, menu_ids }) => ({
                url: `security/roles/${id}/menus`,
                method: 'POST',
                body: { menu_ids },
            }),
            invalidatesTags: ['SecurityRole', 'SidebarMenu'],
        }),
        syncRolePermissions: builder.mutation({
            query: ({ id, permissions }) => ({
                url: `security/roles/${id}/permissions`,
                method: 'POST',
                body: { permissions },
            }),
            invalidatesTags: ['SecurityRole'],
        }),

        // Daftar Permission Master
        getPermissions: builder.query({
            query: () => 'security/permissions',
            providesTags: ['SecurityPermission'],
        }),

        // Manajemen Pengguna (Users)
        getUsers: builder.query({
            query: (params) => ({
                url: 'security/users',
                params,
            }),
            providesTags: ['SecurityUser'],
        }),
        createUser: builder.mutation({
            query: (body) => ({
                url: 'security/users',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['SecurityUser'],
        }),
        updateUser: builder.mutation({
            query: ({ id, ...body }) => ({
                url: `security/users/${id}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: ['SecurityUser'],
        }),
        deleteUser: builder.mutation({
            query: (id) => ({
                url: `security/users/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['SecurityUser'],
        }),
        resetUserPassword: builder.mutation({
            query: ({ id, password }) => ({
                url: `security/users/${id}/reset-password`,
                method: 'POST',
                body: { password },
            }),
            invalidatesTags: ['SecurityUser'],
        }),
    }),
});

export const {
    useGetSidebarMenusQuery,
    useGetMenusQuery,
    useCreateMenuMutation,
    useUpdateMenuMutation,
    useDeleteMenuMutation,
    useGetRolesQuery,
    useCreateRoleMutation,
    useUpdateRoleMutation,
    useDeleteRoleMutation,
    useSyncRoleMenusMutation,
    useSyncRolePermissionsMutation,
    useGetPermissionsQuery,
    useGetUsersQuery,
    useCreateUserMutation,
    useUpdateUserMutation,
    useDeleteUserMutation,
    useResetUserPasswordMutation,
} = securityApi;
