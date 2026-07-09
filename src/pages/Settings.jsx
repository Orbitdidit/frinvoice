import { useState, useEffect } from "react";
import { Invoice } from "@/entities/Invoice";
import { Client } from "@/entities/Client";
import { PricingPreset } from "@/entities/PricingPreset";
import { User } from "@/entities/User";
import {
  Settings as SettingsIcon,
  Calculator,
  User as UserIcon,
  Plus,
  Edit,
  Trash2,
  Save,
  DollarSign,
  X,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Trash,
  Ruler,
  Building2
} from "lucide-react";
import { PaymentConfig } from "@/entities/PaymentConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";
import CompanySettings from "../components/settings/CompanySettings";
import StripeSettings from "../components/settings/StripeSettings";
import { base44 } from "@/api/base44Client";

export default function Settings() {
  const [presets, setPresets] = useState([]);
  const [user, setUser] = useState(null);
  const [showPresetForm, setShowPresetForm] = useState(false);
  const [editingPreset, setEditingPreset] = useState(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isDeletingDrafts, setIsDeletingDrafts] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await User.me();
      // RLS scopes presets to the owner — no manual created_by filter (records may lack that field)
      const presetsData = await PricingPreset.list('-created_date', 500);
      setPresets(presetsData);
      setUser(user);
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const savePreset = async (presetData) => {
    try {
      if (editingPreset) {
        await PricingPreset.update(editingPreset.id, presetData);
      } else {
        // Ensure created_by is set for new presets
        if (user && user.email) {
          presetData.created_by = user.email;
        }
        await PricingPreset.create(presetData);
      }
      setShowPresetForm(false);
      setEditingPreset(null);
      loadData();
    } catch (error) {
      console.error("Error saving preset:", error);
    }
  };

  const deletePreset = async (presetId) => {
    try {
      await PricingPreset.delete(presetId);
      loadData();
    } catch (error) {
      console.error("Error deleting preset:", error);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const currentUser = await User.me();
      
      // Delete all user's data
      const [invoices, clients, pricingPresets, paymentConfigs] = await Promise.all([
        Invoice.filter({ created_by: currentUser.email }),
        Client.filter({ created_by: currentUser.email }),
        PricingPreset.filter({ created_by: currentUser.email }),
        PaymentConfig.filter({ created_by: currentUser.email })
      ]);

      // Delete all records
      await Promise.all([
        ...invoices.map(inv => Invoice.delete(inv.id)),
        ...clients.map(client => Client.delete(client.id)),
        ...pricingPresets.map(preset => PricingPreset.delete(preset.id)),
        ...paymentConfigs.map(config => PaymentConfig.delete(config.id))
      ]);

      // Logout after deletion
      await base44.auth.logout();
    } catch (error) {
      console.error("Error deleting account:", error);
      setIsDeletingAccount(false);
    }
  };

  const handleDeleteAllDrafts = async () => {
    setIsDeletingDrafts(true);
    try {
      await Invoice.deleteMany({ status: "draft" });
    } catch (error) {
      console.error("Error deleting draft invoices:", error);
    } finally {
      setIsDeletingDrafts(false);
    }
  };

  const getCategoryColor = () => 'bg-ink text-paper';

  const getUnitTypeLabel = (unitType) => {
    const labels = {
      per_hour: 'Per Hour',
      per_piece: 'Per Piece',
      per_sqft: 'Per Sq Ft',
      per_linear_ft: 'Per Linear Ft',
      per_panel: 'Per Panel',
      flat_rate: 'Flat Rate'
    };
    return labels[unitType] || unitType;
  };

  const TABS = [
    { value: 'company', label: 'Company', icon: Building2 },
    { value: 'pricing', label: 'Pricing Presets', icon: Calculator },
    { value: 'profile', label: 'Profile', icon: UserIcon },
    { value: 'payments', label: 'Payments', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-money-paper p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <p className="text-xs font-mono font-semibold tracking-[0.2em] uppercase text-money">Configure INVOX</p>
          <h1 className="text-3xl md:text-4xl font-heading font-extrabold text-ink tracking-tight title-underline">Settings</h1>
        </div>

        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 max-w-2xl gap-2 bg-transparent p-0 h-auto">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center justify-center gap-2 py-2.5 rounded-md border-2 border-ink bg-card text-ink shadow-hard-sm font-mono text-xs md:text-sm font-semibold uppercase tracking-wide data-[state=active]:bg-ink data-[state=active]:text-paper"
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Company Tab */}
          <TabsContent value="company">
            <CompanySettings />
          </TabsContent>

          {/* Pricing Presets Tab */}
          <TabsContent value="pricing" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-2 border-ink shadow-hard">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-money mb-1">RateCalc</p>
                    <CardTitle className="flex items-center gap-2 font-heading font-extrabold text-ink">
                      <Calculator className="w-5 h-5 text-ink" />
                      Pricing Presets
                    </CardTitle>
                    <p className="text-ink-soft font-mono text-sm mt-1">
                      Set up pricing templates with optional item dimensions for auto-calculating quantities from target areas
                    </p>
                  </div>
                  <Button
                    variant="signal"
                    onClick={() => setShowPresetForm(true)}
                    className="font-mono uppercase tracking-wide"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Preset
                  </Button>
                </CardHeader>

                <CardContent>
                  {presets.length === 0 ? (
                    <div className="text-center py-12">
                      <Calculator className="w-16 h-16 mx-auto mb-4 text-ink/20" />
                      <h3 className="text-lg font-heading font-extrabold text-ink mb-2">No pricing presets yet</h3>
                      <p className="text-ink-soft font-mono mb-6">
                        Create presets to speed up your voice invoicing with pre-configured pricing
                      </p>
                      <Button
                        variant="signal"
                        onClick={() => setShowPresetForm(true)}
                        className="font-mono uppercase tracking-wide"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create First Preset
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {presets.map((preset, index) => (
                        <motion.div
                          key={preset.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Card className="border-2 border-ink shadow-hard-sm hover:-translate-x-[1px] hover:-translate-y-[1px] transition-transform">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h4 className="font-heading font-extrabold text-ink">{preset.name}</h4>
                                  <p className="text-sm font-mono text-ink-soft mt-1">{preset.description}</p>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-8 h-8"
                                    onClick={() => {
                                      setEditingPreset(preset);
                                      setShowPresetForm(true);
                                    }}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-8 h-8 text-red hover:text-red"
                                    onClick={() => deletePreset(preset.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <span className="inline-block text-[10px] font-mono font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-ink text-paper">
                                  {preset.category}
                                </span>

                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-mono text-ink-soft">{getUnitTypeLabel(preset.unit_type)}</span>
                                  <span className="font-amount text-money flex items-center gap-0.5">
                                    <DollarSign className="w-4 h-4" />
                                    {preset.base_price}
                                  </span>
                                </div>

                                {preset.item_dimension_width && (
                                  <div className="flex items-center gap-1 text-xs font-mono text-ink bg-paper border border-ink rounded px-2 py-1">
                                    <Ruler className="w-3 h-3" />
                                    {preset.item_dimension_width}{preset.item_dimension_unit} × {preset.item_dimension_height}{preset.item_dimension_unit}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Example Usage */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-paper border-2 border-ink shadow-hard">
                <CardHeader>
                  <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-money mb-1">Tip</p>
                  <CardTitle className="font-heading font-extrabold text-ink">How RateCalc Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 font-mono text-sm text-ink">
                  <p>
                    <strong className="font-heading">Voice Command Example:</strong> "Calculate price for full print and installation on a 50 ft by 5 ft wall."
                  </p>
                  <p>
                    <strong className="font-heading">INVOX Response:</strong> "The estimated total is approximately $3,750 (250 sq ft × $15/sq ft)."
                  </p>
                  <p className="text-ink-soft">
                    Set up presets for your most common services to get instant, accurate pricing during client consultations.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-2 border-ink shadow-hard">
                <CardHeader>
                  <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-money mb-1">Account</p>
                  <CardTitle className="flex items-center gap-2 font-heading font-extrabold text-ink">
                    <UserIcon className="w-5 h-5 text-ink" />
                    Profile Settings
                  </CardTitle>
                  <p className="text-ink-soft font-mono text-sm">Manage your account information and preferences</p>
                </CardHeader>

                <CardContent className="space-y-6">
                  {user && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="font-mono text-xs uppercase tracking-wide text-ink-soft">Full Name</Label>
                        <Input value={user.full_name || ''} disabled className="bg-paper border-[1.5px] border-ink font-mono rounded" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-mono text-xs uppercase tracking-wide text-ink-soft">Email Address</Label>
                        <Input value={user.email || ''} disabled className="bg-paper border-[1.5px] border-ink font-mono rounded" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-mono text-xs uppercase tracking-wide text-ink-soft">Account Role</Label>
                        <Input value={user.role || 'user'} disabled className="bg-paper border-[1.5px] border-ink font-mono rounded" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-mono text-xs uppercase tracking-wide text-ink-soft">Member Since</Label>
                        <Input
                          value={user.created_date ? new Date(user.created_date).toLocaleDateString() : ''}
                          disabled
                          className="bg-paper border-[1.5px] border-ink font-mono rounded"
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t space-y-4">
                    <p className="text-sm text-slate-500">
                      Profile information is managed through your authentication provider.
                      Contact support if you need to make changes to your account details.
                    </p>
                    
                    <div className="pt-4 border-t border-red-200">
                      <h4 className="text-sm font-semibold text-red-900 mb-2">Danger Zone</h4>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="border-red-300 text-red-700 hover:bg-red-50"
                            disabled={isDeletingDrafts}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {isDeletingDrafts ? "Deleting..." : "Delete All Drafts"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete all draft invoices?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete every invoice with "draft" status.
                              Sent, paid, and other invoices are not affected. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDeleteAllDrafts}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Yes, delete all drafts
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <p className="text-xs text-red-600 mt-2">
                        ⚠️ Removes all draft invoices. Other statuses remain untouched.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-red-200">
                      <h4 className="text-sm font-semibold text-red-900 mb-2">Account</h4>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="destructive" 
                            className="bg-red-600 hover:bg-red-700"
                            disabled={isDeletingAccount}
                          >
                            <Trash className="w-4 h-4 mr-2" />
                            {isDeletingAccount ? "Processing..." : "Delete Account"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete your account
                              and remove your data from our servers. All your invoices, clients, and
                              settings will be lost.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDeleteAccount}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Yes, delete my account
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <p className="text-xs text-red-600 mt-2">
                        ⚠️ This will permanently delete all your data. This action cannot be reversed.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-2 border-ink shadow-hard">
                <CardHeader>
                  <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-money mb-1">Get paid</p>
                  <CardTitle className="flex items-center gap-2 font-heading font-extrabold text-ink">
                    <CreditCard className="w-5 h-5 text-ink" />
                    Payment Integrations
                  </CardTitle>
                  <p className="text-ink-soft font-mono text-sm">Manage how you accept payments from clients</p>
                </CardHeader>
                <CardContent>
                  <StripeSettings />
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Preset Form Modal */}
        {showPresetForm && (
          <PresetForm
            preset={editingPreset}
            onSave={savePreset}
            onCancel={() => {
              setShowPresetForm(false);
              setEditingPreset(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

// Preset Form Component
function PresetForm({ preset, onSave, onCancel }) {
  const [formData, setFormData] = useState(preset || {
    name: "",
    category: "design",
    unit_type: "per_hour",
    base_price: 0,
    description: "",
    item_dimension_width: null,
    item_dimension_height: null,
    item_dimension_unit: "mm"
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Clean up dimension fields if not per_panel
    const dataToSave = { ...formData };
    if (formData.unit_type !== "per_panel") {
      dataToSave.item_dimension_width = null;
      dataToSave.item_dimension_height = null;
    }
    onSave(dataToSave);
  };

  const isPerPanel = formData.unit_type === "per_panel";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg w-full"
      >
        <Card className="border-2 border-ink shadow-hard-lg">
          <CardHeader className="bg-ink text-paper">
            <CardTitle className="flex items-center justify-between font-heading font-extrabold">
              <span>{preset ? 'Edit Preset' : 'Add New Preset'}</span>
              <Button variant="ghost" size="icon" onClick={onCancel} className="text-paper hover:bg-white/20">
                <X className="w-5 h-5" />
              </Button>
            </CardTitle>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Preset Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Logo Design Standard"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({...formData, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="design">Design</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="print">Print</SelectItem>
                      <SelectItem value="installation">Installation</SelectItem>
                      <SelectItem value="consultation">Consultation</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Unit Type</Label>
                  <Select
                    value={formData.unit_type}
                    onValueChange={(value) => setFormData({...formData, unit_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_hour">Per Hour</SelectItem>
                      <SelectItem value="per_piece">Per Piece</SelectItem>
                      <SelectItem value="per_sqft">Per Sq Ft</SelectItem>
                      <SelectItem value="per_linear_ft">Per Linear Ft</SelectItem>
                      <SelectItem value="per_panel">Per Panel (with dimensions)</SelectItem>
                      <SelectItem value="flat_rate">Flat Rate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Base Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.base_price}
                  onChange={(e) => setFormData({...formData, base_price: parseFloat(e.target.value)})}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Brief description of this preset"
                />
              </div>

              {isPerPanel && (
                <div className="space-y-3 p-4 rounded-md bg-paper border-2 border-ink">
                  <div className="flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-ink" />
                    <p className="text-sm font-heading font-extrabold text-ink">Item Dimensions</p>
                  </div>
                  <p className="text-xs font-mono text-ink-soft">
                    Enter the physical size of a single panel/unit. RateCalc uses this to calculate how many fit in a target area.
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Width</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={formData.item_dimension_width || ""}
                        onChange={(e) => setFormData({...formData, item_dimension_width: parseFloat(e.target.value) || null})}
                        placeholder="640"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Height</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={formData.item_dimension_height || ""}
                        onChange={(e) => setFormData({...formData, item_dimension_height: parseFloat(e.target.value) || null})}
                        placeholder="480"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Unit</Label>
                      <Select
                        value={formData.item_dimension_unit || "mm"}
                        onValueChange={(value) => setFormData({...formData, item_dimension_unit: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mm">mm</SelectItem>
                          <SelectItem value="cm">cm</SelectItem>
                          <SelectItem value="m">m</SelectItem>
                          <SelectItem value="in">in</SelectItem>
                          <SelectItem value="ft">ft</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>

            <div className="flex justify-end gap-3 p-6 border-t-2 border-ink bg-paper">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" variant="money" className="font-mono uppercase tracking-wide">
                <Save className="w-4 h-4 mr-2" />
                Save Preset
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}