# 🌍 Environment Setup — Crypto Invoicing

## Branch Strategy

```
main         → Production release (2-of-3 Safe multisig on Base mainnet)
├─ dev       → Staging/testing (Supabase dev project)
└─ prod      → Production deployment (Supabase prod project)
```

---

## 🏗️ Development Environment (dev branch)

### Setup
```bash
# Clone and switch to dev
git clone https://github.com/2033758-spec/crypto-invoicing
cd crypto-invoicing
git checkout dev

# Install + setup
npm install
cp .env.dev .env.local

# Edit .env.local with your DEV credentials
nano .env.local

# Start server
npm run dev  # http://localhost:3000
```

### Services to Configure (DEV)

#### Supabase (Free Tier)
- Create new **DEV project** at https://app.supabase.com
- Run migrations: `supabase db push`
- Copy URL + keys into `.env.local`

#### Google OAuth (DEV)
- Go to https://console.cloud.google.com
- Create OAuth 2.0 credentials
- Allowed redirect: `http://localhost:3000/[locale]/auth/callback`
- Copy client ID + secret to `.env.local`

#### Resend (Email - DEV)
- Get API key from https://resend.com
- Test emails to your account (free tier)

#### Alchemy (Testnet - DEV)
- Create app on https://dashboard.alchemy.com
- Use **Base Sepolia testnet** (not mainnet)
- Get API key → `.env.local`

#### Telegram Bot (DEV)
- Message @BotFather on Telegram
- Create new bot, get token
- Add to `.env.local` with your chat ID

---

## 🚀 Production Environment (prod branch)

### Setup
```bash
# Switch to prod
git checkout prod

# Use prod env file
cp .env.prod .env.local
nano .env.local  # Fill all secrets
```

### Services to Configure (PROD)

#### Supabase (Prod Project)
- Create new **PROD project** (separate from dev)
- Same migrations as dev
- Copy prod URL + keys

#### Domain
- Purchase domain (e.g., cryptoinvoicing.com)
- Set `NEXT_PUBLIC_SITE_URL=https://your-domain.com`
- Point DNS to Vercel (if using Vercel deploy)

#### Google OAuth (PROD)
- Add new redirect URI: `https://your-domain.com/[locale]/auth/callback`
- Update `NEXT_PUBLIC_GOOGLE_CLIENT_ID` + secret

#### Alchemy (Mainnet - PROD)
- **CRITICAL:** Use **Base mainnet**, not testnet
- Create separate app for production
- Update `ALCHEMY_API_KEY`

#### Safe Multisig (PROD)
```
Network: Base mainnet
Signers: 2-of-3 (you + co-founder + advisor)
Balance: ≤$5k steady state (sweep rule every 24h)
```
- Deploy via https://app.safe.global
- Copy address to `SAFE_MULTISIG_ADDRESS`
- Store signer private key in `.env.local` (NEVER in Git)

#### Telegram Bot (PROD)
- Create separate bot for production
- Update token + chat ID

---

## 📋 Deployment Checklist

### Before pushing to prod
- [ ] All tests pass (`npm test`)
- [ ] No secrets in git (run `git log -p | grep -i secret`)
- [ ] .env.local is in .gitignore
- [ ] ALCHEMY_API_KEY points to **mainnet** (check in code)
- [ ] SAFE_MULTISIG_ADDRESS is 2-of-3 on Base mainnet
- [ ] Telegram bot is production bot (not staging)
- [ ] Email domain verified with Resend
- [ ] Sentry DSN is prod project

### Deploy to Vercel (or your host)
```bash
# Connect GitHub repo to Vercel
# Link prod branch to production deployment
# Vercel auto-fills env vars from GitHub repo secrets
```

Set these in Vercel dashboard:
```
Production (prod branch):
- All env vars from .env.prod (without .local suffix)
- Auto-deploys on push to prod branch

Preview (main/dev):
- Limited credentials (dev Supabase, dev Alchemy testnet)
- Safe to share with team
```

---

## 🔐 Secret Management

### NEVER commit to Git:
- `.env.local`
- `.env.prod`
- Private keys (Safe signer, etc)
- API secrets

### Safe approach:
1. Keep `.env.example` in Git (public template)
2. Keep `.env.dev` / `.env.prod` in Git (public templates with placeholders)
3. Copy `→ .env.local` locally (Git-ignored)
4. Fill secrets manually or via CI/CD secrets

### For Vercel deployment:
```
Settings → Environment Variables
```
Add each secret individually (Vercel never shows them in logs).

---

## ✅ Quick Validation

```bash
# Check that no secrets leaked
git log --all -p | grep -i "ALCHEMY_API_KEY=sk-" && echo "⚠️ SECRET FOUND" || echo "✓ Safe"

# Check current env
echo "Current: $NODE_ENV"
cat .env.local | grep SENTRY_DSN  # Should match branch
```

---

## 📞 Support

- **Dev issues?** Ask in #dev-setup Slack
- **Prod incident?** Follow [RECOVERY.md](./RECOVERY.md)
- **Domain question?** Ask @cpo when ready to purchase

