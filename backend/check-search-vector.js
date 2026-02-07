// Quick script to verify search_vector population
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSearchVector() {
    try {
        // Check a few threads
        const result = await prisma.$queryRaw`
            SELECT 
                id, 
                LEFT(content, 50) as content_preview,
                search_vector IS NOT NULL  as has_search_vector,
                search_vector::text as search_vector_text
            FROM "Thread" 
            LIMIT 5
        `;

        console.log('Search Vector Check Results:');
        console.log('==============================');
        console.table(result);

        // Count total threads with and without search_vector
        const stats = await prisma.$queryRaw`
            SELECT 
                COUNT(*) as total_threads,
                COUNT(CASE WHEN search_vector IS NOT NULL THEN 1 END) as has_vector,
                COUNT(CASE WHEN search_vector IS NULL THEN 1 END) as missing_vector
            FROM "Thread"
        `;

        console.log('\nStatistics:');
        console.log('===========');
        console.table(stats);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkSearchVector();
