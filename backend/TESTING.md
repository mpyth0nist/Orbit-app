# Testing Guide

## Overview
This project now has a comprehensive testing suite using Jest and Supertest to ensure API correctness and prevent regressions.

## Setup

### Prerequisites
- PostgreSQL database running
- Node.js installed
- Dependencies installed (`npm install`)

### Test Database
**IMPORTANT**: Tests use the database specified in `DATABASE_URL`. To protect production data:

1. Create a separate test database:
```bash
createdb orbit-db-test
```

2. Before running tests, update `.env` to point to test database:
```bash
DATABASE_URL="postgresql://postgres:root1234@localhost:8000/orbit-db-test?schema=public"
```

Or set it temporarily when running tests:
```bash
DATABASE_URL="postgresql://postgres:root1234@localhost:8000/orbit-db-test?schema=public" npm test
```

3. Run Prisma migrations on test database:
```bash
npx prisma migrate deploy
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm test:watch
```

### Run specific test file
```bash
npm test -- auth.test.js
```

## Test Coverage

The test suite covers:
- ✅ **Authentication**: Registration, login, token validation
- ✅ **Threads**: CRUD operations, feed, trending, authorization
- ✅ **Comments**: Create, reply, delete with proper auth
- ✅ **Reactions**: Like/unlike threads and comments
- ✅ **Notifications**: Auto-creation, retrieval, mark as read, unread counts
- ✅ **Users/Follows**: Profiles, follow/unfollow, followers/following lists

## Test Structure

```
backend/
├── __tests__/
│   ├── setup.js              # Global test setup
│   ├── helpers/
│   │   └── testUtils.js      # Reusable test utilities
│   ├── auth.test.js
│   ├── threads.test.js
│   ├── comments.test.js
│   ├── reactions.test.js
│   ├── notifications.test.js
│   └── users.test.js
└── jest.config.js            # Jest configuration
```

## Important Notes

- Tests run sequentially (`--runInBand`) to avoid database conflicts
- Database is automatically cleaned between each test
- All tests use a shared test database connection
- JWT secret defaults to `'test-secret'` if not set in environment
