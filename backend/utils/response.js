/**
 * Response Utility Functions
 * 
 * Provides standardized response formats for consistent API responses
 * across the entire application. Ensures all responses follow the same structure.
 * 
 * @module utils/response
 */

/**
 * Send a successful response
 * 
 * @param {Response} res - Express response object
 * @param {*} data - Response data payload
 * @param {string} [message] - Success message
 * @param {number} [statusCode=200] - HTTP status code
 * 
 * @example
 * successResponse(res, { user }, 'User fetched successfully');
 * // Returns: { success: true, message: '...', data: { user } }
 */
export const successResponse = (res, data, message = 'Success', statusCode = 200) => {
    res.status(statusCode).json({
        success: true,
        message,
        data
    });
};

/**
 * Send an error response
 * 
 * @param {Response} res - Express response object
 * @param {string} message - Error message
 * @param {number} [statusCode=400] - HTTP status code
 * @param {Array|Object} [errors=null] - Additional error details
 * 
 * @example
 * errorResponse(res, 'User not found', 404);
 * // Returns: { success: false, message: 'User not found' }
 */
export const errorResponse = (res, message, statusCode = 400, errors = null) => {
    const response = {
        success: false,
        message
    };

    if (errors) {
        response.errors = errors;
    }

    res.status(statusCode).json(response);
};

/**
 * Send a paginated response
 * 
 * @param {Response} res - Express response object
 * @param {Array} data - Array of data items
 * @param {Object} pagination - Pagination metadata
 * @param {number} pagination.page - Current page number
 * @param {number} pagination.limit - Items per page
 * @param {number} pagination.total - Total number of items
 * @param {string} [message='Success'] - Success message
 * 
 * @example
 * paginatedResponse(res, threads, { page: 1, limit: 20, total: 100 });
 * // Returns: { success: true, data: [...], pagination: { ... } }
 */
export const paginatedResponse = (res, data, pagination, message = 'Success') => {
    const { page, limit, total } = pagination;

    res.status(200).json({
        success: true,
        message,
        data,
        pagination: {
            currentPage: page,
            itemsPerPage: limit,
            totalItems: total,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page < Math.ceil(total / limit),
            hasPrevPage: page > 1
        }
    });
};

/**
 * Send a cursor-based paginated response
 * 
 * @param {Response} res - Express response object
 * @param {Array} data - Array of data items
 * @param {Object} cursor - Cursor pagination metadata
 * @param {string|null} cursor.nextCursor - Base64-encoded cursor for next page
 * @param {number} cursor.limit - Items per page
 * @param {string} [message='Success'] - Success message
 * 
 * @example
 * cursorPaginatedResponse(res, threads, { nextCursor: 'eyJpZCI6MTB9', limit: 20 });
 * // Returns: { success: true, data: [...], pagination: { nextCursor, limit, hasNextPage } }
 */
export const cursorPaginatedResponse = (res, data, cursor, message = 'Success') => {
    const { nextCursor, limit } = cursor;

    res.status(200).json({
        success: true,
        message,
        data,
        pagination: {
            nextCursor,
            limit,
            hasNextPage: nextCursor !== null
        }
    });
};

/**
 * Send a created resource response
 * 
 * @param {Response} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} [message='Resource created successfully'] - Success message
 * 
 * @example
 * createdResponse(res, { thread }, 'Thread created');
 */
export const createdResponse = (res, data, message = 'Resource created successfully') => {
    successResponse(res, data, message, 201);
};

/**
 * Send a no content response (for successful deletions)
 * 
 * @param {Response} res - Express response object
 * @param {string} [message='Resource deleted successfully'] - Success message
 * 
 * @example
 * deletedResponse(res, 'Thread deleted');
 */
export const deletedResponse = (res, message = 'Resource deleted successfully') => {
    res.status(200).json({
        success: true,
        message
    });
};
