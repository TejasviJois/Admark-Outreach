"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  defaultTemplateId: string | null;
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

type Template = {
  id: string;
  name: string;
  isDefault: boolean;
};

type ProfileSummary = {
  about: string | null;
  services: string[];
  website: string | null;
  status: string;
  profileQualityScore?: number | null;
};

type EmailConnection = {
  configured: boolean;
  provider: string;
  from: string | null;
  missing: string[];
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
  const [templates, setTemplates] = useState<Template[]>([]);
  const [profilesByLeadId, setProfilesByLeadId] = useState<
    Record<string, ProfileSummary>
  >({});
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [defaultTemplateId, setDefaultTemplateId] = useState("");
  const [emailConnection, setEmailConnection] = useState<EmailConnection | null>(
    null,
  );
  const [aiToggle, setAiToggle] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [
        campaignsResponse,
        leadsResponse,
        templatesResponse,
        connectionResponse,
      ] = await Promise.all([
        fetch("/api/v1/campaigns"),
        fetch("/api/v1/leads"),
        fetch("/api/v1/email-templates"),
        fetch("/api/v1/emails/connection"),
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
      const templatesJson = await readJson<{
        success: true;
        data: Template[];
      }>(templatesResponse);
      const connectionJson = await readJson<{
        success: true;
        data: EmailConnection;
      }>(connectionResponse);

      setCampaigns(campaignsJson.data);
      setLeads(leadsJson.data);
      setTemplates(templatesJson.data);
      setEmailConnection(connectionJson.data);

      const completedLeads = leadsJson.data.filter(
        (lead) => lead.researchStatus === "COMPLETED",
      );
      const profileEntries = await Promise.all(
        completedLeads.map(async (lead) => {
          try {
            const response = await fetch(`/api/v1/research/${lead.id}`);
            if (!response.ok) return null;
            const json = await readJson<{
              success: true;
              data: ProfileSummary;
            }>(response);
            return [lead.id, json.data] as const;
          } catch {
            return null;
          }
        }),
      );
      const nextProfiles: Record<string, ProfileSummary> = {};
      for (const entry of profileEntries) {
        if (entry) nextProfiles[entry[0]] = entry[1];
      }
      setProfilesByLeadId(nextProfiles);

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
        body: JSON.stringify({
          name: campaignName,
          defaultTemplateId: defaultTemplateId || null,
        }),
      });
      const json = await readJson<{ success: true; data: Campaign }>(response);
      setCampaignName("");
      setDefaultTemplateId("");
      setSelectedCampaignId(json.data.id);
      setMessage(
        `Campaign created: ${json.data.name}${
          json.data.defaultTemplateId ? " (template assigned)" : " — assign a template before mailing"
        }`,
      );
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
          pipelineResults?: Array<{ sent?: boolean; error?: string }>;
        };
      }>(response);

      const pipeline = json.data.pipelineResults ?? [];
      const sentCount = pipeline.filter((item) => item.sent).length;
      const pipelineErrors = pipeline.filter((item) => item.error).length;

      setMessage(
        `Imported ${json.data.importedCount} lead(s). Pipeline processed ${pipeline.length}. Sent: ${sentCount}. Errors: ${pipelineErrors}. Skipped duplicates: ${json.data.skippedDuplicateCount}.`,
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

  async function handleMailCampaign() {
    if (!selectedCampaignId) {
      setError("Select a campaign first");
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const json = await readJson<{
        success: true;
        data: { results: Array<{ sent?: boolean; error?: string }> };
      }>(
        await fetch("/api/v1/campaigns/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId: selectedCampaignId,
            sendImmediately: true,
          }),
        }),
      );
      const sentCount = json.data.results.filter((item) => item.sent).length;
      setMessage(
        `Campaign mail finished. Processed ${json.data.results.length}, sent ${sentCount}.`,
      );
      await loadData();
    } catch (mailError) {
      setError(
        mailError instanceof Error ? mailError.message : "Mail campaign failed",
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
      const json = await readJson<{
        success: true;
        data: ProfileSummary;
      }>(response);
      setProfilesByLeadId((prev) => ({ ...prev, [leadId]: json.data }));
      setMessage("Lead enriched and email queued from campaign template");
      await loadData();
    } catch (researchError) {
      setError(
        researchError instanceof Error
          ? researchError.message
          : "Enrichment failed",
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
            CSV → crawl (if website) → profile → campaign template → queue → Titan
            SMTP.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-sm">
          <div className="flex gap-3">
            <Link href="/templates" className="text-zinc-600 underline">
              Templates
            </Link>
            <Link href="/" className="text-zinc-600 underline">
              Home
            </Link>
          </div>
          <p
            className={
              emailConnection?.configured
                ? "text-emerald-700"
                : "text-amber-700"
            }
          >
            Email:{" "}
            {emailConnection?.configured
              ? `Connected (${emailConnection.provider}${
                  emailConnection.from ? ` · ${emailConnection.from}` : ""
                })`
              : `Not configured${
                  emailConnection?.missing?.length
                    ? ` — set ${emailConnection.missing.join(", ")}`
                    : ""
                }`}
          </p>
        </div>
      </header>

      <section className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <p className="text-sm font-medium">AI personalization</p>
          <p className="text-xs text-zinc-500">Coming soon — does nothing yet.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={aiToggle}
          onClick={() => setAiToggle((value) => !value)}
          className={`relative h-7 w-12 rounded-full transition ${
            aiToggle ? "bg-zinc-900" : "bg-zinc-300"
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition ${
              aiToggle ? "left-5" : "left-0.5"
            }`}
          />
        </button>
      </section>

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
            placeholder="Campaign name (e.g. Cafe Q3)"
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          />
          <select
            value={defaultTemplateId}
            onChange={(event) => setDefaultTemplateId(event.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">Default template (required to mail)</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
                {template.isDefault ? " (tenant default)" : ""}
              </option>
            ))}
          </select>
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
                {campaign.defaultTemplateId ? "" : " (no template)"}
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
            Required: company_name, email. Optional website triggers crawl.
            Sample: fixtures/sample-leads.csv
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="w-fit rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
            >
              Import & process
            </button>
            <button
              type="button"
              onClick={() => void handleMailCampaign()}
              className="w-fit rounded border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              Mail campaign
            </button>
          </div>
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
            {campaigns.map((campaign) => {
              const templateName = templates.find(
                (template) => template.id === campaign.defaultTemplateId,
              )?.name;
              return (
                <li key={campaign.id} className="border-b border-zinc-200 py-2">
                  <span className="font-medium">{campaign.name}</span>
                  <span className="ml-2 text-zinc-500">{campaign.status}</span>
                  <span className="ml-2 text-zinc-500">
                    · template: {templateName ?? "none"}
                  </span>
                </li>
              );
            })}
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
                  <th className="py-2 pr-4 font-medium">Enrich</th>
                  <th className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const profile = profilesByLeadId[lead.id];
                  const summaryBits = [
                    profile?.profileQualityScore != null
                      ? `Score ${profile.profileQualityScore}`
                      : null,
                    profile?.about
                      ? `${profile.about.slice(0, 80)}${profile.about.length > 80 ? "…" : ""}`
                      : null,
                    profile?.services?.length
                      ? `Services: ${profile.services.slice(0, 3).join(", ")}`
                      : null,
                  ].filter(Boolean);

                  return (
                    <tr
                      key={lead.id}
                      className="border-b border-zinc-100 align-top"
                    >
                      <td className="py-2 pr-4">{lead.companyName}</td>
                      <td className="py-2 pr-4">
                        {[lead.firstName, lead.lastName]
                          .filter(Boolean)
                          .join(" ") || "—"}
                      </td>
                      <td className="py-2 pr-4">{lead.email}</td>
                      <td className="py-2 pr-4">{lead.leadStatus}</td>
                      <td className="py-2 pr-4">
                        <div>{lead.researchStatus}</div>
                        {summaryBits.length > 0 ? (
                          <p className="mt-1 max-w-xs text-xs text-zinc-500">
                            {summaryBits.join(" · ")}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => void handleResearch(lead.id)}
                            className="text-zinc-600 underline"
                          >
                            Process
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
