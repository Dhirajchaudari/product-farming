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

## VM prerequisites

- Docker installed and running
- Nginx installed
- Nginx config includes snippet file:
  - `/etc/nginx/snippets/product-farming-api-active.conf`
  - upstream name `product_farming_api_active`
- Passwordless sudo for `nginx -t`, `systemctl reload nginx`, and writing snippet files

## Zero-downtime verification (built into deploy script)

`script/deploy-bluegreen.sh` now includes a cutover window probe and fails deployment if health requests fail during that window.

Optional env flags:

- `PF_ZERO_DOWNTIME_CHECK` (default: `1`)
- `PF_ZERO_DOWNTIME_DURATION_SECONDS` (default: `30`)
- `PF_ZERO_DOWNTIME_INTERVAL_SECONDS` (default: `0.2`)
