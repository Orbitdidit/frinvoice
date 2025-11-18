import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Settings, CheckCircle, AlertTriangle, Globe, RefreshCw, Zap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export default function VoiceSetupGuide({ showMobileGuide = true }) {
  const [micPermission, setMicPermission] = useState('unknown');
  const [isCheckingPermission, setIsCheckingPermission] = useState(false);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isChrome = /Chrome/i.test(navigator.userAgent);

  useEffect(() => {
    checkMicrophonePermission();
  }, []);

  const checkMicrophonePermission = async () => {
    setIsCheckingPermission(true);
    try {
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'microphone' });
        setMicPermission(permission.state);
        
        permission.onchange = () => {
          setMicPermission(permission.state);
        };
      } else {
        setMicPermission('unknown');
      }
    } catch (error) {
      console.log('Permission check not supported:', error);
      setMicPermission('unknown');
    } finally {
      setIsCheckingPermission(false);
    }
  };

  const requestMicrophonePermission = async () => {
    setIsCheckingPermission(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicPermission('granted');
    } catch (error) {
      setMicPermission('denied');
    } finally {
      setIsCheckingPermission(false);
    }
  };

  const getPermissionColor = () => {
    switch (micPermission) {
      case 'granted': return 'bg-green-50 border-green-200';
      case 'denied': return 'bg-red-50 border-red-200';
      case 'prompt': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  const getPermissionIcon = () => {
    switch (micPermission) {
      case 'granted': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'denied': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'prompt': return <Mic className="w-5 h-5 text-yellow-600" />;
      default: return <Mic className="w-5 h-5 text-blue-600" />;
    }
  };

  if (!showMobileGuide && !isMobile && micPermission === 'granted') return null;

  return (
    <Alert className={`mb-6 ${getPermissionColor()}`}>
      {getPermissionIcon()}
      <AlertDescription>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-900">
              🎤 Voice Setup for {isMobile ? (isIOS ? 'iPhone/iPad' : 'Mobile') : 'Desktop'}
            </p>
            <div className="flex items-center gap-2">
              <Badge className={
                micPermission === 'granted' ? 'bg-green-100 text-green-800' :
                micPermission === 'denied' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }>
                {micPermission === 'granted' ? '✅ Ready' :
                 micPermission === 'denied' ? '❌ Blocked' :
                 '⏳ Needs Permission'}
              </Badge>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={checkMicrophonePermission}
                disabled={isCheckingPermission}
              >
                {isCheckingPermission ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              </Button>
            </div>
          </div>
          
          {micPermission === 'denied' && (
            <div className="bg-red-100 p-3 rounded-lg border border-red-200">
              <p className="font-semibold text-red-900 mb-2">❌ Microphone Access Blocked</p>
              <div className="space-y-2 text-sm text-red-800">
                {isIOS && (
                  <>
                    <div className="flex items-start gap-2">
                      <Globe className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span><strong>Safari on iPhone/iPad:</strong> Go to Settings → Safari → Camera & Microphone → Allow</span>
                    </div>
                    <div className="text-xs text-red-600">Then refresh this page and try again.</div>
                  </>
                )}
                {isAndroid && (
                  <>
                    <div className="flex items-start gap-2">
                      <Globe className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span><strong>Android Chrome:</strong> Tap the 🔒 or ⓘ icon in the address bar → Permissions → Microphone → Allow</span>
                    </div>
                  </>
                )}
                {!isMobile && (
                  <>
                    <div className="flex items-start gap-2">
                      <Settings className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span><strong>Desktop:</strong> Click the 🔒 or microphone icon in your browser's address bar and allow microphone access</span>
                    </div>
                  </>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.reload()}
                  className="mt-2 bg-red-50 hover:bg-red-100"
                >
                  Refresh Page After Fixing Settings
                </Button>
              </div>
            </div>
          )}

          {micPermission === 'prompt' && (
            <div className="bg-yellow-100 p-3 rounded-lg border border-yellow-200">
              <p className="font-semibold text-yellow-900 mb-2">🔔 Permission Required</p>
              <div className="space-y-2 text-sm text-yellow-800">
                <p>Click the button below to request microphone access. Your browser will show a permission popup.</p>
                <Button 
                  onClick={requestMicrophonePermission}
                  disabled={isCheckingPermission}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  {isCheckingPermission ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Mic className="w-4 h-4 mr-2" />}
                  Request Microphone Access
                </Button>
              </div>
            </div>
          )}

          {micPermission === 'granted' && (
            <div className="bg-green-100 p-3 rounded-lg border border-green-200">
              <p className="font-semibold text-green-900 mb-2">✅ Ready for Voice Commands!</p>
              <div className="space-y-2 text-sm text-green-800">
                <p>Microphone access granted. You can now use voice features.</p>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    <span>🆓 FREE: AssemblyAI (5 hrs/month)</span>
                  </Badge>
                  <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>🆓 FREE: Browser Voice (unlimited)</span>
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {micPermission === 'unknown' && (
            <div className="space-y-2 text-sm text-blue-800">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>When you start recording, your browser will ask for microphone permission</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>Click "Allow" to enable voice features</span>
              </div>
              {isMobile && (
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Alternative:</strong> You can always use the "Type Text" or "Upload PDF" options instead</span>
                </div>
              )}
            </div>
          )}

          {/* NEW: Service Availability Display */}
          <div className="pt-2 border-t border-slate-200">
            <p className="text-xs text-slate-600 font-medium mb-2">🚀 Available Voice Services:</p>
            <div className="grid grid-cols-1 gap-1 text-xs text-slate-600">
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                <Badge className="bg-blue-100 text-blue-800 text-xs">🆓 FREE</Badge>
                <span><strong>AssemblyAI:</strong> 5 hours free monthly, professional quality</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                <Badge className="bg-green-100 text-green-800 text-xs">🆓 FREE</Badge>
                <span><strong>Browser Voice:</strong> Unlimited, works offline (Chrome/Safari)</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-purple-50 rounded">
                <Badge className="bg-purple-100 text-purple-800 text-xs">💎 PREMIUM</Badge>
                <span><strong>OpenAI:</strong> Backup option (requires billing)</span>
              </div>
            </div>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}