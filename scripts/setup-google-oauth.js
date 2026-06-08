#!/usr/bin/env node
/**
 * Setup Google OAuth for Supabase
 *
 * This script configures Google OAuth provider credentials in Supabase.
 * Run with: node scripts/setup-google-oauth.js
 */

const https = require('https');

// Secrets come from the environment only — NEVER hardcode (this script used to
// leak the live service-role key + Google client secret in plaintext). Run with:
//   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... \
//   node scripts/setup-google-oauth.js
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wthatxtjzagprunjnzoh.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = `${SUPABASE_URL}/auth/v1/callback`;

if (!SERVICE_ROLE_KEY || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error('❌ Missing env vars. Set SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (see .env).');
  process.exit(1);
}

async function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + path);
    const options = {
      method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function setup() {
  console.log('🔧 Setting up Google OAuth for Supabase...\n');

  try {
    // First, ensure OAuth server is enabled
    console.log('🔌 Enabling OAuth server...');
    let enableResult = await makeRequest('PUT', '/auth/v1/admin/oauth/enable', {});
    console.log('  Status:', enableResult.status);

    // Try to update auth settings
    console.log('📝 Attempting to configure Google OAuth provider...');

    // Try direct OAuth endpoint
    let result = await makeRequest('PUT', '/auth/v1/admin/oauth/google', {
      client_id: GOOGLE_CLIENT_ID,
      secret: GOOGLE_CLIENT_SECRET,
      enabled: true,
    });

    if (result.status === 404) {
      console.log('  Trying alternative endpoint...');
      result = await makeRequest('POST', '/auth/v1/admin/oauth/providers', {
        provider: 'google',
        client_id: GOOGLE_CLIENT_ID,
        secret: GOOGLE_CLIENT_SECRET,
        enabled: true,
      });
    }

    if (result.status >= 400) {
      console.error('❌ Failed to update auth config');
      console.error('Status:', result.status);
      console.error('Response:', result.data);
      process.exit(1);
    }

    console.log('✅ Google OAuth configured successfully!\n');
    console.log('Credentials added:');
    console.log('  Client ID:', GOOGLE_CLIENT_ID);
    console.log('  Redirect URI:', GOOGLE_REDIRECT_URI);
    console.log('\nYou can now test auth on https://cryptoinvoicing.co/signup');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n⚠️  If this fails, you may need to manually add credentials to Supabase dashboard:');
    console.error('  Path: Auth → Providers → Google');
    console.error('  Client ID:', GOOGLE_CLIENT_ID);
    console.error('  Client Secret: (see your .env / 1Password — not printed)');
    process.exit(1);
  }
}

setup();
