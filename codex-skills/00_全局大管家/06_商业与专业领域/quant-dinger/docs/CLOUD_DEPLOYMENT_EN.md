# QuantDinger Cloud Server Deployment Guide

This guide covers production-style deployment on a cloud server with Docker Compose, domain setup, HTTPS, reverse proxy, and frontend/backend separation options.

## Recommended Architecture

Recommended setup: single domain + host Nginx reverse proxy

- Public URL: `https://app.example.com`
- Host Nginx: listens on `80/443`
- Docker `frontend`: binds to `127.0.0.1:8888`
- Docker `backend`: binds to `127.0.0.1:5000`
- Docker `postgres`: binds to `127.0.0.1:5432`

Benefits:

- Only `80/443` are exposed publicly
- Frontend and API stay on the same origin
- Backend and database are not directly exposed to the internet

## 1. Prepare the Server

Recommended:

- Ubuntu 22.04 / Debian 12
- 2 vCPU / 4 GB RAM or higher
- Security group ports open: `22`, `80`, `443`
- A domain such as `app.example.com`

DNS steps:

1. Create an `A` record
2. Host: `app`
3. Value: your server public IP
4. Wait for DNS propagation

Verify:

```bash
ping app.example.com
```

## 2. Install Docker and Docker Compose

Ubuntu / Debian example:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
docker --version
docker compose version
```

If Docker Hub is slow or blocked in your network, you can switch image source later with `IMAGE_PREFIX` in the project-root `.env`.

## 3. Clone the Project

```bash
git clone https://github.com/brokermr810/QuantDinger.git
cd QuantDinger
```

## 4. Configure `backend_api_python/.env`

Copy the template:

```bash
cp backend_api_python/env.example backend_api_python/.env
```

Generate and write `SECRET_KEY`:

```bash
./scripts/generate-secret-key.sh
```

At minimum, review these values:

```ini
ADMIN_USER=quantdinger
ADMIN_PASSWORD=your_strong_password
SECRET_KEY=your_generated_secret
```

If you want AI features, add at least one provider key, for example:

```ini
OPENROUTER_API_KEY=your_key
```

## 5. Configure the Project-Root `.env`

The project-root `.env` is used by Docker Compose for ports and image source selection.

Copy the template:

```bash
cp .env.example .env
```

Recommended production values:

```ini
FRONTEND_PORT=127.0.0.1:8888
BACKEND_PORT=127.0.0.1:5000
DB_PORT=127.0.0.1:5432
IMAGE_PREFIX=
```

Explanation:

- `FRONTEND_PORT=127.0.0.1:8888`: only accessible locally, exposed through host Nginx
- `BACKEND_PORT=127.0.0.1:5000`: avoid exposing API directly
- `DB_PORT=127.0.0.1:5432`: avoid exposing PostgreSQL directly
- `IMAGE_PREFIX=`: empty means official Docker Hub

If image pulls fail, try:

```ini
IMAGE_PREFIX=docker.m.daocloud.io/library/
```

or:

```ini
IMAGE_PREFIX=docker.xuanyuan.me/library/
```

## 6. Start the Containers

```bash
docker-compose up -d --build
docker-compose ps
```

Logs:

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

At this point, services usually listen on:

- `127.0.0.1:8888`
- `127.0.0.1:5000`
- `127.0.0.1:5432`

## 7. Install and Configure Nginx

Install:

```bash
sudo apt update
sudo apt install -y nginx
```

Recommended site config `/etc/nginx/sites-available/quantdinger.conf`:

```nginx
server {
    listen 80;
    server_name app.example.com;

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:8888;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/quantdinger.conf /etc/nginx/sites-enabled/quantdinger.conf
sudo nginx -t
sudo systemctl reload nginx
```

If using UFW:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 8. Enable HTTPS with Let's Encrypt

Install Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Request the certificate:

```bash
sudo certbot --nginx -d app.example.com
```

Test renewal:

```bash
sudo certbot renew --dry-run
```

Then open:

```text
https://app.example.com
```

## 9. Recommended Production Mode: Single Domain

This is the recommended mode for the open-source edition.

Why:

- The frontend is pulled as a prebuilt image (`ghcr.io/brokermr810/quantdinger-frontend`) — no local build
- The frontend container already proxies `/api/*` to `backend:5000` inside Docker
- Only one public domain and one TLS configuration are needed

Topology:

```text
Browser
  -> https://app.example.com
  -> Host Nginx :443
  -> 127.0.0.1:8888 (frontend container)
  -> /api/* then proxied by frontend container to backend:5000
```

## 10. Advanced Option: Frontend / Backend Separation

If you want:

- frontend: `app.example.com`
- API: `api.example.com`

you can use a dual-domain setup, but note:

1. the frontend must point API requests to `api.example.com`
2. backend cross-origin handling must be correct
3. this is better suited for deployments where you control frontend source/customization

Host Nginx can expose:

- `app.example.com` -> `127.0.0.1:8888`
- `api.example.com` -> `127.0.0.1:5000`

Example `api.example.com` config:

```nginx
server {
    listen 80;
    server_name api.example.com;

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

If you only want logical separation without cross-origin complexity, keep:

- `https://app.example.com/`
- `https://app.example.com/api/`

## 11. Common Operations

Check status:

```bash
docker-compose ps
```

View logs:

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

Update:

```bash
git pull
docker-compose up -d --build
```

Restart:

```bash
docker-compose restart backend
docker-compose restart frontend
```

Stop:

```bash
docker-compose down
```

## 12. Troubleshooting

### 1. Image pull failures

Symptoms:

- `failed to resolve source metadata`
- `registry-1.docker.io`
- `Docker Desktop has no HTTPS proxy`

Fix:

```ini
IMAGE_PREFIX=docker.m.daocloud.io/library/
```

Then rerun:

```bash
docker-compose up -d --build
```

### 2. Backend logs show `exec /usr/local/bin/docker-entrypoint.sh: no such file or directory`

Fix:

```bash
docker-compose build --no-cache backend
docker-compose up -d backend
```

### 3. Frontend logs show `host not found in upstream "backend"`

This usually means backend failed first.

Fix:

```bash
docker-compose ps
docker-compose logs backend --tail=100
docker-compose restart frontend
```

### 4. `docker compose up` fails to pull `quantdinger-frontend`

The frontend image lives on GHCR (`ghcr.io/brokermr810/quantdinger-frontend`). If the pull fails:

```bash
docker pull ghcr.io/brokermr810/quantdinger-frontend:latest
```

Common causes:

- Image visibility set to private — switch the package to public in GitHub, or `docker login ghcr.io` first
- Network firewall blocks GHCR — set a mirror prefix via `FRONTEND_IMAGE` in project-root `.env`
- Tag pinned by `IMAGE_TAG` (or `BACKEND_TAG` / `FRONTEND_TAG`) no longer exists — fall back to `latest` or pick an existing semver tag

### 5. Saving settings fails with `Read-only file system: '/app/.env'`

This means `backend_api_python/.env` is mounted read-only into the container.

In `docker-compose.yml`, avoid:

```yaml
- ./backend_api_python/.env:/app/.env:ro
```

Use a writable mount instead:

```yaml
- ./backend_api_python/.env:/app/.env
```

Then run:

```bash
docker-compose up -d backend
```

### 6. Proxy works on host but not inside Docker

If your proxy listens on host `127.0.0.1:10808`, do not use `127.0.0.1` inside the container, because that points to the container itself.

For Docker deployments, use:

```ini
PROXY_URL=socks5h://host.docker.internal:10808
```

### 7. Exchange logs show `symbol not found`

If proxy/network access is already working but some symbols still fail, for example:

```text
Symbol 'MATIC/USDT' not found on okx
```

this is usually a market-symbol mapping / token-rename issue on the exchange side, not a general network failure.

### 8. Nginx 502 / 504

Check:

```bash
docker-compose ps
curl http://127.0.0.1:8888/health
curl http://127.0.0.1:5000/api/health
sudo nginx -t
```

### 9. PostgreSQL should not be public

Recommended:

```ini
DB_PORT=127.0.0.1:5432
```

Do not expose:

- `5432`
- `5000`

Publicly expose only:

- `80`
- `443`

