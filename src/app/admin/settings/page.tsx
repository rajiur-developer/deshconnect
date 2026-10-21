// @ts-nocheck
import { getDatabase } from "@/lib/db/store"; import { PageHeader } from "@/components/layout/page-header"; import { SettingsForm } from "@/components/admin/admin-client";
export const metadata = { title: "Admin Settings" };
export default async function AdminSettingsPage() {
const db = await getDatabase();
return (
<>
<PageHeader title="Admin Settings" description="Manage website configuration and administrative settings." />
<SettingsForm
initial={{
siteName: db.settings.siteName,
allowPublicPosts: db.settings.allowPublicPosts,
requireNewsApproval: db.settings.requireNewsApproval,
donorDirectoryEnabled: db.settings.donorDirectoryEnabled,
}}
/>
</>
); }
