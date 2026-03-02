import React, { useState } from "react";
import { UploadFile } from "@/integrations/Core";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Building, Save, FileText, DollarSign, Calendar } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function CompanySettings() {
  const [userData, setUserData] = useState({
    company_name: "",
    company_logo_url: "",
    business_address: "",
    phone: "",
    website: "",
    default_invoice_terms: "",
    payment_details: "",
    default_due_days: "0"
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = await User.me();
      setUserData({
        company_name: user.company_name || "",
        company_logo_url: user.company_logo_url || "",
        business_address: user.business_address || "",
        phone: user.phone || "",
        website: user.website || "",
        default_invoice_terms: user.default_invoice_terms || "",
        payment_details: user.payment_details || "",
        default_due_days: user.default_due_days !== undefined ? String(user.default_due_days) : "0"
      });
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const handleLogoUpload = async (file) => {
    if (!file) return;
    
    setUploading(true);
    try {
      const result = await UploadFile({ file });
      setUserData(prev => ({
        ...prev,
        company_logo_url: result.file_url
      }));
    } catch (error) {
      console.error("Error uploading logo:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await User.updateMyUserData({ ...userData, default_due_days: parseInt(userData.default_due_days) || 0 });
      toast.success("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving user data:", error);
      toast.error("Error saving settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5 text-purple-600" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-4">
            <Label>Company Logo</Label>
            <div className="flex items-center gap-4">
              {userData.company_logo_url && (
                <div className="w-20 h-20 rounded-lg border-2 border-slate-200 overflow-hidden bg-slate-50">
                  <img
                    src={userData.company_logo_url}
                    alt="Company logo"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleLogoUpload(e.target.files[0])}
                  className="hidden"
                  id="logo-upload"
                  disabled={uploading}
                />
                <label htmlFor="logo-upload">
                  <Button variant="outline" disabled={uploading} asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? 'Uploading...' : 'Upload Logo'}
                    </span>
                  </Button>
                </label>
                <p className="text-sm text-slate-500 mt-1">
                  Recommended: PNG or JPG, max 2MB
                </p>
              </div>
            </div>
          </div>

          {/* Company Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input
                value={userData.company_name}
                onChange={(e) => setUserData(prev => ({ ...prev, company_name: e.target.value }))}
                placeholder="Your Company Name"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={userData.phone}
                onChange={(e) => setUserData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Business Address</Label>
            <Input
              value={userData.business_address}
              onChange={(e) => setUserData(prev => ({ ...prev, business_address: e.target.value }))}
              placeholder="123 Business St, City, State 12345"
            />
          </div>

          <div className="space-y-2">
            <Label>Website</Label>
            <Input
              value={userData.website}
              onChange={(e) => setUserData(prev => ({ ...prev, website: e.target.value }))}
              placeholder="https://yourcompany.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Invoice Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            Invoice Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              Default Due Date
            </Label>
            <select
              value={userData.default_due_days}
              onChange={(e) => setUserData(prev => ({ ...prev, default_due_days: e.target.value }))}
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="0">Due Today (same day)</option>
              <option value="7">Net 7 (7 days)</option>
              <option value="14">Net 14 (14 days)</option>
              <option value="15">Net 15 (15 days)</option>
              <option value="30">Net 30 (30 days)</option>
              <option value="45">Net 45 (45 days)</option>
              <option value="60">Net 60 (60 days)</option>
            </select>
            <p className="text-sm text-slate-500">Default due date for all new invoices.</p>
          </div>

          <div className="space-y-2">
            <Label>Default Terms & Conditions</Label>
            <Textarea
              value={userData.default_invoice_terms}
              onChange={(e) => setUserData(prev => ({ ...prev, default_invoice_terms: e.target.value }))}
              placeholder="Payment is due within 30 days..."
              rows={4}
            />
            <p className="text-sm text-slate-500">
              This text will automatically appear in the notes section of new invoices.
            </p>
          </div>
        </CardContent>
      </Card>

       {/* Payment Instructions */}
       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-purple-600" />
            Payment Instructions
          </CardTitle>
           <p className="text-slate-600">This information will be shown to your clients on their invoice.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>How to Pay</Label>
            <Textarea
              value={userData.payment_details}
              onChange={(e) => setUserData(prev => ({ ...prev, payment_details: e.target.value }))}
              placeholder="e.g., PayPal: yourname@example.com, Venmo: @your-name, Bank Transfer: ..."
              rows={4}
            />
            <p className="text-sm text-slate-500">
              Clearly list the ways your clients can pay you.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>

    </motion.div>
  );
}