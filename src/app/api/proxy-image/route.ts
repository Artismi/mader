import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get('url');

  if (!rawUrl) {
    return new NextResponse('Missing URL parameter', { status: 400 });
  }

  // Sicurezza: decode se doppiamente encodata (%25XX → %XX → carattere)
  // Previene errori con URL come Pollinations che già contengono %20 nel prompt
  let imageUrl = rawUrl;
  try {
    // Se contiene %25 (segno di doppia codifica), decodiamo una volta
    if (rawUrl.includes('%25')) {
      imageUrl = decodeURIComponent(rawUrl);
    }
  } catch {
    // Se il decode fallisce, usa la URL originale
    imageUrl = rawUrl;
  }

  // Sicurezza base: accetta solo URL http/https
  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    return new NextResponse('Only HTTP/HTTPS URLs are allowed', { status: 400 });
  }

  try {
    // Timeout esteso a 30s per generatori AI come Pollinations (lenti per design)
    const response = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) });

    if (!response.ok) {
      return new NextResponse(`Failed to fetch image: ${response.status} ${response.statusText}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type');

    // Se non è un'immagine restituisce errore chiaro (es. HTML di errore Pollinations)
    if (contentType && !contentType.startsWith('image/')) {
      return new NextResponse(`Unexpected content type: ${contentType}`, { status: 502 });
    }

    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'TimeoutError';
    const msg = isTimeout ? 'Image fetch timed out (30s)' : 'Error fetching image';
    console.error('Image proxy error:', imageUrl, error);
    return new NextResponse(msg, { status: isTimeout ? 504 : 500 });
  }
}
