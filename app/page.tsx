import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Admark Outreach</h1>
      <p className="mt-3 text-zinc-600">
        Import and manage outreach leads by campaign.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/auth/login"
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Sign in
        </Link>
        <Link
          href="/leads"
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900"
        >
          Open leads
        </Link>
        <Link
          href="/templates"
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900"
        >
          Templates
        </Link>
      </div>
    </main>
  );
}
