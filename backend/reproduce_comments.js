

async function reproduce() {
    // 1. Login (we need a valid token)
    // Note: This assumes a user exists. If not, we might need to register one, but we likely have one from previous steps.
    // I'll try to register a temporary user to get a fresh token.
    console.log('Registering temp user...');
    const uniqueId = Date.now();
    const registerRes = await fetch('http://localhost:8080/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: `commenttester${uniqueId}`,
            email: `comment_${uniqueId}@example.com`,
            password: 'Password123',
            firstName: 'Comment',
            lastName: 'Tester'
        })
    });

    const registerData = await registerRes.json();
    if (!registerData.success) {
        console.error('Registration failed:', registerData);
        return;
    }
    const token = registerData.data.token;
    console.log('Got token.');

    // 2. Create a Thread (to comment on)
    // We need a thread first. I'll inspect thread routes if needed or try to create one.
    // Assuming POST /api/threads exists (step 18 showed threads routes enabled).
    console.log('Creating a thread...');
    const threadRes = await fetch('http://localhost:8080/api/threads', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            content: "This is a test thread for comments"
        })
    });

    const threadData = await threadRes.json();
    console.log('Thread Response:', JSON.stringify(threadData, null, 2));
    if (!threadData.success) {
        console.error('Thread creation failed:', threadData);
        // If thread creation fails, maybe we can't reproduce comments yet.
        return;
    }
    const threadId = threadData.data?.id; // Corrected access based on log
    if (!threadId) {
        console.error('Could not extract thread ID');
        return;
    }
    console.log('Created thread:', threadId);

    // 3. Get Comments (This should fail if likes_count is missing)
    console.log('Fetching comments...');
    const getCommentsRes = await fetch(`http://localhost:8080/api/threads/${threadId}/comments`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('Get Comments Status:', getCommentsRes.status);
    const getCommentsData = await getCommentsRes.json();
    console.log('Get Comments Response:', JSON.stringify(getCommentsData, null, 2));

    // 4. Create Comment
    console.log('Creating comment...');
    const createCommentRes = await fetch(`http://localhost:8080/api/threads/${threadId}/comments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            content: "This is a test comment"
        })
    });
    console.log('Create Comment Status:', createCommentRes.status);
    console.log('Create Comment Response:', await createCommentRes.json());
}

reproduce();
