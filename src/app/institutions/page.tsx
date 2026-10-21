// @ts-nocheck
import type { Metadata } from "next";
import { INSTITUTION_CATEGORIES } from "@/lib/constants"; import { buildHref, firstParam, parseSort } from "@/lib/query"; import { parsePage } from "@/lib/utils"; import { getDirectoryLocationOptions } from "@/services/locations"; import { listInstitutions } from "@/services/institutions"; import { DirectoryFilters } from "@/components/search/directory-filters"; import { InstitutionCard } from "@/components/cards/institution-card"; import { EmptyState } from "@/components/ui/empty-state"; import { Pagination } from "@/components/ui/pagination"; import { PageBanner } from "@/components/layout/page-banner"; import { ListGrid } from "@/components/layout/list-grid"; import { Icon } from "@/components/ui/icons";
export const metadata: Metadata = { title: "Institutions" };
export default async function InstitutionsPage({
searchParams, }: {
searchParams: Promise<Record<string, string | string[] | undefined>>; }) {
const params = await searchParams;
const divisionId = firstParam(params.divisionId);
const districtId = firstParam(params.districtId);
const upazilaId = firstParam(params.upazilaId);
const query = {
q: firstParam(params.q),
divisionId,
districtId,
upazilaId,
category: firstParam(params.category),
sort: parseSort(params.sort),
page: parsePage(firstParam(params.page)),
};
const [{ items, meta }, options] = await Promise.all([
listInstitutions(query),
getDirectoryLocationOptions(),
]);
return (
<>
<PageBanner
title="Institutions"
description="Schools, colleges, madrasahs and other institutions across Bangladesh."
media="/images/banner/Collage.webp"
/>
<div className="container-x py-8">
<DirectoryFilters
action="/institutions"
params={params}
divisions={options.divisions}
districts={options.districts}
upazilas={options.upazilas}
categories={INSTITUTION_CATEGORIES.map((category) => ({ value: category.value, label: category.label }))}
showCategory
sortOptions={["relevance", "name", "newest"]}
current={{ divisionId, districtId, upazilaId }}
/>
<p className="mt-6 text-sm text-slate-500">{meta.total} records found</p>
{items.length ? (
<ListGrid className="mt-4">
{items.map((institution) => (
<InstitutionCard key={institution.id} institution={institution} />
))}
</ListGrid>
) : (
<EmptyState title="No institutions match your filters" icon={<Icon name="book" className="h-10 w-10" />} />
)}
<Pagination meta={meta} hrefFor={(page) => buildHref("/institutions", params, { page })} />
</div>
</>
); }
