import React, { useState, useEffect } from "react";
import { Invoice } from "@/entities/Invoice";
import { Client } from "@/entities/Client";
import { User } from "@/entities/User"; // Import User
import { Link, useNavigate } from "react-router-dom"; // Added useNavigate
import { createPageUrl } from "@/utils";
import { 
  Mic, 
  TrendingUp, 
  FileText, 
  Users, 
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export default function Dashboard() {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate(); // Initialize useNavigate

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await User.me(); // Get current user
      const [invoiceData, clientData] = await Promise.all([
        Invoice.filter({ created_by: user.email }, "-created_date", 10), // Filter by user
        Client.filter({ created_by: user.email }, "-created_date", 5)   // Filter by user
      ]);
      setInvoices(invoiceData);
      setClients(clientData);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // FIXED REVENUE CALCULATION - Only count PAID invoices
  const totalRevenue = invoices
    .filter(inv => inv.status === 'paid' || inv.payment_status === 'paid')
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    
  const paidInvoices = invoices.filter(inv => inv.status === 'paid' || inv.payment_status === 'paid').length;
  const pendingInvoices = invoices.filter(inv => inv.status === 'sent').length;
  const overdueInvoices = invoices.filter(inv => inv.status === 'overdue').length;

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'viewed': return 'bg-purple-100 text-purple-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewClientInvoices = (clientName) => {
    navigate(createPageUrl(`Invoices?client=${encodeURIComponent(clientName)}`));
  };

  const handleViewInvoice = (invoiceId) => {
    navigate(createPageUrl(`InvoiceDetail?id=${invoiceId}`));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Welcome to INVIO
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Create professional invoices instantly with our intelligent AI assistant and voice features.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={createPageUrl("CreateInvoice")}>
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                <FileText className="w-5 h-5 mr-2" />
                Create New Invoice
              </Button>
            </Link>
            <Link to={createPageUrl("VoiceInvoice")}>
              <Button variant="outline" className="border-purple-200 hover:bg-purple-50 px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                <Mic className="w-5 h-5 mr-2" />
                Voice Invoice (Testing)
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">Total Revenue</CardTitle>
                <DollarSign className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-800 dark:text-green-300">${totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  All time earnings
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">Total Invoices</CardTitle>
                <FileText className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-800 dark:text-blue-300">{invoices.length}</div>
                <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center mt-1">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {paidInvoices} paid
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-400">Active Clients</CardTitle>
                <Users className="w-4 h-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-800 dark:text-purple-300">{clients.length}</div>
                <p className="text-xs text-purple-600 dark:text-purple-400">Registered clients</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800 hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-400">Pending</CardTitle>
                <Clock className="w-4 h-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-800 dark:text-orange-300">{pendingInvoices}</div>
                <p className="text-xs text-orange-600 dark:text-orange-400">Awaiting payment</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.5 }}
          className="grid md:grid-cols-2 gap-6"
        >
          <Card className="bg-gradient-to-br from-purple-600 to-blue-600 dark:from-purple-700 dark:to-blue-700 text-white border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-3">
                <FileText className="w-6 h-6" />
                Invoice Creator
              </CardTitle>
              <p className="text-purple-100">
                Create professional invoices quickly with our intelligent form system and AI assistance.
              </p>
            </CardHeader>
            <CardContent>
              <Link to={createPageUrl("CreateInvoice")}>
                <Button variant="secondary" className="w-full bg-white/20 hover:bg-white/30 text-white border-white/20">
                  Create New Invoice
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700 text-white border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-3">
                <Mic className="w-6 h-6" />
                Voice Features
              </CardTitle>
              <p className="text-green-100">
                Use voice commands to create invoices naturally with our advanced AI voice recognition.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to={createPageUrl("VoiceInvoice")}>
                <Button variant="secondary" className="w-full bg-white/20 hover:bg-white/30 text-white border-white/20">
                  <Mic className="w-4 h-4 mr-2" />
                  Voice Invoice Creator
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <div className="grid md:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
            <Card className="hover:shadow-lg transition-all duration-300 bg-white dark:bg-slate-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">Recent Invoices</CardTitle>
                <Link to={createPageUrl("Invoices")}>
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                    <p className="font-medium">No invoices yet</p>
                    <p className="text-sm">Create your first invoice with voice commands!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invoices.slice(0, 5).map((invoice) => (
                      <div 
                        key={invoice.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                        onClick={() => handleViewInvoice(invoice.id)}
                      >
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-100">{invoice.client_name}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">#{invoice.invoice_number}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-800 dark:text-slate-100">${invoice.total_amount?.toFixed(2)}</p>
                          <Badge className={getStatusColor(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}>
            <Card className="hover:shadow-lg transition-all duration-300 bg-white dark:bg-slate-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">Top Clients</CardTitle>
                <Link to={createPageUrl("Clients")}>
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </CardHeader>
              <CardContent>
                {clients.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <Users className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                    <p className="font-medium">No clients yet</p>
                    <p className="text-sm">Add clients to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clients.slice(0, 5).map((client) => (
                      <div 
                        key={client.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                        onClick={() => handleViewClientInvoices(client.name)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-blue-400 rounded-lg flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {client.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-800 dark:text-slate-100">{client.name}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{client.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-800 dark:text-slate-100">${client.total_revenue?.toFixed(2) || '0.00'}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{client.total_invoices || 0} invoices</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}