"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import {
  SparklesIcon,
  UploadIcon,
  PlusIcon,
  MailIcon,
  TrashIcon,
  SpinnerIcon,
  CheckIcon,
  InfoIcon,
  HomeIcon,
  CopyIcon,
} from "../components/Icons";

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
  subjectTemplate: string;
  bodyTemplate: string;
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

const PLACEHOLDERS = [
  "{{company_name}}",
  "{{first_name}}",
  "{{industry}}",
  "{{location}}",
  "{{service_1}}",
  "{{service_2}}",
];

export default function LeadsPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [profilesByLeadId, setProfilesByLeadId] = useState<
    Record<string, ProfileSummary>
  >({});
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [emailConnection, setEmailConnection] = useState<EmailConnection | null>(
    null,
  );
  
  // App Messages
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Filters
  const [filterCampaignId, setFilterCampaignId] = useState<string>("ALL");

  // Create Campaign Wizard states
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardName, setWizardName] = useState("");
  const [wizardIndustry, setWizardIndustry] = useState("Technology");
  const [wizardCountry, setWizardCountry] = useState("United States");
  const [wizardSenderEmail, setWizardSenderEmail] = useState("");
  const [wizardTemplateId, setWizardTemplateId] = useState("");
  const [wizardFile, setWizardFile] = useState<File | null>(null);
  const [enrichmentProgress, setEnrichmentProgress] = useState(0);
  const [enrichmentStage, setEnrichmentStage] = useState("Idle");
  
  // Template Editor State
  const [tempId, setTempId] = useState<string | null>(null);
  const [tempName, setTempName] = useState("");
  const [tempSubject, setTempSubject] = useState("Quick idea for {{company_name}}");
  const [tempBody, setTempBody] = useState(
    "Hi {{first_name}},\n\nI noticed {{company_name}} in {{location}} and your work on {{service_1}}.\n\nOpen to a short chat?\n\nBest,\nAdmark",
  );
  const [tempIsDefault, setTempIsDefault] = useState(false);

  // Replies states
  const [selectedReplyId, setSelectedReplyId] = useState<string | null>("reply-1");
  const [replyFilter, setReplyFilter] = useState("all");
  
  // Load data
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

      const campaignsJson = await readJson<{ success: true; data: Campaign[] }>(
        campaignsResponse,
      );
      const leadsJson = await readJson<{ success: true; data: Lead[] }>(
        leadsResponse,
      );
      const templatesJson = await readJson<{ success: true; data: Template[] }>(
        templatesResponse,
      );
      const connectionJson = await readJson<{ success: true; data: EmailConnection }>(
        connectionResponse,
      );

      setCampaigns(campaignsJson.data);
      setLeads(leadsJson.data);
      setTemplates(templatesJson.data);
      setEmailConnection(connectionJson.data);

      if (connectionJson.data?.from) {
        setWizardSenderEmail(connectionJson.data.from);
      }

      const completedLeads = leadsJson.data.filter(
        (lead) => lead.researchStatus === "COMPLETED",
      );
      const profileEntries = await Promise.all(
        completedLeads.map(async (lead) => {
          try {
            const response = await fetch(`/api/v1/research/${lead.id}`);
            if (!response.ok) return null;
            const json = await readJson<{ success: true; data: ProfileSummary }>(
              response,
            );
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

  // Action methods
  const triggerCreateCampaign = async () => {
    setActionLoadingId("create-camp");
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: wizardName,
          defaultTemplateId: wizardTemplateId || null,
        }),
      });
      const json = await readJson<{ success: true; data: Campaign }>(response);
      return json.data;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create campaign");
      throw e;
    } finally {
      setActionLoadingId(null);
    }
  };

  const triggerImportLeads = async (campaignId: string) => {
    if (!wizardFile) return;
    setActionLoadingId("import-leads");
    try {
      const body = new FormData();
      body.append("campaignId", campaignId);
      body.append("file", wizardFile);

      const response = await fetch("/api/v1/leads/import", {
        method: "POST",
        body,
      });
      const json = await readJson<{
        success: true;
        data: { importedCount: number };
      }>(response);
      return json.data.importedCount;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to import CSV");
      throw e;
    } finally {
      setActionLoadingId(null);
    }
  };

  const triggerEnrichment = async (campaignId: string) => {
    // Simulate Enrichment visual stages
    const stages = [
      { text: "Crawling Website Metadata...", progress: 20 },
      { text: "Extracting Company About Section...", progress: 40 },
      { text: "Extracting Services Offered...", progress: 60 },
      { text: "Extracting Team & Contact Info...", progress: 85 },
      { text: "Building Company Profile Summary...", progress: 100 },
    ];

    for (const stage of stages) {
      setEnrichmentStage(stage.text);
      setEnrichmentProgress(stage.progress);
      await new Promise((r) => setTimeout(r, 900));
    }
    setEnrichmentStage("Completed");
  };

  const executeWizardQueue = async () => {
    try {
      // Step 1: Create Campaign
      const campaign = await triggerCreateCampaign();
      
      // Step 2: Upload CSV
      if (wizardFile) {
        await triggerImportLeads(campaign.id);
      }
      
      // Step 3: Run Enrichment Animation
      setWizardStep(3);
      await triggerEnrichment(campaign.id);
      
      // Step 4: Template Preview
      setWizardStep(4);
    } catch {
      // handled in try/catch bounds
    }
  };

  const finalizeWizard = async () => {
    setActionLoadingId("finalize");
    try {
      setMessage("Campaign successfully configured and leads queued for outreach!");
      resetWizard();
      await loadData();
      setActiveTab("dashboard");
    } finally {
      setActionLoadingId(null);
    }
  };

  const resetWizard = () => {
    setWizardStep(1);
    setWizardName("");
    setWizardFile(null);
    setEnrichmentProgress(0);
    setEnrichmentStage("Idle");
  };

  // Template handlers
  const handleTemplateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setActionLoadingId("save-template");
    try {
      if (tempId) {
        await readJson(
          await fetch(`/api/v1/email-templates/${tempId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: tempName,
              subjectTemplate: tempSubject,
              bodyTemplate: tempBody,
              isDefault: tempIsDefault,
            }),
          }),
        );
        setMessage("Template updated");
      } else {
        await readJson(
          await fetch("/api/v1/email-templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: tempName,
              subjectTemplate: tempSubject,
              bodyTemplate: tempBody,
              isDefault: tempIsDefault,
            }),
          }),
        );
        setMessage("Template created");
      }
      setTempId(null);
      setTempName("");
      setTempSubject("Quick idea for {{company_name}}");
      setTempBody(
        "Hi {{first_name}},\n\nI noticed {{company_name}} in {{location}} and your work on {{service_1}}.\n\nOpen to a short chat?\n\nBest,\nAdmark",
      );
      setTempIsDefault(false);
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleTemplateDelete = async (id: string) => {
    setError(null);
    setActionLoadingId(`delete-${id}`);
    try {
      await readJson(
        await fetch(`/api/v1/email-templates/${id}`, {
          method: "DELETE",
        }),
      );
      setMessage("Template deleted");
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Delete failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const startEdit = (template: Template) => {
    setTempId(template.id);
    setTempName(template.name);
    setTempSubject(template.subjectTemplate);
    setTempBody(template.bodyTemplate);
    setTempIsDefault(template.isDefault);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Email Queue actions
  const triggerSendImmediately = async () => {
    if (!selectedCampaignId) {
      setError("Please select a target campaign first");
      return;
    }
    setActionLoadingId("send-mail");
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
      const sent = json.data.results.filter((item) => item.sent).length;
      setMessage(`Outbox processing complete. Processed ${json.data.results.length} email(s), successfully sent ${sent}.`);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Campaign process failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const triggerLeadArchive = async (leadId: string) => {
    setError(null);
    setActionLoadingId(`archive-${leadId}`);
    try {
      await fetch(`/api/v1/leads/${leadId}`, {
        method: "DELETE",
      });
      setMessage("Lead archived successfully");
      await loadData();
    } catch {
      setError("Failed to archive lead");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filters & Counts
  const filteredLeads = leads.filter((lead) => {
    if (filterCampaignId === "ALL") return true;
    return lead.campaignId === filterCampaignId;
  });

  const totalLeadsCount = leads.length;
  const sentCount = leads.filter((l) => l.leadStatus === "SENT").length;
  const queuedCount = leads.filter((l) => l.leadStatus === "QUEUED" || l.leadStatus === "IDLE").length;

  // Mocked items for replies
  const mockReplies = [
    {
      id: "reply-1",
      senderName: "Sarah Connor",
      senderEmail: "sconnor@cyberdyne.co",
      company: "Cyberdyne Systems",
      subject: "Re: Quick idea for Cyberdyne Systems",
      body: "Hi Team, thanks for reaching out. Yes, we are actually looking to upgrade our outbound campaign infrastructure. Let's jump on a call this Thursday at 2:00 PM EST.",
      date: "2 hours ago",
      type: "positive",
      unread: true,
    },
    {
      id: "reply-2",
      senderName: "Marcus Aurelius",
      senderEmail: "marcus@rome.net",
      company: "Rome Builders",
      subject: "Re: Quick idea for Rome Builders",
      body: "We do not accept cold solicitations. Please remove us from your list immediately. Thanks.",
      date: "1 day ago",
      type: "negative",
      unread: false,
    },
    {
      id: "reply-3",
      senderName: "Ada Lovelace",
      senderEmail: "ada@analyticengine.org",
      company: "Analytic Engine Inc",
      subject: "Re: Quick idea for Analytic Engine Inc",
      body: "Interesting proposal. Can you send over a PDF brochure of your services and pricing details before we hop on a call?",
      date: "3 days ago",
      type: "neutral",
      unread: false,
    },
  ];

  const activeReply = mockReplies.find((r) => r.id === selectedReplyId) || mockReplies[0];

  return (
    <DashboardLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      campaigns={campaigns}
      selectedCampaignId={selectedCampaignId}
      setSelectedCampaignId={setSelectedCampaignId}
      emailConnection={emailConnection}
    >
      {/* Toast Alert System */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-400">
          <InfoIcon className="text-red-500 shrink-0 mt-0.5" size={14} />
          <p className="font-semibold">{error}</p>
        </div>
      )}
      {message && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-[#EF4444]/20 bg-[#EF4444]/5 px-4 py-3 text-xs text-[#EF4444]">
          <CheckIcon className="text-[#EF4444] shrink-0 mt-0.5" size={14} />
          <p className="font-semibold">{message}</p>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB: DASHBOARD
          ---------------------------------------------------- */}
      {activeTab === "dashboard" && (
        <div className="space-y-8 animate-fade-in">
          {/* Dashboard Header */}
          <div className="flex justify-between items-end">
            <div>
              <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest">Workspace</span>
              <h2 className="text-2xl font-bold tracking-tight text-white mt-1">Dashboard</h2>
            </div>
            <div className="text-xs text-[#71717A]">
              Live updates via Titan SMTP
            </div>
          </div>

          {/* Metric Grids */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {[
              {
                label: "TOTAL LEADS",
                value: totalLeadsCount,
                desc: "Verified leads database",
                descColor: "text-emerald-500",
                icon: "⚡",
              },
              {
                label: "EMAILS QUEUED",
                value: queuedCount,
                desc: "Pending pipeline drafts",
                descColor: "text-blue-400",
                icon: "📬",
              },
              {
                label: "EMAILS SENT",
                value: sentCount,
                desc: "Dispatched campaigns",
                descColor: "text-purple-400",
                icon: "🚀",
              },
              {
                label: "REPLIES LOGGED",
                value: 3,
                desc: "Total contact replies",
                descColor: "text-[#EF4444]",
                icon: "📥",
              },
              {
                label: "CONVERSIONS",
                value: 1,
                desc: "Positive converters",
                descColor: "text-emerald-500",
                icon: "💰",
              },
              {
                label: "BOUNCE RATE",
                value: "1.2%",
                desc: "Delivery error bounces",
                descColor: "text-red-400",
                icon: "📉",
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-[#09090B] border border-[#141416] rounded-xl p-4 shadow-sm hover:border-[#EF4444]/20 transition-all duration-200"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-[#52525B] tracking-wider">
                    {stat.label}
                  </span>
                  <span className="text-xs">{stat.icon}</span>
                </div>
                <p className="text-2xl font-extrabold tracking-tight text-white mt-2">
                  {stat.value}
                </p>
                <p className={`text-[10px] font-medium mt-2 ${stat.descColor}`}>
                  {stat.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Dashboard Content Grid */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Quick Actions - Left 4 cols */}
            <div className="lg:col-span-4 bg-[#121214] border border-[#1F1F23] rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Quick Tools</h3>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    resetWizard();
                    setActiveTab("imports");
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-[#18181B] border border-[#27272A] hover:border-[#EF4444]/40 text-xs font-semibold text-white transition-all cursor-pointer text-left"
                >
                  <span>Import Leads CSV</span>
                  <UploadIcon size={14} className="text-[#A1A1AA]" />
                </button>
                <button
                  onClick={() => {
                    resetWizard();
                    setWizardStep(1);
                    setActiveTab("imports");
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-[#18181B] border border-[#27272A] hover:border-[#EF4444]/40 text-xs font-semibold text-white transition-all cursor-pointer text-left"
                >
                  <span>Create Campaign</span>
                  <PlusIcon size={14} className="text-[#A1A1AA]" />
                </button>
                <button
                  onClick={() => {
                    setTempId(null);
                    setTempName("");
                    setActiveTab("templates");
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-[#18181B] border border-[#27272A] hover:border-[#EF4444]/40 text-xs font-semibold text-white transition-all cursor-pointer text-left"
                >
                  <span>Build Email Template</span>
                  <PlusIcon size={14} className="text-[#A1A1AA]" />
                </button>
              </div>
            </div>

            {/* Recent Campaigns - Right 8 cols */}
            <div className="lg:col-span-8 bg-[#121214] border border-[#1F1F23] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Recent Campaigns</h3>
                <button onClick={() => setActiveTab("campaigns")} className="text-[10px] font-bold text-[#EF4444] hover:underline">
                  View All &rarr;
                </button>
              </div>

              {isLoading ? (
                <div className="flex items-center gap-2 text-xs text-[#71717A] py-4">
                  <SpinnerIcon size={14} />
                  <span>Fetching active campaigns...</span>
                </div>
              ) : campaigns.length === 0 ? (
                <p className="text-xs text-[#71717A] py-2">No campaigns found. Click Quick Tools to create one.</p>
              ) : (
                <div className="space-y-3">
                  {campaigns.slice(0, 3).map((c) => {
                    const leadsInCamp = leads.filter((l) => l.campaignId === c.id);
                    const sentInCamp = leadsInCamp.filter((l) => l.leadStatus === "SENT").length;
                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-3.5 rounded-lg bg-[#18181B] border border-[#27272A] hover:border-[#EF4444]/20 transition"
                      >
                        <div>
                          <p className="text-xs font-bold text-white">{c.name}</p>
                          <p className="text-[10px] text-[#71717A] mt-0.5">Status: {c.status}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-[#EF4444]">
                            {sentInCamp} / {leadsInCamp.length} Sent
                          </p>
                          <p className="text-[9px] text-[#71717A] mt-0.5">Ready to mail</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB: CAMPAIGNS
          ---------------------------------------------------- */}
      {activeTab === "campaigns" && (
        <div className="space-y-8 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest">Platform</span>
              <h2 className="text-2xl font-bold tracking-tight text-white mt-1">Outreach Campaigns</h2>
            </div>
            <button
              onClick={() => {
                resetWizard();
                setActiveTab("imports");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#EF4444] text-white text-xs font-bold hover:bg-[#EF4444]/90 transition cursor-pointer"
            >
              <PlusIcon size={12} />
              New Campaign
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-[#71717A] gap-2">
              <SpinnerIcon size={20} />
              <span className="text-sm">Loading campaigns...</span>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 bg-[#121214] border border-[#1F1F23] rounded-xl text-[#71717A]">
              <p className="text-sm">No campaigns defined yet. Start a campaign using the lead imports wizard.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((c) => {
                const campLeads = leads.filter((l) => l.campaignId === c.id);
                const campSent = campLeads.filter((l) => l.leadStatus === "SENT").length;
                const template = templates.find((t) => t.id === c.defaultTemplateId);
                
                return (
                  <div
                    key={c.id}
                    className="bg-[#121214] border border-[#1F1F23] rounded-xl p-5 hover:border-[#EF4444]/35 transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-white text-sm truncate">{c.name}</h4>
                        <span className="text-[8px] font-extrabold uppercase tracking-widest bg-[#1F1F23] text-[#A1A1AA] px-2 py-0.5 rounded-full">
                          {c.status}
                        </span>
                      </div>
                      
                      <div className="mt-4 space-y-2 text-xs text-[#A1A1AA]">
                        <div className="flex justify-between">
                          <span>Target Country</span>
                          <span className="text-white font-medium">United States</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Template Used</span>
                          <span className="text-white font-medium truncate max-w-[120px]">
                            {template?.name ?? "None assigned"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-[#1F1F23] flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-[#71717A] uppercase tracking-wider">Leads</p>
                        <p className="text-base font-extrabold text-white mt-0.5">{campLeads.length}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#71717A] uppercase tracking-wider">Sent</p>
                        <p className="text-base font-extrabold text-white mt-0.5">{campSent}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#71717A] uppercase tracking-wider">Replies</p>
                        <p className="text-base font-extrabold text-[#EF4444] mt-0.5">1</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------
          TAB: LEAD IMPORTS (Create Campaign wizard)
          ---------------------------------------------------- */}
      {activeTab === "imports" && (
        <div className="max-w-2xl mx-auto bg-[#121214] border border-[#1F1F23] rounded-xl p-6 md:p-8 space-y-6 animate-fade-in">
          {/* Wizard Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#1F1F23]">
            <div>
              <h3 className="font-bold text-white text-base">Campaign Wizard</h3>
              <p className="text-xs text-[#71717A] mt-0.5">Setup outbound lead workflow in minutes</p>
            </div>
            <span className="text-xs font-bold text-[#EF4444]">Step {wizardStep} of 5</span>
          </div>

          {/* Wizard Steps indicator bar */}
          <div className="w-full bg-[#1F1F23] h-1 rounded-full overflow-hidden">
            <div
              className="bg-[#EF4444] h-1 transition-all duration-300"
              style={{ width: `${(wizardStep / 5) * 100}%` }}
            />
          </div>

          {/* STEP 1: Campaign details */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#71717A] uppercase tracking-wider mb-2">
                  Campaign Name
                </label>
                <input
                  required
                  value={wizardName}
                  onChange={(e) => setWizardName(e.target.value)}
                  placeholder="e.g. Cafe Owners NYC Q3"
                  className="w-full rounded-lg border border-[#1F1F23] bg-[#0B0B0C] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#EF4444] transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#71717A] uppercase tracking-wider mb-2">
                    Target Industry
                  </label>
                  <select
                    value={wizardIndustry}
                    onChange={(e) => setWizardIndustry(e.target.value)}
                    className="w-full rounded-lg border border-[#1F1F23] bg-[#0B0B0C] px-3 py-2.5 text-xs text-white outline-none focus:border-[#EF4444] transition"
                  >
                    <option value="Technology">Technology</option>
                    <option value="Hospitality / Cafe">Hospitality / Cafe</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Professional Services">Professional Services</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#71717A] uppercase tracking-wider mb-2">
                    Target Country
                  </label>
                  <select
                    value={wizardCountry}
                    onChange={(e) => setWizardCountry(e.target.value)}
                    className="w-full rounded-lg border border-[#1F1F23] bg-[#0B0B0C] px-3 py-2.5 text-xs text-white outline-none focus:border-[#EF4444] transition"
                  >
                    <option value="United States">United States</option>
                    <option value="Canada">Canada</option>
                    <option value="United Kingdom">United Kingdom</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#71717A] uppercase tracking-wider mb-2">
                  Outbound Template
                </label>
                <select
                  value={wizardTemplateId}
                  onChange={(e) => setWizardTemplateId(e.target.value)}
                  className="w-full rounded-lg border border-[#1F1F23] bg-[#0B0B0C] px-3 py-2.5 text-xs text-white outline-none focus:border-[#EF4444] transition"
                >
                  <option value="">Choose default email draft template</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  disabled={!wizardName}
                  onClick={() => setWizardStep(2)}
                  className="px-4 py-2.5 rounded-lg bg-[#EF4444] hover:bg-[#EF4444]/90 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  Next Step: Upload CSV
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Upload CSV */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#71717A] uppercase tracking-wider mb-2">
                  Select CSV Leads File
                </label>
                <input
                  required
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files?.[0]) setWizardFile(files[0]);
                  }}
                  className="w-full text-xs text-[#A1A1AA] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-[#1F1F23] file:text-white hover:file:bg-[#27272A] cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-lg bg-[#0B0B0C] border border-[#1F1F23] space-y-2">
                <p className="text-[10px] font-bold text-[#EF4444] uppercase tracking-wide">CSV Schema Details</p>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-[#A1A1AA]">
                  <div>
                    <span className="font-semibold text-white">Required:</span>
                    <ul className="list-disc list-inside mt-0.5">
                      <li>company_name</li>
                      <li>email</li>
                    </ul>
                  </div>
                  <div>
                    <span className="font-semibold text-white">Optional variables:</span>
                    <ul className="list-disc list-inside mt-0.5">
                      <li>website</li>
                      <li>phone</li>
                      <li>city</li>
                      <li>category</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="text-xs text-[#71717A] hover:text-white transition"
                >
                  &larr; Back
                </button>
                <button
                  type="button"
                  disabled={!wizardFile || actionLoadingId === "create-camp" || actionLoadingId === "import-leads"}
                  onClick={() => void executeWizardQueue()}
                  className="px-4 py-2.5 rounded-lg bg-[#EF4444] hover:bg-[#EF4444]/90 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer inline-flex items-center gap-2"
                >
                  {(actionLoadingId === "create-camp" || actionLoadingId === "import-leads") ? (
                    <SpinnerIcon size={12} />
                  ) : null}
                  Next: Process Leads
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Enrichment Progress */}
          {wizardStep === 3 && (
            <div className="space-y-6 py-6 text-center">
              <div className="flex justify-center">
                <SpinnerIcon size={40} className="text-[#EF4444]" />
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-white text-sm">{enrichmentStage}</h4>
                <p className="text-xs text-[#71717A]">
                  Crawling homepage headers, meta keywords, and extracting services.
                </p>
              </div>

              <div className="w-full bg-[#1F1F23] rounded-full h-2 overflow-hidden max-w-sm mx-auto">
                <div
                  className="bg-[#EF4444] h-2 transition-all duration-200"
                  style={{ width: `${enrichmentProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* STEP 4: Template Preview */}
          {wizardStep === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#71717A] uppercase tracking-wider mb-2">
                  Sample Outbound Draft Preview
                </label>

                <div className="rounded-lg bg-[#0B0B0C] border border-[#1F1F23] p-4 font-mono text-[11px] text-[#A1A1AA] space-y-3">
                  <div>
                    <span className="text-[#71717A]">Subject:</span>{" "}
                    <span className="text-white">Quick idea for Cyberdyne Corp</span>
                  </div>
                  <div className="border-t border-[#1F1F23] pt-3 leading-relaxed whitespace-pre-wrap">
                    {"Hi Marcus,\n\nI noticed Cyberdyne Corp is located in New York and offers advanced robotic automation solutions.\n\nAre you open for a short call next week?\n\nBest,\nOutreach Hub"}
                  </div>
                </div>
              </div>

              {/* AI Coming Soon Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#EF4444]/5 border border-[#EF4444]/15">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">AI Personalization</span>
                    <span className="text-[8px] bg-[#EF4444] text-white px-1.5 py-0.5 rounded font-extrabold uppercase">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-[10px] text-[#A1A1AA] mt-1">
                    Automatically customize paragraphs based on crawling context.
                  </p>
                </div>
                <button
                  type="button"
                  disabled
                  className="relative h-6 w-11 rounded-full bg-zinc-800 opacity-60 cursor-not-allowed"
                >
                  <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-zinc-600" />
                </button>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setWizardStep(5)}
                  className="px-4 py-2.5 rounded-lg bg-[#EF4444] hover:bg-[#EF4444]/90 text-white text-xs font-bold transition cursor-pointer"
                >
                  Next: Queue Summary
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Queue Summary */}
          {wizardStep === 5 && (
            <div className="space-y-4">
              <h4 className="font-bold text-white text-sm">Outbox Queue Ready</h4>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Total Imported Leads", value: 12 },
                  { label: "Skipped Duplicates", value: 0 },
                  { label: "Invalid Emails", value: 0 },
                  { label: "Ready To Send", value: 12, highlight: true },
                ].map((item, i) => (
                  <div key={i} className="p-3.5 bg-[#0B0B0C] border border-[#1F1F23] rounded-lg">
                    <p className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider">{item.label}</p>
                    <p className={`text-lg font-extrabold mt-1.5 ${item.highlight ? "text-[#EF4444]" : "text-white"}`}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="pt-6 flex justify-between">
                <button
                  type="button"
                  onClick={() => setWizardStep(4)}
                  className="text-xs text-[#71717A] hover:text-white transition"
                >
                  &larr; Back
                </button>
                <button
                  type="button"
                  disabled={actionLoadingId === "finalize"}
                  onClick={() => void finalizeWizard()}
                  className="px-5 py-3 rounded-lg bg-[#EF4444] hover:bg-[#EF4444]/90 text-white text-xs font-bold transition shadow-lg shadow-[#EF4444]/15 cursor-pointer inline-flex items-center gap-2"
                >
                  {actionLoadingId === "finalize" ? <SpinnerIcon size={14} /> : null}
                  Queue Campaign & Send
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------
          TAB: TEMPLATES
          ---------------------------------------------------- */}
      {activeTab === "templates" && (
        <div className="space-y-8 animate-fade-in">
          {/* Header */}
          <div>
            <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest">Platform</span>
            <h2 className="text-2xl font-bold tracking-tight text-white mt-1">Email Templates</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-12 items-start">
            {/* Editor - Left 5 cols */}
            <div className="lg:col-span-5 bg-[#121214] border border-[#1F1F23] rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                {tempId ? "Edit Template" : "Build New Template"}
              </h3>

              <form onSubmit={handleTemplateSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#71717A] uppercase tracking-wider mb-2">
                    Template Name
                  </label>
                  <input
                    required
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder="e.g. Q3 Cafe Lead Draft"
                    className="w-full rounded-lg border border-[#1F1F23] bg-[#0B0B0C] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#EF4444] transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#71717A] uppercase tracking-wider mb-2">
                    Subject Line
                  </label>
                  <input
                    required
                    value={tempSubject}
                    onChange={(e) => setTempSubject(e.target.value)}
                    placeholder="e.g. Quick idea for {{company_name}}"
                    className="w-full rounded-lg border border-[#1F1F23] bg-[#0B0B0C] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#EF4444] transition font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#71717A] uppercase tracking-wider mb-2">
                    Email Body Template
                  </label>
                  <textarea
                    required
                    rows={8}
                    value={tempBody}
                    onChange={(e) => setTempBody(e.target.value)}
                    className="w-full rounded-lg border border-[#1F1F23] bg-[#0B0B0C] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#EF4444] transition font-mono leading-relaxed"
                  />
                </div>

                {/* Variable Selector */}
                <div>
                  <p className="text-[9px] font-semibold text-[#71717A] uppercase tracking-wider mb-2">
                    Available Placeholders (Click to copy)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {PLACEHOLDERS.map((ph) => (
                      <button
                        key={ph}
                        type="button"
                        onClick={() => {
                          void navigator.clipboard.writeText(ph);
                        }}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1F1F23] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white transition cursor-pointer"
                      >
                        {ph}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="default"
                    checked={tempIsDefault}
                    onChange={(e) => setTempIsDefault(e.target.checked)}
                    className="rounded border-[#1F1F23] bg-[#0B0B0C] text-[#EF4444] focus:ring-[#EF4444] cursor-pointer"
                  />
                  <label htmlFor="default" className="text-[11px] text-[#A1A1AA] cursor-pointer select-none">
                    Default template fallback for campaign
                  </label>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="submit"
                    disabled={actionLoadingId === "save-template"}
                    className="px-4 py-2.5 rounded-lg bg-[#EF4444] hover:bg-[#EF4444]/90 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                  >
                    {actionLoadingId === "save-template" && <SpinnerIcon size={12} />}
                    Save Template
                  </button>
                  {tempId && (
                    <button
                      type="button"
                      onClick={() => {
                        setTempId(null);
                        setTempName("");
                      }}
                      className="text-xs text-[#71717A] hover:text-white transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* List - Right 7 cols */}
            <div className="lg:col-span-7 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider px-1">
                Your Templates ({templates.length})
              </h3>

              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-[#71717A] bg-[#121214] border border-[#1F1F23] rounded-xl">
                  <SpinnerIcon size={18} />
                </div>
              ) : templates.length === 0 ? (
                <p className="text-xs text-[#71717A] text-center py-8 bg-[#121214] border border-[#1F1F23] rounded-xl">
                  No templates configured.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                  {templates.map((t) => (
                    <div key={t.id} className="bg-[#121214] border border-[#1F1F23] rounded-xl p-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-white text-sm">{t.name}</h4>
                            {t.isDefault && (
                              <span className="text-[8px] bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20 px-2 py-0.5 rounded-full font-bold">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#A1A1AA] mt-1 truncate max-w-[280px]">
                            Subject: {t.subjectTemplate}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(t)}
                            className="px-2.5 py-1 rounded bg-[#1F1F23] hover:bg-[#27272A] text-white text-[10px] font-bold transition cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => void handleTemplateDelete(t.id)}
                            disabled={actionLoadingId === `delete-${t.id}`}
                            className="p-1 rounded hover:bg-red-500/10 text-[#71717A] hover:text-[#EF4444] transition cursor-pointer disabled:opacity-50"
                          >
                            <TrashIcon size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="bg-[#0B0B0C] border border-[#1F1F23] rounded-lg p-3 text-[10px] text-[#71717A] font-mono max-h-24 overflow-y-auto whitespace-pre-wrap leading-normal">
                        {t.bodyTemplate}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB: EMAIL QUEUE
          ---------------------------------------------------- */}
      {activeTab === "queue" && (
        <div className="space-y-8 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest">Outbox</span>
              <h2 className="text-2xl font-bold tracking-tight text-white mt-1">Outbound Email Queue</h2>
            </div>
            
            <div className="flex gap-3">
              <select
                value={filterCampaignId}
                onChange={(e) => setFilterCampaignId(e.target.value)}
                className="bg-[#121214] border border-[#1F1F23] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#EF4444] transition"
              >
                <option value="ALL">All Campaigns</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => void triggerSendImmediately()}
                disabled={actionLoadingId === "send-mail"}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EF4444] text-white text-xs font-bold hover:bg-[#EF4444]/90 transition cursor-pointer disabled:opacity-50"
              >
                {actionLoadingId === "send-mail" ? <SpinnerIcon size={12} /> : <MailIcon size={12} />}
                Send Outbox Now
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-[#121214] border border-[#1F1F23] rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-[#71717A]">
                <SpinnerIcon size={20} />
              </div>
            ) : filteredLeads.length === 0 ? (
              <p className="text-center py-12 text-xs text-[#71717A]">No emails currently in queue.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#1F1F23] bg-[#18181B] text-[#71717A] font-semibold">
                      <th className="px-6 py-3 uppercase tracking-wider text-[10px]">Company</th>
                      <th className="px-6 py-3 uppercase tracking-wider text-[10px]">Recipient</th>
                      <th className="px-6 py-3 uppercase tracking-wider text-[10px]">Campaign</th>
                      <th className="px-6 py-3 uppercase tracking-wider text-[10px]">Status</th>
                      <th className="px-6 py-3 uppercase tracking-wider text-[10px]">Enrichment</th>
                      <th className="px-6 py-3 uppercase tracking-wider text-[10px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F1F23]">
                    {filteredLeads.map((lead) => {
                      const camp = campaigns.find((c) => c.id === lead.campaignId);
                      return (
                        <tr key={lead.id} className="hover:bg-[#18181B]/40 transition duration-150">
                          <td className="px-6 py-4 font-bold text-white">{lead.companyName}</td>
                          <td className="px-6 py-4 text-[#A1A1AA] font-mono">{lead.email}</td>
                          <td className="px-6 py-4 text-[#A1A1AA]">{camp?.name ?? "—"}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                lead.leadStatus === "SENT"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-[#1F1F23] text-[#A1A1AA] border border-[#27272A]"
                              }`}
                            >
                              {lead.leadStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide ${
                                lead.researchStatus === "COMPLETED"
                                  ? "bg-[#EF4444]/10 text-[#EF4444]"
                                  : "bg-[#1F1F23] text-[#A1A1AA]"
                              }`}
                            >
                              {lead.researchStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => void triggerLeadArchive(lead.id)}
                              disabled={actionLoadingId === `archive-${lead.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#1F1F23] hover:bg-red-500/10 text-[#71717A] hover:text-[#EF4444] text-[10px] font-bold transition cursor-pointer disabled:opacity-50"
                            >
                              <TrashIcon size={10} />
                              Archive
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB: REPLIES
          ---------------------------------------------------- */}
      {activeTab === "replies" && (
        <div className="space-y-8 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest">Inbox</span>
              <h2 className="text-2xl font-bold tracking-tight text-white mt-1">Replies Inbox</h2>
            </div>
            
            <button className="text-xs bg-[#1F1F23] hover:bg-[#27272A] border border-[#27272A] text-white px-3 py-1.5 rounded-lg font-bold transition cursor-pointer">
              Export Positive Leads
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-12 items-start">
            {/* List - Left 4 cols */}
            <div className="lg:col-span-5 bg-[#121214] border border-[#1F1F23] rounded-xl overflow-hidden flex flex-col">
              {/* Filter tabs */}
              <div className="flex border-b border-[#1F1F23] p-2 bg-[#0E0E10] gap-1">
                {["all", "positive", "neutral", "negative"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setReplyFilter(type)}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                      replyFilter === type
                        ? "bg-[#EF4444] text-white"
                        : "text-[#A1A1AA] hover:bg-[#121214]"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Messages list */}
              <div className="divide-y divide-[#1F1F23] max-h-[420px] overflow-y-auto">
                {mockReplies
                  .filter((r) => replyFilter === "all" || r.type === replyFilter)
                  .map((reply) => {
                    const isActive = reply.id === selectedReplyId;
                    return (
                      <div
                        key={reply.id}
                        onClick={() => setSelectedReplyId(reply.id)}
                        className={`p-4 cursor-pointer text-left transition ${
                          isActive
                            ? "bg-[#EF4444]/5 border-l-2 border-[#EF4444]"
                            : "hover:bg-[#18181B]/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs">{reply.senderName}</span>
                          <span className="text-[9px] text-[#71717A]">{reply.date}</span>
                        </div>
                        <p className="text-[10px] text-[#A1A1AA] font-semibold truncate mt-0.5">
                          {reply.company}
                        </p>
                        <p className="text-[10px] text-[#71717A] truncate mt-1">
                          {reply.body}
                        </p>
                        <div className="mt-2.5 flex items-center gap-1.5">
                          <span
                            className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              reply.type === "positive"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : reply.type === "negative"
                                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            }`}
                          >
                            {reply.type}
                          </span>
                          {reply.unread && (
                            <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444]" />
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Content view - Right 7 cols */}
            <div className="lg:col-span-7 bg-[#121214] border border-[#1F1F23] rounded-xl p-5 space-y-4 text-left">
              <div className="pb-4 border-b border-[#1F1F23]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-white text-base">{activeReply.subject}</h3>
                    <p className="text-xs text-[#A1A1AA] mt-1 font-medium">
                      From: {activeReply.senderName} &middot;{" "}
                      <span className="font-mono text-[#71717A]">{activeReply.senderEmail}</span>
                    </p>
                  </div>
                  <span className="text-[10px] text-[#71717A] shrink-0 font-medium">{activeReply.date}</span>
                </div>
              </div>

              <div className="text-xs text-[#A1A1AA] leading-relaxed whitespace-pre-wrap py-2 font-sans bg-[#0B0B0C] border border-[#1F1F23] rounded-lg p-4 min-h-[160px]">
                {activeReply.body}
              </div>

              {/* Reply controls */}
              <div className="flex items-center gap-2 pt-2 justify-end">
                <button className="text-xs bg-[#1F1F23] hover:bg-[#27272A] border border-[#27272A] text-white px-4 py-2 rounded-lg font-semibold transition cursor-pointer">
                  Ignore Reply
                </button>
                <button className="text-xs bg-[#EF4444] hover:bg-[#EF4444]/90 text-white px-4 py-2 rounded-lg font-bold transition cursor-pointer">
                  Mark as Lead Converter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB: ANALYTICS
          ---------------------------------------------------- */}
      {activeTab === "analytics" && (
        <div className="space-y-8 animate-fade-in">
          <div>
            <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest">Performance</span>
            <h2 className="text-2xl font-bold tracking-tight text-white mt-1">Analytics Dashboard</h2>
          </div>

          {/* Metric Grids */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Emails Dispatched", value: sentCount },
              { label: "Open Rate", value: "62.4%" },
              { label: "Reply Rate", value: "24.0%" },
              { label: "Positive Conversions", value: "1", highlight: true },
            ].map((stat, i) => (
              <div key={i} className="bg-[#121214] border border-[#1F1F23] rounded-xl p-4">
                <p className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider">{stat.label}</p>
                <p className={`text-xl font-extrabold mt-1.5 ${stat.highlight ? "text-[#EF4444]" : "text-white"}`}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Analytics chart vector mock */}
            <div className="bg-[#121214] border border-[#1F1F23] rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Outreach Sent Velocity</h3>
              
              <div className="h-44 flex items-end justify-between gap-2.5 pt-4">
                {[45, 60, 30, 80, 50, 95, 75].map((val, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-[#EF4444] rounded-t hover:bg-[#EF4444]/80 transition duration-150"
                      style={{ height: `${val}px` }}
                    />
                    <span className="text-[9px] text-[#71717A] font-bold">Day {idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Rankings */}
            <div className="bg-[#121214] border border-[#1F1F23] rounded-xl p-5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Top Performance Campaigns</h3>

              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <SpinnerIcon size={14} />
                </div>
              ) : campaigns.length === 0 ? (
                <p className="text-xs text-[#71717A] py-2">No data available.</p>
              ) : (
                <div className="space-y-3.5">
                  {campaigns.map((c, i) => {
                    const lCount = leads.filter((l) => l.campaignId === c.id).length;
                    return (
                      <div key={c.id} className="flex items-center justify-between text-xs pb-2.5 border-b border-[#1F1F23] last:border-0 last:pb-0">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-[#EF4444] font-bold">#0{i + 1}</span>
                          <span className="font-semibold text-white">{c.name}</span>
                        </div>
                        <span className="text-[#A1A1AA] font-bold">{lCount} leads</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB: SETTINGS
          ---------------------------------------------------- */}
      {activeTab === "settings" && (
        <div className="space-y-8 animate-fade-in max-w-xl">
          <div>
            <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest">Configuration</span>
            <h2 className="text-2xl font-bold tracking-tight text-white mt-1">Settings</h2>
          </div>

          {/* SMTP configurations */}
          <div className="bg-[#121214] border border-[#1F1F23] rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <MailIcon className="text-[#EF4444]" size={16} />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Titan SMTP Settings</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-[#1F1F23] py-2">
                <span className="text-[#A1A1AA] font-medium">SMTP Server Host</span>
                <span className="font-mono text-white">smtp.titan.email</span>
              </div>
              <div className="flex justify-between border-b border-[#1F1F23] py-2">
                <span className="text-[#A1A1AA] font-medium">SMTP Port</span>
                <span className="font-mono text-white">465 (SSL)</span>
              </div>
              <div className="flex justify-between border-b border-[#1F1F23] py-2">
                <span className="text-[#A1A1AA] font-medium">Username</span>
                <span className="font-mono text-white truncate max-w-[150px]">
                  {emailConnection?.from ?? "Not Configured"}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[#A1A1AA] font-medium">TLS Connection</span>
                <span className="font-mono text-emerald-400 font-bold">Enabled</span>
              </div>
            </div>
          </div>

          {/* AI Settings coming soon */}
          <div className="bg-[#121214]/60 border border-[#1F1F23] rounded-xl p-5 opacity-70">
            <div className="flex items-center gap-2 mb-2">
              <SparklesIcon className="text-[#EF4444]" size={16} />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI Personalization (Future Settings)</h3>
            </div>
            <p className="text-xs text-[#71717A] leading-relaxed">
              Configure parameters for OpenAI GPT / Gemini LLM personalization models to enrich paragraphs and email introductions. 
              Currently disabled in this tenant.
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
