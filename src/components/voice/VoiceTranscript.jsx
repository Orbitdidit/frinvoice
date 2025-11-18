import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export default function VoiceTranscript({ transcript, isProcessing }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <Card className="bg-slate-50 border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            Voice Transcript
            {isProcessing && (
              <Badge className="bg-blue-100 text-blue-800 ml-auto">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Processing...
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-white rounded-lg p-4 border min-h-[100px] max-h-[200px] overflow-y-auto">
            {transcript ? (
              <p className="text-slate-700 leading-relaxed">
                {transcript}
              </p>
            ) : (
              <p className="text-slate-400 italic">
                Your voice transcript will appear here...
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}