# Acme relay

Forwards Stripe events to the Acme partner API, keeps a copy of each in Postgres, and
redeploys the pricing page on Vercel when a price changes. Commits are signed as a GitHub App.

## Running it

```sh
node app.mjs
```

It checks its configuration first and says what is missing.

## Configuration

In `.env`, which git ignores:

| Name | What it is |
| --- | --- |
| `ADMIN_PASSWORD` | The password for the admin screens |
| `STRIPE_WEBHOOK_SECRET` | The signing secret of the Stripe webhook that sends events here |
| `VERCEL_TOKEN` | A Vercel access token that can redeploy the pricing page |
| `DATABASE_URL` | The Postgres database events are kept in |
| `JWT_SECRET` | 32 random bytes as hex, for signing admin sessions |
| `ACME_PARTNER_KEY` | The key the Acme partner API issued |
| `GITHUB_APP_PRIVATE_KEY` | The GitHub App's private key, the whole PEM block |
