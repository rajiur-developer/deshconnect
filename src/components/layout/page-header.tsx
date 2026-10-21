// @ts-nocheck
import type { ReactNode } from "react";
export function PageHeader({
title,
description,
action,
children, }: {
title: string;
description?: string;
action?: ReactNode;
children?: ReactNode; }) {
return (
<section className="border-b border-slate-200 bg-white">
<div className="container-x py-8 sm:py-10">
<div className="flex flex-wrap items-start justify-between gap-4">
<div className="max-w-3xl">
<h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
{description && <p className="mt-2 text-slate-600">{description}</p>}
</div>
{action && <div className="shrink-0">{action}</div>}
</div>
{children && <div className="mt-4">{children}</div>}
</div>
</section>
); }
