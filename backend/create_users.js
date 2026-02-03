
const fetch = globalThis.fetch;

const API_URL = 'http://localhost:8080/api/auth/register';

const users = [];
for (let i = 1; i <= 20; i++) {
    users.push({
        firstName: `User`,
        lastName: `Test${i}`,
        username: `prototypeuser${i}`,
        email: `user${i}@example.com`,
        password: 'Password123!'
    });
}

async function registerUsers() {
    console.log(`Starting registration of ${users.length} users...`);

    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
        try {
            console.log(`Registering ${user.username}...`);
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(user)
            });

            const data = await response.json();

            if (response.ok) {
                console.log(`✅ Success: ${user.username} (ID: ${data.data?.user?.id})`);
                successCount++;
            } else {
                console.log(`❌ Failed: ${user.username} - ${data.message || 'Unknown error'}`);
                failCount++;
            }
        } catch (error) {
            console.error(`❌ Error registering ${user.username}:`, error.message);
            failCount++;
        }
    }

    console.log('\n--- Registration Summary ---');
    console.log(`Total: ${users.length}`);
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);
}

registerUsers();
