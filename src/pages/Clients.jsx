import React, { useState, useEffect } from 'react';
import { Client } from '@/entities/Client';
import { User } from '@/entities/User';
import { Plus, Search, Users, Edit, Trash2, Mail, Phone, Building2, TrendingUp, FileText, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import ClientForm from '../components/clients/ClientForm';
import { motion, AnimatePresence } from 'framer-motion';

function getInitials(name) {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

const avatarGradients = [
  'from-purple-500 to-blue-500',
  'from-pink-500 to-rose-500',
  'from-cyan-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-green-500 to-emerald-500',
  'from-violet-500 to-purple-500',
];

function getGradient(name) {
  const idx = (name?.charCodeAt(0) || 0) % avatarGradients.length;
  return avatarGradients[idx];
}

function getPaymentTermLabel(term) {
  const map = { net_15: 'Net 15', net_30: 'Net 30', net_45: 'Net 45', due_on_receipt: 'Due on Receipt' };
  return map[term] || term || 'Net 30';
}

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  useEffect(() => { loadClients(); }, []);

  useEffect(() => {
    const results = clients.filter(c =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.company?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredClients(results);
  }, [searchTerm, clients]);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      const data = await Client.filter({ created_by: user.email }, '-total_revenue');
      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClientSave = async (clientData) => {
    try {
      const user = await User.me();
      const dataToSave = { ...clientData, created_by: user.email };
      if (editingClient) {
        await Client.update(editingClient.id, dataToSave);
        setEditingClient(null);
      } else {
        await Client.create(dataToSave);
      }
      setShowForm(false);
      loadClients();
    } catch (error) {
      console.error('Error saving client:', error);
    }
  };

  const handleDeleteClient = async (clientId) => {
    if (window.confirm("Are you sure you want to delete this client?")) {
      try {
        await Client.delete(clientId);
        loadClients();
      } catch (error) {
        console.error("Error deleting client:", error);
      }
    }
  };

  const totalRevenue = clients.reduce((sum, c) => sum + (c.total_revenue || 0), 0);
  const topClient = clients.reduce((top, c) => (!top || (c.total_revenue || 0) > (top.total_revenue || 0)) ? c : top, null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Client Directory</h1>
            <p className="text-slate-500 mt-1">{clients.length} client{clients.length !== 1 ? 's' : ''} in your network</p>
          </div>
          <Button onClick={() => { setEditingClient(null); setShowForm(true); }}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 rounded-xl shadow-lg">
            <Plus className="w-5 h-5 mr-2" />
            Add Client
          </Button>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-gradient-to-br from-purple-500 to-blue-600 border-0 shadow-lg shadow-purple-200">
              <CardContent className="p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Total Clients</p>
                    <p className="text-3xl font-bold mt-1">{clients.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 border-0 shadow-lg shadow-emerald-200">
              <CardContent className="p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm font-medium">Total Revenue</p>
                    <p className="text-3xl font-bold mt-1">${totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="col-span-2 md:col-span-1">
            <Card className="bg-gradient-to-br from-amber-500 to-orange-500 border-0 shadow-lg shadow-amber-200">
              <CardContent className="p-5 text-white">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-amber-100 text-sm font-medium">Top Client</p>
                    <p className="text-xl font-bold mt-1 truncate">{topClient?.name || '—'}</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Search */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 py-3 rounded-xl border-slate-200 bg-white shadow-sm text-base"
            />
          </div>
        </motion.div>

        {/* Client Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-48 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredClients.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-600 mb-2">
              {clients.length === 0 ? "No clients yet" : "No results found"}
            </h3>
            <p className="text-slate-400 mb-6">
              {clients.length === 0 ? "Add your first client to get started" : "Try a different search"}
            </p>
            {clients.length === 0 && (
              <Button onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                <Plus className="w-4 h-4 mr-2" /> Add First Client
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredClients.map((client, index) => (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.04 }}
                  layout
                >
                  <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-slate-100 rounded-2xl overflow-hidden bg-white">
                    <CardContent className="p-0">
                      {/* Card Top / Avatar Strip */}
                      <div className={`bg-gradient-to-r ${getGradient(client.name)} h-2`} />
                      
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getGradient(client.name)} flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0`}>
                              {getInitials(client.name)}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-slate-900 truncate">{client.name}</h3>
                              {client.company && (
                                <p className="text-sm text-slate-500 flex items-center gap-1 truncate">
                                  <Building2 className="w-3 h-3 flex-shrink-0" />
                                  {client.company}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setEditingClient(client); setShowForm(true); }}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-purple-600 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClient(client.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-1.5 mb-4">
                          {client.email && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span className="truncate">{client.email}</span>
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span>{client.phone}</span>
                            </div>
                          )}
                        </div>

                        {/* Stats Footer */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="text-center">
                              <p className="text-xs text-slate-400">Invoices</p>
                              <p className="text-sm font-bold text-slate-700 flex items-center gap-0.5">
                                <FileText className="w-3 h-3" />
                                {client.total_invoices || 0}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-slate-400">Revenue</p>
                              <p className="text-sm font-bold text-emerald-600">${(client.total_revenue || 0).toLocaleString()}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs text-slate-500 border-slate-200">
                            {getPaymentTermLabel(client.payment_terms)}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Client Form Modal */}
      {showForm && (
        <ClientForm
          client={editingClient}
          onSave={handleClientSave}
          onCancel={() => { setShowForm(false); setEditingClient(null); }}
        />
      )}
    </div>
  );
}