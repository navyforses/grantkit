/**
 * check-sitemap — fetch <base>/sitemap.xml, HEAD-check every <loc>, print non-200s.
 *
 *   pnpm check:sitemap                       # http://localhost:3000
 *   pnpm check:sitemap https://example.org   # any base URL
 *
 * Exit code 1 when any URL (or the sitemap itself) is not 200.
 */

const base = (process.argv[2] || process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const CONCURRENCY = 8;

async function fetchStatus(url: string): Promise<number> {
  try {
    const head = await fetch(url, { method: "HEAD", redirect: "manual" });
    // Some servers reject HEAD; fall back to GET.
    if (head.status === 405 || head.status === 501) return (await fetch(url, { redirect: "manual" })).status;
    return head.status;
  } catch {
    return 0; // network error
  }
}

async function main() {
  const res = await fetch(`${base}/sitemap.xml`);
  if (res.status !== 200) {
    console.error(`sitemap.xml → ${res.status}`);
    process.exit(1);
  }
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!.trim());
  console.log(`${urls.length} URLs in ${base}/sitemap.xml`);

  const bad: Array<[string, number]> = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < urls.length) {
        const url = urls[i++]!;
        const code = await fetchStatus(url);
        if (code !== 200) bad.push([url, code]);
      }
    })
  );

  for (const [url, code] of bad) console.log(`${code || "ERR"}\t${url}`);
  console.log(bad.length ? `${bad.length} non-200` : "all 200");
  process.exit(bad.length ? 1 : 0);
}

main();
