import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new NextResponse('Missing URL parameter', { status: 400 });
  }

  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return new NextResponse(`Failed to fetch image: ${response.status} ${response.statusText}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type');
    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType || 'image/jpeg',
        // Allow caching
        'Cache-Control': 'public, max-age=31536000, immutable',
        // Important for CORS if accessed directly, though Next.js proxying usually handles it
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return new NextResponse('Error fetching image', { status: 500 });
  }
}
