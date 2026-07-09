import React, { useEffect, useState, useCallback } from "react";
import MaintenanceScreen, { MAINTENANCE_MODE } from "@/components/MaintenanceMode";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Invoice } from "@/entities/Invoice";
import { User } from "@/entities/User"; // Import User
import {
  Mic,
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  Bell,
  FileCheck,
  ArrowLeft,
  Moon,
  Sun
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import MobileBottomNav from "@/components/MobileBottomNav";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Create Invoice",
    url: createPageUrl("CreateInvoice"),
    icon: FileText,
    highlight: true,
  },
  {
    title: "Voice Invoice",
    url: createPageUrl("VoiceInvoice"),
    icon: Mic,
    highlight: true,
  },
  {
    title: "Invoices",
    url: createPageUrl("Invoices"),
    icon: FileText,
  },
  {
    title: "Estimates",
    url: createPageUrl("Estimates"),
    icon: FileCheck,
  },
  {
    title: "Clients",
    url: createPageUrl("Clients"),
    icon: Users,
  },
  {
    title: "Settings",
    url: createPageUrl("Settings"),
    icon: Settings,
  },
];

function DesktopSidebar({ location, navigationItems, createPageUrl }) {
  const [stats, setStats] = useState({ revenue: 0, invoices: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const user = await User.me(); // Get current user
        const invoiceData = await Invoice.filter({ created_by: user.email }); // Filter by user
        const totalRevenue = invoiceData
          .filter(inv => inv.status === 'paid')
          .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
        const totalInvoices = invoiceData.length;
        setStats({ revenue: totalRevenue, invoices: totalInvoices });
      } catch (error) {
        // This will catch errors if user is not logged in (e.g., on a public page)
        // In that case, stats will just remain 0, which is fine.
        console.log("Not logged in, sidebar stats not loaded.");
      }
    };

    fetchStats();
  }, [location.pathname]); // Refetch when navigation occurs

  return (
    <Sidebar className="border-r-2 border-ink bg-cream hidden md:flex">
      <SidebarHeader className="border-b-2 border-ink p-6">
        <Link to={createPageUrl("Dashboard")} className="block">
          <h2 className="font-heading font-extrabold text-2xl text-ink tracking-tight">
            IN<span className="text-money">VOX</span>
          </h2>
          <p className="text-xs text-slate-500 font-mono font-medium tracking-wide mt-0.5">Speak it. Send it. Get paid.</p>
        </Link>
      </SidebarHeader>

      <SidebarContent className="p-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={`group relative transition-all duration-200 rounded-md mb-1 border-2 ${
                      location.pathname === item.url
                        ? 'bg-ink text-paper border-ink shadow-hard-sm'
                        : 'text-ink border-transparent hover:bg-sand'
                    }`}
                  >
                    <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                      <item.icon className="w-5 h-5" />
                      <span className="font-heading font-semibold">{item.title}</span>
                      {item.highlight && (
                        <span className="ml-auto text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-signal text-white border border-ink">
                          NEW
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-8">
          <SidebarGroupLabel className="text-xs font-mono font-semibold text-slate-500 uppercase tracking-wider px-4 mb-3">
            Quick Stats
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-4 space-y-4">
              <div className="rounded-md p-3 border-2 border-ink bg-card shadow-hard-sm border-l-[6px] border-l-money">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono font-medium text-ink">Revenue</span>
                  <span className="font-amount text-lg text-money">${stats.revenue.toFixed(2)}</span>
                </div>
              </div>
              <div className="rounded-md p-3 border-2 border-ink bg-card shadow-hard-sm border-l-[6px] border-l-[#2456d6]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono font-medium text-ink">Invoices</span>
                  <span className="font-amount text-lg text-ink">{stats.invoices}</span>
                </div>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t-2 border-ink p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-ink rounded-md flex items-center justify-center">
            <span className="text-paper font-heading font-bold text-sm">U</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 text-sm truncate">User</p>
            <p className="text-xs text-slate-500 truncate">Professional Plan</p>
          </div>
          <Bell className="w-4 h-4 text-slate-400" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function MobileHeader({ createPageUrl, currentPageName, darkMode, setDarkMode }) {
  const navigate = useNavigate();
  const childPages = ['InvoiceDetail', 'EditInvoice', 'PublicInvoice', 'Clients', 'Settings'];
  const isChildPage = childPages.includes(currentPageName);

  return (
    <header 
    className="bg-cream border-b-2 border-ink px-6 md:hidden select-none"
      style={{ 
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: '1rem'
      }}
    >
      <div className="flex items-center gap-4">
        {isChildPage ? (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            className="hover:bg-sand p-2 rounded-lg transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        ) : (
          <SidebarTrigger className="hover:bg-sand p-2 rounded-lg transition-colors duration-200" />
        )}
        <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2">
          <h1 className="text-xl font-heading font-extrabold text-ink tracking-tight">
            IN<span className="text-money">VOX</span>
          </h1>
        </Link>
        <button
          onClick={() => setDarkMode(d => !d)}
          className="ml-auto p-2 rounded-lg hover:bg-sand transition-colors"
        >
          {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-500" />}
        </button>
      </div>
    </header>
  );
}

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('darkMode') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try { localStorage.setItem('darkMode', darkMode); } catch {}
  }, [darkMode]);

  const publicPages = ['PublicInvoice', 'PaymentSuccess', 'PaymentCancelled'];
  const isPublicPage = publicPages.includes(currentPageName);

  useEffect(() => {
    // --- PWA Installation Logic ---
    const manifest = {
      name: "INVOX — Speak it. Send it. Get paid.",
      short_name: "INVOX",
      description: "Create professional invoices instantly with AI-powered tools.",
      start_url: "/",
      display: "standalone",
      background_color: "#FFFFFF",
      theme_color: "#1f7a3d",
      icons: [
        {
          src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiB2aWV3Qm94PSIwIDAgMTkyIDE5MiI+PHJlY3Qgd2lkdGg9IjE5MiIgaGVpZ2h0PSIxOTIiIHJ4PSIzMiIgZmlsbD0iIzFmN2EzZCIvPjx0ZXh0IHg9Ijk2IiB5PSIxMTgiIGZvbnQtZmFtaWx5PSJBcmlhbCBCbGFjaywgc2Fucy1zZXJpZiIgZm9udC1zaXplPSI0OCIgZm9udC13ZWlnaHQ9IjkwMCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGxldHRlci1zcGFjaW5nPSIyIj5JTlZPWDwvdGV4dD48L3N2Zz4=",
          sizes: "192x192",
          type: "image/svg+xml",
        },
        {
          src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiB2aWV3Qm94PSIwIDAgNTEyIDUxMiI+PHJlY3Qgd2lkdGg9IjUxMiIgaGVpZ2h0PSI1MTIiIHJ4PSI4MCIgZmlsbD0iIzFmN2EzZCIvPjx0ZXh0IHg9IjI1NiIgeT0iMzE1IiBmb250LWZhbWlseT0iQXJpYWwgQmxhY2ssIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTI4IiBmb250LXdlaWdodD0iOTAwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgbGV0dGVyLXNwYWNpbmc9IjQiPklOVk9YPC90ZXh0Pjwvc3ZnPg==",
          sizes: "512x512",
          type: "image/svg+xml",
        },
      ],
    };

    const manifestBlob = new Blob([JSON.stringify(manifest)], { type: "application/json" });
    const manifestUrl = URL.createObjectURL(manifestBlob);

    const manifestLink = document.createElement("link");
    manifestLink.rel = "manifest";
    manifestLink.href = manifestUrl;
    document.head.appendChild(manifestLink);

    // Add theme color meta tag for iOS Safari
    const themeColorMeta = document.createElement("meta");
    themeColorMeta.name = "theme-color";
    themeColorMeta.content = manifest.theme_color;
    document.head.appendChild(themeColorMeta);
    
    // Add apple touch icon
    const appleTouchIcon = document.createElement("link");
    appleTouchIcon.rel = "apple-touch-icon";
    appleTouchIcon.href = manifest.icons[1].src; // Use the larger icon
    document.head.appendChild(appleTouchIcon);


    // Cleanup on component unmount
    return () => {
      // Check if elements exist before trying to remove them
      if (document.head.contains(manifestLink)) {
        document.head.removeChild(manifestLink);
      }
      if (document.head.contains(themeColorMeta)) {
        document.head.removeChild(themeColorMeta);
      }
      if (document.head.contains(appleTouchIcon)) {
        document.head.removeChild(appleTouchIcon);
      }
      URL.revokeObjectURL(manifestUrl);
    };
  }, []);

  if (MAINTENANCE_MODE) {
    return <MaintenanceScreen />;
  }

  if (isPublicPage) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-money-paper">
        <style>{`
          :root {
            --paper: #f4f0e6;
            --ink: #17150f;
            --money: #1f7a3d;
            --stamp: #c8372d;
          }
          
          /* Disable text selection on UI elements */
          button, [role="tab"], [role="button"], .select-none, a, 
          [role="menuitem"], [role="option"], label {
            user-select: none;
            -webkit-user-select: none;
            -webkit-tap-highlight-color: transparent;
          }
          
          /* Remove tap highlight on all interactive elements */
          * {
            -webkit-tap-highlight-color: transparent;
          }
        `}</style>

        <DesktopSidebar location={location} navigationItems={navigationItems} createPageUrl={createPageUrl} />

        <main className="flex-1 flex flex-col min-w-0">
          <MobileHeader createPageUrl={createPageUrl} currentPageName={currentPageName} darkMode={darkMode} setDarkMode={setDarkMode} />

          <div
            className="flex-1 overflow-auto pb-28 md:pb-0 relative"
            style={{ overscrollBehavior: 'none' }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '-100%', opacity: 0 }}
                transition={{ 
                  type: 'tween',
                  ease: 'easeInOut',
                  duration: 0.3
                }}
                className="absolute inset-0 overflow-auto"
                style={{ overscrollBehavior: 'none' }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>

          <MobileBottomNav location={location} />
        </main>
      </div>
    </SidebarProvider>
  );
}