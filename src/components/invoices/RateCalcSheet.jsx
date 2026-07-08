import React, { useState, useEffect } from "react";
import { PricingPreset } from "@/entities/PricingPreset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Calculator, Search, Package, Ruler, Loader2 } from "lucide-react";
import { toast } from "sonner";

// ── unit conversion helpers ──────────────────────────────────────────────────
const TO_MM = {
  mm: 1,
  cm: 10,
  m: 1000,
  in: 25.4,
  ft: 304.8,
};

function toMm(value, unit) {
  return (Number(value) || 0) * (TO_MM[unit] || 1);
}

function fmt(n) {
  return (Math.round(n * 100) / 100).toLocaleString("en-US");
}

/**
 * Calculate how many preset items fit into a target area.
 * Rounds up per row and per column.
 */
export function calculateUnitCount(preset, targetW, targetH, targetUnit) {
  if (!preset?.item_dimension_width || !preset?.item_dimension_height) return null;

  const itemW = toMm(preset.item_dimension_width, preset.item_dimension_unit);
  const itemH = toMm(preset.item_dimension_height, preset.item_dimension_unit);
  const targW = toMm(targetW, targetUnit);
  const targH = toMm(targetH, targetUnit);

  if (itemW <= 0 || itemH <= 0 || targW <= 0 || targH <= 0) return null;

  const perRow = Math.ceil(targW / itemW);
  const rows = Math.ceil(targH / itemH);
  const total = perRow * rows;

  return { perRow, rows, total };
}

const UNIT_OPTIONS = ["ft", "in", "m", "cm", "mm"];

export default function RateCalcSheet({ open, onOpenChange, onAddLineItem }) {
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("quantity"); // "quantity" | "dimensions"
  const [quantity, setQuantity] = useState(1);
  const [targetW, setTargetW] = useState("");
  const [targetH, setTargetH] = useState("");
  const [targetUnit, setTargetUnit] = useState("ft");

  useEffect(() => {
    if (open) loadPresets();
  }, [open]);

  const loadPresets = async () => {
    setLoading(true);
    try {
      const data = await PricingPreset.list();
      setPresets(data);
    } catch (e) {
      console.error("Error loading presets:", e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = presets.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  const calc = selected && mode === "dimensions"
    ? calculateUnitCount(selected, targetW, targetH, targetUnit)
    : null;

  const finalQty = mode === "dimensions" ? (calc?.total || 0) : (Number(quantity) || 0);
  const lineTotal = finalQty * (Number(selected?.base_price) || 0);

  const handleAdd = () => {
    if (!selected) {
      toast.error("Pick a preset first");
      return;
    }
    if (finalQty <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    const detailParts = [];
    if (selected.unit_type === "per_panel" && selected.item_dimension_width) {
      detailParts.push(
        `${selected.item_dimension_width}${selected.item_dimension_unit} × ${selected.item_dimension_height}${selected.item_dimension_unit} per panel`
      );
    }
    if (mode === "dimensions" && calc) {
      detailParts.push(
        `Coverage: ${targetW}${targetUnit} × ${targetH}${targetUnit} → ${calc.perRow}/row × ${calc.rows} rows = ${calc.total} units`
      );
    }

    onAddLineItem({
      description: selected.name,
      detail: detailParts.join(" | ") || selected.description || "",
      quantity: finalQty,
      unit_price: Number(selected.base_price) || 0,
      total: lineTotal,
      is_discount: false,
      file_urls: [],
    });

    toast.success(`Added ${finalQty} × ${selected.name} — $${fmt(lineTotal)}`);
    // reset
    setSelected(null);
    setQuantity(1);
    setTargetW("");
    setTargetH("");
    setMode("quantity");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-xl">
            <Calculator className="w-5 h-5 text-purple-600" />
            RateCalc — Auto-Quote
          </SheetTitle>
          <SheetDescription>
            Pick a preset, enter quantity or target dimensions, and we'll calculate the line item automatically.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Search */}
          {!selected && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search presets..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Preset list */}
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-500">
                  No presets found. Create some in Settings or save line items as presets.
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {filtered.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelected(p)}
                      className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-purple-400 hover:bg-purple-50 transition-colors flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                        <p className="text-xs text-slate-500">
                          ${p.base_price} / {p.unit_type.replace(/_/g, " ")}
                          {p.item_dimension_width && (
                            <span className="ml-1">
                              · {p.item_dimension_width}{p.item_dimension_unit} × {p.item_dimension_height}{p.item_dimension_unit}
                            </span>
                          )}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected preset + calculator */}
          {selected && (
            <div className="space-y-4">
              {/* Selected preset header */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-200 flex items-center justify-center">
                    <Package className="w-5 h-5 text-purple-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{selected.name}</p>
                    <p className="text-xs text-slate-600">
                      ${selected.base_price} / {selected.unit_type.replace(/_/g, " ")}
                      {selected.item_dimension_width && (
                        <span className="ml-1">
                          · {selected.item_dimension_width}{selected.item_dimension_unit} × {selected.item_dimension_height}{selected.item_dimension_unit}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                  Change
                </Button>
              </div>

              {/* Mode toggle */}
              <div className="flex gap-2">
                <Button
                  variant={mode === "quantity" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode("quantity")}
                  className="flex-1"
                >
                  Enter Quantity
                </Button>
                <Button
                  variant={mode === "dimensions" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode("dimensions")}
                  className="flex-1"
                  disabled={!selected.item_dimension_width}
                >
                  <Ruler className="w-4 h-4 mr-1" />
                  Enter Dimensions
                </Button>
              </div>

              {/* Quantity mode */}
              {mode === "quantity" && (
                <div>
                  <Label className="text-sm font-semibold">Quantity</Label>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min="0"
                    step="0.01"
                    className="mt-1 text-lg"
                    autoFocus
                  />
                </div>
              )}

              {/* Dimensions mode */}
              {mode === "dimensions" && selected.item_dimension_width && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-semibold">Target Width</Label>
                      <Input
                        type="number"
                        value={targetW}
                        onChange={(e) => setTargetW(e.target.value)}
                        min="0"
                        step="0.01"
                        placeholder="20"
                        className="mt-1"
                        autoFocus
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Target Height</Label>
                      <Input
                        type="number"
                        value={targetH}
                        onChange={(e) => setTargetH(e.target.value)}
                        min="0"
                        step="0.01"
                        placeholder="10"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Unit</Label>
                    <div className="flex gap-1 mt-1">
                      {UNIT_OPTIONS.map((u) => (
                        <button
                          key={u}
                          onClick={() => setTargetUnit(u)}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            targetUnit === u
                              ? "bg-purple-600 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Calculation result */}
                  {calc && (
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Item size:</span>
                        <span className="font-mono font-semibold">
                          {selected.item_dimension_width}{selected.item_dimension_unit} × {selected.item_dimension_height}{selected.item_dimension_unit}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Per row:</span>
                        <span className="font-mono font-semibold">{calc.perRow} units</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Rows:</span>
                        <span className="font-mono font-semibold">{calc.rows}</span>
                      </div>
                      <div className="flex items-center justify-between text-base font-bold pt-2 border-t border-slate-200">
                        <span>Total units:</span>
                        <span className="text-purple-600">{calc.total}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Summary */}
              <div className="p-4 rounded-lg bg-purple-600 text-white flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider opacity-80">Line Total</p>
                  <p className="text-2xl font-bold">${fmt(lineTotal)}</p>
                </div>
                <Badge className="bg-white/20 text-white">
                  {fmt(finalQty)} × ${selected.base_price}
                </Badge>
              </div>

              <Button
                onClick={handleAdd}
                className="w-full bg-purple-600 hover:bg-purple-700"
                size="lg"
                disabled={finalQty <= 0}
              >
                Add Line Item — ${fmt(lineTotal)}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}