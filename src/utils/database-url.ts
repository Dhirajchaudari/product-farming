export interface ResolvedDatabaseUrl {
  connectionString: string;
  host: string;
  port: number;
  database: string;
}

function appendQueryParam(url: string, key: string, value: string): string {
  const separator = url.includes("?") ? "&" : "?";
  if (new RegExp(`[?&]${key}=`).test(url)) {
    return url;
  }
  return `${url}${separator}${key}=${encodeURIComponent(value)}`;
}

/**
 * Parses postgres URL using the last `@` as credentials/host boundary
 * so passwords may contain `@` only when URL-encoded as `%40`.
 */
export function parsePostgresUrl(raw: string): ResolvedDatabaseUrl {
  const trimmed = raw.trim();
  const protocolMatch = trimmed.match(/^postgres(ql)?:\/\//i);
  if (!protocolMatch) {
    throw new Error("DATABASE_URL must start with postgresql:// or postgres://");
  }

  const rest = trimmed.slice(protocolMatch[0].length);
  const hostBoundary = rest.lastIndexOf("@");
  if (hostBoundary === -1) {
    throw new Error(
      "DATABASE_URL is malformed (missing host). Example: postgresql://USER:PASSWORD@HOST:5432/DATABASE"
    );
  }

  const credentials = rest.slice(0, hostBoundary);
  const hostPart = rest.slice(hostBoundary + 1);

  if (credentials.includes("@")) {
    throw new Error(
      "DATABASE_URL password contains '@'. URL-encode it as %40 (e.g. Pass@123 → Pass%40123)."
    );
  }

  const hostMatch = hostPart.match(/^([^/?#:]+)(?::(\d+))?(\/[^?#]*)?/);
  if (!hostMatch?.[1]) {
    throw new Error("DATABASE_URL is malformed: could not parse database host.");
  }

  const host = hostMatch[1];
  const port = hostMatch[2] ? Number(hostMatch[2]) : 5432;
  const databasePath = hostMatch[3] ?? "/postgres";
  const database = databasePath.replace(/^\//, "").split("?")[0] || "postgres";

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`DATABASE_URL has invalid port: ${hostMatch[2]}`);
  }

  if (host === "base") {
    throw new Error(
      'DATABASE_URL host is "base", which is invalid. Check for a typo, unencoded "@" in the password, or use DATABASE_HOST + DATABASE_USER + DATABASE_PASSWORD instead.'
    );
  }

  let connectionString = trimmed;
  if (host.includes("neon.tech") || host.includes("supabase.co")) {
    connectionString = appendQueryParam(connectionString, "sslmode", "require");
  }
  connectionString = appendQueryParam(connectionString, "connect_timeout", "30");

  return {
    connectionString,
    host,
    port,
    database
  };
}

function buildFromParts(): string | null {
  const host = process.env.DATABASE_HOST?.trim() || process.env.PGHOST?.trim();
  const user = process.env.DATABASE_USER?.trim() || process.env.PGUSER?.trim();
  const password = process.env.DATABASE_PASSWORD ?? process.env.PGPASSWORD ?? "";
  const port = process.env.DATABASE_PORT?.trim() || process.env.PGPORT?.trim() || "5432";
  const database =
    process.env.DATABASE_NAME?.trim() ||
    process.env.PGDATABASE?.trim() ||
    process.env.POSTGRES_DB?.trim();

  if (!host || !user || !database) {
    return null;
  }

  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  return `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`;
}

export function resolveDatabaseUrl(): ResolvedDatabaseUrl {
  const fromParts = buildFromParts();
  const raw = process.env.DATABASE_URL?.trim() || fromParts;
  if (!raw) {
    throw new Error(
      "Missing database config. Set DATABASE_URL or DATABASE_HOST, DATABASE_USER, DATABASE_PASSWORD, and DATABASE_NAME."
    );
  }
  return parsePostgresUrl(raw);
}
