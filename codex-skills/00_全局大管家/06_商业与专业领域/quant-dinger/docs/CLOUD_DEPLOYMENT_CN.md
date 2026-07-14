# QuantDinger 云服务器部署指南

本文面向生产/准生产环境，使用云服务器 + Docker Compose 部署 QuantDinger，并补充域名、HTTPS、反向代理与前后端分离说明。

## 推荐架构

推荐使用“同域名 + Nginx 反向代理”：

- 用户访问：`https://app.example.com`
- 宿主机 Nginx：监听 `80/443`
- Docker `frontend`：绑定到 `127.0.0.1:8888`
- Docker `backend`：绑定到 `127.0.0.1:5000`
- Docker `postgres`：绑定到 `127.0.0.1:5432`

这样做的好处：

- 外网只暴露 `80/443`
- 前端和 API 走同域名，最省心
- 数据库与后端管理端口不直接暴露到公网

## 1. 服务器准备

建议配置：

- Ubuntu 22.04 / Debian 12
- 2C4G 及以上
- 已开放安全组端口：`22`、`80`、`443`
- 已准备域名，例如 `app.example.com`

域名解析：

1. 在 DNS 服务商后台添加一条 `A` 记录
2. 主机记录填 `app`
3. 记录值填云服务器公网 IP
4. 等待解析生效

验证：

```bash
ping app.example.com
```

## 2. 安装 Docker 与 Docker Compose

Ubuntu / Debian 示例：

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
docker --version
docker compose version
```

如果你的网络拉取 Docker Hub 较慢，可稍后通过项目根 `.env` 的 `IMAGE_PREFIX` 切换镜像源。

## 3. 拉取项目

```bash
git clone https://github.com/brokermr810/QuantDinger.git
cd QuantDinger
```

## 4. 配置后端 `.env`

复制模板：

```bash
cp backend_api_python/env.example backend_api_python/.env
```

生成并写入 `SECRET_KEY`：

```bash
./scripts/generate-secret-key.sh
```

至少检查并修改这些配置：

```ini
ADMIN_USER=quantdinger
ADMIN_PASSWORD=your_strong_password
SECRET_KEY=your_generated_secret
```

如果你需要 AI 功能，再补充至少一个模型提供商密钥，例如：

```ini
OPENROUTER_API_KEY=your_key
```

## 5. 配置项目根 `.env`

项目根 `.env` 用于 Docker Compose 的端口和镜像源控制。

推荐生产配置：

```bash
cp .env.example .env
```

编辑为：

```ini
FRONTEND_PORT=127.0.0.1:8888
BACKEND_PORT=127.0.0.1:5000
DB_PORT=127.0.0.1:5432
IMAGE_PREFIX=
```

说明：

- `FRONTEND_PORT=127.0.0.1:8888`：只允许宿主机本地访问，由外层 Nginx 转发
- `BACKEND_PORT=127.0.0.1:5000`：避免后端 API 直接暴露公网
- `DB_PORT=127.0.0.1:5432`：避免数据库端口暴露公网
- `IMAGE_PREFIX=`：空值表示官方 Docker Hub

如果拉镜像失败，可改成：

```ini
IMAGE_PREFIX=docker.m.daocloud.io/library/
```

或：

```ini
IMAGE_PREFIX=docker.xuanyuan.me/library/
```

## 6. 启动容器

```bash
docker-compose up -d --build
docker-compose ps
```

查看日志：

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

此时服务通常已在本机监听：

- `127.0.0.1:8888`
- `127.0.0.1:5000`
- `127.0.0.1:5432`

## 7. 安装并配置 Nginx

安装：

```bash
sudo apt update
sudo apt install -y nginx
```

推荐站点配置 `/etc/nginx/sites-available/quantdinger.conf`：

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

启用站点：

```bash
sudo ln -s /etc/nginx/sites-available/quantdinger.conf /etc/nginx/sites-enabled/quantdinger.conf
sudo nginx -t
sudo systemctl reload nginx
```

如果启用了防火墙：

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 8. 配置 HTTPS（Let's Encrypt）

安装 Certbot：

```bash
sudo apt install -y certbot python3-certbot-nginx
```

申请证书：

```bash
sudo certbot --nginx -d app.example.com
```

自动续期测试：

```bash
sudo certbot renew --dry-run
```

完成后访问：

```text
https://app.example.com
```

## 9. 推荐生产模式：同域名部署

这是开源版最推荐的方式。

原因：

- 前端以预构建镜像（`ghcr.io/brokermr810/quantdinger-frontend`）方式拉取，无需本地构建
- 前端容器内部已把 `/api/*` 代理到 Docker 网络中的 `backend:5000`
- 用户只需要维护一个域名和一套 HTTPS

拓扑如下：

```text
Browser
  -> https://app.example.com
  -> Host Nginx :443
  -> 127.0.0.1:8888 (frontend container)
  -> /api/* 再由 frontend 容器代理到 backend:5000
```

## 10. 高级方案：前后端分离 / 双域名

如果你希望：

- 前端域名：`app.example.com`
- API 域名：`api.example.com`

可以使用双域名方案，但请注意：

1. 需要前端能够把 API 指向 `api.example.com`
2. 后端需要正确处理跨域
3. 这种方式更适合有前端源码控制权或二次开发的部署场景

宿主机 Nginx 可拆成两个站点：

- `app.example.com` -> `127.0.0.1:8888`
- `api.example.com` -> `127.0.0.1:5000`

`api.example.com` 示例：

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

如果你只是想“前后端逻辑分离”，但不想处理跨域，建议仍使用同域名：

- `https://app.example.com/`
- `https://app.example.com/api/`

## 11. 常用运维命令

查看状态：

```bash
docker-compose ps
```

查看日志：

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

更新版本：

```bash
git pull
docker-compose up -d --build
```

重启：

```bash
docker-compose restart backend
docker-compose restart frontend
```

停止：

```bash
docker-compose down
```

## 12. 常见问题排查

### 1. 拉镜像失败

现象：

- `failed to resolve source metadata`
- `registry-1.docker.io`
- `Docker Desktop has no HTTPS proxy`

处理：

```ini
IMAGE_PREFIX=docker.m.daocloud.io/library/
```

然后重新：

```bash
docker-compose up -d --build
```

### 2. 后端日志出现 `exec /usr/local/bin/docker-entrypoint.sh: no such file or directory`

处理：

```bash
docker-compose build --no-cache backend
docker-compose up -d backend
```

### 3. 前端日志出现 `host not found in upstream "backend"`

通常表示后端没先起来。

处理：

```bash
docker-compose ps
docker-compose logs backend --tail=100
docker-compose restart frontend
```

### 4. `docker compose up` 拉不到 `quantdinger-frontend`

前端镜像托管在 GHCR（`ghcr.io/brokermr810/quantdinger-frontend`）。若拉取失败：

```bash
docker pull ghcr.io/brokermr810/quantdinger-frontend:latest
```

常见原因：

- GHCR 包可见性是私有 —— 在 GitHub 上把包设为 public，或先 `docker login ghcr.io`
- 网络封禁 GHCR —— 在项目根 `.env` 用 `FRONTEND_IMAGE` 指向国内镜像
- `IMAGE_TAG`(或 `BACKEND_TAG` / `FRONTEND_TAG`)pin 的版本不存在 —— 回退到 `latest` 或选一个已发布的 semver tag

### 5. 后台保存配置时报 `Read-only file system: '/app/.env'`

原因是 `backend_api_python/.env` 被只读挂载到容器内。

请检查 `docker-compose.yml`，确保不要使用：

```yaml
- ./backend_api_python/.env:/app/.env:ro
```

而应改为可写挂载：

```yaml
- ./backend_api_python/.env:/app/.env
```

然后执行：

```bash
docker-compose up -d backend
```

### 6. Docker 内代理不生效

如果宿主机代理监听在本机 `127.0.0.1:10808`，容器内不能直接写 `127.0.0.1`，因为那会指向容器自己。

Docker 部署请改为：

```ini
PROXY_URL=socks5h://host.docker.internal:10808
```

### 7. 交易所日志出现 `symbol not found`

如果你已经确认代理和外网访问正常，但日志仍出现某些币对不存在，例如：

```text
Symbol 'MATIC/USDT' not found on okx
```

这通常是交易所的符号映射/代币更名问题，不一定是网络故障。

### 8. Nginx 502 / 504

检查：

```bash
docker-compose ps
curl http://127.0.0.1:8888/health
curl http://127.0.0.1:5000/api/health
sudo nginx -t
```

### 9. 数据库不应暴露公网

生产环境建议：

```ini
DB_PORT=127.0.0.1:5432
```

不要开放：

- `5432`
- `5000`

公网只开放：

- `80`
- `443`

