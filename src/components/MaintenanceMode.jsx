import { Wrench, Clock, Zap } from "lucide-react";

// 🔧 MAINTENANCE MODE TOGGLE
// Set to true to show maintenance screen to all users
export const MAINTENANCE_MODE = false;

export default function MaintenanceScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
      <div className="text-center max-w-md mx-auto">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-2xl">
              <Zap className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <Wrench className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">Frinvoice</h1>
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