"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Modal } from "@/components/modal";
import { Panel } from "@/components/panel";
import { useNow } from "@/components/use-now";
import type { CompanyDto, DeliveryDto, NewDeliveryBody } from "@/lib/dto";
import { formatAge } from "@/lib/format";

const CARRIERS = ["DHL", "UPS", "FedEx", "InPost", "DPD", "Poczta Polska"]; // suggestions only; any text is accepted

/** Calls our API (never Salesforce directly). Throws with the server's message on failure. */
async function callApi(router: ReturnType<typeof useRouter>, url: string, method: "POST" | "PATCH", body?: NewDeliveryBody) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body && JSON.stringify(body),
  });
  if (res.status === 401) {
    router.replace("/login"); // session expired
    throw new Error("Session expired");
  }
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `Request failed (${res.status})`);
}

const tile = "rounded border p-3 text-center transition";

export function DeliveriesPanel({
  locationSlug,
  deliveries,
  companies,
  onChanged,
}: {
  locationSlug: string;
  deliveries: DeliveryDto[];
  companies: CompanyDto[];
  onChanged: () => void; // reload Reception so the new state shows immediately
}) {
  const [adding, setAdding] = useState(false);
  const [listing, setListing] = useState(false);

  return (
    <Panel title="Deliveries">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={`${tile} flex flex-col items-center justify-center border-dashed border-zinc-300 hover:border-zinc-500 dark:border-zinc-700 dark:hover:border-zinc-500`}
        >
          <span className="text-3xl font-semibold leading-none">+</span>
          <span className="mt-1 text-xs text-zinc-500">Add delivery</span>
        </button>
        <button
          type="button"
          disabled={deliveries.length === 0}
          onClick={() => setListing(true)}
          className={`${tile} border-zinc-200 enabled:hover:border-zinc-400 dark:border-zinc-800 dark:enabled:hover:border-zinc-600`}
        >
          <span className="block text-3xl font-semibold tabular-nums">{deliveries.length}</span>
          <span className="block text-xs text-zinc-500">deliveries waiting</span>
          {deliveries.length > 0 && <span className="mt-1 block text-xs text-indigo-500">See list</span>}
        </button>
      </div>

      <AddDeliveryDialog open={adding} onClose={() => setAdding(false)} locationSlug={locationSlug} companies={companies} onChanged={onChanged} />
      <WaitingDialog open={listing} onClose={() => setListing(false)} locationSlug={locationSlug} deliveries={deliveries} onChanged={onChanged} />
    </Panel>
  );
}

function AddDeliveryDialog({
  open,
  onClose,
  locationSlug,
  companies,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  locationSlug: string;
  companies: CompanyDto[];
  onChanged: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSaving(true);
    setError(null);
    try {
      await callApi(router, `/api/deliveries?location=${locationSlug}`, "POST", {
        companyId: String(form.get("companyId")),
        carrier: String(form.get("carrier") ?? ""),
      });
      onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the delivery");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add delivery">
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-500">Delivered for</span>
          <select name="companyId" required defaultValue="" className="w-full rounded border border-zinc-300 bg-transparent px-2 py-1.5 dark:border-zinc-700">
            <option value="" disabled>
              Choose a company…
            </option>
            {companies.map((c) => (
              <option key={c.id} value={c.id} className="text-black">
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-500">Carrier (optional)</span>
          <input
            name="carrier"
            list="carriers"
            maxLength={60}
            className="w-full rounded border border-zinc-300 bg-transparent px-2 py-1.5 dark:border-zinc-700"
          />
          <datalist id="carriers">
            {CARRIERS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        {error && (
          <p role="alert" className="rounded bg-amber-50 p-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-zinc-900 px-3 py-1 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {saving ? "Saving…" : "Add delivery"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function WaitingDialog({
  open,
  onClose,
  locationSlug,
  deliveries,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  locationSlug: string;
  deliveries: DeliveryDto[];
  onChanged: () => void;
}) {
  const router = useRouter();
  const now = useNow(60_000);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function collect(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await callApi(router, `/api/deliveries/${id}?location=${locationSlug}`, "PATCH");
      onChanged();
      if (deliveries.length === 1) onClose(); // that was the last one
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the delivery");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Deliveries waiting · ${deliveries.length}`}>
      {error && (
        <p role="alert" className="mb-2 rounded bg-amber-50 p-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {error}
        </p>
      )}
      <ul className="max-h-[70vh] divide-y divide-zinc-200 overflow-auto dark:divide-zinc-800">
        {deliveries.map((d) => (
          <li key={d.id} className="flex items-center gap-3 py-2 text-sm">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{d.company}</span>
              <span className="text-xs text-zinc-500">
                {d.carrier ?? "Carrier not noted"} · waiting {formatAge(Math.max(0, Math.floor((now - Date.parse(d.receivedAt)) / 60_000)))}
              </span>
            </span>
            <button
              type="button"
              disabled={busyId === d.id}
              onClick={() => collect(d.id)}
              className="rounded border border-zinc-300 px-2 py-1 text-xs disabled:opacity-60 dark:border-zinc-700"
            >
              {busyId === d.id ? "…" : "Collected"}
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
