# Backend deployment (blue/green)

This repository deploys the backend API to a single VM with blue/green containers and Nginx upstream cutover.

## GitHub Actions

Workflow: `.github/workflows/deploy-dev.yml`

Required repository secrets:

- `DEV_VM_HOST`
- `DEV_VM_USER`
- `DEV_VM_SSH_PRIVATE_KEY`
- `SERVER_ENV_B64` (base64 of `.env.production`)

Optional repository variables:

- `SERVER_DEPLOY_BASE` (default: `/home/ubuntu/apps/product-farming/server`)
- `SERVER_PUBLIC_HEALTH_URL` (public URL to verify post-cutover)

Generate the env secret locally:

```bash
base64 -w0 < .env.production
```

## Database URL (fix `Can't reach database server at base`)

This almost always means **`DATABASE_URL` in `.env.production` / `SERVER_ENV_B64` is malformed**.

Common causes:

1. **Unencoded `@` in the password** — e.g. `PayrollPilot@123` must be `PayrollPilot%40123` in the URL.
2. **Wrong host** — hostname must be your Postgres host (Neon, RDS, VM IP), not `base` or a placeholder.
3. **Missing SSL** — Neon/Supabase need `?sslmode=require` (added automatically for known hosts when using a valid URL).

Preferred format:

```env
DATABASE_URL=postgresql://USER:URL_ENCODED_PASSWORD@HOST:5432/DATABASE?sslmode=require
```

Alternative (avoids encoding issues in one long URL):

```env
DATABASE_HOST=your-db-host.example.com
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=plain-password-here
DATABASE_NAME=product_farming
```

After updating secrets, redeploy. `/health` returns **503** when the database is unreachable so deploy fails fast with container logs.

## VM prerequisites

- Docker installed and running
- Nginx installed
- Nginx config includes upstream file:
  - `/etc/nginx/conf.d/product-farming-api-upstream.conf`
  - upstream name `product_farming_api_active`
- Passwordless sudo for `nginx -t`, `systemctl reload nginx`, and writing snippet files

## TLS with Certbot (for api.orbitalops.net)

If HTTP is working but CI checks use HTTPS, ensure Certbot is configured on the VM:

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.orbitalops.net
```

Validate:

```bash
curl -I https://api.orbitalops.net/health
```

## Zero-downtime verification (built into deploy script)

`script/deploy-bluegreen.sh` now includes a cutover window probe and fails deployment if health requests fail during that window.

Optional env flags:

- `PF_ZERO_DOWNTIME_CHECK` (default: `1`)
- `PF_ZERO_DOWNTIME_DURATION_SECONDS` (default: `30`)
- `PF_ZERO_DOWNTIME_INTERVAL_SECONDS` (default: `0.2`)
- `PF_PUBLIC_HEALTH_SUCCESS_COUNT` (default: `3`)
- `PF_PUBLIC_HEALTH_MAX_TIME_SECONDS` (default: `8`)
- `PF_APP_PORT` (default: `8000`)
