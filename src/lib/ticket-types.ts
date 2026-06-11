// Convention: distinguish Admin intake type via notes prefix
// (UI-only — no schema change needed)
export const CLAIM_MARKER  = "[CLAIM]";
export const RETURN_MARKER = "[RETURN]";

export type TicketIntakeType = "CLAIM" | "RETURN";

export function buildIntakeNotes(type: TicketIntakeType, extra: string) {
  const marker = type === "CLAIM" ? CLAIM_MARKER : RETURN_MARKER;
  return `${marker}\n${extra}`.trim();
}

export function getIntakeType(notes: string | null | undefined): TicketIntakeType | null {
  if (!notes) return null;
  if (notes.startsWith(CLAIM_MARKER))  return "CLAIM";
  if (notes.startsWith(RETURN_MARKER)) return "RETURN";
  return null;
}

export function stripIntakeMarker(notes: string | null | undefined): string {
  if (!notes) return "";
  return notes.replace(/^\[(CLAIM|RETURN)\]\s*\n?/, "");
}
