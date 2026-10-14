import { NextResponse } from 'next/server';

const isGenerator = (u: string) => /^https:\/\/image\.pollinations\.ai\//.test(u)

// una richiesta alla volta verso il generatore (in questo processo del server)
let chain: Promise<unknown> = Promise.resolve()
function queued<T>(job: () => Promise<T>): Promise<T> {
  const run = chain.then(job, job)
  chain = run.catch(() => undefined)
  return run
}

const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

async function fetchWithRetry(url: string): Promise<Response> {
  let last: Response | null = null
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(60000) })
      const type = r.headers.get('content-type') ?? ''
      if (r.ok && type.startsWith('image/')) return r
      last = r
      if (r.status !== 429 && r.status < 500 && r.ok) return r
    } catch { /* timeout o rete: si ritenta */ }
    await wait(2000 * 2 ** attempt)
  }
  return last ?? new Response('Generatore non disponibile', { status: 504 })
}

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
    // I generatori gratuiti (Pollinations) accettano poche richieste alla volta:
    // in fila, con nuovi tentativi se rifiutano o sono lenti
    const response = isGenerator(imageUrl) ? await queued(() => fetchWithRetry(imageUrl)) : await fetch(imageUrl, { signal: AbortSignal.timeout(30000) });

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
