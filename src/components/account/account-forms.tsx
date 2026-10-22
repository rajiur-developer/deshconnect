// @ts-nocheck
"use client";
import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { getInsForgeBrowserClient } from "@/lib/insforge-browser";
import { sendMessageAction, updateProfileAction, type AccountFormState } from "@/features/account/actions"; import { PROFILE_IMAGE_BUCKET, PROFILE_IMAGE_MAX_BYTES, PROFILE_IMAGE_TYPES } from "@/features/account/constants"; import { Button } from "@/components/ui/button"; import { Field, Input, Textarea } from "@/components/ui/input"; import { LocationFields } from "@/components/forms/location-fields"; import { useFormStateToast } from "@/components/ui/toast"; import type { DistrictOption, LocationOption, UpazilaOption } from "@/components/search/directory-filters";
import { Spinner } from "@/components/ui/spinner";
type LocationProps = {
divisions: LocationOption[];
districts: DistrictOption[];
upazilas: UpazilaOption[]; };
type ProfileProps = LocationProps & {
userId: string;
initial: {
fullName: string;
bio?: string;
phone?: string;
avatar?: string;
divisionId?: string;
districtId?: string;
upazilaId?: string;
}; };
export function ProfileEditForm({ userId, divisions, districts, upazilas, initial }: ProfileProps) {
const [state, formAction, pending] = useActionState<AccountFormState, FormData>(updateProfileAction, {});
const [uploading, setUploading] = useState(false);
const [uploadError, setUploadError] = useState("");
const [preview, setPreview] = useState(initial.avatar ?? "");
const formRef = useRef<HTMLFormElement>(null);
const fileRef = useRef<HTMLInputElement>(null);
const avatarUrlRef = useRef<HTMLInputElement>(null);
const avatarKeyRef = useRef<HTMLInputElement>(null);
const avatarMimeRef = useRef<HTMLInputElement>(null);
const avatarSizeRef = useRef<HTMLInputElement>(null);
const submitAfterUpload = useRef(false);
const uploadInProgress = useRef(false);
useFormStateToast(state);
useEffect(() => { setPreview(initial.avatar ?? ""); }, [initial.avatar]);
function safeFilename(name: string) { return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-100) || "profile-image"; }
async function handleSubmit(event: FormEvent<HTMLFormElement>) {
if (submitAfterUpload.current) { submitAfterUpload.current = false; return; }
const file = fileRef.current?.files?.[0];
if (!file) return;
event.preventDefault();
if (uploadInProgress.current) return;
setUploadError("");
if (!PROFILE_IMAGE_TYPES.includes(file.type as (typeof PROFILE_IMAGE_TYPES)[number])) { setUploadError("Choose a JPG, JPEG, or PNG image."); return; }
if (file.size < 1 || file.size > PROFILE_IMAGE_MAX_BYTES) { setUploadError("The image must be 5 MB or smaller."); return; }
uploadInProgress.current = true;
setUploading(true);
try {
const client = getInsForgeBrowserClient();
const key = `${userId}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
const { data, error } = await client.storage.from(PROFILE_IMAGE_BUCKET).upload(key, file);
if (error || !data?.url || !data?.key) { setUploadError("Image upload failed. Please try again."); return; }
if (avatarUrlRef.current) avatarUrlRef.current.value = data.url;
if (avatarKeyRef.current) avatarKeyRef.current.value = data.key;
if (avatarMimeRef.current) avatarMimeRef.current.value = file.type;
if (avatarSizeRef.current) avatarSizeRef.current.value = String(file.size);
setPreview(URL.createObjectURL(file));
if (fileRef.current) fileRef.current.value = "";
submitAfterUpload.current = true;
formRef.current?.requestSubmit();
} catch { setUploadError("Image upload failed. Please try again."); }
finally { uploadInProgress.current = false; setUploading(false); }
}
return (
<form ref={formRef} action={formAction} onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
<div className="grid gap-4 sm:grid-cols-2">
<Field label="Full name" htmlFor="fullName" required>
<Input id="fullName" name="fullName" defaultValue={initial.fullName} required />
</Field>
<Field label="Phone" htmlFor="phone" hint="Optional">
<Input id="phone" name="phone" defaultValue={initial.phone ?? ""} placeholder="01712345678" />
</Field>
</div>
<Field label="Bio" htmlFor="bio" hint="Optional">
<Textarea id="bio" name="bio" defaultValue={initial.bio ?? ""} />
</Field>
<div>
<p className="mb-1.5 text-sm font-medium text-slate-700">Profile picture</p>
<div className="flex items-center gap-4">
{preview && <img src={preview} alt="Profile picture preview" className="h-14 w-14 rounded-full border border-slate-200 object-cover" />}
<input ref={fileRef} id="profile-picture" name="profile-picture" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:font-medium file:text-brand-700 hover:file:bg-brand-100" />
</div>
<p className="mt-1 text-xs text-slate-500">JPG, JPEG, or PNG · max 5 MB.</p>
</div>
<input ref={avatarUrlRef} type="hidden" name="avatar" />
<input ref={avatarKeyRef} type="hidden" name="avatar_key" />
<input ref={avatarMimeRef} type="hidden" name="avatar_mime_type" />
<input ref={avatarSizeRef} type="hidden" name="avatar_size" />
<LocationFields
divisions={divisions}
districts={districts}
upazilas={upazilas}
current={{
divisionId: initial.divisionId,
districtId: initial.districtId,
upazilaId: initial.upazilaId,
}}
/>
{(state.error || uploadError) && <p role="alert" className="text-sm text-accent-600">{uploadError || state.error}</p>}
{state.success && <p role="status" className="text-sm text-emerald-600">{state.success}</p>}
<Button type="submit" disabled={pending || uploading}>{uploading ? "Uploading…" : pending ? "Saving…" : "Save changes"}</Button>
</form>
); }
export function MessageForm({ conversationId, viewerId, onMessageSent }: { conversationId: string; viewerId: string; onMessageSent?: (message: { id: string; conversationId: string; senderId: string; body: string; attachmentKey: string | null; attachmentUrl: string | null; attachmentMimeType: string | null; attachmentType: "image" | "audio" | null; createdAt: string; readBy: string[] }) => void }) {
const [body, setBody] = useState("");
const [file, setFile] = useState<File | null>(null);
const [pending, setPending] = useState(false);
const [recording, setRecording] = useState(false);
const [error, setError] = useState("");
const [replyingTo, setReplyingTo] = useState<{ messageId: string; senderName: string; body: string } | null>(null);
const imageRef = useRef<HTMLInputElement>(null);
const audioRef = useRef<HTMLInputElement>(null);
const recorderRef = useRef<MediaRecorder | null>(null);
const streamRef = useRef<MediaStream | null>(null);
const MAX_CHAT_MEDIA_BYTES = 5 * 1024 * 1024;
useEffect(() => () => {
const recorder = recorderRef.current;
if (recorder && recorder.state !== "inactive") { recorder.onstop = null; recorder.stop(); }
streamRef.current?.getTracks().forEach((track) => track.stop());
}, []);
useEffect(() => {
const handleReply = (event: Event) => {
const detail = (event as CustomEvent<{ conversationId: string; messageId: string; senderName: string; body: string }>).detail;
if (detail?.conversationId !== conversationId) return;
setReplyingTo({ messageId: detail.messageId, senderName: detail.senderName, body: detail.body });
setBody("");
setError("");
};
window.addEventListener("chat-reply-requested", handleReply);
return () => window.removeEventListener("chat-reply-requested", handleReply);
}, [conversationId]);
async function toggleVoiceRecording() {
setError("");
if (recording) { recorderRef.current?.stop(); return; }
if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
setError("Voice recording is not supported in this browser. Choose an audio recording instead."); return;
}
try {
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
streamRef.current = stream;
const recorder = new MediaRecorder(stream);
recorderRef.current = recorder;
const chunks: BlobPart[] = [];
recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
recorder.onstop = () => {
const mimeType = recorder.mimeType || "audio/webm";
const blob = new Blob(chunks, { type: mimeType });
const extension = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm";
setFile(new File([blob], `voice-message.${extension}`, { type: mimeType }));
if (imageRef.current) imageRef.current.value = "";
if (audioRef.current) audioRef.current.value = "";
stream.getTracks().forEach((track) => track.stop());
streamRef.current = null; setRecording(false);
};
recorder.start(); setFile(null); setRecording(true);
if (imageRef.current) imageRef.current.value = "";
if (audioRef.current) audioRef.current.value = "";
} catch { setError("Microphone access was not available. Allow microphone access or choose an audio recording."); }
}
async function submitMessage(event: FormEvent<HTMLFormElement>) {
event.preventDefault();
if (pending) return;
if (!body.trim() && !file) return;
const messageBody = body.trim();
const selectedFile = file;
const replyToMessageId = replyingTo?.messageId ?? null;
const optimisticId = crypto.randomUUID();
const optimisticMime = selectedFile?.type.toLowerCase().split(";")[0] ?? "";
const optimisticType = optimisticMime.startsWith("image/") ? "image" : optimisticMime.startsWith("audio/") ? "audio" : null;
window.dispatchEvent(new CustomEvent("chat-message-optimistic", { detail: {
id: optimisticId, conversationId, senderId: viewerId, body: messageBody, readBy: [viewerId], deliveredTo: [],
attachmentKey: null, attachmentUrl: null, attachmentMimeType: optimisticMime || null, attachmentType: optimisticType,
replyToMessageId, reactions: [], createdAt: new Date().toISOString(), deliveryState: "sending",
optimisticAttachmentType: optimisticType,
} }));
setBody("");
setFile(null);
setReplyingTo(null);
if (imageRef.current) imageRef.current.value = "";
if (audioRef.current) audioRef.current.value = "";
setPending(true); setError("");
let uploadedKey: string | undefined;
try {
let attachment: { key: string; url: string; mimeType: string; type: "image" | "audio" } | undefined;
if (selectedFile) {
if (selectedFile.size < 1 || selectedFile.size > MAX_CHAT_MEDIA_BYTES) throw new Error("Images and voice messages must be 5 MB or smaller.");
const mimeType = selectedFile.type.toLowerCase().split(";")[0];
const type = mimeType.startsWith("image/") ? "image" : mimeType.startsWith("audio/") ? "audio" : null;
const allowed = new Set(["image/jpeg", "image/png", "image/webp", "audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav", "audio/aac", "audio/x-wav"]);
if (!type || !allowed.has(mimeType)) throw new Error("Choose an image or audio recording. Other file types are not supported.");
const extension = selectedFile.name.split(".").pop()?.toLowerCase() || (type === "image" ? "jpg" : "webm");
const key = `${viewerId}/${conversationId}/${crypto.randomUUID()}.${extension}`;
const client = getInsForgeBrowserClient();
const { data: upload, error: uploadError } = await client.storage.from("chat-media").upload(key, selectedFile);
if (uploadError) throw new Error(uploadError.message || "The attachment could not be uploaded. Check your connection and try again.");
uploadedKey = key;
if (!upload?.url) throw new Error("The attachment uploaded, but its link could not be saved. Please try again.");
attachment = { key, url: upload.url, mimeType, type };
}
const result = await sendMessageAction(conversationId, messageBody, attachment, replyToMessageId);
if (!result.ok) {
if (uploadedKey) await getInsForgeBrowserClient().storage.from("chat-media").remove(uploadedKey);
uploadedKey = undefined;
throw new Error(result.error || "The message could not be sent.");
}
uploadedKey = undefined;
if (!result.message) throw new Error("The message was sent, but its delivery status could not be confirmed.");
onMessageSent?.(result.message);
window.dispatchEvent(new CustomEvent("chat-message-sent", { detail: { ...result.message, clientMessageId: optimisticId } }));
uploadedKey = undefined;
} catch (cause) {
if (uploadedKey) await getInsForgeBrowserClient().storage.from("chat-media").remove(uploadedKey);
const message = cause instanceof Error ? cause.message : "The message could not be sent. Please try again.";
window.dispatchEvent(new CustomEvent("chat-message-send-failed", { detail: { id: optimisticId, conversationId } }));
setBody((current) => current || messageBody);
if (selectedFile) setFile(selectedFile);
if (replyToMessageId && replyingTo) setReplyingTo(replyingTo);
setError(message);
} finally { setPending(false); }
}
return (
<form onSubmit={submitMessage} className={`space-y-2 rounded-lg ${error ? "motion-error" : ""}`}>
{replyingTo && <div className="flex items-start justify-between gap-3 rounded-lg border-l-2 border-brand-500 bg-brand-50 px-3 py-2 text-xs text-slate-600"><p className="min-w-0"><span className="font-semibold text-slate-800">Replying to {replyingTo.senderName}</span><br /><span className="block truncate">{replyingTo.body}</span></p><button type="button" onClick={() => setReplyingTo(null)} className="shrink-0 text-slate-500 underline">Cancel</button></div>}
<div className="flex gap-2">
<Input value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a message…" aria-label="Message" className="flex-1" maxLength={2000} disabled={pending} />
<Button type="submit" disabled={pending || (!body.trim() && !file)} aria-busy={pending}>{pending && <Spinner />}{pending ? "Sending…" : "Send"}</Button>
</div>
<div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
<label className={`cursor-pointer hover:text-brand-700 ${pending ? "pointer-events-none opacity-60" : ""}`}>Image<input ref={imageRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={pending} onChange={(event) => { const selected = event.target.files?.[0] ?? null; setFile(selected); if (selected && audioRef.current) audioRef.current.value = ""; }} /></label>
<label className={`cursor-pointer hover:text-brand-700 ${pending ? "pointer-events-none opacity-60" : ""}`}>Choose voice<input ref={audioRef} type="file" accept="audio/*" className="sr-only" disabled={pending} onChange={(event) => { const selected = event.target.files?.[0] ?? null; setFile(selected); if (selected && imageRef.current) imageRef.current.value = ""; }} /></label>
<button type="button" onClick={toggleVoiceRecording} disabled={pending} className="font-medium text-brand-700 hover:text-brand-900 disabled:opacity-60">{recording ? "Stop recording" : "Record voice"}</button>
{file && <span className="max-w-48 truncate text-slate-500">{file.name}</span>}
<span className="text-slate-400">Image or voice · max 5 MB</span>
</div>
{error && <p role="alert" className="text-xs text-accent-600">{error}</p>}
</form>
); }
