import React, { useState, useEffect } from 'react';
import { Client } from '@/entities/Client';
import { Plus, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ClientForm from '../components/clients/ClientForm';
import ClientCard from '../components/clients/ClientCard';
import { motion, AnimatePresence } from 'framer-motion';

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
      // RLS already scopes clients to the current owner — no manual created_by filter
      const data = await Client.list('-total_revenue', 500);
      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClientSave = async (clientData) => {
    try {
      if (editingClient) {
        await Client.update(editingClient.id, clientData);
        setEditingClient(null);
      } else {
        await Client.create(clientData);
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
    <div className="min-h-screen bg-money-paper p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <p className="text-xs font-mono font-semibold tracking-[0.2em] uppercase text-money">Your network</p>
            <h1 className="text-3xl md:text-4xl font-heading font-extrabold text-ink tracking-tight title-underline">Clients</h1>
          </div>
          <Button
            variant="signal"
            size="lg"
            onClick={() => { setEditingClient(null); setShowForm(true); }}
            className="font-mono uppercase tracking-wide"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Client
          </Button>
        </div>

        {/* Stat cards — pipeline style */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Total Clients */}
          <div className="bg-card rounded-md border-2 border-ink shadow-hard overflow-hidden">
            <div className="bg-ink px-4 py-2">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-paper">Total Clients</span>
            </div>
            <div className="p-4">
              <p className="font-amount text-3xl md:text-4xl text-ink">{clients.length}</p>
            </div>
          </div>

          {/* Top Client */}
          <div className="bg-card rounded-md border-2 border-ink shadow-hard overflow-hidden">
            <div className="bg-ink px-4 py-2">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-paper">Top Client</span>
            </div>
            <div className="p-4">
              <p className="font-heading font-extrabold text-lg md:text-xl text-ink truncate">{topClient?.name || '—'}</p>
            </div>
          </div>

          {/* Total Revenue — fully money-green blocked */}
          <div className="bg-money rounded-md border-2 border-ink shadow-hard overflow-hidden col-span-2 md:col-span-1">
            <div className="bg-green-dark px-4 py-2">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-white">Total Revenue</span>
            </div>
            <div className="p-4">
              <p className="font-amount text-3xl md:text-4xl text-white">${totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-soft" />
          <Input
            placeholder="Search by name, email, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 py-3 rounded-md border-2 border-ink bg-card shadow-hard-sm font-mono text-base"
          />
        </div>

        {/* Client grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-48 bg-card border-2 border-ink/20 rounded-md animate-pulse" />
            ))}
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-card border-2 border-ink rounded-md shadow-hard-sm flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-ink" />
            </div>
            <h3 className="text-lg font-heading font-extrabold text-ink mb-2">
              {clients.length === 0 ? "No clients yet" : "No results found"}
            </h3>
            <p className="text-ink-soft font-mono mb-6">
              {clients.length === 0 ? "Add your first client to get started" : "Try a different search"}
            </p>
            {clients.length === 0 && (
              <Button variant="signal" onClick={() => setShowForm(true)} className="font-mono uppercase tracking-wide">
                <Plus className="w-4 h-4 mr-2" /> Add First Client
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredClients.map((client, index) => (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: Math.min(index * 0.03, 0.3) }}
                  layout
                >
                  <ClientCard
                    client={client}
                    onEdit={(c) => { setEditingClient(c); setShowForm(true); }}
                    onDelete={handleDeleteClient}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
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