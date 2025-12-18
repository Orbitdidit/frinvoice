import React, { useState, useEffect } from 'react';
import { Client } from '@/entities/Client';
import { User } from '@/entities/User';
import { Plus, Search, Users, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ClientForm from '../components/clients/ClientForm';
import { motion } from 'framer-motion';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null); // State to hold client being edited

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    // Filter clients whenever 'clients' or 'searchTerm' changes
    const results = clients.filter(
      (client) =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.company && client.company.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredClients(results);
  }, [searchTerm, clients]);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const user = await User.me(); // Get current user
      // Filter clients by the current user's email (assuming user.email is unique identifier)
      const data = await Client.filter({ created_by: user.email }, "-created_date");
      setClients(data);
      // setFilteredClients will be updated by the useEffect hook
    } catch (error) {
      console.error('Error loading clients:', error);
      // Optionally, set an error state to display to the user
    } finally {
      setIsLoading(false);
    }
  };

  const handleClientSave = async (clientData) => {
    try {
      const user = await User.me(); // Get current user again for created_by
      const dataToSave = { ...clientData, created_by: user.email };

      if (editingClient) {
        // If editingClient is set, it's an update operation
        await Client.update(editingClient.id, dataToSave);
        setEditingClient(null); // Clear editing client after update
      } else {
        // Otherwise, it's a new client creation
        await Client.create(dataToSave);
      }
      setShowForm(false); // Close the form
      loadClients(); // Reload clients to reflect changes
    } catch (error) {
      console.error('Error saving client:', error);
      // Handle save error, e.g., show a toast
    }
  };

  const handleEditClient = (client) => {
    setEditingClient(client); // Set the client to be edited
    setShowForm(true); // Open the form
  };

  const handleDeleteClient = async (clientId) => {
    if (window.confirm("Are you sure you want to delete this client? This action cannot be undone.")) {
      try {
        await Client.delete(clientId);
        loadClients(); // Reload clients after deletion
      } catch (error) {
        console.error("Error deleting client:", error);
        // Handle deletion error
      }
    }
  };

  const totalClients = clients.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Client Management</h1>
            <p className="text-slate-600 mt-1">Manage your client relationships</p>
          </div>

          <Button
            onClick={() => {
              setEditingClient(null); // Ensure no client is being edited when adding new
              setShowForm(true);
            }}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Client
          </Button>
        </motion.div>

        {/* Stats Card (simplified) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Total Clients</p>
                    <p className="text-2xl font-bold text-blue-800">{totalClients}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
          {/* Removed Total Revenue and Top Client cards as per outline's implied scope */}
        </div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search clients by name, email, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Clients Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                  <CardTitle>Client Portal & Directory</CardTitle>
                  <p className="text-sm text-slate-500 mt-1">Manage client details and history</p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="text-center py-12 text-slate-500">Loading clients...</div>
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-semibold text-slate-600 mb-2">
                    {clients.length === 0 ? "No clients yet" : "No clients match your search"}
                  </h3>
                  <p className="text-slate-500 mb-6">
                    {clients.length === 0
                      ? "Add your first client to start building relationships!"
                      : "Try adjusting your search terms"
                    }
                  </p>
                  {clients.length === 0 && (
                    <Button
                      onClick={() => setShowForm(true)}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Client
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell>{client.email}</TableCell>
                        <TableCell>{client.company || '-'}</TableCell>
                        <TableCell>{client.phone || '-'}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditClient(client)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteClient(client.id)}>
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

        {/* Client Form Modal */}
        {showForm && (
          <ClientForm
            client={editingClient} // Pass the client if editing, otherwise null for new
            onSave={handleClientSave}
            onCancel={() => {
              setShowForm(false);
              setEditingClient(null); // Clear editing client on cancel
            }}
          />
        )}
      </div>
    </div>
  );
}