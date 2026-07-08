import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Home, FileText, Users, Settings as SettingsIcon, Plus, Mic, Keyboard, Camera, Edit3, X } from "lucide-react";

const tabs = [
  { title: "Home", url: createPageUrl("Dashboard"), icon: Home, rootPattern: "Dashboard" },
  { title: "Invoices", url: createPageUrl("Invoices"), icon: FileText, rootPattern: "Invoices" },
  { title: "Clients", url: createPageUrl("Clients"), icon: Users, rootPattern: "Clients" },
  { title: "Settings", url: createPageUrl("Settings"), icon: SettingsIcon, rootPattern: "Settings" },
];

const createOptions = [
  {
    title: "Voice",
    description: "Speak your invoice",
    icon: Mic,
    url: createPageUrl("VoiceInvoice"),
  },
  {
    title: "Type It",
    description: "Describe in text with AI",
    icon: Keyboard,
    url: createPageUrl("CreateInvoice"),
    color: "from-blue-500 to-cyan-500",
  },
  {
    title: "Scan / Photo",
    description: "Upload a photo or screenshot",
    icon: Camera,
    url: createPageUrl("CreateInvoice"),
    color: "from-amber-500 to-orange-500",
  },
  {
    title: "Manual",
    description: "Build it line by line",
    icon: Edit3,
    url: createPageUrl("CreateInvoice"),
    color: "from-emerald-500 to-green-500",
  },
];

export default function MobileBottomNav({ location }) {
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isActive = (tab) => {
    if (location.pathname === tab.url) return true;
    const seg = "/" + tab.rootPattern.toLowerCase();
    return location.pathname.toLowerCase().startsWith(seg) && tab.rootPattern !== "Dashboard";
  };

  const handleCreate = (url) => {
    setSheetOpen(false);
    navigate(url);
  };

  return (
    <>
      {/* Bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden select-none bg-white dark:bg-slate-900 border-t-2 border-ink"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="relative flex items-stretch justify-around px-2 pt-2 pb-1">
          {/* Left: Home + Invoices */}
          {tabs.slice(0, 2).map((tab) => (
            <TabButton key={tab.title} tab={tab} active={isActive(tab)} />
          ))}

          {/* Center raised + button */}
          <div className="flex flex-col items-center justify-end" style={{ minWidth: 64 }}>
            <button
              onClick={() => setSheetOpen(true)}
              aria-label="Create invoice"
              className="relative -mt-8 w-14 h-14 rounded-full bg-ink border-2 border-ink shadow-hard flex items-center justify-center text-paper active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
            >
              <Plus className="w-7 h-7" />
            </button>
            <span className="mt-1 text-[10px] font-mono font-semibold text-ink">Create</span>
          </div>

          {/* Right: Clients + Settings */}
          {tabs.slice(2).map((tab) => (
            <TabButton key={tab.title} tab={tab} active={isActive(tab)} />
          ))}
        </div>
      </nav>

      {/* Action sheet */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheetOpen(false)}
              className="fixed inset-0 z-40 md:hidden bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "tween", ease: "easeOut", duration: 0.25 }}
              className="fixed bottom-0 left-0 right-0 z-50 md:hidden rounded-t-lg border-t-2 border-ink bg-white dark:bg-slate-900 shadow-hard-lg"
              style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-300 absolute left-1/2 -translate-x-1/2 top-2" />
                <h3 className="text-lg font-heading font-extrabold text-ink dark:text-white mt-2">Create Invoice</h3>
                <button
                  onClick={() => setSheetOpen(false)}
                  className="p-2 rounded-md hover:bg-paper text-ink"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-4 pb-4 pt-2 grid grid-cols-2 gap-3">
                {createOptions.map((opt) => (
                  <button
                    key={opt.title}
                    onClick={() => handleCreate(opt.url)}
                    className="flex flex-col items-start gap-2 p-4 rounded-md border-2 border-ink bg-paper hover:bg-card transition-colors text-left shadow-hard-sm"
                  >
                    <div className={`w-11 h-11 rounded-md bg-ink flex items-center justify-center text-paper`}>
                      <opt.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-heading font-bold text-ink text-sm">{opt.title}</p>
                      <p className="text-xs text-slate-500 font-mono leading-snug">{opt.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function TabButton({ tab, active }) {
  return (
    <Link
      to={tab.url}
      className={`flex flex-col items-center justify-center gap-1 flex-1 py-1.5 rounded-md transition-colors ${
        active ? "text-money" : "text-ink/60"
      }`}
    >
      <tab.icon className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />
      <span className={`text-[10px] font-mono ${active ? "font-bold" : "font-medium"}`}>{tab.title}</span>
    </Link>
  );
}