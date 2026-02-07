/**
 * Community Authorization Helpers
 * 
 * Provides utility functions for checking community member permissions
 */

/**
 * Check if user is an admin
 * @param {Object} membership - CommunityMember object
 * @returns {boolean}
 */
export const isAdmin = (membership) => {
    return membership?.role === 'ADMIN';
};

/**
 * Check if user is a moderator (not admin)
 * @param {Object} membership - CommunityMember object
 * @returns {boolean}
 */
export const isModerator = (membership) => {
    return membership?.role === 'MODERATOR';
};

/**
 * Check if user can moderate (admin or moderator)
 * @param {Object} membership - CommunityMember object
 * @returns {boolean}
 */
export const canModerate = (membership) => {
    return membership?.role === 'ADMIN' || membership?.role === 'MODERATOR';
};

/**
 * Check if user can manage roles (admin only)
 * @param {Object} membership - CommunityMember object
 * @returns {boolean}
 */
export const canManageRoles = (membership) => {
    return isAdmin(membership);
};

/**
 * Check if user can manage community settings (admin only)
 * @param {Object} membership - CommunityMember object
 * @returns {boolean}
 */
export const canManageSettings = (membership) => {
    return isAdmin(membership);
};

/**
 * Check if target user can be moderated by requester
 * Moderators cannot moderate other moderators or admins
 * @param {Object} requesterMembership - Requester's CommunityMember object
 * @param {Object} targetMembership - Target user's CommunityMember object
 * @returns {boolean}
 */
export const canModerateUser = (requesterMembership, targetMembership) => {
    // Admins can moderate anyone except creator (handled separately)
    if (isAdmin(requesterMembership)) {
        return true;
    }

    // Moderators can only moderate regular members
    if (isModerator(requesterMembership)) {
        return targetMembership?.role === 'MEMBER';
    }

    return false;
};
