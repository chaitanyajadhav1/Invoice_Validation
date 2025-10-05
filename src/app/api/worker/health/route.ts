import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    workers: [
      {
        name: 'PDF Processing',
        queue: 'file-upload-queue',
        status: 'running',
        concurrency: 2
      },
      {
        name: 'Invoice Processing',
        queue: 'invoice-upload-queue', 
        status: 'running',
        concurrency: 1
      }
    ],
    redis: 'Upstash Connected',
    deployment: 'Next.js Full-Stack',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '5.2.0-nextjs-integration'
  });
}
