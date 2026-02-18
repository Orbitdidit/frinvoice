import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Save,
  Edit3,
  X,
  FileText,
  Calendar,
  DollarSign,
  User,
  Mail,
  RotateCcw,
  Sparkles,
  BookOpen,
  Trash2,
  PlusCircle,
  Image as ImageIcon,
  Loader2,
  GripVertical,
  ChevronDown,
  UserPlus,
  Phone,
  Building,
  Copy,
  BookmarkPlus
} from "lucide-react";
import { toast } from 'sonner';
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import LineItemImageUpload from "./LineItemImageUpload";
import ImageCarousel from "./ImageCarousel";
import { User as UserEntity } from "@/entities/User";
import { Client } from "@/entities/Client";
import { PricingPreset } from "@/entities/PricingPreset";
import { UploadFile } from "@/integrations/Core";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { MobileSelect, SelectItem } from "@/components/ui/mobile-select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import ClientForm from "../clients/ClientForm";

export default function InvoiceEditor({ invoiceData, onSave, onCancel, isEditing: initialIsEditing = false, isNew = false }) {
  const [editableData, setEditableData] = useState(() => {
    const dataWithDocType = {
      ...invoiceData,
      document_type: invoiceData.document_type || 'invoice'
    };
    const lineItemsWithIds = dataWithDocType.line_items ? dataWithDocType.line_items.map((item, index) => ({
      ...item,
      id: item.id || `item-${Date.now()}-${index}`
    })) : [];
    return { ...dataWithDocType, line_items: lineItemsWithIds };
  });
  const [isEditing, setIsEditing] = useState(initialIsEditing);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [carouselImages, setCarouselImages] = useState([]);
  const [showCarousel, setShowCarousel] = useState(false);
  const [userCompany, setUserCompany] = useState(null);
  const [isUploadingHero, setIsUploadingHero] = useState(false);
  const [clients, setClients] = useState([]);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);

  useEffect(() => {
    setEditableData(prev => {
      const lineItemsWithIds = prev.line_items.map((item, index) => ({
        ...item,
        id: item.id || `item-${Date.now()}-${index}`
      }));
      if (JSON.stringify(lineItemsWithIds.map(i => i.id)) !== JSON.stringify(prev.line_items.map(i => i.id))) {
        return { ...prev, line_items: lineItemsWithIds };
      }
      return prev;
    });

    loadUserCompanyInfo();
    loadClients();
  }, []);

  const loadUserCompanyInfo = async () => {
    try {
      const user = await UserEntity.me();
      setUserCompany(user);

      if (!editableData.notes && user.default_invoice_terms) {
        setEditableData(prev => ({
          ...prev,
          notes: user.default_invoice_terms
        }));
      }
    } catch (error) {
      console.error("Error loading user company info:", error);
    }
  };

  const loadClients = async () => {
    try {
      const clientData = await Client.list();
      setClients(clientData);
    } catch (error) {
      console.error("Error loading clients:", error);
    }
  };

  const handleClientSelect = (clientName) => {
    const selectedClient = clients.find(c => c.name === clientName);
    if (selectedClient) {
      setEditableData(prev => ({
        ...prev,
        client_name: selectedClient.name,
        client_email: selectedClient.email || '',
        client_phone: selectedClient.phone || '',
        client_company: selectedClient.company || ''
      }));
    }
    setClientSearchOpen(false);
  };

  const handleNewClientSave = async (clientData) => {
    try {
      await Client.create(clientData);
      await loadClients();
      
      // Auto-select the newly created client
      setEditableData(prev => ({
        ...prev,
        client_name: clientData.name,
        client_email: clientData.email || '',
        client_phone: clientData.phone || '',
        client_company: clientData.company || ''
      }));
      
      setShowClientForm(false);
    } catch (error) {
      console.error("Error creating client:", error);
    }
  };

  const handleFieldChange = (field, value) => {
    setEditableData(prev => {
      let newData = { ...prev, [field]: value };

      if (field === 'tax_rate') {
        return recalculateTotals(newData.line_items, newData);
      }
      return newData;
    });
  };

  useEffect(() => {
    if (!editableData.invoice_date) {
      const today = new Date().toISOString().split('T')[0];
      handleFieldChange('invoice_date', today);
    }
  }, []);

  const handleProjectImageUpload = async (file) => {
    if (!file) return;
    
    setIsUploadingHero(true);
    try {
      const result = await UploadFile({ file });
      if (result?.file_url) {
        handleFieldChange('project_hero_image_url', result.file_url);
      }
    } catch (error) {
      console.error("Error uploading project image:", error);
    } finally {
      setIsUploadingHero(false);
    }
  };

  const handleDateChange = (field, value) => {
    handleFieldChange(field, value);
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const handleLineItemChange = (index, field, value) => {
    const newLineItems = [...editableData.line_items];
    newLineItems[index] = { ...newLineItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = field === 'quantity' ? parseFloat(value) || 0 : parseFloat(newLineItems[index].quantity) || 0;
      const unitPrice = field === 'unit_price' ? parseFloat(value) || 0 : parseFloat(newLineItems[index].unit_price) || 0;
      newLineItems[index].total = quantity * unitPrice;
    }
    
    const newData = recalculateTotals(newLineItems, editableData);
    setEditableData(newData);
  };

  const handleLineItemImagesChange = (index, imageUrls) => {
    const newLineItems = [...editableData.line_items];
    newLineItems[index] = {
      ...newLineItems[index],
      file_urls: imageUrls,
      thumbnail_url: imageUrls[0] || newLineItems[index].thumbnail_url
    };
    setEditableData(prev => ({ ...prev, line_items: newLineItems }));
  };

  const openImageCarousel = (images) => {
    setCarouselImages(images);
    setShowCarousel(true);
  };

  const recalculateTotals = (lineItems, currentData) => {
    const subtotal = lineItems.reduce((sum, item) => {
      return sum + (item.is_discount ? 0 : (parseFloat(item.total) || 0));
    }, 0);

    const discountAmount = Math.abs(lineItems.reduce((sum, item) => {
      return sum + (item.is_discount ? (parseFloat(item.total) || 0) : 0);
    }, 0));

    const taxRate = parseFloat(currentData.tax_rate) || 0;
    const taxAmount = (subtotal - discountAmount) * (taxRate / 100);
    const totalAmount = subtotal - discountAmount + taxAmount;

    return {
      ...currentData,
      line_items: lineItems,
      subtotal,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      total_amount: totalAmount
    };
  };

  const handleRemoveLineItem = (index) => {
    const newLineItems = editableData.line_items.filter((_, i) => i !== index);
    const newData = recalculateTotals(newLineItems, editableData);
    setEditableData(newData);
  };

  const handleDuplicateLineItem = (index) => {
    const itemToDuplicate = editableData.line_items[index];
    const newItem = {
      ...itemToDuplicate,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    const newLineItems = [...editableData.line_items];
    newLineItems.splice(index + 1, 0, newItem);
    const newData = recalculateTotals(newLineItems, editableData);
    setEditableData(newData);
  };

  const handleSaveAsPreset = async (item) => {
    if (!item.description || !item.unit_price) return;
    try {
      await PricingPreset.create({
        name: item.description,
        description: item.detail || item.description,
        base_price: parseFloat(item.unit_price) || 0,
        unit_type: 'flat_rate',
        category: 'other'
      });
      toast.success("✅ Saved as preset!");
    } catch (error) {
      console.error("Error saving preset:", error);
    }
  };

  const handleAddLineItem = () => {
    const newItem = {
      id: `item-${Date.now()}`,
      description: "",
      detail: "",
      quantity: 1,
      unit_price: 0,
      total: 0,
      is_discount: false,
      file_urls: []
    };
    const newData = recalculateTotals([...editableData.line_items, newItem], editableData);
    setEditableData(newData);
  };

  const handleAddDiscountLineItem = () => {
    const newItem = {
      id: `discount-${Date.now()}`,
      description: "Discount",
      detail: "",
      quantity: 1,
      unit_price: 0,
      total: 0,
      is_discount: true,
      file_urls: []
    };
    const newData = recalculateTotals([...editableData.line_items, newItem], editableData);
    setEditableData(newData);
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(editableData.line_items);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setEditableData(prev => ({ ...prev, line_items: items }));
  };

  const handleSave = async () => {
    if (!editableData.client_name) {
      setError("Please enter a client name");
      return;
    }

    if (editableData.line_items.length === 0) {
      setError("Please add at least one line item");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      calculateTotals();
      const savePromise = onSave(editableData);
      toast.promise(savePromise, {
        loading: 'Saving...',
        success: 'Saved successfully!',
        error: 'Failed to save'
      });
      await savePromise;
    } catch (error) {
      console.error("Error saving invoice:", error);
      setError("Failed to save invoice. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateTotals = () => {
    const newData = recalculateTotals(editableData.line_items, editableData);
    setEditableData(newData);
  };

  const isClassic = editableData.template === 'classic';
  const isEstimate = editableData.document_type === 'estimate';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {isNew && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardHeader>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-green-900">Document Generated!</CardTitle>
                  <p className="text-green-700">Need changes? You can edit all details below before saving.</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800 px-4 py-2">
                ✨ AI Generated & Fully Editable
              </Badge>
            </div>
          </CardHeader>
        </Card>
      )}

      <div className="flex items-center justify-center flex-wrap gap-4">
        <MobileSelect
          value={editableData.document_type}
          onValueChange={(value) => handleFieldChange('document_type', value)}
          placeholder="Select type"
          className="w-[180px] bg-white dark:bg-slate-800 rounded-full"
        >
          <SelectItem value="invoice">Invoice</SelectItem>
          <SelectItem value="estimate">Estimate</SelectItem>
        </MobileSelect>
      
        <Button
          variant={!isClassic ? 'default' : 'outline'}
          onClick={() => handleFieldChange('template', 'modern')}
          className={`rounded-full transition-all duration-300 ${!isClassic ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' : ''}`}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Modern Style
        </Button>
        <Button
          variant={isClassic ? 'default' : 'outline'}
          onClick={() => handleFieldChange('template', 'classic')}
          className={`rounded-full transition-all duration-300 ${isClassic ? 'bg-slate-800 text-white' : ''}`}
        >
          <BookOpen className="w-4 h-4 mr-2" />
          Classic Style
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <Button
          onClick={handleSave}
          disabled={isProcessing}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 rounded-xl shadow-lg order-1"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Save {isEstimate ? 'Estimate' : 'Invoice'}
            </>
          )}
        </Button>
        <Button
            variant="outline"
            onClick={onCancel}
            className="px-6 py-3 rounded-xl order-2"
          >
            <X className="w-5 h-5 mr-2" />
            Cancel
        </Button>
      </div>

      <Card className={`shadow-xl transition-all duration-500 ${isClassic ? 'font-serif' : 'font-sans'}`}>
        <CardHeader className={`transition-all duration-500 ${isClassic ? 'bg-white border-b-2 border-black' : `text-white ${isEstimate ? 'bg-gradient-to-r from-cyan-800 to-blue-900' : 'bg-gradient-to-r from-slate-900 to-slate-800'}`}`}>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              {userCompany?.company_logo_url && (
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden bg-white p-2 flex-shrink-0">
                  <img
                    src={userCompany.company_logo_url}
                    alt={userCompany.company_name || "Company logo"}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div>
                <h2 className={`text-3xl font-bold ${isClassic ? 'text-black' : 'text-white'}`}>{isEstimate ? 'ESTIMATE' : 'INVOICE'}</h2>
                <p className={`mt-1 ${isClassic ? 'text-slate-600' : 'text-slate-300'}`}>
                  {isClassic ? (isEstimate ? 'Estimate Number' : 'Invoice Number') : `Professional ${isEstimate ? 'Estimate' : 'Invoice'}`}
                </p>
                {userCompany?.company_name && (
                  <p className={`text-lg font-semibold mt-1 ${isClassic ? 'text-slate-800' : 'text-slate-200'}`}>
                    {userCompany.company_name}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className={`text-sm ${isClassic ? 'text-slate-600' : 'text-slate-300'}`}>
                {isClassic ? '' : (isEstimate ? 'Estimate Number' : 'Invoice Number')}
              </p>
              <Input
                  value={editableData.invoice_number}
                  onChange={(e) => handleFieldChange('invoice_number', e.target.value)}
                  className={`mt-1 w-48 text-right font-bold text-2xl ${isClassic ? 'border-slate-400 bg-white text-black' : 'bg-white/20 border-white/30 text-white'}`}
                />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-6 md:mb-8">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Bill To</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowClientForm(true)}
                  className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  New Client
                </Button>
              </div>
              <div className="mt-2 space-y-2">
                {/* Client Name with Dropdown */}
                <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={clientSearchOpen}
                      className="w-full justify-between h-auto py-3"
                    >
                      <div className="flex items-center gap-2 text-left flex-1">
                        <User className="w-4 h-4 text-slate-500" />
                        <div className="flex-1 overflow-hidden">
                          {editableData.client_name ? (
                            <div>
                              <div className="font-semibold">{editableData.client_name}</div>
                              {editableData.client_company && (
                                <div className="text-xs text-slate-500">{editableData.client_company}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500">Select client or type new...</span>
                          )}
                        </div>
                      </div>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Search clients or type new..." 
                        value={editableData.client_name}
                        onValueChange={(value) => handleFieldChange('client_name', value)}
                      />
                      <CommandEmpty>
                        <div className="p-4 text-center">
                          <p className="text-sm text-slate-600 mb-3">No client found with that name</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              setClientSearchOpen(false);
                              setShowClientForm(true);
                            }}
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Create "{editableData.client_name}" as new client
                          </Button>
                        </div>
                      </CommandEmpty>
                      <CommandGroup className="max-h-[300px] overflow-auto">
                        {clients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={client.name}
                            onSelect={() => handleClientSelect(client.name)}
                            className="cursor-pointer"
                          >
                            <div className="flex items-start gap-3 py-2 w-full">
                              <User className="w-5 h-5 text-purple-600 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-slate-900">{client.name}</div>
                                {client.company && (
                                  <div className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                                    <Building className="w-3 h-3" />
                                    {client.company}
                                  </div>
                                )}
                                {client.email && (
                                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                    <Mail className="w-3 h-3" />
                                    {client.email}
                                  </div>
                                )}
                                {client.phone && (
                                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                    <Phone className="w-3 h-3" />
                                    {client.phone}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>

                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={editableData.client_contact_person || ''}
                    onChange={(e) => handleFieldChange('client_contact_person', e.target.value)}
                    placeholder="Contact Person (optional)"
                    className="pl-10"
                  />
                </div>

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={editableData.client_email || ''}
                    onChange={(e) => handleFieldChange('client_email', e.target.value)}
                    placeholder="Client Email"
                    type="email"
                    className="pl-10"
                  />
                </div>

                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={editableData.client_phone || ''}
                    onChange={(e) => handleFieldChange('client_phone', e.target.value)}
                    placeholder="Client Phone (optional)"
                    type="tel"
                    className="pl-10"
                  />
                </div>

                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={editableData.client_company || ''}
                    onChange={(e) => handleFieldChange('client_company', e.target.value)}
                    placeholder="Company/Business Name (optional)"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="md:text-right">
              <Label className="text-sm font-semibold text-slate-600 uppercase tracking-wide">{isEstimate ? 'Estimate Dates' : 'Invoice Dates'}</Label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center md:justify-end gap-2">
                  <span className="text-slate-700 font-medium">{isEstimate ? 'Issued Date:' : 'Issue Date:'}</span>
                  <Input
                      type="date"
                      value={formatDateForInput(editableData.invoice_date)}
                      onChange={(e) => handleDateChange('invoice_date', e.target.value)}
                      className="w-40"
                    />
                </div>
                <div className="flex items-center md:justify-end gap-2">
                  <span className="text-slate-700 font-medium">{isEstimate ? 'Valid Until:' : 'Due Date:'}</span>
                  <Input
                      type="date"
                      value={formatDateForInput(editableData.due_date)}
                      onChange={(e) => handleDateChange('due_date', e.target.value)}
                      className="w-40"
                    />
                </div>
              </div>
            </div>
          </div>

          {/* Project Showcase Image */}
          <div className="mb-8">
            <Label className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2 block">
              Project Showcase Image (Optional)
            </Label>
            {editableData.project_hero_image_url ? (
              <div className="relative group">
                <img 
                  src={editableData.project_hero_image_url} 
                  alt="Project showcase" 
                  className="w-full h-64 object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleFieldChange('project_hero_image_url', '')}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleProjectImageUpload(e.target.files[0])}
                  className="hidden"
                  id="hero-image-upload"
                  disabled={isUploadingHero}
                />
                <label htmlFor="hero-image-upload" className="cursor-pointer">
                  {isUploadingHero ? (
                    <Loader2 className="w-12 h-12 mx-auto text-slate-400 animate-spin" />
                  ) : (
                    <>
                      <ImageIcon className="w-12 h-12 mx-auto text-slate-400 mb-2" />
                      <p className="text-slate-600">Click to upload a showcase image</p>
                      <p className="text-xs text-slate-400 mt-1">Optional: Add a hero image to highlight your project</p>
                    </>
                  )}
                </label>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-lg font-semibold text-slate-800">Line Items</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddDiscountLineItem}
                  className="text-green-600 border-green-300 hover:bg-green-50"
                >
                  <DollarSign className="w-4 h-4 mr-1" />
                  Add Discount/Deposit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddLineItem}
                  className="text-purple-600 border-purple-300 hover:bg-purple-50"
                >
                  <PlusCircle className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </div>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="line-items">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                    {editableData.line_items.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`${item.is_discount ? 'bg-green-50 border-green-200' : 'bg-white'} ${snapshot.isDragging ? 'shadow-2xl rotate-2' : ''}`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div {...provided.dragHandleProps} className="mt-3">
                                  <GripVertical className="w-5 h-5 text-slate-400 cursor-grab active:cursor-grabbing" />
                                </div>

                                <div className="flex-1 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Input
                                      value={item.description}
                                      onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                                      placeholder={item.is_discount ? "Discount/Deposit Description" : "Item Description"}
                                      className="font-semibold"
                                    />
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleSaveAsPreset(item)}
                                      title="Save as Preset"
                                      className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                    >
                                      <BookmarkPlus className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDuplicateLineItem(index)}
                                      title="Duplicate Item"
                                      className="text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                                    >
                                      <Copy className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleRemoveLineItem(index)}
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>

                                  <Textarea
                                    value={item.detail}
                                    onChange={(e) => handleLineItemChange(index, 'detail', e.target.value)}
                                    placeholder="Additional details..."
                                    rows={2}
                                    className="text-sm"
                                  />

                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div>
                                      <Label className="text-xs text-slate-600">Quantity</Label>
                                      <Input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                                        min="0"
                                        step="0.01"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs text-slate-600">Unit Price</Label>
                                      <Input
                                        type="number"
                                        value={item.unit_price}
                                        onChange={(e) => handleLineItemChange(index, 'unit_price', e.target.value)}
                                        min="0"
                                        step="0.01"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <Label className="text-xs text-slate-600">Total</Label>
                                      <Input
                                        type="number"
                                        value={item.total}
                                        onChange={(e) => handleLineItemChange(index, 'total', e.target.value)}
                                        className="font-bold"
                                        step="0.01"
                                      />
                                    </div>
                                  </div>

                                  {!item.is_discount && (
                                    <LineItemImageUpload
                                      images={item.file_urls || []}
                                      onImagesChange={(urls) => handleLineItemImagesChange(index, urls)}
                                    />
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    </div>
                    )}
                    </Droppable>
                    </DragDropContext>

                    <div className="flex gap-2 justify-center mt-4 border-t pt-4 border-dashed border-slate-200">
                    <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddDiscountLineItem}
                    className="text-green-600 border-green-300 hover:bg-green-50"
                    >
                    <DollarSign className="w-4 h-4 mr-1" />
                    Add Discount/Deposit
                    </Button>
                    <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddLineItem}
                    className="text-purple-600 border-purple-300 hover:bg-purple-50"
                    >
                    <PlusCircle className="w-4 h-4 mr-1" />
                    Add Item
                    </Button>
                    </div>
                    </div>

                    {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-full md:w-96 space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-slate-600">Subtotal:</span>
                <span className="font-semibold text-lg">${(editableData.subtotal || 0).toFixed(2)}</span>
              </div>

              {editableData.discount_amount > 0 && (
                <div className="flex justify-between items-center py-2 border-b text-green-700">
                  <span>Discounts/Deposits:</span>
                  <span className="font-semibold">-${(editableData.discount_amount || 0).toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between items-center py-2 border-b">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">Tax Rate (%):</span>
                  <Input
                    type="number"
                    value={editableData.tax_rate || 0}
                    onChange={(e) => handleFieldChange('tax_rate', e.target.value)}
                    className="w-20 h-8"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
                <span className="font-semibold">${(editableData.tax_amount || 0).toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center py-4 bg-slate-900 text-white px-4 rounded-lg">
                <span className="text-xl font-bold">Total:</span>
                <span className="text-3xl font-bold">${(editableData.total_amount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2 block">
              Notes & Terms
            </Label>
            <Textarea
              value={editableData.notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="Payment terms, thank you message, or additional notes..."
              rows={4}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <Button
          onClick={handleSave}
          disabled={isProcessing}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 rounded-xl shadow-lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Save {isEstimate ? 'Estimate' : 'Invoice'}
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          className="px-6 py-3 rounded-xl"
        >
          <X className="w-5 h-5 mr-2" />
          Cancel
        </Button>
      </div>

      {/* Image Carousel */}
      <ImageCarousel
        images={carouselImages}
        isOpen={showCarousel}
        onClose={() => setShowCarousel(false)}
      />

      {/* Client Form Modal */}
      {showClientForm && (
        <ClientForm
          onSave={handleNewClientSave}
          onCancel={() => setShowClientForm(false)}
        />
      )}
    </motion.div>
  );
}