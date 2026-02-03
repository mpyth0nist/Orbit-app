

async function reproduce() {
    const longString = 'a'.repeat(150);

    // Test case 1: Long First Name
    console.log('Testing long first name...');
    try {
        const response = await fetch('http://localhost:8080/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'testuser_' + Date.now(),
                email: `test_${Date.now()}@example.com`,
                password: 'password123',
                firstName: longString,
                lastName: 'Doe'
            })
        });

        let data = await response.json();
        console.log('Status (Long Input):', response.status);
        console.log('Response (Long Input):', data);

        // Test case 2: Valid Registration
        console.log('\nTesting valid registration...');
        const uniqueId = Date.now();
        const validResponse = await fetch('http://localhost:8080/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: `validuser${uniqueId}`,
                email: `valid${uniqueId}@example.com`,
                password: 'Password123',
                firstName: 'John',
                lastName: 'Doer'
            })
        });

        data = await validResponse.json();
        console.log('Status (Valid Input):', validResponse.status);
        console.log('Response (Valid Input):', data);

    } catch (error) {
        console.error('Error:', error);
    }
}

reproduce();
