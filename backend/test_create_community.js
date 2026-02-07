
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testCreateCommunity() {
    const userId = 1; // Replace with a valid user ID if possible
    const name = "Test Community " + Date.now();
    const description = "Test Description";

    try {
        console.log(`Attempting to create community: ${name}`);

        // Find a valid user first
        const user = await prisma.user.findFirst();
        if (!user) {
            console.error("No users found in DB. Please create a user first.");
            return;
        }
        const effectiveUserId = user.id;
        console.log(`Using user ID: ${effectiveUserId}`);

        const community = await prisma.$transaction(async (tx) => {
            const newCommunity = await tx.community.create({
                data: {
                    name: name,
                    description: description,
                    creatorId: effectiveUserId
                }
            });

            await tx.communityMember.create({
                data: {
                    communityId: newCommunity.id,
                    userId: effectiveUserId,
                    role: 'ADMIN',
                    status: 'ACTIVE'
                }
            });

            return newCommunity;
        });

        console.log('Community created successfully:', community);
    } catch (error) {
        console.error('Error creating community:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testCreateCommunity();
