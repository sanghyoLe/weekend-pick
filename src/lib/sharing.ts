import { planSchema, type PlanInput } from "./domain";

// Demo links contain only validated fixture IDs, never user-authored content or secrets.
export function encodeDemoPlan(plan: PlanInput): string {
  return `d.${Buffer.from(JSON.stringify(planSchema.parse(plan))).toString("base64url")}`;
}
export function decodeDemoPlan(id: string): PlanInput | null {
  if (!/^d\.[A-Za-z0-9_-]{1,700}$/.test(id)) return null;
  try { return planSchema.parse(JSON.parse(Buffer.from(id.slice(2), "base64url").toString("utf8"))); } catch { return null; }
}
