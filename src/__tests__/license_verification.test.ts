// ============================================
// LICENSE VERIFICATION & CRYPTOGRAPHY TEST SUITE
// ============================================
import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'crypto';
import { EXAMSTUDIO_PUBLIC_KEY } from '@/constants/license-public-key';
import { licenseService } from '@/services/license-service';

describe('Offline License Cryptographic Verification Suite', () => {
  let testPrivateKey: crypto.KeyObject;
  let testPublicKey: crypto.KeyObject;

  beforeAll(() => {
    testPublicKey = crypto.createPublicKey(EXAMSTUDIO_PUBLIC_KEY);
    // Đọc developer key nếu có
    const fs = require('fs');
    const path = require('path');
    const realPrivPath = path.resolve(__dirname, '..', '..', '..', 'developer_tools', 'keys', 'license_private.pem');
    if (fs.existsSync(realPrivPath)) {
      testPrivateKey = crypto.createPrivateKey(fs.readFileSync(realPrivPath, 'utf8'));
    }
  });

  // Helper to generate a test license using developer's private key if available or test key
  function createSignedLicense(payloadOverride: Record<string, any>, privateKeyInput?: string | crypto.KeyObject) {
    const payload = {
      v: 1,
      id: `ES-TEST-${Date.now()}`,
      name: 'Nguyen Van Test',
      email: 'test@example.com',
      prod: 'ExamStudio',
      type: 'lifetime',
      iat: Math.floor(Date.now() / 1000),
      exp: 0,
      ...payloadOverride,
    };

    const canonicalString = JSON.stringify(payload, Object.keys(payload).sort());
    const payloadBuffer = Buffer.from(canonicalString, 'utf8');

    let key: crypto.KeyObject;
    if (privateKeyInput) {
      key = typeof privateKeyInput === 'string' ? crypto.createPrivateKey(privateKeyInput) : privateKeyInput;
    } else {
      key = testPrivateKey;
    }

    const signature = crypto.sign(null, payloadBuffer, key);
    return `EXAM.${payloadBuffer.toString('base64url')}.${signature.toString('base64url')}`;
  }

  it('1. should verify a valid Lifetime License key successfully', async () => {
    const validKey = createSignedLicense({
      name: 'Đào Đức Thịnh',
      email: 'daothinh636@gmail.com',
      type: 'lifetime',
      exp: 0,
    });

    expect(validKey.startsWith('EXAM.')).toBe(true);

    const result = await licenseService.verifyKey(validKey);
    expect(result.valid).toBe(true);
    expect(result.payload?.name).toBe('Đào Đức Thịnh');
    expect(result.payload?.type).toBe('lifetime');
    expect(result.payload?.prod).toBe('ExamStudio');
  });

  it('2. should reject a tampered license payload (e.g. customer name changed)', async () => {
    const validKey = createSignedLicense({ name: 'User Chuan' });
    const parts = validKey.split('.');
    
    // Tamper the payload: change name to Hacker
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    payload.name = 'Hacker Bypass';
    const tamperedPayloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');

    const tamperedKey = `EXAM.${tamperedPayloadB64}.${parts[2]}`;

    const result = await licenseService.verifyKey(tamperedKey);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Chữ ký');
  });

  it('3. should reject a tampered expiration date (e.g. extending subscription)', async () => {
    const validKey = createSignedLicense({
      name: 'Subscription User',
      type: 'subscription',
      exp: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days
    });
    const parts = validKey.split('.');

    // Tamper the payload: extend to year 2099
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    payload.exp = 4102444800; // 2099
    payload.type = 'lifetime';
    const tamperedPayloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');

    const tamperedKey = `EXAM.${tamperedPayloadB64}.${parts[2]}`;

    const result = await licenseService.verifyKey(tamperedKey);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Chữ ký');
  });

  it('4. should reject an expired subscription license', async () => {
    const expiredKey = createSignedLicense({
      name: 'Expired User',
      type: 'subscription',
      iat: Math.floor(Date.now() / 1000) - 86400 * 60,
      exp: Math.floor(Date.now() / 1000) - 86400 * 10, // expired 10 days ago
    });

    const result = await licenseService.verifyKey(expiredKey);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('hết hạn');
  });

  it('5. should reject a license signed with a different/fake private key', async () => {
    // Generate a random, fake Ed25519 keypair
    const fakeKeyPair = crypto.generateKeyPairSync('ed25519', {
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    const fakeKey = createSignedLicense({ name: 'Fake Signed' }, fakeKeyPair.privateKey);

    const result = await licenseService.verifyKey(fakeKey);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Chữ ký');
  });

  it('6. should reject malformed or corrupted license strings', async () => {
    expect((await licenseService.verifyKey('')).valid).toBe(false);
    expect((await licenseService.verifyKey('NOT_A_LICENSE')).valid).toBe(false);
    expect((await licenseService.verifyKey('EXAM.invalid-base64')).valid).toBe(false);
    expect((await licenseService.verifyKey('EXAM.payload.sig.extra')).valid).toBe(false);
  });

  it('7. should reject licenses intended for other products', async () => {
    const foreignKey = createSignedLicense({ prod: 'OtherProduct' });
    const result = await licenseService.verifyKey(foreignKey);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('không dành cho phần mềm ExamPrep Studio');
  });
});
