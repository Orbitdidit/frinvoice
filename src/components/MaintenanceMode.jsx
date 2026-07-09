import { Wrench, Clock } from "lucide-react";

// 🔧 MAINTENANCE MODE TOGGLE
// Set to true to show maintenance screen to all users
export const MAINTENANCE_MODE = false;

export default function MaintenanceScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
      <div className="text-center max-w-md mx-auto">
        <div className="flex justify-center mb-6">
          <div className="text-center">
            <h1 className="text-5xl font-black text-white mb-1 tracking-tight">
              IN<span className="text-green-500">VOX</span>
            </h1>
            <p className="text-sm text-purple-300 font-mono">Speak it. Send it. Get paid.</p>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-purple-300 mb-4">Maintenance in Progress</h2>

        <p className="text-slate-400 mb-8 leading-relaxed">
          We're making some improvements to give you a better experience. 
          We'll be back up and running shortly!
        </p>

        <div className="flex items-center justify-center gap-2 bg-white/10 rounded-xl px-6 py-4 border border-white/20">
          <Clock className="w-5 h-5 text-purple-300 animate-pulse" />
          <span className="text-white font-medium">Back online very soon</span>
        </div>

        <p className="text-slate-500 text-sm mt-6">
          Thank you for your patience ✨
        </p>
      </div>
    </div>
  );
}