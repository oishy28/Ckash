const request = require('supertest');
const app = require('./server'); // Ensure server.js ends with: module.exports = app;

describe('GET /', () => {
  it('should serve the index.html on GET /', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toMatch(/Electricity Bill Payment/); // adjust to match actual content
  });
});
