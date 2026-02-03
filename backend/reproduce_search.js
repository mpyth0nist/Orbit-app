
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testSearch() {
    const searchQuery = 'test';

    try {
        console.log(`Searching for "${searchQuery}"...`);

        // Prepare search query for PostgreSQL (escape special characters)
        const searchTerms = searchQuery
            .split(/\s+/)
            .filter(term => term.length > 0)
            .map(term => `${term}:*`)
            .join(' & ');

        console.log('Formatted User Query:', searchTerms);

        const limit = 20;
        const skip = 0;

        // Use raw SQL for Full-Text Search with relevance ranking
        const threads = await prisma.$queryRaw`
        SELECT 
            t.id,
            t."user_id" as "userId",
            t.content,
            t."likes_count" as "likesCount",
            t."comments_count" as "commentsCount",
            t."created_at" as "createdAt",
            t."updated_at" as "updatedAt",
            ts_rank(t.search_vector, to_tsquery('english', ${searchTerms})) as rank
        FROM "Thread" t
        WHERE t.search_vector @@ to_tsquery('english', ${searchTerms})
        ORDER BY rank DESC, t."created_at" DESC
        LIMIT ${limit}
        OFFSET ${skip}
    `;

        console.log(`Found ${threads.length} threads in raw query.`);
        threads.forEach(t => console.log(`- [${t.id}] Rank: ${t.rank}, Content: ${t.content}`));

        // Mimic the controller's second step
        const threadIds = threads.map(t => t.id);
        console.log('Fetching full details for IDs:', threadIds);

        const fullThreads = await prisma.thread.findMany({
            where: {
                id: { in: threadIds }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        type: true,
                        profile: {
                            select: {
                                firstName: true,
                                lastName: true,
                                photoUrl: true
                            }
                        }
                    }
                },
                media: {
                    select: {
                        id: true,
                        type: true,
                        url: true
                    }
                }
            }
        });
        console.log(`Fetched ${fullThreads.length} full threads.`);
        // Also check total count
        const countResult = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM "Thread" t
        WHERE t.search_vector @@ to_tsquery('english', ${searchTerms})
    `;
        console.log('Total count:', countResult[0].count);

    } catch (error) {
        console.error('Search failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testSearch();
