import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { rateLimitIdentity } from '../../src/api/middleware/rateLimitIdentity';
import { apiRateLimit, authRateLimit } from '../../src/api/middleware/rateLimitMiddleware';

test('verified accounts have independent quotas; forged/expired tokens remain anonymous; login protection remains', async () => {
  process.env.NODE_ENV = 'test';
  const secret = 'rate-limit-test';
  const app = express();
  app.use(rateLimitIdentity(token => jwt.verify(token, secret) as { userId: string }));
  app.use(apiRateLimit);
  app.use(express.json());
  app.get('/api/auth/me', (req, res) => res.json({ routeAuthStillNeeded: req.user === undefined }));
  app.post('/api/auth/login', authRateLimit, (_req, res) => res.status(401).json({ error: 'Invalid credentials' }));
  const token = jwt.sign({ userId: 'admin-one' }, secret);
  for (let i = 0; i < 105; i++) {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer ' + token);
    assert.equal(res.status, 200);
    assert.equal(res.headers['ratelimit-limit'], '1000');
    assert.equal(res.body.routeAuthStillNeeded, true);
  }
  const second = await request(app).get('/api/auth/me').set('Authorization', 'Bearer ' + jwt.sign({ userId: 'admin-two' }, secret));
  assert.equal(second.headers['ratelimit-remaining'], '999');
  for (const invalid of [jwt.sign({ userId: 'admin-one' }, 'wrong-secret'), jwt.sign({ userId: 'admin-one' }, secret, { expiresIn: -1 }), 'garbage']) {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer ' + invalid);
    assert.equal(res.headers['ratelimit-limit'], '100');
  }
  for (let i = 0; i < 21; i++) {
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com' });
    assert.equal(res.status, i === 20 ? 429 : 401);
  }
});
