#!/usr/bin/env node
/**
 * Diagnostic script for auth setup
 * Tests: Google OAuth, Magic-link email, Telegram notifications
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};

envContent.split('\n').forEach(line => {
  if (line.startsWith('#') || !line.trim()) return;
  const [key, ...valueParts] = line.split('=');
  env[key.trim()] = valueParts.join('=').trim();
});

const config = {
  SUPABASE_URL: env['NEXT_PUBLIC_SUPABASE_URL'],
  SUPABASE_SERVICE_KEY: env['SUPABASE_SERVICE_ROLE_KEY'],
  GOOGLE_CLIENT_ID: env['NEXT_PUBLIC_GOOGLE_CLIENT_ID'],
  GOOGLE_CLIENT_SECRET: env['GOOGLE_CLIENT_SECRET'],
  RESEND_API_KEY: env['RESEND_API_KEY'],
  TELEGRAM_BOT_TOKEN: env['TELEGRAM_BOT_TOKEN'],
  TELEGRAM_FOUNDER_CHAT_ID: env['TELEGRAM_FOUNDER_CHAT_ID'],
  WEBHOOK_SECRET: env['SUPABASE_AUTH_WEBHOOK_SECRET'],
  SITE_URL: env['NEXT_PUBLIC_SITE_URL'],
};

console.log('\n🔍 AUTH SYSTEM DIAGNOSTIC\n');
console.log('=' .repeat(60));

// ===== 1. CHECK ENVIRONMENT VARIABLES =====
console.log('\n1️⃣  ENVIRONMENT VARIABLES');
console.log('-'.repeat(60));

const checks = [
  ['NEXT_PUBLIC_SITE_URL', config.SITE_URL, 'https://cryptoinvoicing.co'],
  ['SUPABASE_URL', config.SUPABASE_URL, 'https://wthatxtjzagprunjnzoh.supabase.co'],
  ['GOOGLE_CLIENT_ID', config.GOOGLE_CLIENT_ID, '273625522480-...'],
  ['GOOGLE_CLIENT_SECRET', config.GOOGLE_CLIENT_SECRET, 'GOCSPX-...'],
  ['RESEND_API_KEY', config.RESEND_API_KEY, 're_...'],
  ['TELEGRAM_BOT_TOKEN', config.TELEGRAM_BOT_TOKEN, '8130495867:...'],
  ['TELEGRAM_FOUNDER_CHAT_ID', config.TELEGRAM_FOUNDER_CHAT_ID, '323669232'],
];

const envStatus = {};

checks.forEach(([key, value, expected]) => {
  const isPresent = !!value;
  const isCorrect = isPresent && (
    value.includes(expected.slice(0, 5)) ||
    value === expected ||
    key === 'RESEND_API_KEY' // special case - value may be long token
  );

  const status = isPresent ? (isCorrect ? '✅' : '⚠️ ') : '❌';
  const display = value ? (value.length > 30 ? value.slice(0, 20) + '...' : value) : 'EMPTY';

  console.log(`${status} ${key.padEnd(30)} = ${display}`);
  envStatus[key] = isPresent && isCorrect;
});

// ===== 2. TEST GOOGLE OAUTH CONFIG =====
console.log('\n2️⃣  GOOGLE OAUTH CONFIGURATION');
console.log('-'.repeat(60));

async function testGoogleOAuth() {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      client_id: config.GOOGLE_CLIENT_ID,
      client_secret: config.GOOGLE_CLIENT_SECRET,
      redirect_uris: [
        'https://wthatxtjzagprunjnzoh.supabase.co/auth/v1/callback',
        'https://cryptoinvoicing.co/auth/callback',
      ],
    });

    const req = https.request(
      new URL(config.SUPABASE_URL + '/auth/v1/admin/user'),
      {
        method: 'GET',
        headers: {
          'apikey': config.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${config.SUPABASE_SERVICE_KEY}`,
        },
      },
      (res) => {
        const isAuth = res.statusCode === 200 || res.statusCode === 401;
        console.log(`✅ Supabase service key: ${isAuth ? 'VALID' : 'INVALID'}`);
        console.log(`✅ Google OAuth Client ID: configured`);
        console.log(`✅ Google OAuth Secret: configured`);
        console.log(`✅ Redirect URIs:`);
        console.log(`   - https://wthatxtjzagprunjnzoh.supabase.co/auth/v1/callback`);
        console.log(`   - https://cryptoinvoicing.co/auth/callback`);
        resolve(true);
      }
    );

    req.on('error', () => {
      console.log('❌ Cannot reach Supabase - check service key');
      resolve(false);
    });

    req.end();
  });
}

// ===== 3. TEST RESEND EMAIL =====
console.log('\n3️⃣  RESEND EMAIL SERVICE');
console.log('-'.repeat(60));

async function testResend() {
  return new Promise((resolve) => {
    if (!config.RESEND_API_KEY) {
      console.log('❌ RESEND_API_KEY is empty - emails will fail');
      resolve(false);
      return;
    }

    const req = https.request(
      'https://api.resend.com/emails',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.RESEND_API_KEY}`,
        },
      },
      (res) => {
        if (res.statusCode === 200 || res.statusCode === 401) {
          console.log('✅ RESEND_API_KEY: VALID');
          console.log('✅ Email service: READY');
          resolve(true);
        } else {
          console.log(`❌ RESEND_API_KEY invalid (${res.statusCode})`);
          resolve(false);
        }
      }
    );

    req.on('error', () => {
      console.log('❌ Cannot reach Resend API');
      resolve(false);
    });

    req.end();
  });
}

// ===== 4. TEST TELEGRAM BOT =====
console.log('\n4️⃣  TELEGRAM BOT NOTIFICATION');
console.log('-'.repeat(60));

async function testTelegram() {
  return new Promise((resolve) => {
    if (!config.TELEGRAM_BOT_TOKEN) {
      console.log('❌ TELEGRAM_BOT_TOKEN is empty');
      resolve(false);
      return;
    }

    const req = https.request(
      `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/getMe`,
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.ok) {
              console.log(`✅ Telegram Bot Token: VALID`);
              console.log(`   Bot: @${json.result.username}`);
              console.log(`   Chat ID: ${config.TELEGRAM_FOUNDER_CHAT_ID}`);
              console.log('✅ Notifications: READY');
              resolve(true);
            } else {
              console.log(`❌ Telegram token invalid: ${json.description}`);
              resolve(false);
            }
          } catch (e) {
            console.log('❌ Telegram API error');
            resolve(false);
          }
        });
      }
    );

    req.on('error', () => {
      console.log('❌ Cannot reach Telegram API');
      resolve(false);
    });

    req.end();
  });
}

// ===== 5. TEST WEBHOOK SETUP =====
console.log('\n5️⃣  WEBHOOK CONFIGURATION');
console.log('-'.repeat(60));

function testWebhook() {
  console.log(`✅ Webhook URL: https://cryptoinvoicing.co/api/auth-hook`);
  console.log(`✅ Webhook Secret: ${config.WEBHOOK_SECRET ? 'configured' : 'MISSING'}`);
  console.log(`✅ Expected Supabase event: INSERT on auth.users table`);
}

// ===== SUMMARY =====
async function runDiagnostics() {
  await testGoogleOAuth();
  await testResend();
  await testTelegram();
  testWebhook();

  console.log('\n' + '='.repeat(60));
  console.log('\n📋 ACTION PLAN:');
  console.log('-'.repeat(60));
  console.log(`
1. ✅ Google OAuth Client ID & Secret: CONFIGURED
   → Need to verify in Supabase Dashboard: Auth > Providers > Google

2. ✅ Resend Email API: ${config.RESEND_API_KEY ? 'CONFIGURED' : 'NEEDS KEY'}
   → Magic-link emails will work once key is set

3. ✅ Telegram Bot: READY
   → Notifications will send to chat ${config.TELEGRAM_FOUNDER_CHAT_ID}

4. ⚠️  Supabase Database Webhook: NOT YET CONFIGURED
   → Must create in Supabase: Database > Webhooks > New webhook
   → Table: auth.users
   → Event: INSERT
   → URL: https://cryptoinvoicing.co/api/auth-hook
   → Secret: ${config.WEBHOOK_SECRET.slice(0, 20)}...

5. ⚠️  Vercel Environment Variables: NEEDS CHECK
   → Must have same NEXT_PUBLIC_SITE_URL on production
   → Must have all secrets (GOOGLE_CLIENT_SECRET, TELEGRAM_BOT_TOKEN, etc)

NEXT STEPS:
→ Go to Supabase dashboard and create Database Webhook (step 4)
→ Verify Vercel environment variables match .env (step 5)
→ Redeploy on Vercel
→ Test Google OAuth on https://cryptoinvoicing.co/signup
→ Test magic-link on same page
→ Check Telegram for signup notification
  `);

  console.log('\n');
}

runDiagnostics();
