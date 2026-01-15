/**
 * Async Handler Wrapper
 * 
 * Wraps async route handlers to automatically catch errors and pass them to
 * Express error handling middleware, eliminating the need for try-catch blocks
 * in every controller function.
 * 
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 * 
 * @example
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await prisma.user.findMany();
 *   res.json({ success: true, data: users });
 * }));
 */
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
