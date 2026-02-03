
const fetch = globalThis.fetch;

const BASE_URL = 'http://localhost:8080/api';

async function main() {
    const users = [];

    // 1. Login all users
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
                    id: data.data.user.id,
                    username: data.data.user.username,
                    token: data.data.token,
                    index: i // 1-based index
                });
                console.log(`Logged in ${data.data.user.username}`);
            } else {
                console.error(`Failed to login ${email}:`, data.message);
            }
        } catch (e) {
            console.error(`Error logging in ${email}:`, e.message);
        }
    }

    if (users.length < 20) {
        console.log(`Warning: Only logged in ${users.length} users. Proceeding with available users.`);
    }

    // Sort by index just in case
    users.sort((a, b) => a.index - b.index);

    // Helpers
    const follow = async (follower, target) => {
        if (follower.id === target.id) return; // Can't follow self

        try {
            const res = await fetch(`${BASE_URL}/user/follow/${target.id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${follower.token}`
                }
            });
            const data = await res.json();
            if (res.ok) {
                console.log(`✅ ${follower.username} followed ${target.username}`);
            } else {
                // Ignore if already following
                if (data.message && data.message.includes('already')) {
                    // console.log(`- ${follower.username} already follows ${target.username}`);
                } else {
                    console.log(`❌ ${follower.username} failed to follow ${target.username}: ${data.message}`);
                }
            }
        } catch (e) {
            console.error(`Error:`, e.message);
        }
    };

    // 2. Distribute follows
    // User 1: Followed by ALL others (users 2-20)
    const influencer = users[0]; // prototypeuser1
    console.log(`\n--- Making everyone follow ${influencer.username} ---`);
    for (let i = 1; i < users.length; i++) {
        await follow(users[i], influencer);
    }

    // User 2: Followed by 15 users (users 3-17)
    const tier2 = users[1]; // prototypeuser2
    console.log(`\n--- Making 15 users follow ${tier2.username} ---`);
    const followers2 = users.slice(2, 2 + 15); // indices 2 to 16
    for (const f of followers2) {
        await follow(f, tier2);
    }

    // User 3: Followed by 10 users (users 4-13)
    const tier3 = users[2]; // prototypeuser3
    console.log(`\n--- Making 10 users follow ${tier3.username} ---`);
    const followers3 = users.slice(3, 3 + 10);
    for (const f of followers3) {
        await follow(f, tier3);
    }

    // User 4: Followed by 5 users (users 5-9)
    const tier4 = users[3]; // prototypeuser4
    console.log(`\n--- Making 5 users follow ${tier4.username} ---`);
    const followers4 = users.slice(4, 4 + 5);
    for (const f of followers4) {
        await follow(f, tier4);
    }

    console.log('\nDone creating follows.');
}

main();
