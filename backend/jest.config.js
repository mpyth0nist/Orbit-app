export default {
    testEnvironment: 'node',
    testTimeout: 10000,
    verbose: true,
    collectCoverageFrom: [
        'controllers/**/*.js',
        'middleware/**/*.js',
        'utils/**/*.js',
        '!**/*.test.js',
    ],
    testMatch: [
        '**/__tests__/**/*.test.js',
    ],
    setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
    transform: {},
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
};
