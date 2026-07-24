import React from "react";
import {
  DashboardIcon,
  LeadsIcon,
  TemplatesIcon,
  QueueIcon,
  RepliesIcon,
  AnalyticsIcon,
  SettingsIcon,
  MailIcon,
} from "./Icons";

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  campaigns: Array<{ id: string; name: string }>;
  selectedCampaignId: string;
  setSelectedCampaignId: (id: string) => void;
  emailConnection: {
    configured: boolean;
    provider: string;
    from: string | null;
    missing: string[];
  } | null;
}

export default function DashboardLayout({
  children,
  activeTab,
  setActiveTab,
  campaigns,
  selectedCampaignId,
  setSelectedCampaignId,
  emailConnection,
}: DashboardLayoutProps) {
  // Sidebar categories matching the Admark OS CRM layout
  const categories = [
    {
      title: "DAILY WORK",
      items: [{ id: "dashboard", name: "Dashboard", icon: DashboardIcon }],
    },
    {
      title: "CAMPAIGNS",
      items: [
        { id: "campaigns", name: "Campaigns", icon: LeadsIcon },
        { id: "imports", name: "Lead Imports", icon: QueueIcon },
      ],
    },
    {
      title: "INTELLIGENCE",
      items: [
        { id: "templates", name: "Templates", icon: TemplatesIcon },
        { id: "queue", name: "Email Queue", icon: MailIcon },
        { id: "replies", name: "Replies", icon: RepliesIcon },
        { id: "analytics", name: "Analytics", icon: AnalyticsIcon },
      ],
    },
    {
      title: "SYSTEM",
      items: [{ id: "settings", name: "Settings", icon: SettingsIcon }],
    },
  ];

  return (
    <div className="flex min-h-screen bg-black text-[#F4F4F5] font-sans antialiased selection:bg-[#EF4444]/30 selection:text-white">
      {/* Sidebar - Replicating Admark CRM exact Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-[#141416] bg-black fixed h-full z-20">
        {/* Brand/Logo Section */}
        <div className="h-16 flex items-center px-6 border-b border-[#141416]">
          <img
            src="/logo.png"
            alt="Admark Digitals"
            className="h-7 w-auto object-contain"
          />
        </div>

        {/* Sidebar Navigation Categories */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {categories.map((cat) => (
            <div key={cat.title} className="space-y-1.5">
              <span className="block px-3 text-[9px] font-bold text-[#52525B] tracking-widest uppercase">
                {cat.title}
              </span>
              <div className="space-y-0.5">
                {cat.items.map((item) => {
                  const isActive = activeTab === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                        isActive
                          ? "bg-[#EF4444] text-white shadow-md shadow-[#EF4444]/20"
                          : "text-[#A1A1AA] hover:bg-[#09090B] hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          size={15}
                          className={isActive ? "text-white" : "opacity-60"}
                        />
                        <span>{item.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer Status Indicator */}
        <div className="p-4 border-t border-[#141416]">
          <div className="rounded-xl p-3 bg-[#09090B] border border-[#141416] flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold text-[#52525B] uppercase tracking-wider">
                TITAN SMTP
              </p>
              <p className="text-[11px] font-medium text-white truncate max-w-[130px] mt-0.5">
                {emailConnection?.configured ? emailConnection.from : "Not Connected"}
              </p>
            </div>
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  emailConnection?.configured ? "bg-[#EF4444]" : "bg-amber-500"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  emailConnection?.configured ? "bg-[#EF4444]" : "bg-amber-500"
                }`}
              />
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="flex h-16 items-center justify-between px-6 border-b border-[#141416] bg-black sticky top-0 z-10">
          {/* Left Side: Sidebar Toggle + Title */}
          <div className="flex items-center gap-4">
            <button className="text-[#A1A1AA] hover:text-white">
              {/* Sidebar toggle icon [||] */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            </button>
            <span className="text-[10px] font-bold text-white tracking-widest uppercase hidden sm:inline">
              ADMARK OPERATING SYSTEM
            </span>
          </div>

          {/* Right Side: Campaign context selector + Notifications + Logout */}
          <div className="flex items-center gap-5">
            {/* Campaign Select */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-[#52525B] uppercase tracking-wider">
                Outbox
              </span>
              <select
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                className="bg-[#09090B] border border-[#141416] rounded-lg px-2.5 py-1 text-xs text-white font-medium outline-none focus:border-[#EF4444] transition"
              >
                <option value="">All Campaigns</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Notification Bell */}
            <button className="relative p-1 text-[#A1A1AA] hover:text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="absolute top-0 right-0 h-1.5 w-1.5 rounded-full bg-[#EF4444]" />
            </button>

            {/* Sign Out Button */}
            <button
              onClick={() => {
                window.location.href = "/auth/login";
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#141416] hover:bg-[#09090B] text-xs font-semibold text-white transition cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
              <span>Sign out</span>
            </button>
          </div>
        </header>

        {/* Mobile Sidebar Category Links */}
        <div className="flex items-center gap-2 overflow-x-auto py-2.5 px-4 border-b border-[#141416] bg-black md:hidden">
          {categories.map((cat) =>
            cat.items.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`whitespace-nowrap px-3 py-1 rounded-full text-[10px] font-bold tracking-wide transition cursor-pointer ${
                    isActive ? "bg-[#EF4444] text-white" : "bg-[#09090B] text-[#A1A1AA]"
                  }`}
                >
                  {item.name}
                </button>
              );
            })
          )}
        </div>

        {/* Main Workspace Frame */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
