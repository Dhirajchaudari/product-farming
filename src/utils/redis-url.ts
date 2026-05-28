export function normalizeRedisUrl(raw: string): string {
  let url = raw.trim();

  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1).trim();
  }

  url = url.replace(/%22$/i, "").replace(/"$/, "").trim();

  if (!url.startsWith("redis://") && !url.startsWith("rediss://")) {
    url = `redis://${url.replace(/^\/+/, "")}`;
  }

  return url;
}
