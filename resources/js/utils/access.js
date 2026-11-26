/**
 * Helper otorisasi & cakupan program berbasis Role Management.
 */

export function getUserRoleNames(user) {
    if (!user) return [];
    const roles = Array.isArray(user.roles)
        ? user.roles.map((r) => (typeof r === 'string' ? r : r?.name)).filter(Boolean)
        : [];
    if (user.role && !roles.includes(user.role)) {
        roles.unshift(user.role);
    }
    return roles.map((r) => String(r).toLowerCase());
}

export function isSuperAdmin(user) {
    const roleNames = getUserRoleNames(user);
    return roleNames.includes('superadmin') || roleNames.includes('mudir');
}

export function getUserProgramId(user) {
    if (!user || isSuperAdmin(user)) return null;
    if (user.program_id) return Number(user.program_id);
    if (Array.isArray(user.roles)) {
        const scopedRole = user.roles.find((r) => r && r.program_id);
        if (scopedRole?.program_id) return Number(scopedRole.program_id);
    }
    return null;
}

export function getUserProgram(user, programs = []) {
    const progId = getUserProgramId(user);
    if (!progId) return null;
    if (Array.isArray(user?.roles)) {
        const roleProg = user.roles.find((r) => Number(r?.program_id) === progId)?.program;
        if (roleProg) return roleProg;
    }
    return programs.find((p) => Number(p.id) === progId) || null;
}

export function hasPermission(user, permission) {
    if (!user) return false;
    if (isSuperAdmin(user)) return true;
    const perms = Array.isArray(user.permission_names) ? user.permission_names : [];
    if (perms.includes('*')) return true;
    return perms.includes(permission);
}

export function hasAnyPermission(user, permissions = []) {
    if (!user) return false;
    if (isSuperAdmin(user)) return true;
    const perms = Array.isArray(user.permission_names) ? user.permission_names : [];
    if (perms.includes('*')) return true;
    return permissions.some((p) => perms.includes(p));
}
