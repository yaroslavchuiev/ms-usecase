import type { LocationDto } from "@/lib/dto";
import type { SfLocation } from "./types";

/** "Kraków" -> "krakow", "Tel Aviv" -> "tel-aviv". Slugs are what group names refer to. */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/gi, "l")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function mapLocation(record: SfLocation): LocationDto {
  return { id: record.Id, slug: slugify(record.Name), name: record.Name, timeZone: record.Time_Zone__c };
}
