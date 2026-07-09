import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Mic,
  Square,
  Volume2,
  MessageCircle,
  X,
  ArrowLeft,
  Settings,
  Sparkles,
  Gauge
} from "lucide-react";
import { voiceConversationAdvanced } from "@/functions/voiceConversationAdvanced";
import VoiceSetupGuide from "./VoiceSetupGuide";

export default function VoiceConversation({ onInvoiceDataGenerated, onClose }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [lastAiResponse, setLastAiResponse] = useState("");
  
  // 🚀 NEW: Quality Settings
  const [voiceQuality, setVoiceQuality] = useState('fast'); // fast | premium
  const [transcriptionQuality, setTranscriptionQuality] = useState('fast');
  const [servicesUsed, setServicesUsed] = useState({ stt: '', tts: '' });
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const conversationHistoryRef = useRef("");

  const startConversation = async () => {
    console.log("🎤 Starting conversation...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      });
      
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
        }
      }
      
      const options = mimeType ? { mimeType } : {};
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        setIsProcessing(true);
        stream.getTracks().forEach(track => track.stop());

        if (audioChunksRef.current.length === 0) {
          alert("No audio data recorded. Please try again.");
          setIsProcessing(false);
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const extension = mimeType.includes('mp4') ? 'm4a' : 'webm';
        const audioFile = new File([audioBlob], `conversation.${extension}`, { type: mimeType });
        
        audioChunksRef.current = [];

        try {
          const formData = new FormData();
          formData.append('audio', audioFile);
          formData.append('conversation_history', conversationHistoryRef.current);
          formData.append('voice_quality', voiceQuality);
          formData.append('transcription_quality', transcriptionQuality);
          
          const response = await voiceConversationAdvanced(formData);

          const aiResponseText = response.headers['X-AI-Response'] || response.headers?.get?.('X-AI-Response') || 'I heard you!';
          const userText = response.headers['X-User-Text'] || response.headers?.get?.('X-User-Text') || '';
          const sttService = response.headers['X-STT-Service'] || response.headers?.get?.('X-STT-Service') || '';
          const ttsService = response.headers['X-TTS-Service'] || response.headers?.get?.('X-TTS-Service') || '';
          
          setLastAiResponse(aiResponseText);
          setCurrentTranscript(userText);
          setServicesUsed({ stt: sttService, tts: ttsService });
          
          await playAudioResponse(response.data);
          
          conversationHistoryRef.current += `\nUser: ${userText}\nINVIO: ${aiResponseText}`;
          
          setConversationHistory(prev => [...prev, 
            { type: 'user', text: userText },
            { type: 'ai', text: aiResponseText }
          ]);

        } catch (error) {
          console.error("Conversation error:", error);
          alert(`Error: ${error.response?.data?.error || error.message || 'Voice conversation failed'}`);
        } finally {
          setIsProcessing(false);
        }
      };

      setIsRecording(true);
      mediaRecorderRef.current.start(100);
      
    } catch (error) {
      console.error("Error starting conversation:", error);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    console.log("🛑 Stopping recording...");
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playAudioResponse = async (audioData) => {
    try {
      setIsPlaying(true);
      const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
    } catch (error) {
      console.error("Error playing audio:", error);
      setIsPlaying(false);
    }
  };

  const endConversation = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
    setIsRecording(false);
    setIsProcessing(false);
    setIsPlaying(false);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
    >
      <Card className="w-full max-w-lg bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200 shadow-2xl">
        <CardHeader className="text-center bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={endConversation}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-xl">🚀 Advanced Voice AI</CardTitle>
                <p className="text-purple-100 text-sm">Multi-Service AI Pipeline</p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={endConversation}
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 md:p-8 space-y-6">
          <VoiceSetupGuide />

          {/* 🎛️ NEW: Quality Controls */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-white rounded-lg border">
            <div>
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Gauge className="w-4 h-4" />
                Voice Quality
              </label>
              <Select value={voiceQuality} onValueChange={setVoiceQuality} disabled={isRecording || isProcessing}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fast">⚡ Fast (OpenAI TTS)</SelectItem>
                  <SelectItem value="premium">🎭 Premium (ElevenLabs)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Recognition
              </label>
              <Select value={transcriptionQuality} onValueChange={setTranscriptionQuality} disabled={isRecording || isProcessing}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fast">⚡ Fast (Whisper)</SelectItem>
                  <SelectItem value="premium">🎯 Premium (Deepgram)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status Display */}
          <div className="text-center space-y-3">
            {isPlaying ? (
              <motion.div className="space-y-2" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                  <Volume2 className="w-10 h-10 text-green-600 animate-pulse" />
                </div>
                <Badge className="bg-green-100 text-green-800">🗣️ INVOX Speaking...</Badge>
                {lastAiResponse && <p className="text-sm text-slate-600 italic">"{lastAiResponse}"</p>}
                {servicesUsed.tts && (
                  <Badge variant="outline" className="text-xs">
                    {servicesUsed.tts}
                  </Badge>
                )}
              </motion.div>
            ) : isProcessing ? (
              <motion.div className="space-y-2" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-10 h-10 text-blue-600 animate-spin" />
                </div>
                <Badge className="bg-blue-100 text-blue-800">🧠 AI Processing...</Badge>
                {currentTranscript && <p className="text-sm text-slate-600">You said: "{currentTranscript}"</p>}
                {servicesUsed.stt && (
                  <Badge variant="outline" className="text-xs">
                    {servicesUsed.stt}
                  </Badge>
                )}
              </motion.div>
            ) : isRecording ? (
              <motion.div className="space-y-2" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center animate-pulse">
                  <Mic className="w-10 h-10 text-red-600" />
                </div>
                <Badge className="bg-red-100 text-red-800">🎤 Listening... Speak now</Badge>
              </motion.div>
            ) : (
              <motion.div className="space-y-2" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                <div className="w-20 h-20 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
                  <Mic className="w-10 h-10 text-purple-600" />
                </div>
                <Badge className="bg-purple-100 text-purple-800">🚀 Advanced AI Ready</Badge>
              </motion.div>
            )}

            <h3 className="text-xl font-semibold text-slate-800">
              {isPlaying 
                ? "INVOX is responding with premium AI voice..." 
                : isProcessing 
                ? "Multiple AI services working on your request..." 
                : isRecording 
                ? "I'm listening - tell me about your invoice needs" 
                : "Click and hold the microphone button below to start talking"}
            </h3>
          </div>

          {/* Action Button - FIXED */}
          <div className="flex justify-center">
            <Button
              onClick={isRecording ? stopRecording : startConversation}
              onMouseDown={!isRecording ? startConversation : undefined}
              onMouseUp={isRecording ? stopRecording : undefined}
              onTouchStart={!isRecording ? startConversation : undefined}
              onTouchEnd={isRecording ? stopRecording : undefined}
              disabled={isProcessing || isPlaying}
              className={`w-24 h-24 rounded-full shadow-lg transition-all duration-200 cursor-pointer ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 scale-110' 
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
              } ${(isProcessing || isPlaying) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
            >
              {isRecording ? (
                <Square className="w-8 h-8 text-white" fill="white" />
              ) : (
                <Mic className="w-8 h-8 text-white" />
              )}
            </Button>
          </div>

          <div className="text-center text-sm text-slate-600">
            {isRecording ? (
              <p className="text-red-600 font-semibold">🔴 Recording... Click again to stop</p>
            ) : (
              <p>Click the microphone to start your conversation with INVOX</p>
            )}
          </div>

          {/* Conversation History */}
          {conversationHistory.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-2 bg-white rounded-lg p-3 border">
              {conversationHistory.slice(-4).map((item, index) => (
                <div key={index} className={`text-sm ${item.type === 'user' ? 'text-blue-700' : 'text-purple-700'}`}>
                  <strong>{item.type === 'user' ? 'You:' : 'INVOX:'}</strong> {item.text}
                </div>
              ))}
            </div>
          )}

          {/* Powered by Badge */}
          <div className="flex items-center justify-center gap-2 text-sm text-purple-700 font-medium">
            <Sparkles className="w-4 h-4" />
            <span>Multi-Service AI Pipeline</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}