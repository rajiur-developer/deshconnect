// @ts-nocheck
import type { AuditLog } from "@/types/admin";
import { getDatabase, saveDatabase } from "@/lib/db/store"; import { createId } from "@/lib/utils";
export async function recordAudit(input: {
actorId: string;
actorName: string;
action: string;
entity: string;
entityId: string;
outcome: AuditLog["outcome"];
detail?: string; }): Promise<void> {
await saveDatabase((db) => {
db.auditLogs.push({
id: createId("aud"),
actorId: input.actorId,
actorName: input.actorName,
action: input.action,
entity: input.entity,
entityId: input.entityId,
outcome: input.outcome,
detail: input.detail ?? null,
createdAt: new Date().toISOString(),
});
}); }
export async function listAuditLogs(limit = 100): Promise<AuditLog[]> {
const db = await getDatabase();
return db.auditLogs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit); }
