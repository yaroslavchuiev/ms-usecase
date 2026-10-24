import { jsonError } from "@/lib/api";
import { authoriseLocationRequest } from "@/lib/auth/guard";
import { DeliveryInputError, createDelivery } from "@/lib/data/deliveries";
import type { NewDeliveryBody } from "@/lib/dto";

// POST /api/deliveries?location=warsaw   body: { companyId, carrier? }
// Logs a parcel received at reception. Needs the "reception" role for that location.
export async function POST(request: Request) {
  const access = await authoriseLocationRequest(request, "reception");
  if ("error" in access) return access.error;

  if (!request.headers.get("content-type")?.includes("application/json")) return jsonError(415, "Send JSON");
  const body: Partial<NewDeliveryBody> | null = await request.json().catch(() => null);
  if (typeof body?.companyId !== "string" || !/^[a-zA-Z0-9]{15,18}$/.test(body.companyId)) return jsonError(400, "Pick a company");
  if (body.carrier !== undefined && (typeof body.carrier !== "string" || body.carrier.length > 60)) return jsonError(400, "Carrier is too long");

  try {
    const delivery = await createDelivery(access.location, { companyId: body.companyId, carrier: body.carrier });
    return Response.json(delivery, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof DeliveryInputError) return jsonError(error.status, error.message);
    console.error("create delivery failed:", error);
    return jsonError(502, "Salesforce data is temporarily unavailable");
  }
}
