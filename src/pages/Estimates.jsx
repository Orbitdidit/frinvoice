
import { useState, useEffect } from "react";
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
  FileText
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

export default function Estimates() {
  const navigate = useNavigate();
  const [estimates, setEstimates] = useState([]);
  const [filteredEstimates, setFilteredEstimates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadEstimates();
  }, []);

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

  const getStatusColor = (status) => {
    const colors = {
      draft: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      viewed: "bg-purple-100 text-purple-800",
      accepted: "bg-green-100 text-green-800",
      declined: "bg-red-100 text-red-800",
    };
    return colors[status] || colors.draft;
  };

  const getStatusIcon = (status) => {
    const icons = {
      draft: <Clock className="w-4 h-4" />,
      sent: <Send className="w-4 h-4" />,
      viewed: <Eye className="w-4 h-4" />,
      accepted: <CheckCircle className="w-4 h-4" />,
      declined: <XCircle className="w-4 h-4" />,
    };
    return icons[status] || icons.draft;
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <FileCheck className="w-8 h-8 text-purple-600" />
              Estimates
            </h1>
            <p className="text-slate-600 mt-1">Manage your project estimates and proposals</p>
          </div>

          <Button
            onClick={() => navigate(createPageUrl("CreateInvoice"))}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create New Estimate
          </Button>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Total Estimates</p>
                    <p className="text-2xl font-bold text-blue-800">{stats.total}</p>
                  </div>
                  <FileCheck className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700">Accepted</p>
                    <p className="text-2xl font-bold text-green-800">{stats.accepted}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-700">Pending</p>
                    <p className="text-2xl font-bold text-yellow-800">{stats.pending}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-700">Declined</p>
                    <p className="text-2xl font-bold text-red-800">{stats.declined}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search estimates by client, number, or notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
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
            </CardContent>
          </Card>
        </motion.div>

        {/* Estimates Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Your Estimates</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="text-center py-12 text-slate-500">Loading estimates...</div>
              ) : filteredEstimates.length === 0 ? (
                <div className="text-center py-12">
                  <FileCheck className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-semibold text-slate-600 mb-2">
                    {estimates.length === 0 ? "No estimates yet" : "No estimates match your search"}
                  </h3>
                  <p className="text-slate-500 mb-6">
                    {estimates.length === 0
                      ? "Create your first estimate to start winning more projects!"
                      : "Try adjusting your search terms or filters"
                    }
                  </p>
                  {estimates.length === 0 && (
                    <Button
                      onClick={() => navigate(createPageUrl("CreateInvoice"))}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Estimate
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estimate #</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEstimates.map((estimate) => (
                      <TableRow key={estimate.id}>
                        <TableCell className="font-medium">{estimate.invoice_number}</TableCell>
                        <TableCell>{estimate.client_name}</TableCell>
                        <TableCell>
                          {estimate.invoice_date ? new Date(estimate.invoice_date).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell className="font-semibold">
                          ${estimate.total_amount?.toFixed(2) || '0.00'}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(estimate.status)}>
                            {getStatusIcon(estimate.status)}
                            <span className="ml-1 capitalize">{estimate.status}</span>
                          </Badge>
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
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
