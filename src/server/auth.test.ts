import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { hashPassword, loginUser, registerUser, verifyPassword } from './auth';

test('hashPassword and verifyPassword securely validate credentials', () => {
  const hash = hashPassword('SecretPass123');
  assert.ok(hash.includes(':'));
  assert.equal(verifyPassword('SecretPass123', hash), true);
  assert.equal(verifyPassword('WrongPass', hash), false);
});

test('registerUser validates fields and loginUser authenticates registered accounts', () => {
  const uniqueEmail = `student_${crypto.randomUUID().slice(0, 8)}@example.com`;

  const mismatch = registerUser({
    fullName: 'Aarav Sharma',
    email: uniqueEmail,
    password: 'password123',
    confirmPassword: 'password999',
  });
  assert.equal(mismatch.ok, false);

  const created = registerUser({
    fullName: 'Aarav Sharma',
    email: uniqueEmail,
    password: 'password123',
    confirmPassword: 'password123',
  });
  assert.equal(created.ok, true);

  const dup = registerUser({
    fullName: 'Aarav Sharma',
    email: uniqueEmail,
    password: 'password123',
    confirmPassword: 'password123',
  });
  assert.equal(dup.ok, false);

  const loggedIn = loginUser({ email: uniqueEmail, password: 'password123' });
  assert.equal(loggedIn.ok, true);

  const badLogin = loginUser({ email: uniqueEmail, password: 'wrong' });
  assert.equal(badLogin.ok, false);
});
