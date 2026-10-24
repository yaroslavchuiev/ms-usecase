import "server-only";
import { invalidate } from "@/lib/cache";
import type { DeliveryDto, LocationDto, NewDeliveryBody } from "@/lib/dto";
import { mockActiveContracts } from "@/lib/mock/queries";
import { mockCollectDelivery, mockCreateDelivery } from "@/lib/mock/deliveries";
import { createRecord, updateRecord } from "@/lib/salesforce/client";
import { mapDelivery } from "@/lib/salesforce/mappers";
import { fetchActiveContracts, fetchWaitingDelivery } from "@/lib/salesforce/queries";
import type { SfContract } from "@/lib/salesforce/types";
import { localDateString } from "@/lib/time";
import { isLiveMode } from "./mode";

/** The caller sent something we reject (unknown company, unknown delivery): becomes a 4xx. */
export class DeliveryInputError extends Error {
  constructor(message: string, readonly status: 400 | 404) {
    super(message);
  }
}

const activeContracts = (location: LocationDto, now: Date): Promise<SfContract[]> => {
  const today = localDateString(now, location.timeZone);
  return isLiveMode() ? fetchActiveContracts(location.id, today) : Promise.resolve(mockActiveContracts(location.id, today));
};

// The reception view is cached for 30 s in live mode; after a write, drop it so the change shows at once.
const refreshReception = (location: LocationDto) => invalidate(`reception:${location.id}`);

export async function createDelivery(location: LocationDto, input: NewDeliveryBody, now = new Date()): Promise<DeliveryDto> {
  // Only companies with an active contract at THIS location can receive parcels here.
  const contract = (await activeContracts(location, now)).find((c) => c.AccountId === input.companyId);
  if (!contract) throw new DeliveryInputError("Unknown company for this location", 400);
  const carrier = input.carrier?.trim() || null;

  if (!isLiveMode()) {
    const delivery = mockCreateDelivery(location.id, contract, carrier, now);
    return mapDelivery(delivery);
  }
  const received = now.toISOString();
  const id = await createRecord("Delivery__c", {
    Account__c: contract.AccountId,
    Carrier__c: carrier,
    Received_Time__c: received,
    Status__c: "Waiting",
    Location__c: location.id,
  });
  refreshReception(location);
  return { id, company: contract.Account.Name, carrier, receivedAt: received };
}

export async function collectDelivery(location: LocationDto, deliveryId: string, now = new Date()): Promise<void> {
  if (!isLiveMode()) {
    if (!mockCollectDelivery(location.id, deliveryId, now)) throw new DeliveryInputError("Delivery not found", 404);
    return;
  }
  // Check it is a waiting delivery of THIS location first: an Id alone must not let anyone touch other buildings.
  if (!(await fetchWaitingDelivery(location.id, deliveryId))) throw new DeliveryInputError("Delivery not found", 404);
  await updateRecord("Delivery__c", deliveryId, { Status__c: "Collected", Collected_Time__c: now.toISOString() });
  refreshReception(location);
}
