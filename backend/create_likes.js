
const fetch = globalThis.fetch;

const BASE_URL = 'http://localhost:8080/api';
const THREAD_ID = 2; // Hardcoded from previous finding

async function main() {
    const users = [];

    // 1. Login all 20 users
    console.log('Logging in 20 users...');
    for (let i = 1; i <= 20; i++) {
        const email = `user${i}@example.com`;
        const password = 'Password123!';

        try {
            const res = await fetch(`${BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (data.success) {
                users.push({
                    username: data.data.user.username,
                    token: data.data.token
                });
                console.log(`Logged in ${data.data.user.username}`);
            } else {
                console.error(`Failed to login ${email}:`, data.message);
            }
        } catch (e) {
            console.error(`Error logging in ${email}:`, e.message);
        }
    }

    console.log(`\n--- Liking Thread ID ${THREAD_ID} with ${users.length} users ---`);

    for (const user of users) {
        try {
            const res = await fetch(`${BASE_URL}/reactions/thread/${THREAD_ID}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            });
            const data = await res.json();

            if (res.ok) {
                const action = data.message.includes('unliked') ? 'unliked' : 'liked';
                console.log(`✅ ${user.username} ${action} the thread`);

                // If we accidentally unliked it (because toggle), we should like it back?
                // The prompt says "make all these users like". If they already liked, toggle might unlike.
                // If unliked, toggle again to like.
                if (action === 'unliked') {
                    console.log(`   (Re-liking to ensure 'liked' state...)`);
                    const res2 = await fetch(`${BASE_URL}/reactions/thread/${THREAD_ID}`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${user.token}` }
                    });
                    const data2 = await res2.json();
                    if (res2.ok && !data2.message.includes('unliked')) {
                        console.log(`   ✅ Restored like for ${user.username}`);
                    }
                }
            } else {
                console.error(`❌ ${user.username} failed to like: ${data.message}`);
            }
        } catch (e) {
            console.error(`Error for ${user.username}:`, e.message);
        }
    }

    console.log('\nDone.');
}

main();
