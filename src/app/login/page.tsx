// @ts-nocheck
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { firstParam } from "@/lib/query"; import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth/current-user";
import { redirect } from "next/navigation";
export const metadata: Metadata = { title: "Login", robots: { index: false, follow: false } };
export default async function LoginPage({
searchParams, }: {
searchParams: Promise<Record<string, string | string[] | undefined>>; }) {
const params = await searchParams;
const next = firstParam(params.next) ?? "/dashboard";
const user = await getCurrentUser();
if (user) redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
const oauthError = firstParam(params.error);
return (
<>
<PageHeader title="Welcome back" description="Log in to your DeshConnect account." />
<div className="container-x flex min-h-[70vh] items-center justify-center py-12">
<div className="w-full max-w-md">
<LoginForm next={next} oauthError={oauthError} />
</div>
</div>
 </>
); }
