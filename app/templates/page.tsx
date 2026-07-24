"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Template = {
  id: string;
  name: string;
  subjectTemplate: string;
  bodyTemplate: string;
  isDefault: boolean;
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

const PLACEHOLDER_HINT =
  "{{company_name}} {{first_name}} {{industry}} {{location}} {{service_1}} {{service_2}}";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("Quick idea for {{company_name}}");
  const [body, setBody] = useState(
    "Hi {{first_name}},\n\nI noticed {{company_name}} in {{location}} and your work on {{service_1}}.\n\nOpen to a short chat?\n\nBest,\nAdmark",
  );
  const [isDefault, setIsDefault] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [aiEnabled, setAiEnabled] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [templatesRes, aiRes] = await Promise.all([
        fetch("/api/v1/email-templates"),
        fetch("/api/v1/settings/ai-personalization"),
      ]);
      if (templatesRes.status === 401) {
        window.location.href = "/auth/login";
        return;
      }
      const templatesJson = await readJson<{ success: true; data: Template[] }>(
        templatesRes,
      );
      setTemplates(templatesJson.data);
      if (aiRes.ok) {
        const aiJson = await readJson<{
          success: true;
          data: { enabled: boolean };
        }>(aiRes);
        setAiEnabled(aiJson.data.enabled);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load",
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setSubject("Quick idea for {{company_name}}");
    setBody(
      "Hi {{first_name}},\n\nI noticed {{company_name}} in {{location}} and your work on {{service_1}}.\n\nOpen to a short chat?\n\nBest,\nAdmark",
    );
    setIsDefault(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      if (editingId) {
        await readJson(
          await fetch(`/api/v1/email-templates/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              subjectTemplate: subject,
              bodyTemplate: body,
              isDefault,
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
              name,
              subjectTemplate: subject,
              bodyTemplate: body,
              isDefault,
            }),
          }),
        );
        setMessage("Template created");
      }
      resetForm();
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed");
    }
  }

  function startEdit(template: Template) {
    setEditingId(template.id);
    setName(template.name);
    setSubject(template.subjectTemplate);
    setBody(template.bodyTemplate);
    setIsDefault(template.isDefault);
  }

  async function handleDelete(templateId: string) {
    setError(null);
    try {
      await readJson(
        await fetch(`/api/v1/email-templates/${templateId}`, {
          method: "DELETE",
        }),
      );
      setMessage("Template deleted");
      await load();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Delete failed",
      );
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">Admark Outreach</p>
          <h1 className="text-3xl font-semibold tracking-tight">Templates</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Create campaign templates. Assign one as the campaign default on the
            Leads page. Placeholders: {PLACEHOLDER_HINT}
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/leads" className="underline text-zinc-600">
            Leads
          </Link>
          <Link href="/" className="underline text-zinc-600">
            Home
          </Link>
        </div>
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

      <section className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h2 className="text-lg font-medium">AI personalization</h2>
          <p className="text-sm text-zinc-500">
            Coming soon — template emails work without AI. Toggle is display-only
            for now.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={aiEnabled}
          onClick={() => setAiEnabled((value) => !value)}
          className={`relative h-7 w-12 rounded-full transition ${
            aiEnabled ? "bg-zinc-900" : "bg-zinc-300"
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition ${
              aiEnabled ? "left-5" : "left-0.5"
            }`}
          />
        </button>
      </section>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">
          {editingId ? "Edit template" : "New template"}
        </h2>
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Template name (e.g. Cafe outreach)"
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        />
        <input
          required
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="Subject template"
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        />
        <textarea
          required
          rows={8}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Body template"
          className="rounded border border-zinc-300 px-3 py-2 font-mono text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(event) => setIsDefault(event.target.checked)}
          />
          Tenant default (fallback if campaign has none)
        </label>
        <div className="flex gap-3">
          <button
            type="submit"
            className="w-fit rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            {editingId ? "Save changes" : "Create template"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-zinc-600 underline"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <section>
        <h2 className="text-lg font-medium">Your templates</h2>
        <ul className="mt-3 space-y-3">
          {templates.map((template) => (
            <li
              key={template.id}
              className="border-b border-zinc-200 py-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium">{template.name}</span>
                  {template.isDefault ? (
                    <span className="ml-2 text-xs text-zinc-500">default</span>
                  ) : null}
                  <p className="mt-1 text-zinc-500">{template.subjectTemplate}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="underline text-zinc-600"
                    onClick={() => startEdit(template)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="underline text-zinc-600"
                    onClick={() => void handleDelete(template.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
