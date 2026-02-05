
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const searchTerm = "EncodingTest";
    const content = `Test "quotes" and \`backticks\` & ampersands for ${searchTerm}`;

    // 1. Create a dummy user and thread
    const user = await prisma.user.create({
        data: {
            email: `test_encoding_${Date.now()}@example.com`,
            username: `test_enc_${Date.now()}`,
            passwordHash: 'password123',
            profile: {
                create: {
                    firstName: 'Test',
                    lastName: 'User'
                }
            }
        }
    });

    const thread = await prisma.thread.create({
        data: {
            content: content,
            userId: user.id
        }
    });

    console.log("Original Content:", JSON.stringify(content));

    // 2. Perform the exact raw SQL query from the controller
    // Note: We need to match the logic of 'searchTerms' in controller
    const searchTermsFormatted = `${searchTerm}:*`;

    console.log("Search Terms:", searchTermsFormatted);

    try {
        const results = await prisma.$queryRaw`
        SELECT 
            t.id,
            t.content
        FROM "Thread" t
        WHERE t.search_vector @@ to_tsquery('english', ${searchTermsFormatted})
        LIMIT 1
    `;

        if (results.length > 0) {
            const result = results[0];
            console.log("Raw SQL Result Content:", JSON.stringify(result.content));
            console.log("Matches Original?", result.content === content);
        } else {
            console.log("No results found via Raw SQL");
        }

    } catch (e) {
        console.error("Query Error:", e);
    } finally {
        // Cleanup
        await prisma.thread.delete({ where: { id: thread.id } });
        await prisma.user.delete({ where: { id: user.id } });
        await prisma.$disconnect();
    }
}

main();
