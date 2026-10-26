# NovaChat api-gateway

The NovaChat api gateway. Shared code comes from [`NovaChat-Enterprise-ERP/packages`](https://github.com/NovaChat-Enterprise-ERP/packages).

## Setup

Dependencies under `@novachat-enterprise-erp` are served from GitHub Packages, which requires a token even for public packages. Create a classic personal access token with the `read:packages` scope and add it to `~/.npmrc`:

```
//npm.pkg.github.com/:_authToken=<token>
```

Then:

```sh
cp .env.example .env
pnpm install
pnpm dev
```

## Scripts

- `pnpm dev`
- `pnpm build`
- `pnpm start`
- `pnpm test`
- `pnpm lint`
- `pnpm typecheck`

## Docker

```sh
docker build --secret id=npmrc,src=$HOME/.npmrc -t novachat/api-gateway .
```

## Deploying to Render

[`render.yaml`](render.yaml) is the Blueprint for the whole backend on Render's free tier: eight free web services, each built from its own repo, calling each other over their public `onrender.com` URLs (internal routes reject requests without a valid HMAC signature). Services with a database run their migrations on startup.

Secrets live in environment groups created in the Render dashboard before the Blueprint is applied:

- `novachat-shared`: `INTERNAL_SECRET`, `REDIS_URL`, `PUBLIC_APP_URL`, `LOG_LEVEL`, and a secret file `npmrc` containing `//npm.pkg.github.com/:_authToken=<read:packages token>`
- `novachat-db`: `DATABASE_URL`, `DATABASE_URL_DIRECT`
- `novachat-google`, `novachat-storage`, `novachat-livekit`, `novachat-resend`: the integration credentials for auth, file, call and notification services
