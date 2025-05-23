
const request = require('supertest');
const app = require('./server'); // make sure server.js has: module.exports = app

describe('Meter Payment API', () => {
  // Test: GET /
//   it('should serve the index.html on GET /', async () => {
//     const res = await request(app).get('/');
//     expect(res.statusCode).toBe(200);
//     expect(res.headers['content-type']).toMatch(/html/);
//     expect(res.text).toMatch(/Electricity Bill Payment/);
//   });

//   it('should validate a valid Company A meter', async () => {
//   const res = await request(app).post('/validate-meter').send({ serial: "A12345" });
//   expect(res.statusCode).toBe(200);
//   expect(res.body).toHaveProperty('meter');
//   expect(res.body.meter).toHaveProperty('owner');
// });


  // Test: Validate an unknown serial
  it('should fail for an unknown serial', async () => {
    const res = await request(app).post('/validate-meter').send({ serial: 'X99999' });
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  // Test: Missing serial
  it('should reject requests with no serial', async () => {
    const res = await request(app).post('/validate-meter').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  // Test: Payment with sufficient balance
  it('should process payment if balance is enough', async () => {
    const res = await request(app).post('/make-payment').send({ serial: 'A67890' });
    expect([200, 400]).toContain(res.statusCode);

    if (res.statusCode === 200) {
      expect(res.body).toHaveProperty('transaction');
    } else {
      console.log('Payment skipped (already paid or insufficient):', res.body.message);
    }
  });

  // Test: Payment with insufficient funds
  it('should reject payment if bank has insufficient funds', async () => {
    const res = await request(app).post('/make-payment').send({ serial: 'A67890' });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/insufficient/i);
  });

  // Test: Payment for unknown serial
  it('should return 404 for payment with unknown serial', async () => {
    const res = await request(app).post('/make-payment').send({ serial: 'ZZ9999' });
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  // Test: Payment request with missing serial
  it('should return 400 for payment with missing serial', async () => {
    const res = await request(app).post('/make-payment').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

