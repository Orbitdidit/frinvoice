import { useState, useEffect, useRef } from "react";
import { Invoice } from "@/entities/Invoice";
import { User } from "@/entities/User";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  FileCheck,
  Plus,
  Eye,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  FileText,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import StampBadge from "@/components/StampBadge";

export default function Estimates() {
  const navigate = useNavigate();
  const [estimates, setEstimates] = useState([]);
  const [filteredEstimates, setFilteredEstimates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef(null);

  useEffect(() => {
    loadEstimates();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e) => {
      if (container.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e) => {
      if (container.scrollTop === 0 && !isPullRefreshing) {
        const currentY = e.touches[0].clientY;
        const pullDistance = currentY - startY.current;
        
        if (pullDistance > 80) {
          setIsPullRefreshing(true);
          loadEstimates().finally(() => {
            setTimeout(() => setIsPullRefreshing(false), 500);
          });
        }
      }
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isPullRefreshing]);

  // Move filterEstimates logic into useEffect to fix dependency issue
  useEffect(() => {
    let filtered = estimates;

    if (searchTerm) {
      filtered = filtered.filter(estimate =>
        estimate.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        estimate.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        estimate.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(estimate => estimate.status === statusFilter);
    }

    setFilteredEstimates(filtered);
  }, [estimates, searchTerm, statusFilter]);

  const loadEstimates = async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      const data = await Invoice.filter({ 
        document_type: "estimate", 
        created_by: user.email 
      }, "-created_date");
      setEstimates(data);
    } catch (error) {
      console.error("Error loading estimates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const convertToInvoice = async (estimate) => {
    try {
      // Create a new invoice from the estimate
      const invoiceData = {
        ...estimate,
        document_type: "invoice",
        invoice_number: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        status: "draft",
        payment_status: "unpaid"
      };
      
      // Remove the ID so it creates a new record
      delete invoiceData.id;
      delete invoiceData.created_date;
      delete invoiceData.updated_date;
      
      const newInvoice = await Invoice.create(invoiceData);
      navigate(createPageUrl(`InvoiceDetail?id=${newInvoice.id}`));
    } catch (error) {
      console.error("Error converting estimate to invoice:", error);
      alert("Failed to convert estimate to invoice. Please try again.");
    }
  };

  const duplicateEstimate = async (estimate) => {
    try {
      const duplicatedData = {
        ...estimate,
        invoice_number: `EST-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        status: "draft"
      };
      
      // Remove the ID so it creates a new record
      delete duplicatedData.id;
      delete duplicatedData.created_date;
      delete duplicatedData.updated_date;
      
      const newEstimate = await Invoice.create(duplicatedData);
      navigate(createPageUrl(`EditInvoice?id=${newEstimate.id}`));
    } catch (error) {
      console.error("Error duplicating estimate:", error);
      alert("Failed to duplicate estimate. Please try again.");
    }
  };

  const deleteEstimate = async (estimateId) => {
    if (window.confirm("Are you sure you want to delete this estimate? This action cannot be undone.")) {
      try {
        await Invoice.delete(estimateId);
        loadEstimates();
      } catch (error) {
        console.error("Error deleting estimate:", error);
        alert("Failed to delete estimate. Please try again.");
      }
    }
  };

  const stats = {
    total: estimates.length,
    accepted: estimates.filter(e => e.status === 'accepted').length,
    pending: estimates.filter(e => ['draft', 'sent', 'viewed'].includes(e.status)).length,
    declined: estimates.filter(e => e.status === 'declined').length
  };

  return (
    <div className="min-h-screen bg-money-paper p-6" ref={containerRef}>
      {isPullRefreshing && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 md:hidden">
          <div className="bg-card rounded-md border-2 border-ink shadow-hard p-3 animate-bounce">
            <RefreshCw className="w-5 h-5 text-money animate-spin" />
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <p className="text-xs font-mono font-semibold tracking-[0.2em] uppercase text-money">Proposals</p>
            <h1 className="text-3xl font-heading font-extrabold text-ink flex items-center gap-3">
              <FileCheck className="w-8 h-8 text-ink" />
              Estimates
            </h1>
            <p className="text-ink/60 font-mono text-sm mt-1">Manage your project estimates and proposals</p>
          </div>

          <Button onClick={() => navigate(createPageUrl("CreateInvoice"))} size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Create New Estimate
          </Button>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Estimates", value: stats.total, icon: FileCheck, accent: "text-ink" },
            { label: "Accepted", value: stats.accepted, icon: CheckCircle, accent: "text-money" },
            { label: "Pending", value: stats.pending, icon: Clock, accent: "text-ink" },
            { label: "Declined", value: stats.declined, icon: XCircle, accent: "text-stamp" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * (i + 1) }}>
              <div className="bg-card rounded-md border-2 border-ink shadow-hard p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-ink/60">{stat.label}</p>
                    <p className={`text-2xl font-mono font-bold ${stat.accent}`}>{stat.value}</p>
                  </div>
                  <stat.icon className={`w-8 h-8 ${stat.accent}`} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="bg-card rounded-md border-2 border-ink shadow-hard p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-ink/40" />
                  <Input
                    placeholder="Search estimates by client, number, or notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-2 border-ink font-mono"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-ink/40" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40 border-2 border-ink font-mono">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="viewed">Viewed</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
          </div>
        </motion.div>

        {/* Estimates Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="bg-card rounded-md border-2 border-ink shadow-hard overflow-hidden">
            <div className="border-b-2 border-ink px-6 py-4">
              <h2 className="font-heading font-bold text-ink">Your Estimates</h2>
            </div>
            <div className="p-0">
              {isLoading ? (
                <div className="text-center py-12 font-mono text-ink/50">Loading estimates...</div>
              ) : filteredEstimates.length === 0 ? (
                <div className="text-center py-12">
                  <FileCheck className="w-16 h-16 mx-auto mb-4 text-ink/20" />
                  <h3 className="text-lg font-heading font-bold text-ink mb-2">
                    {estimates.length === 0 ? "No estimates yet" : "No estimates match your search"}
                  </h3>
                  <p className="text-ink/60 font-mono text-sm mb-6">
                    {estimates.length === 0
                      ? "Create your first estimate to start winning more projects!"
                      : "Try adjusting your search terms or filters"
                    }
                  </p>
                  {estimates.length === 0 && (
                    <Button onClick={() => navigate(createPageUrl("CreateInvoice"))}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Estimate
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-mono uppercase text-xs">Estimate #</TableHead>
                      <TableHead className="font-mono uppercase text-xs">Client</TableHead>
                      <TableHead className="font-mono uppercase text-xs">Date</TableHead>
                      <TableHead className="font-mono uppercase text-xs">Amount</TableHead>
                      <TableHead className="font-mono uppercase text-xs">Status</TableHead>
                      <TableHead className="text-right font-mono uppercase text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEstimates.map((estimate) => (
                      <TableRow key={estimate.id}>
                        <TableCell className="font-mono font-medium text-ink">{estimate.invoice_number}</TableCell>
                        <TableCell className="text-ink">{estimate.client_name}</TableCell>
                        <TableCell className="font-mono text-ink/70">
                          {estimate.invoice_date ? new Date(estimate.invoice_date).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-ink">
                          ${estimate.total_amount?.toFixed(2) || '0.00'}
                        </TableCell>
                        <TableCell>
                          <StampBadge status={estimate.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(createPageUrl(`InvoiceDetail?id=${estimate.id}`))}>
                                <Eye className="mr-2 h-4 w-4" /> View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(createPageUrl(`EditInvoice?id=${estimate.id}`))}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => duplicateEstimate(estimate)}>
                                <Copy className="mr-2 h-4 w-4" /> Duplicate
                              </DropdownMenuItem>
                              {estimate.status === 'accepted' && (
                                <DropdownMenuItem onClick={() => convertToInvoice(estimate)}>
                                  <FileText className="mr-2 h-4 w-4" /> Convert to Invoice
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => deleteEstimate(estimate.id)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}