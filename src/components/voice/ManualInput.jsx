import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Keyboard, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export default function ManualInput({ value, onChange, isProcessing }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-4"
    >
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
          <Keyboard className="w-10 h-10 text-white" />
        </div>
        <Badge className="bg-indigo-100 text-indigo-800 px-4 py-2 mb-4">
          <MessageSquare className="w-4 h-4 mr-2" />
          Manual Text Input
        </Badge>
      </div>

      <Card className="bg-slate-50 border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-indigo-600" />
            Type Your Invoice Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="manual-input">Describe your invoice in natural language:</Label>
            <Textarea
              id="manual-input"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Type your invoice details here... For example: 'Create an invoice for ABC Company for logo design work, 5 hours at $100 per hour, plus website mockup for $300'"
              rows={6}
              className="bg-white border-2 border-slate-200 focus:border-indigo-500 transition-colors"
              disabled={isProcessing}
            />
          </div>
          
          {value && (
            <div className="mt-3 text-sm text-slate-600">
              <span className="font-medium">Character count:</span> {value.length}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-center text-sm text-slate-500 max-w-md mx-auto">
        <p>💡 <strong>Tip:</strong> Be as detailed as possible. Include client name, services, quantities, pricing, and any special discounts for best results.</p>
      </div>
    </motion.div>
  );
}