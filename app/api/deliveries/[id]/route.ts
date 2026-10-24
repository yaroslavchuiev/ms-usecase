import { jsonError } from "@/lib/api";
import { authoriseLocationRequest } from "@/lib/auth/guard";
import { DeliveryInputError, collectDelivery } from "@/lib/data/deliveries";

// PATCH /api/deliveries/<id>?location=warsaw
// Marks a waiting delivery as collected. Needs the "reception" role for that location.
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await authoriseLocationRequest(request, "reception");
  if ("error" in access) return access.error;

  const { id } = await context.params;
  if (!/^[a-zA-Z0-9]{15,18}$/.test(id)) return jsonError(404, "Delivery not found");

  try {
    await collectDelivery(access.location, id);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof DeliveryInputError) return jsonError(error.status, error.message);
    console.error("collect delivery failed:", error);
    return jsonError(502, "Salesforce data is temporarily unavailable");
  }
}
