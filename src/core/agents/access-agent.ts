import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { memberships, users } from "@/db/schema";
export type Access = {
  userId: string;
  projectId: string;
  role: string;
  permission: string;
  analytics: boolean;
  write: boolean;
};
export async function checkAccess(
  userId: string,
  projectId: string,
): Promise<Access> {
  const [membership] = await getDb()
    .select({ role: users.role, permission: memberships.permission })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(
      and(eq(memberships.userId, userId), eq(memberships.projectId, projectId)),
    );
  if (!membership)
    throw new Error("Access denied: user is not a member of this project.");
  return {
    userId,
    projectId,
    ...membership,
    analytics: ["admin", "analytics", "retail"].includes(membership.role),
    write: membership.permission === "write",
  };
}
export function requireAnalytics(access: Access, dataset: string) {
  if (
    !access.analytics ||
    (access.role === "retail" && dataset.startsWith("demographics"))
  )
    throw new Error("Access denied for dataset");
}
export function requireWrite(access: Access) {
  if (!access.write) throw new Error("Write permission required");
}
