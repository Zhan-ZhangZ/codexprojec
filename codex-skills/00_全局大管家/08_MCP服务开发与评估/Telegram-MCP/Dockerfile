FROM ghcr.io/astral-sh/uv:latest AS uv

FROM python:3.13-slim

COPY --from=uv /uv /usr/local/bin/uv

WORKDIR /app

COPY pyproject.toml uv.lock README.md ./
COPY tg_mcp/ tg_mcp/
RUN uv sync --frozen --no-dev

EXPOSE 8000

CMD ["uv", "run", "python", "-m", "tg_mcp", "serve", "--transport", "http", "--host", "0.0.0.0", "--port", "8000", "--path", "/mcp"]
