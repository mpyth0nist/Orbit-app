import { PrismaClient } from '@prisma/client';

let prisma;

// Initialize test database connection
beforeAll(async () => {
    prisma = new PrismaClient({
        datasources: {
            db: {
                url: process.env.DATABASE_URL,
            },
        },
    });

    // Ensure we're using test database
    if (!process.env.DATABASE_URL?.includes('test')) {
        throw new Error('Tests must use a test database! Set DATABASE_URL to test database.');
    }

    await prisma.$connect();
});

// Clean database between tests
afterEach(async () => {
    const tables = [
        'Notification',
        'Reaction',
        'Comment',
        'Media',
        'Thread',
        'Follow',
        'Profile',
        'User',
    ];

    for (const table of tables) {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
    }
});

// Close connection after all tests
afterAll(async () => {
    await prisma.$disconnect();
});

export { prisma };
