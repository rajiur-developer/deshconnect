// @ts-nocheck
"use client";
import { useRef, useState } from "react";
import { Icon } from "@/components/ui/icons";
export function ImageUpload({
name,
label,
hint,
current, }: {
name: string;
label: string;
hint?: string;
current?: string | null; }) {
const inputRef = useRef<HTMLInputElement>(null);
const [value, setValue] = useState(current ?? "");
const [preview, setPreview] = useState(current ?? "");
const [busy, setBusy] = useState(false);
async function handleFile(file: File) {
if (!file.type.startsWith("image/")) {
alert("Please select an image.");
return;
}
if (file.size > 5 * 1024 * 1024) {
alert("Image is too large (max 5 MB).");
return;
}
 setBusy(true);
 try {
 const dataUrl = await resizeToDataUrl(file);
 if (dataUrl) {
 setValue(dataUrl);
 setPreview(dataUrl);
 } else {
 alert("This image could not be read. Please choose another image.");
 }
 } catch {
 alert("This image could not be read. Please choose another image.");
 } finally {
 setBusy(false);
 }
}
return (
<div>
<p className="mb-1.5 text-sm font-medium text-slate-700">{label}</p>
<input type="hidden" name={name} value={value} />
<div className="flex items-center gap-3">
<button
type="button"
onClick={() => inputRef.current?.click()}
className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-ring"
>
<Icon name="edit" className="h-4 w-4" />
{busy ? "Reading…" : preview ? "Change image" : "Select image"}
</button>
<input
ref={inputRef}
type="file"
accept="image/*"
className="hidden"
onChange={(event) => {
const file = event.target.files?.[0];
if (file) void handleFile(file);
event.target.value = "";
}}
/>
{preview ? (
<img src={preview} alt={label} className="h-16 w-16 rounded-lg border border-slate-200 object-cover" />
) : (
<span className="text-sm text-slate-400">No image selected</span>
)}
{value && (
<button
type="button"
onClick={() => {
setValue("");
setPreview("");
}}
className="text-xs font-medium text-accent-600 hover:underline"
>
Remove
</button>
)}
</div>
{hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
</div>
); }
function resizeToDataUrl(file: File): Promise<string> {
return new Promise((resolve) => {
const url = URL.createObjectURL(file);
const img = new Image();
img.onload = () => {
const max = 1200;
const scale = Math.min(1, max / Math.max(img.width, img.height));
const canvas = document.createElement("canvas");
canvas.width = Math.max(1, Math.round(img.width * scale));
canvas.height = Math.max(1, Math.round(img.height * scale));
const ctx = canvas.getContext("2d");
if (!ctx) {
URL.revokeObjectURL(url);
resolve("");
return;
}
ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
URL.revokeObjectURL(url);
resolve(canvas.toDataURL("image/jpeg", 0.8));
};
img.onerror = () => {
URL.revokeObjectURL(url);
resolve("");
};
img.src = url;
}); }
