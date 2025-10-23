import { describe, test, expect, beforeAll } from 'vitest';
import { Subscrio } from '../../src/index.js';
import { getTestConnectionString } from '../setup/get-connection.js';

describe('API Keys E2E Tests', () => {
  let subscrio: Subscrio;
  
  beforeAll(() => {
    subscrio = new Subscrio({
      database: { connectionString: getTestConnectionString() }
    });
  });

  describe('CRUD Operations', () => {
    test('creates API key with admin scope', async () => {
      const apiKey = await subscrio.apiKeys.createAPIKey({
        displayName: 'Admin Key',
        description: 'An admin API key',
        scope: 'admin'
      });

      expect(apiKey).toBeDefined();
      expect(apiKey.key).toBeDefined();
      expect(apiKey.plaintextKey).toBeDefined();
      expect(apiKey.plaintextKey).toMatch(/^sk_/);
      expect(apiKey.displayName).toBe('Admin Key');
      expect(apiKey.scope).toBe('admin');
      expect(apiKey.status).toBe('active');
    });

    test('creates API key with readonly scope', async () => {
      const apiKey = await subscrio.apiKeys.createAPIKey({
        displayName: 'Readonly Key',
        scope: 'readonly'
      });

      expect(apiKey.scope).toBe('readonly');
    });

    test('creates API key with expiration date', async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const apiKey = await subscrio.apiKeys.createAPIKey({
        displayName: 'Expiring Key',
        scope: 'admin',
        expiresAt: expiresAt.toISOString()
      });

      expect(apiKey.expiresAt).toBeDefined();
    });

    test('creates API key with IP whitelist', async () => {
      const apiKey = await subscrio.apiKeys.createAPIKey({
        displayName: 'IP Restricted Key',
        scope: 'admin',
        ipWhitelist: ['192.168.1.1', '10.0.0.1']
      });

      expect(apiKey.ipWhitelist).toEqual(['192.168.1.1', '10.0.0.1']);
    });

    test('returns plaintext key only on creation', async () => {
      const created = await subscrio.apiKeys.createAPIKey({
        displayName: 'Once Key',
        scope: 'admin'
      });

      expect(created.plaintextKey).toBeDefined();

      // Can't retrieve plaintext again
      const retrieved = await subscrio.apiKeys.getAPIKeyByPlaintext(created.plaintextKey);
      expect(retrieved).toBeDefined();
      expect((retrieved as any).plaintextKey).toBeUndefined();
    });

    test('updates API key display name', async () => {
      const apiKey = await subscrio.apiKeys.createAPIKey({
        displayName: 'Original Name',
        scope: 'admin'
      });

      const updated = await subscrio.apiKeys.updateAPIKey(apiKey.key, {
        displayName: 'Updated Name'
      });

      expect(updated.displayName).toBe('Updated Name');
    });

    test('updates API key description', async () => {
      const apiKey = await subscrio.apiKeys.createAPIKey({
        displayName: 'Update Desc Key',
        scope: 'admin',
        description: 'Old description'
      });

      const updated = await subscrio.apiKeys.updateAPIKey(apiKey.key, {
        description: 'New description'
      });

      expect(updated.description).toBe('New description');
    });
  });

  describe('Validation Tests', () => {
    test('throws error for invalid scope', async () => {
      await expect(
        subscrio.apiKeys.createAPIKey({
          displayName: 'Invalid Scope',
          scope: 'invalid' as any
        })
      ).rejects.toThrow();
    });

    test('plaintext key has correct format (sk_...)', async () => {
      const apiKey = await subscrio.apiKeys.createAPIKey({
        displayName: 'Format Test',
        scope: 'admin'
      });

      expect(apiKey.plaintextKey).toMatch(/^sk_[a-zA-Z0-9_-]+$/);
    });
  });

  describe('Status & Security', () => {
    test('validates API key successfully', async () => {
      const apiKey = await subscrio.apiKeys.createAPIKey({
        displayName: 'Valid Key',
        scope: 'admin'
      });

      const isValid = await subscrio.apiKeys.validateAPIKey(
        apiKey.plaintextKey,
        'admin'
      );

      expect(isValid).toBe(true);
    });

    test('validates API key with admin scope', async () => {
      const apiKey = await subscrio.apiKeys.createAPIKey({
        displayName: 'Admin Scope Key',
        scope: 'admin'
      });

      const isValid = await subscrio.apiKeys.validateAPIKey(
        apiKey.plaintextKey,
        'admin'
      );

      expect(isValid).toBe(true);
    });

    test('validates API key with readonly scope', async () => {
      const apiKey = await subscrio.apiKeys.createAPIKey({
        displayName: 'Readonly Scope Key',
        scope: 'readonly'
      });

      const isValid = await subscrio.apiKeys.validateAPIKey(
        apiKey.plaintextKey,
        'readonly'
      );

      expect(isValid).toBe(true);
    });

    test('fails validation for revoked key', async () => {
      const apiKey = await subscrio.apiKeys.createAPIKey({
        displayName: 'Revoked Key',
        scope: 'admin'
      });

      await subscrio.apiKeys.archiveAPIKey(apiKey.key);

      await expect(
        subscrio.apiKeys.validateAPIKey(apiKey.plaintextKey, 'admin')
      ).rejects.toThrow('revoked');
    });

    test('fails validation for expired key', async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() - 1); // Yesterday

      const apiKey = await subscrio.apiKeys.createAPIKey({
        displayName: 'Expired Key',
        scope: 'admin',
        expiresAt: expiresAt.toISOString()
      });

      await expect(
        subscrio.apiKeys.validateAPIKey(apiKey.plaintextKey, 'admin')
      ).rejects.toThrow('expired');
    });

    test('fails validation for wrong scope', async () => {
      const apiKey = await subscrio.apiKeys.createAPIKey({
        displayName: 'Readonly Only',
        scope: 'readonly'
      });

      await expect(
        subscrio.apiKeys.validateAPIKey(apiKey.plaintextKey, 'admin')
      ).rejects.toThrow('scope');
    });

    test('fails validation for invalid key', async () => {
      await expect(
        subscrio.apiKeys.validateAPIKey('sk_invalid_key', 'admin')
      ).rejects.toThrow();
    });

    test('revokes an active API key', async () => {
      const apiKey = await subscrio.apiKeys.createAPIKey({
        displayName: 'To Revoke',
        scope: 'admin'
      });

      expect(apiKey.status).toBe('active');

      await subscrio.apiKeys.archiveAPIKey(apiKey.key);

      const retrieved = await subscrio.apiKeys.getAPIKeyByPlaintext(apiKey.plaintextKey);
      expect(retrieved?.status).toBe('revoked');
    });

    test('deletes a revoked API key', async () => {
      const apiKey = await subscrio.apiKeys.createAPIKey({
        displayName: 'To Delete',
        scope: 'admin'
      });

      await subscrio.apiKeys.archiveAPIKey(apiKey.key);
      await subscrio.apiKeys.deleteAPIKey(apiKey.key);

      const retrieved = await subscrio.apiKeys.getAPIKeyByPlaintext(apiKey.plaintextKey);
      expect(retrieved).toBeNull();
    });

    test('throws error when deleting active key', async () => {
      const apiKey = await subscrio.apiKeys.createAPIKey({
        displayName: 'Delete Active',
        scope: 'admin'
      });

      await expect(
        subscrio.apiKeys.deleteAPIKey(apiKey.key)
      ).rejects.toThrow('revoked');
    });
  });

  describe('IP Whitelist Tests', () => {
    test('allows any IP when whitelist empty', async () => {
      const apiKey = await subscrio.apiKeys.createAPIKey({
        displayName: 'No Whitelist',
        scope: 'admin'
      });

      const isValid = await subscrio.apiKeys.validateAPIKey(
        apiKey.plaintextKey,
        'admin',
        '1.2.3.4'
      );

      expect(isValid).toBe(true);
    });
  });
});

