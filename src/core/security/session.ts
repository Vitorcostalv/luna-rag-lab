import { createHmac, timingSafeEqual, scryptSync } from "node:crypto";

export function protectedDeployment() {
  return (
    process.env.NODE_ENV === "production" ||
    !!process.env.VERCEL ||
    process.env.PUBLIC_DEMO_MODE === "true"
  );
}
export function snapshotMode() {
  return (
    process.env.LAB_MODE === "snapshot" ||
    (protectedDeployment() && process.env.DATABASE_MODE !== "postgres")
  );
}
export function ownerConfigured() {
  return (
    !snapshotMode() &&
    (process.env.OWNER_AUTH_SECRET?.length || 0) >= 32 &&
    /^[0-9a-f]{32,}:[0-9a-f]{128}$/i.test(process.env.OWNER_PASSWORD_HASH || "")
  );
}
export function signSession(expires = Date.now() + 3600000) {
  const secret = process.env.OWNER_AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Owner authentication unavailable");
  const payload = Buffer.from(
    JSON.stringify({ sub: "admin", exp: expires }),
  ).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}
export function verifySession(token: string | undefined) {
  try {
    if (
      !token ||
      !process.env.OWNER_AUTH_SECRET ||
      process.env.OWNER_AUTH_SECRET.length < 32
    )
      return false;
    const [payload, signature, extra] = token.split(".");
    if (extra || !payload || !signature) return false;
    const expected = createHmac("sha256", process.env.OWNER_AUTH_SECRET)
      .update(payload)
      .digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      return false;
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    return (
      claims.sub === "admin" &&
      Number.isFinite(claims.exp) &&
      claims.exp > Date.now() &&
      claims.exp <= Date.now() + 3600000
    );
  } catch {
    return false;
  }
}
export function ownerSession(request: Request) {
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("luna_owner="))
    ?.slice(11);
  return ownerConfigured() && verifySession(cookie);
}
export function sameOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new Error("Access denied: cross-origin request");
}
export function guardOwner(
  request: Request,
  claimed?: { userId: string; projectId: string },
) {
  if (!protectedDeployment()) return;
  if (!ownerSession(request))
    throw new Error("Access denied: verified owner session required");
  sameOrigin(request);
  if (claimed && (claimed.userId !== "admin" || claimed.projectId !== "demo"))
    throw new Error("Access denied: owner identity mismatch");
}
export function publicReplay(request: Request) {
  return snapshotMode() || (protectedDeployment() && !ownerSession(request));
}
export function verifyPassword(password: string) {
  const [salt, hash] = (process.env.OWNER_PASSWORD_HASH || "").split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex"),
    actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
