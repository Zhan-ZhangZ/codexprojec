import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/code/:path*',
        destination: 'http://127.0.0.1:8000/code/:path*',
      },
      {
        source: '/api/sessions',
        destination: 'http://127.0.0.1:8000/api/sessions',
      },
      {
        source: '/api/sessions/:path*',
        destination: 'http://127.0.0.1:8000/api/sessions/:path*',
      },
      // 工作流 API
      {
        source: '/api/project/:path*',
        destination: 'http://127.0.0.1:8000/api/project/:path*',
      },
      {
        source: '/api/stages',
        destination: 'http://127.0.0.1:8000/api/stages',
      },
      {
        source: '/api/upload_media',
        destination: 'http://127.0.0.1:8000/api/upload_media',
      },
      {
        source: '/api/models',
        destination: 'http://127.0.0.1:8000/api/models',
      },
      {
        source: '/api/config',
        destination: 'http://127.0.0.1:8000/api/config',
      },
      {
        source: '/api/cache/:path*',
        destination: 'http://127.0.0.1:8000/api/cache/:path*',
      },
      // 一键 pipeline API
      {
        source: '/api/pipelines',
        destination: 'http://127.0.0.1:8000/api/pipelines',
      },
      {
        source: '/api/pipelines/:path*',
        destination: 'http://127.0.0.1:8000/api/pipelines/:path*',
      },
      {
        source: '/api/tasks',
        destination: 'http://127.0.0.1:8000/api/tasks',
      },
      {
        source: '/api/tasks/:path*',
        destination: 'http://127.0.0.1:8000/api/tasks/:path*',
      },
      // 临时工作台 API
      {
        source: '/api/sandbox/:path*',
        destination: 'http://127.0.0.1:8000/api/sandbox/:path*',
      },
    ];
  },
};

export default nextConfig;
