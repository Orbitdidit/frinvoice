import React, { useEffect, useState, useCallback } from "react";
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
  Zap,
  Bell,
  Home,
  Clock,
  Menu,
  X,
  Bot,
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

const bottomNavItems = [
  {
    title: "Home",
    url: createPageUrl("Dashboard"),
    icon: Home,
  },
  {
    title: "Create",
    url: createPageUrl("CreateInvoice"),
    icon: FileText,
    highlight: true,
  },
  {
    title: "Voice",
    url: createPageUrl("VoiceInvoice"),
    icon: Mic,
    highlight: true,
  },
  {
    title: "Documents",
    url: createPageUrl("Invoices"),
    icon: FileText,
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
    <Sidebar className="border-r border-slate-200/60 bg-white/80 backdrop-blur-xl hidden md:flex">
      <SidebarHeader className="border-b border-slate-200/60 p-6">
        <Link to={createPageUrl("Dashboard")} className="block">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            <div>
              <h2 className="font-bold text-xl text-slate-900 tracking-tight">Frinvoice</h2>
              <p className="text-xs text-slate-500 font-medium">Smart Invoice Management</p>
            </div>
          </div>
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
                    className={`group relative hover:bg-slate-50 transition-all duration-200 rounded-xl mb-1 ${
                      location.pathname === item.url
                        ? 'bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    } ${item.highlight ? 'ring-2 ring-purple-100' : ''}`}
                  >
                    <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                      <item.icon className={`w-5 h-5 transition-colors ${
                        location.pathname === item.url ? 'text-purple-600' : ''
                      }`} />
                      <span className="font-medium">{item.title}</span>
                      {item.highlight && (
                        <Badge className="ml-auto bg-purple-100 text-purple-700 text-xs px-2 py-1">
                          NEW
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-8">
          <SidebarGroupLabel className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 mb-3">
            Quick Stats
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-4 space-y-4">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Revenue</span>
                  <span className="text-lg font-bold text-green-600">${stats.revenue.toFixed(2)}</span>
                </div>
              </div>
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Invoices</span>
                  <span className="text-lg font-bold text-purple-600">{stats.invoices}</span>
                </div>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-200/60 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-slate-200 to-slate-300 rounded-xl flex items-center justify-center">
            <span className="text-slate-700 font-semibold text-sm">U</span>
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
    className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-700/60 px-6 md:hidden select-none"
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
            className="hover:bg-slate-100 p-2 rounded-lg transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        ) : (
          <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors duration-200" />
        )}
        <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Frinvoice</h1>
        </Link>
        <button
          onClick={() => setDarkMode(d => !d)}
          className="ml-auto p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-500" />}
        </button>
      </div>
    </header>
  );
}

function MobileBottomNavigation({ location, bottomNavItems, createPageUrl }) {
  const navigate = useNavigate();

  const getTabRoot = (itemTitle) => {
    const rootPages = {
      'Documents': createPageUrl('Invoices'),
      'Clients': createPageUrl('Clients'),
      'Settings': createPageUrl('Settings')
    };
    return rootPages[itemTitle];
  };

  const handleNavClick = (e, item) => {
    const tabRoot = getTabRoot(item.title);
    if (tabRoot && location.pathname !== item.url && location.pathname.includes(item.url.split('?')[0])) {
      e.preventDefault();
      navigate(tabRoot, { replace: false });
    } else if (location.pathname === item.url) {
      e.preventDefault();
      navigate(item.url, { replace: true });
    }
  };

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 md:hidden z-50 select-none"
      style={{ 
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))'
      }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {bottomNavItems.map((item) => (
          <Link
            key={item.title}
            to={item.url}
            onClick={(e) => handleNavClick(e, item)}
            className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-200 ${
              location.pathname === item.url
                ? 'bg-gradient-to-t from-purple-50 to-blue-50 text-purple-700'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <item.icon className={`w-5 h-5 ${
              location.pathname === item.url ? 'text-purple-600' : ''
            }`} />
            <span className={`text-xs font-medium ${
              item.highlight && location.pathname !== item.url ? 'text-purple-600' : ''
            }`}>
              {item.title}
            </span>
            {item.highlight && location.pathname === item.url && (
              <div className="absolute -top-1 right-2 w-2 h-2 bg-purple-500 rounded-full"></div>
            )}
          </Link>
        ))}
      </div>
    </div>
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
      name: "Frinvoice - Smart Invoice Management",
      short_name: "Frinvoice",
      description: "Create professional invoices instantly with AI-powered tools.",
      start_url: "/",
      display: "standalone",
      background_color: "#FFFFFF",
      theme_color: "#8B5CF6", // Purple
      icons: [
        {
          src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLXphcCI+PHJlY3Qgd2lkdGg9IjE5MiIgaGVpZ2h0PSIxOTIiIHg9IjAiIHk9IjAiIHJ4PSIyNCIgZmlsbD0iIzhCNUNGNyIvPjxwYXRoIGQ9Ik0xMyAyTDMgMTRoOWwtMiA4IDgtMTEuMDY2NjY2NzYzMjQ1MjA1SDVMMi04eiIvPjwvc3ZnPg==",
          sizes: "192x192",
          type: "image/svg+xml",
        },
        {
          src: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLXphcCI+PHJlY3Qgd2lkdGg9IjUxMiIgaGVpZ2h0PSI1MTIiIHg9IjAiIHk9IjAiIHJ4PSI4MCIgZmlsbD0iIzhCNUNGNyIvPjxwYXRoIGQ9Ik0xMyAyTDMgMTRoOWwtMiA4IDgtMTEuMDY2NjY2NzYzMjQ1MjA1SDVMMi04eiIvPjwvc3ZnPg==",
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

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <style>{`
          :root {
            --primary: #8B5CF6;
            --primary-dark: #7C3AED;
            --accent: #10B981;
            --background: #FAFBFC;
            --surface: #FFFFFF;
            --text-primary: #0B1426;
            --text-secondary: #64748B;
            --border: #E2E8F0;
          }
          
          @media (prefers-color-scheme: dark) {
            :root {
              --background: #0F172A;
              --surface: #1E293B;
              --text-primary: #F1F5F9;
              --text-secondary: #94A3B8;
              --border: #334155;
            }
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
            className="flex-1 overflow-auto pb-20 md:pb-0 relative" 
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

          <MobileBottomNavigation location={location} bottomNavItems={bottomNavItems} createPageUrl={createPageUrl} />
        </main>
      </div>
    </SidebarProvider>
  );
}