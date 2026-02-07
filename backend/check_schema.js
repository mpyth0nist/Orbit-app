
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkColumn() {
    try {
        const columns = await prisma.$queryRaw`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'Thread' AND column_name = 'thread_type'
        `;
        console.log('Column check result:', columns);

        if (columns.length === 0) {
            console.log('COLUMN MISSING in DB!');
        } else {
            console.log('COLUMN EXISTS in DB.');
        }
    } catch (e) {
        console.error('Error checking column:', e);
    } finally {
        await prisma.$disconnect();
    }
}

checkColumn();
