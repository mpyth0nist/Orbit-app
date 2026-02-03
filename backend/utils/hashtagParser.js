/**
 * Hashtag Parser Utility
 * Extracts hashtags from thread content
 */

/**
 * Extract hashtags from text content
 * @param {string} content - The text content to parse
 * @returns {string[]} - Array of unique hashtag strings (lowercase, without #)
 */
export function extractHashtags(content) {
    if (!content || typeof content !== 'string') {
        return [];
    }

    // Regex to match hashtags: # followed by alphanumeric characters and underscores
    // Must be preceded by whitespace or start of string
    const hashtagRegex = /(?:^|\s)#([a-zA-Z0-9_]+)/g;

    const hashtags = [];
    let match;

    while ((match = hashtagRegex.exec(content)) !== null) {
        const tag = match[1].toLowerCase();

        // Filter out pure numbers (e.g., #123 is not a valid hashtag)
        if (!/^\d+$/.test(tag)) {
            hashtags.push(tag);
        }
    }

    // Return unique hashtags only
    return [...new Set(hashtags)];
}

/**
 * Format hashtags for display (add # prefix)
 * @param {string[]} tags - Array of hashtag strings
 * @returns {string[]} - Array with # prefix
 */
export function formatHashtags(tags) {
    return tags.map(tag => `#${tag}`);
}
