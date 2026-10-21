// @ts-nocheck
"use client";
import { useState } from "react";
import type { DistrictOption, LocationOption, UpazilaOption } from "@/components/search/directory-filters";
type Props = {
divisions: LocationOption[];
districts: DistrictOption[];
upazilas: UpazilaOption[];
current: { divisionId?: string; districtId?: string; upazilaId?: string };
required?: boolean; };
/** Dependent Division → District → Upazila selects for forms. */ export function LocationFields({ divisions, districts, upazilas, current, required }: Props) {
const [divisionId, setDivisionId] = useState(current.divisionId ?? "");
const [districtId, setDistrictId] = useState(current.districtId ?? "");
const [upazilaId, setUpazilaId] = useState(current.upazilaId ?? "");
const districtChoices = divisionId ? districts.filter((item) => item.divisionId === divisionId) : districts;
const upazilaChoices = districtId ? upazilas.filter((item) => item.districtId === districtId) : upazilas;
return (
<div className="grid gap-3 sm:grid-cols-3">
<div>
<label htmlFor="divisionId" className="mb-1.5 block text-sm font-medium text-slate-700">
Division{required ? " *" : ""}
</label>
<select
id="divisionId"
name="divisionId"
value={divisionId}
onChange={(event) => {
setDivisionId(event.target.value);
setDistrictId("");
setUpazilaId("");
}}
className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-ring"
>
<option value="">Select division</option>
{divisions.map((division) => (
<option key={division.id} value={division.id}>{division.name}</option>
))}
</select>
</div>
<div>
<label htmlFor="districtId" className="mb-1.5 block text-sm font-medium text-slate-700">District</label>
<select
id="districtId"
name="districtId"
value={districtId}
onChange={(event) => {
setDistrictId(event.target.value);
setUpazilaId("");
}}
className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-ring"
>
<option value="">Select district</option>
{districtChoices.map((district) => (
<option key={district.id} value={district.id}>{district.name}</option>
))}
</select>
</div>
<div>
<label htmlFor="upazilaId" className="mb-1.5 block text-sm font-medium text-slate-700">Upazila</label>
<select
id="upazilaId"
name="upazilaId"
value={upazilaId}
onChange={(event) => setUpazilaId(event.target.value)}
className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-ring"
>
<option value="">Select upazila</option>
{upazilaChoices.map((upazila) => (
<option key={upazila.id} value={upazila.id}>{upazila.name}</option>
))}
</select>
</div>
</div>
); }
