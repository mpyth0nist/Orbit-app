
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkTables() {
    try {
        const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema='public'
    `;
        console.log('Tables:', tables.map(t => t.table_name));

        // Check Thread columns
        const columns = await prisma.$queryRaw`
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_name='Thread'
    `;
        console.log('Thread columns:', columns.map(c => `${c.column_name}(${c.data_type})`));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkTables();
