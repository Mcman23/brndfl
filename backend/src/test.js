import http from 'http';
import assert from 'assert';

const baseOptions = {
  hostname: 'localhost',
  port: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
};

function request(path, method, body, cookies) {
  return new Promise((resolve, reject) => {
    const headers = { ...baseOptions.headers };
    if (cookies) {
      headers['Cookie'] = cookies;
    }
    const options = {
      ...baseOptions,
      path,
      method,
      headers
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data ? JSON.parse(data) : null
        });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting API Integration Tests ---');

  // Test 1: Health
  console.log('1. Health check...');
  const healthRes = await request('/api/health', 'GET');
  assert.strictEqual(healthRes.statusCode, 200);
  assert.strictEqual(healthRes.body.success, true);

  // Test 2: Unauthorized API access
  console.log('2. Unauthorized projects check...');
  const unauthRes = await request('/api/admin/projects', 'GET');
  assert.strictEqual(unauthRes.statusCode, 401);

  // Test 3: Invalid login
  console.log('3. Invalid login check...');
  const badLogin = await request('/api/auth/login', 'POST', {
    email: 'admin@brandfull.com',
    password: 'wrong_password'
  });
  assert.strictEqual(badLogin.statusCode, 401);

  // Test 4: Valid login
  console.log('4. Valid login check...');
  const goodLogin = await request('/api/auth/login', 'POST', {
    email: 'admin@brandfull.com',
    password: 'admin123'
  });
  assert.strictEqual(goodLogin.statusCode, 200);
  assert.ok(goodLogin.headers['set-cookie']);
  const cookies = goodLogin.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');

  // Test 5: /api/auth/me
  console.log('5. GET /api/auth/me check...');
  const meRes = await request('/api/auth/me', 'GET', null, cookies);
  assert.strictEqual(meRes.statusCode, 200);
  assert.strictEqual(meRes.body.data.role, 'SUPER_ADMIN');

  // Test 6: Projects CRUD & Duplicate Slug
  console.log('6. Project CRUD & Duplicate Slug check...');
  const projTimestamp = Date.now();
  const newProj = {
    id: 'test-proj-' + projTimestamp,
    client: 'Test Client',
    title: 'Test Project ' + projTimestamp,
    category: 'AI',
    tag: 'AI Dev',
    image: 'https://images.contentstack.io/v3/assets/blt92018a2de1445ae9/bltcd4497cb29be25b1/6a7f96530da6733cca57cef3/CS_Thumb_Google_RightSide.png',
    clientLogo: '',
    span: 'span-6',
    featured: false,
    year: '2026',
    headline: 'Headline text',
    overview: 'Overview text',
    challenge: 'Challenge text',
    solution: 'Solution text',
    impact: []
  };
  // Create
  const createProj = await request('/api/admin/projects', 'POST', newProj, cookies);
  assert.strictEqual(createProj.statusCode, 201);
  const projId = createProj.body.data.id;

  // Duplicate Slug check
  const dupProj = await request('/api/admin/projects', 'POST', newProj, cookies);
  assert.strictEqual(dupProj.statusCode, 409);

  // Update
  const updateProj = await request(`/api/admin/projects/${projId}`, 'PUT', {
    title: 'Updated Test Title'
  }, cookies);
  assert.strictEqual(updateProj.statusCode, 200);
  assert.strictEqual(updateProj.body.data.title, 'Updated Test Title');

  // Delete
  const delProj = await request(`/api/admin/projects/${projId}`, 'DELETE', null, cookies);
  assert.strictEqual(delProj.statusCode, 200);

  // Test 7: Articles CRUD
  console.log('7. Articles CRUD check...');
  const artTimestamp = Date.now();
  const newArt = {
    id: 'test-art-' + artTimestamp,
    tag: 'Tech',
    date: '30 Aug 2026',
    title: 'Test Article ' + artTimestamp,
    author: 'Admin',
    readTime: '5 min',
    excerpt: 'Excerpt text',
    content: 'Body content',
    published: true
  };
  const createArt = await request('/api/admin/articles', 'POST', newArt, cookies);
  assert.strictEqual(createArt.statusCode, 201);
  const artId = createArt.body.data.id;

  // Update
  const updateArt = await request(`/api/admin/articles/${artId}`, 'PUT', {
    title: 'Updated Article Title'
  }, cookies);
  assert.strictEqual(updateArt.statusCode, 200);
  assert.strictEqual(updateArt.body.data.title, 'Updated Article Title');

  // Delete
  const delArt = await request(`/api/admin/articles/${artId}`, 'DELETE', null, cookies);
  assert.strictEqual(delArt.statusCode, 200);

  // Test 8: Jobs CRUD
  console.log('8. Jobs CRUD check...');
  const jobTimestamp = Date.now();
  const newJob = {
    id: 'test-job-' + jobTimestamp,
    title: 'Test Job ' + jobTimestamp,
    type: 'Tam Ştat',
    location: 'Bakı',
    department: 'Dizayn',
    description: 'Job description text',
    requirements: ['Requirement 1'],
    active: true
  };
  const createJob = await request('/api/admin/jobs', 'POST', newJob, cookies);
  assert.strictEqual(createJob.statusCode, 201);
  const jobId = createJob.body.data.id;

  // Update
  const updateJob = await request(`/api/admin/jobs/${jobId}`, 'PUT', {
    title: 'Updated Job Title'
  }, cookies);
  assert.strictEqual(updateJob.statusCode, 200);
  assert.strictEqual(updateJob.body.data.title, 'Updated Job Title');

  // Delete
  const delJob = await request(`/api/admin/jobs/${jobId}`, 'DELETE', null, cookies);
  assert.strictEqual(delJob.statusCode, 200);

  console.log('--- All Tests Passed Successfully! ---');
}

runTests().catch(e => {
  console.error('--- Test Suite Failed! ---');
  console.error(e);
  process.exit(1);
});
