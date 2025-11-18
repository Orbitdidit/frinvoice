
import React, { useState } from "react";
import { UploadFile } from "@/integrations/Core";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Building, Save, FileText, Banknote } from "lucide-react"; // Added Banknote icon
import { motion } from "framer-motion";

export default function LogoUpload() {
  const [userData, setUserData] = useState({
    company_name: "",
    company_logo_url: "",
    business_address: "",
    phone: "",
    website: "",
    default_invoice_terms: "",
    default_payment_instructions: "" // New field for payment instructions
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
        default_payment_instructions: user.default_payment_instructions || "" // Load payment instructions
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
      await User.updateMyUserData(userData);
      alert("Company information saved successfully!");
    } catch (error) {
      console.error("Error saving user data:", error);
      alert("Error saving information. Please try again.");
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

          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Company Information'}
          </Button>
        </CardContent>
      </Card>

      {/* Default Invoice Terms */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            Default Invoice Terms
          </CardTitle>
          <p className="text-slate-600">Set default terms and conditions that will appear on all new invoices</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Terms & Conditions</Label>
            <Textarea
              value={userData.default_invoice_terms}
              onChange={(e) => setUserData(prev => ({ ...prev, default_invoice_terms: e.target.value }))}
              placeholder="Payment is due within 30 days. Late fees may apply after due date. All work remains property of [Company] until payment is received in full."
              rows={4}
              className="resize-none"
            />
            <p className="text-sm text-slate-500">
              This text will automatically appear in the notes section of new invoices
            </p>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Default Terms'}
          </Button>
        </CardContent>
      </Card>

      {/* Default Payment Instructions */} {/* New Card section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-purple-600" />
            Default Payment Instructions
          </CardTitle>
          <p className="text-slate-600">Specify instructions for how customers can make payments for invoices</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Payment Instructions</Label>
            <Textarea
              value={userData.default_payment_instructions}
              onChange={(e) => setUserData(prev => ({ ...prev, default_payment_instructions: e.target.value }))}
              placeholder="Bank Transfer: Account Name, Bank Name, Account No, Sort Code. PayPal: your@email.com"
              rows={4}
              className="resize-none"
            />
            <p className="text-sm text-slate-500">
              This text will automatically appear in the payment section of new invoices
            </p>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Payment Instructions'}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
