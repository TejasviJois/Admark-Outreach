"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  status: string;
};

type Lead = {
  id: string;
  companyName: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  leadStatus: string;
  researchStatus: string;
  campaignId: string;
};

type ApiError = {
  success: false;
  error: { code: string; message: string };
};

async function readJson<T>(response: Response): Promise<T> {
  const json = (await response.json()) as T | ApiError;
  if (
    typeof json === "object" &&
    json !== null &&
    "success" in json &&
    json.success === false
  ) {
    throw new Error(json.error.message);
  }
  return json as T;
}

export default function LeadsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [campaignsResponse, leadsResponse] = await Promise.all([
        fetch("/api/v1/campaigns"),
        fetch("/api/v1/leads"),
      ]);

      if (campaignsResponse.status === 401 || leadsResponse.status === 401) {
        window.location.href = "/auth/login";
        return;
      }

      const campaignsJson = await readJson<{
        success: true;
        data: Campaign[];
      }>(campaignsResponse);
      const leadsJson = await readJson<{ success: true; data: Lead[] }>(
        leadsResponse,
      );

      setCampaigns(campaignsJson.data);
      setLeads(leadsJson.data);

      if (!selectedCampaignId && campaignsJson.data[0]) {
        setSelectedCampaignId(campaignsJson.data[0].id);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load data",
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedCampaignId]);

  useEffect(() => {
    void loadData();
    // Initial load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/v1/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: campaignName }),
      });
      const json = await readJson<{ success: true; data: Campaign }>(response);
      setCampaignName("");
      setSelectedCampaignId(json.data.id);
      setMessage(`Campaign created: ${json.data.name}`);
      await loadData();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create campaign",
      );
    }
  }

  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];

    if (!selectedCampaignId) {
      setError("Select a campaign first");
      return;
    }

    if (!file) {
      setError("Choose a CSV file");
      return;
    }

    try {
      const body = new FormData();
      body.append("campaignId", selectedCampaignId);
      body.append("file", file);

      const response = await fetch("/api/v1/leads/import", {
        method: "POST",
        body,
      });
      const json = await readJson<{
        success: true;
        data: {
          importedCount: number;
          skippedDuplicateCount: number;
          invalidRowCount: number;
        };
      }>(response);

      setMessage(
        `Imported ${json.data.importedCount} lead(s). Skipped duplicates: ${json.data.skippedDuplicateCount}. Invalid rows: ${json.data.invalidRowCount}.`,
      );
      form.reset();
      await loadData();
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "Failed to import leads",
      );
    }
  }

  async function handleArchive(leadId: string) {
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/v1/leads/${leadId}`, {
        method: "DELETE",
      });
      await readJson(response);
      setMessage("Lead archived");
      await loadData();
    } catch (archiveError) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : "Failed to archive lead",
      );
    }
  }

  async function handleResearch(leadId: string) {
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/research/${leadId}`, {
        method: "POST",
      });
      await readJson(response);
      setMessage("Research generated");
      await loadData();
    } catch (researchError) {
      setError(
        researchError instanceof Error
          ? researchError.message
          : "Research failed",
      );
    }
  }

  async function handleGenerateEmail(leadId: string) {
    setError(null);
    setMessage(null);
    try {
      const generated = await readJson<{
        success: true;
        data: { id: string };
      }>(
        await fetch("/api/v1/emails/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId }),
        }),
      );

      const queued = await readJson<{
        success: true;
        data: { id: string };
      }>(
        await fetch("/api/v1/emails/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ generatedEmailId: generated.data.id }),
        }),
      );

      await readJson(
        await fetch("/api/v1/emails/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ queueId: queued.data.id }),
        }),
      );

      setMessage("Email generated, queued, and sent (or simulated locally)");
      await loadData();
    } catch (emailError) {
      setError(
        emailError instanceof Error ? emailError.message : "Email flow failed",
      );
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">Admark Outreach</p>
          <h1 className="text-3xl font-semibold tracking-tight">Leads</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Create a campaign, import a CSV, and manage leads.
          </p>
        </div>
        <Link href="/" className="text-sm text-zinc-600 underline">
          Home
        </Link>
      </header>

      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      <section className="grid gap-8 md:grid-cols-2">
        <form onSubmit={handleCreateCampaign} className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Create campaign</h2>
          <input
            required
            value={campaignName}
            onChange={(event) => setCampaignName(event.target.value)}
            placeholder="Campaign name"
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="w-fit rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            Create
          </button>
        </form>

        <form onSubmit={handleImport} className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Import CSV</h2>
          <select
            required
            value={selectedCampaignId}
            onChange={(event) => setSelectedCampaignId(event.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Select campaign
            </option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
          <input
            required
            name="file"
            type="file"
            accept=".csv,text/csv"
            className="text-sm"
          />
          <p className="text-xs text-zinc-500">
            Required columns: company_name, email. Sample file:
            fixtures/sample-leads.csv
          </p>
          <button
            type="submit"
            className="w-fit rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            Import
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium">Campaigns</h2>
        {isLoading ? (
          <p className="mt-3 text-sm text-zinc-500">Loading…</p>
        ) : campaigns.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No campaigns yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {campaigns.map((campaign) => (
              <li key={campaign.id} className="border-b border-zinc-200 py-2">
                <span className="font-medium">{campaign.name}</span>
                <span className="ml-2 text-zinc-500">{campaign.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium">Leads</h2>
        {isLoading ? (
          <p className="mt-3 text-sm text-zinc-500">Loading…</p>
        ) : leads.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No leads yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500">
                  <th className="py-2 pr-4 font-medium">Company</th>
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Lead</th>
                  <th className="py-2 pr-4 font-medium">Research</th>
                  <th className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-zinc-100">
                    <td className="py-2 pr-4">{lead.companyName}</td>
                    <td className="py-2 pr-4">
                      {[lead.firstName, lead.lastName].filter(Boolean).join(" ") ||
                        "—"}
                    </td>
                    <td className="py-2 pr-4">{lead.email}</td>
                    <td className="py-2 pr-4">{lead.leadStatus}</td>
                    <td className="py-2 pr-4">{lead.researchStatus}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => void handleResearch(lead.id)}
                          className="text-zinc-600 underline"
                        >
                          Research
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleGenerateEmail(lead.id)}
                          className="text-zinc-600 underline"
                        >
                          Generate+Send
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleArchive(lead.id)}
                          className="text-zinc-600 underline"
                        >
                          Archive
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
