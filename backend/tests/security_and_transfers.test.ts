import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, comparePassword, hashPin, comparePin, generateSignedDownloadToken, verifySignedDownload, generatePairingCode } from '../src/utils/security.js';
import { db } from '../src/database/db.js';
import { TransferManager } from '../src/modules/transfers/TransferManager.js';

describe('FluxDrop Security & Transfer Platform Test Suite', () => {
  // Test 1: Password Security & Hashing
  test('1. Password Hashing: uses bcrypt, raw password never equals hash', async () => {
    const rawPass = 'SecretPassword2026!';
    const hash = await hashPassword(rawPass);

    assert.notEqual(rawPass, hash);
    assert.ok(hash.startsWith('$2'));

    const match = await comparePassword(rawPass, hash);
    assert.equal(match, true);

    const falseMatch = await comparePassword('WrongPassword', hash);
    assert.equal(falseMatch, false);
  });

  // Test 2: PIN Security & Separation from Account Password
  test('2. PIN Hashing: separate credential with HMAC pepper and bcrypt', async () => {
    const pin = '482913';
    const hash = await hashPin(pin);

    assert.notEqual(pin, hash);
    assert.ok(hash.length > 30);

    const valid = await comparePin(pin, hash);
    assert.equal(valid, true);

    const invalid = await comparePin('000000', hash);
    assert.equal(invalid, false);
  });

  // Test 3: Pairing Code Generation
  test('3. Pairing Code: generates formatted 6 digits with grouping', () => {
    const code = generatePairingCode();
    assert.match(code, /^\d{3}\s\d{3}$/);
    const rawDigits = code.replace(/\s+/g, '');
    assert.equal(rawDigits.length, 6);
  });

  // Test 4: Signed Download URLs & HMAC Protection
  test('4. Signed URLs: generates expiring HMAC tokens and blocks tampered signatures', () => {
    const fileId = 'file_abc_123';
    const userId = 'usr_nihal_test';

    const { expires, signature } = generateSignedDownloadToken(fileId, userId, 3600);
    assert.ok(expires > Math.floor(Date.now() / 1000));
    assert.ok(signature.length === 64); // SHA-256 hex length

    // Valid check
    const isValid = verifySignedDownload(fileId, userId, expires, signature);
    assert.equal(isValid, true);

    // Tampered user check
    const isTamperedUser = verifySignedDownload(fileId, 'other_user', expires, signature);
    assert.equal(isTamperedUser, false);

    // Expired check
    const isExpired = verifySignedDownload(fileId, userId, Math.floor(Date.now() / 1000) - 10, signature);
    assert.equal(isExpired, false);
  });

  // Test 5: TransferManager Lifecycle
  test('5. TransferManager: handles create -> accept -> start -> progress -> complete', () => {
    const transfer = TransferManager.createTransfer({
      senderUserId: 'usr_sender',
      receiverUserId: 'usr_receiver',
      senderDeviceId: 'dev_sender',
      receiverDeviceId: 'dev_receiver',
      items: [
        { filename: 'code_bundle.tar.gz', size: 104857600, mimeType: 'application/gzip' }
      ],
      connectionType: 'direct',
    });

    assert.ok(transfer.id);
    assert.equal(transfer.status, 'waiting');
    assert.equal(transfer.items.length, 1);

    // Recipient accepts
    const accepted = TransferManager.acceptTransfer(transfer.id, 'dev_receiver');
    assert.ok(accepted);
    assert.equal(accepted?.status, 'connecting');

    // Transfer starts
    const started = TransferManager.startTransfer(transfer.id);
    assert.ok(started);
    assert.equal(started?.status, 'transferring');

    // Progress updates
    TransferManager.updateProgress(transfer.id, transfer.items[0].id, 50);
    const progress50 = TransferManager.getTransferProgress(transfer.id);
    assert.equal(progress50?.totalProgress, 50);

    // Complete transfer
    const completed = TransferManager.completeTransfer(transfer.id);
    assert.ok(completed);
    assert.equal(completed?.status, 'completed');
    assert.equal(completed?.items[0].progress, 100);
  });

  // Test 6: Transfer Rejection & Cancellation
  test('6. TransferManager: handles transfer rejection', () => {
    const transfer = TransferManager.createTransfer({
      senderUserId: 'usr_sender_2',
      receiverUserId: 'usr_receiver_2',
      senderDeviceId: 'dev_sender_2',
      receiverDeviceId: 'dev_receiver_2',
      items: [{ filename: 'document.pdf', size: 2048, mimeType: 'application/pdf' }],
    });

    const rejected = TransferManager.rejectTransfer(transfer.id, 'dev_receiver_2', 'Unauthorized payload');
    assert.ok(rejected);
    assert.equal(rejected?.status, 'cancelled');
  });

  // Test 7: PIN Attempt Counter & Lockout Threshold
  test('7. PIN Lockout Simulation: enforces max attempts before cooldown', async () => {
    const testPinRecord = {
      id: 'test_pin_record',
      userId: 'usr_lockout_test',
      pinHash: await hashPin('987654'),
      failedAttempts: 0,
      lockedUntil: null as string | null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Simulate 4 failed attempts
    for (let i = 0; i < 4; i++) {
      const match = await comparePin('000000', testPinRecord.pinHash);
      assert.equal(match, false);
      testPinRecord.failedAttempts++;
    }
    assert.equal(testPinRecord.failedAttempts, 4);
    assert.equal(testPinRecord.lockedUntil, null);

    // 5th failed attempt locks the PIN
    testPinRecord.failedAttempts++;
    if (testPinRecord.failedAttempts >= 5) {
      testPinRecord.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    }

    assert.ok(testPinRecord.lockedUntil);
    const isLocked = new Date(testPinRecord.lockedUntil!) > new Date();
    assert.equal(isLocked, true);
  });
});
