
import { prisma } from './utils/prisma.js';

async function main() {
    try {
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { username: { contains: 'oussama', mode: 'insensitive' } },
                    { username: { contains: 'pythonist', mode: 'insensitive' } },
                    { profile: { firstName: { contains: 'oussama', mode: 'insensitive' } } },
                    { profile: { lastName: { contains: 'pythonist', mode: 'insensitive' } } }
                ]
            },
            include: {
                profile: true,
                threads: {
                    include: {
                        media: true
                    }
                }
            }
        });

        console.log('Found users:', users.length);
        users.forEach(u => {
            console.log(`User: ${u.username} (ID: ${u.id}), Name: ${u.profile?.firstName} ${u.profile?.lastName}`);
            console.log('Threads:');
            u.threads.forEach(t => {
                console.log(`  - ID: ${t.id}, Content: "${t.content}", Media: ${t.media.length}`);
            });
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
