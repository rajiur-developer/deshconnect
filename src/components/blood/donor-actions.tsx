// @ts-nocheck
"use client";
import { useState, useTransition } from "react";
import { cancelBloodRequestAction } from "@/features/blood/actions";
export function CancelRequestButton({ requestId }: { requestId: string }) {
const [cancelled, setCancelled] = useState(false);
const [pending, startTransition] = useTransition();
if (cancelled) {
return <span className="text-xs text-slate-500">Request cancelled.</span>;
}
return (
<button
type="button"
disabled={pending}
onClick={() =>
startTransition(async () => {
const result = await cancelBloodRequestAction(requestId);
if (result.cancelled) setCancelled(true);
})
}
className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
>
Cancel request
</button>
); }
