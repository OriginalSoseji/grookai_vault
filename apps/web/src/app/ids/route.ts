export const dynamic = "force-static";

export function GET() {
  return new Response("The public card ID registry has been retired.", {
    status: 410,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
