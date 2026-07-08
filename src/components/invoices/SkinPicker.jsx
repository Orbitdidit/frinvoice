import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const SKINS = [
  {
    value: "ledger",
    label: "Ledger",
    desc: "Warm paper",
    bg: "bg-stone-100",
    accent: "bg-green-600",
    text: "text-slate-900",
  },
  {
    value: "neon",
    label: "Neon",
    desc: "Dark cyan glow",
    bg: "bg-[#07080c]",
    accent: "bg-[#3ee6ff]",
    text: "text-cyan-300",
  },
  {
    value: "luxe",
    label: "Luxe",
    desc: "Charcoal + gold",
    bg: "bg-[#141210]",
    accent: "bg-[#c9a860]",
    text: "text-[#c9a860]",
  },
];

export default function SkinPicker({ value, onChange }) {
  const current = value || "ledger";
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Client Skin</span>
      <div className="flex gap-2">
        {SKINS.map((skin) => {
          const active = current === skin.value;
          return (
            <button
              key={skin.value}
              type="button"
              onClick={() => onChange(skin.value)}
              className={`relative w-20 rounded-lg overflow-hidden border-2 transition-all ${
                active ? "border-purple-500 ring-2 ring-purple-200" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className={`${skin.bg} h-12 flex items-end p-1.5`}>
                <div className={`w-6 h-1.5 rounded-sm ${skin.accent}`} />
              </div>
              <div className="bg-white px-1.5 py-1 text-left">
                <p className={`text-[10px] font-bold ${active ? "text-purple-600" : "text-slate-700"}`}>{skin.label}</p>
                <p className="text-[9px] text-slate-400 leading-none">{skin.desc}</p>
              </div>
              {active && (
                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center">
                  <Check className="w-2.5 h-2.5" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}