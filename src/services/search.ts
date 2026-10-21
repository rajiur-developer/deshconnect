// @ts-nocheck
import type { Business, GovernmentService, Institution, News, Place } from "@/types/content"; import type { Post } from "@/types/community";
import { getDatabase } from "@/lib/db/store";
export type GlobalSearchResults = {
places: Place[];
institutions: Institution[];
businesses: Business[];
governmentServices: GovernmentService[];
news: News[];
posts: Post[]; };
/** Build the set of lowercase needles to match against. */ function buildNeedles(query: string): string[] {
const base = query.trim().toLowerCase();
return base ? [base] : []; }
function matches(haystack: string[], needles: string[]): boolean {
return haystack.some((field) => {
const value = field.toLowerCase();
return needles.some((needle) => value.includes(needle));
}); }
/** Categorised global search across the public directories. */ export async function globalSearch(query: string, limit = 4): Promise<GlobalSearchResults> {
const needles = buildNeedles(query);
if (!needles.length) {
return { places: [], institutions: [], businesses: [], governmentServices: [], news: [], posts: [] };
}
const db = await getDatabase();
return {
places: db.places
.filter((item) => item.status === "published" && matches([item.name, item.summary, item.description, item.address, item.category], needles))
.slice(0, limit),
institutions: db.institutions
.filter((item) => item.status === "published" && matches([item.name, item.description, item.address, item.category], needles))
.slice(0, limit),
businesses: db.businesses
.filter((item) => item.status === "published" && matches([item.name, item.description, item.address, item.category], needles))
.slice(0, limit),
governmentServices: db.governmentServices
.filter((item) => item.status === "published" && matches([item.name, item.description, item.officeAddress, item.category], needles))
.slice(0, limit),
news: db.news
.filter((item) => item.status === "published" && matches([item.title, item.excerpt, item.category], needles))
.slice(0, limit),
posts: db.posts
.filter((item) => item.status === "visible" && matches([item.body], needles))
.slice(0, limit),
}; }
