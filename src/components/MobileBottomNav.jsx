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
    color: "from-purple-500 to-fuchsia-500",
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
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden select-none bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-700"
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
              className="relative -mt-8 w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg shadow-purple-500/40 flex items-center justify-center text-white active:scale-95 transition-transform"
            >
              <Plus className="w-7 h-7" />
            </button>
            <span className="mt-1 text-[10px] font-medium text-purple-600 dark:text-purple-400">Create</span>
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
              className="fixed bottom-0 left-0 right-0 z-50 md:hidden rounded-t-3xl bg-white dark:bg-slate-900 shadow-2xl"
              style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-700 absolute left-1/2 -translate-x-1/2 top-2" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-2">Create Invoice</h3>
                <button
                  onClick={() => setSheetOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
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
                    className="flex flex-col items-start gap-2 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${opt.color} flex items-center justify-center text-white shadow-md`}>
                      <opt.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white text-sm">{opt.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">{opt.description}</p>
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
      className={`flex flex-col items-center justify-center gap-1 flex-1 py-1.5 rounded-xl transition-colors ${
        active ? "text-purple-600 dark:text-purple-400" : "text-slate-500 dark:text-slate-400"
      }`}
    >
      <tab.icon className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />
      <span className={`text-[10px] font-medium ${active ? "font-semibold" : ""}`}>{tab.title}</span>
    </Link>
  );
}