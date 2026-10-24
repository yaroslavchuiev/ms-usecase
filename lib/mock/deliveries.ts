import type { SfContract, SfDelivery } from "@/lib/salesforce/types";
import { getMockDataset } from "./index";
import { createIdFactory, record, ref, sfDateTime } from "./helpers";

// Deliveries are the one thing users can change, so unlike the regenerated fixtures they live in a
// mutable in-memory store. It starts from the fixtures and then keeps every add / collect.
// Mock mode only: it is per server instance and resets on restart (real data lives in Salesforce).

let store: SfDelivery[] | null = null;
const newId = createIdFactory(10_000); // continue after the fixture IDs, never repeat them
let number = 10_000;

function all(): SfDelivery[] {
  return (store ??= [...getMockDataset().deliveries.records]);
}

export function mockWaitingDeliveries(locationId: string): SfDelivery[] {
  return all().filter((d) => d.Location__c === locationId && d.Status__c === "Waiting");
}

export function mockCreateDelivery(locationId: string, contract: SfContract, carrier: string | null, now: Date): SfDelivery {
  const delivery = record("Delivery__c", newId("a06"), {
    Name: `DL-${String(++number).padStart(7, "0")}`,
    Account__c: contract.AccountId,
    Account__r: ref("Account", contract.AccountId, { Name: contract.Account.Name }),
    Carrier__c: carrier,
    Received_Time__c: sfDateTime(now),
    Collected_Time__c: null,
    Status__c: "Waiting" as const,
    Location__c: locationId,
  });
  all().push(delivery);
  return delivery;
}

/** Returns false if there is no waiting delivery with this id at this location. */
export function mockCollectDelivery(locationId: string, id: string, now: Date): boolean {
  const delivery = mockWaitingDeliveries(locationId).find((d) => d.Id === id);
  if (!delivery) return false;
  delivery.Status__c = "Collected";
  delivery.Collected_Time__c = sfDateTime(now);
  return true;
}
