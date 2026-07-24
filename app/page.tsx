import Link from "next/link";
import { MailIcon } from "./components/Icons";

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-6 py-16 transition-colors duration-300">
      {/* Brand Icon and Header */}
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EF4444] text-white shadow-xl shadow-[#EF4444]/25 mb-6">
        <MailIcon size={32} />
      </div>

      <div className="text-center max-w-md">
        <h1 className="text-4xl font-extrabold tracking-tight text-white">
          Admark Outreach
        </h1>
        <p className="mt-3.5 text-[#71717A] text-sm leading-relaxed">
          Import leads, crawl profile metadata, and manage automated outreach email campaigns.
        </p>
      </div>

      {/* Access Cards/Buttons */}
      <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full max-w-sm justify-center">
        <Link
          href="/leads"
          className="flex items-center justify-center rounded-xl bg-[#EF4444] hover:bg-[#EF4444]/90 text-white px-5 py-3 text-sm font-bold shadow-md shadow-[#EF4444]/10 hover:shadow-[#EF4444]/20 hover:-translate-y-0.5 transition duration-200"
        >
          Open Dashboard
        </Link>
      </div>

      {/* Tiny Footer */}
      <div className="mt-16 text-center">
        <Link
          href="/auth/login"
          className="text-xs text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition"
        >
          Sign in to another tenant account &rarr;
        </Link>
      </div>
    </main>
  );
}
