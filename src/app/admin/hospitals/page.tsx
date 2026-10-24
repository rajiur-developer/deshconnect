import { InstitutionManager } from "@/components/admin/institution-manager";
import { INSTITUTION_CATEGORIES } from "@/lib/constants";
import { mapDbRow } from "@/lib/db/insforge";
import { firstParam } from "@/lib/query";
import { parsePage } from "@/lib/utils";
import { requireUser } from "@/lib/auth/current-user";
import { insforgeListAdminInstitutions } from "@/services/institutions";
import { getDirectoryLocationOptions } from "@/services/locations";
import type { Institution } from "@/types/content";

export const metadata = { title: "Hospitals" };

export default async function AdminHospitalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = firstParam(params.q)?.trim().slice(0, 100) ?? "";
  const [{ items, meta }, options, user] = await Promise.all([
    insforgeListAdminInstitutions({
      categories: ["hospital", "health-centre"],
      q: query,
      page: parsePage(firstParam(params.page)),
    }),
    getDirectoryLocationOptions(),
    requireUser("/admin/hospitals"),
  ]);
  const categories = INSTITUTION_CATEGORIES.filter(
    (category) => category.value === "hospital" || category.value === "health-centre",
  );

  return (
    <InstitutionManager
      title="Hospitals"
      description="Create and manage hospitals, clinics and health centres."
      isHospital
      records={mapDbRow<Institution[]>(items)}
      adminPath="/admin/hospitals"
      query={query}
      meta={meta}
      categories={categories}
      divisions={options.divisions}
      districts={options.districts}
      upazilas={options.upazilas}
      userId={user.id}
    />
  );
}
