// @ts-nocheck
import type { Metadata } from "next"; import Link from "next/link"; import { notFound } from "next/navigation"; import { EmptyRecordPage } from "@/components/layout/empty-record-page";
import { getHospitalBySlug } from "@/services/institutions"; import { InstitutionDetail } from "@/components/institutions/institution-detail";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
const { slug } = await params;
const hospital = await getHospitalBySlug(slug);
if (!hospital) return { title: "Hospital not found" };
return { title: hospital.name, description: hospital.description, alternates: { canonical: `/hospitals/${hospital.slug}` } }; }
export default async function HospitalDetailPage({ params }: Props) {
const { slug } = await params;
const hospital = await getHospitalBySlug(slug);
if (!hospital) return <EmptyRecordPage title="Hospitals and health centres" description="Find hospitals and health services near you." media="/images/banner/Hospital.webp" backHref="/hospitals" backLabel="Browse hospitals" />;
return (
<div className="container-x py-8">
<InstitutionDetail institution={hospital} />
<div className="mt-8">
<Link href="/hospitals" className="text-sm font-medium text-brand-700">← Back to hospitals</Link>
</div>
</div>
); }
