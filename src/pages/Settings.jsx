
import { useState, useEffect } from "react";
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
  X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import CompanySettings from "../components/settings/CompanySettings";

export default function Settings() {
  const [presets, setPresets] = useState([]);
  const [user, setUser] = useState(null);
  const [showPresetForm, setShowPresetForm] = useState(false);
  const [editingPreset, setEditingPreset] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await User.me(); // Get current user
      const [presetsData, userData] = await Promise.all([
        PricingPreset.filter({ created_by: user.email }), // Filter by user
        user // We already have the user object
      ]);
      setPresets(presetsData);
      setUser(userData);
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

  const getCategoryColor = (category) => {
    const colors = {
      design: 'bg-purple-100 text-purple-800',
      video: 'bg-red-100 text-red-800',
      print: 'bg-blue-100 text-blue-800',
      installation: 'bg-green-100 text-green-800',
      consultation: 'bg-orange-100 text-orange-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.other;
  };

  const getUnitTypeLabel = (unitType) => {
    const labels = {
      per_hour: 'Per Hour',
      per_piece: 'Per Piece',
      per_sqft: 'Per Sq Ft',
      per_linear_ft: 'Per Linear Ft',
      flat_rate: 'Flat Rate'
    };
    return labels[unitType] || unitType;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
            <SettingsIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
            <p className="text-slate-600 mt-1">Configure your INVIO preferences and pricing</p>
          </div>
        </motion.div>

        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-lg bg-slate-100">
            <TabsTrigger value="company" className="flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              Company
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Pricing Presets
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              Profile
            </TabsTrigger>
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
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-purple-600" />
                      SmartCalc™ Pricing Presets
                    </CardTitle>
                    <p className="text-slate-600 mt-1">
                      Set up pricing templates for quick calculations during voice invoicing
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowPresetForm(true)}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Preset
                  </Button>
                </CardHeader>

                <CardContent>
                  {presets.length === 0 ? (
                    <div className="text-center py-12">
                      <Calculator className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                      <h3 className="text-lg font-semibold text-slate-600 mb-2">No pricing presets yet</h3>
                      <p className="text-slate-500 mb-6">
                        Create presets to speed up your voice invoicing with pre-configured pricing
                      </p>
                      <Button
                        onClick={() => setShowPresetForm(true)}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
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
                          <Card className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h4 className="font-semibold text-slate-900">{preset.name}</h4>
                                  <p className="text-sm text-slate-600 mt-1">{preset.description}</p>
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
                                    className="w-8 h-8 text-red-600 hover:text-red-700"
                                    onClick={() => deletePreset(preset.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Badge className={getCategoryColor(preset.category)}>
                                  {preset.category}
                                </Badge>

                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-600">{getUnitTypeLabel(preset.unit_type)}</span>
                                  <span className="font-semibold text-green-600 flex items-center gap-1">
                                    <DollarSign className="w-4 h-4" />
                                    {preset.base_price}
                                  </span>
                                </div>
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
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-blue-900">💡 How SmartCalc™ Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-blue-800">
                    <strong>Voice Command Example:</strong> "Calculate price for full print and installation on a 50 ft by 5 ft wall."
                  </p>
                  <p className="text-blue-700">
                    <strong>INVIO Response:</strong> "The estimated total is approximately $3,750 (250 sq ft × $15/sq ft)."
                  </p>
                  <p className="text-sm text-blue-600">
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-purple-600" />
                    Profile Settings
                  </CardTitle>
                  <p className="text-slate-600">Manage your account information and preferences</p>
                </CardHeader>

                <CardContent className="space-y-6">
                  {user && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input value={user.full_name || ''} disabled className="bg-slate-50" />
                      </div>
                      <div className="space-y-2">
                        <Label>Email Address</Label>
                        <Input value={user.email || ''} disabled className="bg-slate-50" />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Role</Label>
                        <Input value={user.role || 'user'} disabled className="bg-slate-50" />
                      </div>
                      <div className="space-y-2">
                        <Label>Member Since</Label>
                        <Input
                          value={user.created_date ? new Date(user.created_date).toLocaleDateString() : ''}
                          disabled
                          className="bg-slate-50"
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <p className="text-sm text-slate-500">
                      Profile information is managed through your authentication provider.
                      Contact support if you need to make changes to your account details.
                    </p>
                  </div>
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
    description: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg w-full"
      >
        <Card>
          <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            <CardTitle className="flex items-center justify-between">
              <span>{preset ? 'Edit Preset' : 'Add New Preset'}</span>
              <Button variant="ghost" size="icon" onClick={onCancel} className="text-white hover:bg-white/20">
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
            </CardContent>

            <div className="flex justify-end gap-3 p-6 border-t bg-slate-50">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
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
