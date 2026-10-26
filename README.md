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

[`render.yaml`](render.yaml) is the Blueprint for the whole backend: the gateway as a public web service and the seven services as private services, each built from its own repo. Before applying it, create two environment groups in the Render dashboard:

- `novachat-shared`: `INTERNAL_SECRET`, `REDIS_URL`, `PUBLIC_APP_URL`, and a secret file named `npmrc` containing `//npm.pkg.github.com/:_authToken=<token>`
- `novachat-db`: `DATABASE_URL`, `DATABASE_URL_DIRECT`

Then create a Blueprint from this repo. Migrations run as each service's pre-deploy command.
