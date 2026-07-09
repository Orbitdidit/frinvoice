import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Invoice } from "@/entities/Invoice";
import { User } from "@/entities/User"; // Import User
import { createPageUrl } from "@/utils";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  DollarSign,
  Calendar,
  User as UserIcon, // Renamed to avoid conflict with User entity import
  CheckCircle,
  Clock,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [stats, setStats] = useState({ totalRevenue: 0, paidAmount: 0, pendingAmount: 0 }); // Added stats state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const startY = useRef(0);
  const containerRef = useRef(null);

  useEffect(() => {
    loadInvoices();
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
          loadInvoices().finally(() => {
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

  useEffect(() => {
    let newFiltered = [...invoices];
    if (searchTerm) {
      newFiltered = newFiltered.filter(
        (invoice) =>
          invoice.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== "all") {
      newFiltered = newFiltered.filter((invoice) => invoice.status === statusFilter);
    }
    setFilteredInvoices(newFiltered);
  }, [searchTerm, statusFilter, invoices]); // Dependency array updated as per outline

  const loadInvoices = async () => {
    setIsLoading(true);
    try {
      const user = await User.me(); // Get current user
      // Changed Invoice.list to Invoice.filter to query by user
      const data = await Invoice.filter({ created_by: user.email }, '-created_date');
      setInvoices(data);
      setFilteredInvoices(data); // Initialize filtered invoices with all user's invoices
      calculateStats(data); // Calculate stats for the loaded data

      // Handle client filter from URL
      const clientName = searchParams.get('client');
      if (clientName) {
        setSearchTerm(clientName);
      }
    } catch (error) {
      console.error("Error loading invoices:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // calculateStats function to compute revenue metrics
  const calculateStats = (invoicesData) => {
    const totalRev = invoicesData
      .filter(inv => inv.status === 'paid' || inv.payment_status === 'paid')
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    const paidAmt = invoicesData
      .filter(inv => inv.status === 'paid' || inv.payment_status === 'paid')
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    const pendingAmt = invoicesData
      .filter(inv => inv.status === 'sent')
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    setStats({ totalRevenue: totalRev, paidAmount: paidAmt, pendingAmount: pendingAmt });
  };
  
  // filterInvoices function logic moved into useEffect, so this function is removed.

  const handleViewInvoice = (invoiceId) => {
    navigate(createPageUrl(`InvoiceDetail?id=${invoiceId}`));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-money text-white border-green-dark';
      case 'sent': return 'bg-mustard text-ink border-ink';
      case 'viewed': return 'bg-cobalt text-white border-ink';
      case 'overdue': return 'bg-red text-white border-ink';
      case 'draft': return 'bg-paper text-ink border-ink';
      default: return 'bg-paper text-ink border-ink';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return '✅';
      case 'sent': return '📤';
      case 'viewed': return '👁️';
      case 'overdue': return '⚠️';
      case 'draft': return '📝';
      default: return '📄';
    }
  };

  return (
    <div className="min-h-screen bg-money-paper p-6" ref={containerRef}>
      {isPullRefreshing && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 md:hidden">
          <div className="bg-card rounded-full shadow-hard-sm border-2 border-ink p-3 animate-bounce">
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
            <h1 className="title-underline font-poster text-ink text-[42px] md:text-[48px] leading-none">Invoices</h1>
            <p className="text-ink/60 font-mono text-sm mt-3">Manage and track all your invoices</p>
          </div>
          
          <Link to={createPageUrl("CreateInvoice")}>
            <Button variant="signal">
              <Plus className="w-5 h-5 mr-2" />
              Create New Invoice
            </Button>
          </Link>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="card-hard card-hard-hover bg-money">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-mono font-medium text-white/80">Total Revenue</p>
                    <p className="text-2xl font-amount text-white">${stats.totalRevenue.toFixed(2)}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-white" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="card-hard card-hard-hover bg-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-mono font-medium text-ink-soft">Paid Amount</p>
                    <p className="text-2xl font-amount text-ink">${stats.paidAmount.toFixed(2)}</p>
                  </div>
                  <div className="w-8 h-8 bg-money rounded-md flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="card-hard card-hard-hover bg-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-mono font-medium text-ink-soft">Pending Amount</p>
                    <p className="text-2xl font-amount text-ink">${stats.pendingAmount.toFixed(2)}</p>
                  </div>
                  <div className="w-8 h-8 bg-mustard rounded-md flex items-center justify-center">
                    <Clock className="w-5 h-5 text-ink" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-ink-soft" />
                  <Input
                    placeholder="Search by client name or invoice number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-ink-soft" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="viewed">Viewed</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Invoices Table */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.5 }}
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="section-header text-sm text-ink">
                Invoices ({filteredInvoices.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredInvoices.length === 0 && !isLoading ? (
                <div className="text-center py-12">
                  <p className="font-mono text-ink text-lg">
                    {invoices.length === 0 ? "🧾 nothing printing yet" : "🔍 no matches on that filter"}
                  </p>
                  <p className="font-mono text-ink/60 mt-2 mb-6">
                    {invoices.length === 0
                      ? "go make some money — create your first invoice."
                      : "try adjusting your search or filter."
                    }
                  </p>
                  {invoices.length === 0 && (
                    <Link to={createPageUrl("CreateInvoice")}>
                      <Button variant="signal">
                        <Plus className="w-4 h-4 mr-2" />
                        Create First Invoice
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-paper">
                        <TableHead className="font-semibold">Invoice #</TableHead>
                        <TableHead className="font-semibold">Client</TableHead>
                        <TableHead className="font-semibold">Amount</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Due Date</TableHead>
                        <TableHead className="font-semibold">Created</TableHead>
                        <TableHead className="font-semibold text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.map((invoice, index) => (
                        <motion.tr
                          key={invoice.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-paper transition-colors cursor-pointer"
                          onClick={() => handleViewInvoice(invoice.id)}
                        >
                          <TableCell>
                            <span className="highlighter font-mono font-bold text-ink">{invoice.invoice_number}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <UserIcon className="w-4 h-4 text-ink-soft" />
                              <span>{invoice.client_name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">${invoice.total_amount?.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={`${getStatusColor(invoice.status)} border`}>
                              <span className="mr-1">{getStatusIcon(invoice.status)}</span>
                              {invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4 text-ink-soft" />
                              {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                            </div>
                          </TableCell>
                          <TableCell className="text-ink-soft">
                            {format(new Date(invoice.created_date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="w-8 h-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewInvoice(invoice.id);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}