import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  GripVertical,
  DollarSign,
  Percent,
  Package
} from "lucide-react";
import LineItemImageUpload from "./LineItemImageUpload";
import { motion } from "framer-motion";

export default function LineItemEditor({ 
  lineItems, 
  onLineItemsChange, 
  documentType = "invoice" // invoice or estimate
}) {
  const addLineItem = () => {
    const newItem = {
      id: Date.now().toString(),
      description: "",
      detail: "",
      quantity: 1,
      unit_price: 0,
      total: 0,
      is_discount: false,
      file_urls: []
    };
    onLineItemsChange([...lineItems, newItem]);
  };

  const updateLineItem = (index, field, value) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate total
    if (field === 'quantity' || field === 'unit_price') {
      updated[index].total = updated[index].quantity * updated[index].unit_price;
    }
    
    onLineItemsChange(updated);
  };

  const removeLineItem = (index) => {
    if (lineItems.length > 1) {
      const updated = lineItems.filter((_, i) => i !== index);
      onLineItemsChange(updated);
    }
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(lineItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    onLineItemsChange(items);
  };

  const toggleDiscountItem = (index) => {
    const updated = [...lineItems];
    updated[index].is_discount = !updated[index].is_discount;
    
    // Make discount amounts negative
    if (updated[index].is_discount && updated[index].total > 0) {
      updated[index].total = -Math.abs(updated[index].total);
    } else if (!updated[index].is_discount && updated[index].total < 0) {
      updated[index].total = Math.abs(updated[index].total);
    }
    
    onLineItemsChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Package className="w-5 h-5 text-purple-600" />
          {documentType === "estimate" ? "Estimated Items" : "Invoice Items"}
        </h3>
        <Button
          onClick={addLineItem}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="line-items">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
              {lineItems.map((item, index) => (
                <Draggable key={item.id || index} draggableId={item.id || index.toString()} index={index}>
                  {(provided, snapshot) => (
                    <motion.div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`${
                        snapshot.isDragging ? 'shadow-2xl scale-105' : ''
                      } transition-all duration-200`}
                    >
                      <Card className={`${
                        item.is_discount ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white'
                      } ${snapshot.isDragging ? 'shadow-2xl' : ''}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {/* Drag Handle */}
                            <div
                              {...provided.dragHandleProps}
                              className="mt-2 p-1 hover:bg-slate-100 rounded cursor-grab active:cursor-grabbing"
                            >
                              <GripVertical className="w-4 h-4 text-slate-400" />
                            </div>

                            <div className="flex-1 space-y-4">
                              {/* Item Type Toggle */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge className={
                                    item.is_discount 
                                      ? "bg-green-100 text-green-800" 
                                      : "bg-blue-100 text-blue-800"
                                  }>
                                    {item.is_discount ? "Discount/Deposit" : documentType === "estimate" ? "Estimate Item" : "Invoice Item"}
                                  </Badge>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleDiscountItem(index)}
                                    className="text-xs h-7"
                                  >
                                    {item.is_discount ? <DollarSign className="w-3 h-3 mr-1" /> : <Percent className="w-3 h-3 mr-1" />}
                                    {item.is_discount ? "Make Item" : "Make Discount"}
                                  </Button>
                                </div>
                                
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeLineItem(index)}
                                  disabled={lineItems.length <= 1}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>

                              {/* Description & Details */}
                              <div className="space-y-3">
                                <Input
                                  placeholder={item.is_discount ? "Discount/Deposit Description" : "Item description"}
                                  value={item.description}
                                  onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                                  className="font-medium"
                                />
                                
                                <Textarea
                                  placeholder="Additional details (optional)"
                                  value={item.detail || ''}
                                  onChange={(e) => updateLineItem(index, 'detail', e.target.value)}
                                  rows={2}
                                />
                              </div>

                              {/* Image Upload */}
                              <LineItemImageUpload
                                fileUrls={item.file_urls || []}
                                onFileUrlsChange={(urls) => updateLineItem(index, 'file_urls', urls)}
                              />

                              {/* Pricing */}
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div>
                                  <label className="text-sm font-medium text-slate-700">Quantity</label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={item.quantity}
                                    onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                  />
                                </div>
                                
                                <div>
                                  <label className="text-sm font-medium text-slate-700">Unit Price ($)</label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={item.unit_price}
                                    onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                  />
                                </div>
                                
                                <div>
                                  <label className="text-sm font-medium text-slate-700">Total ($)</label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={item.total}
                                    onChange={(e) => updateLineItem(index, 'total', parseFloat(e.target.value) || 0)}
                                    className={item.is_discount ? "text-green-700 font-semibold" : "text-slate-900 font-semibold"}
                                  />
                                </div>

                                <div className="flex items-end">
                                  <div className={`text-lg font-bold ${
                                    item.is_discount ? 'text-green-600' : 'text-slate-900'
                                  }`}>
                                    ${item.total?.toFixed(2) || '0.00'}
                                    {item.is_discount && (
                                      <div className="text-xs text-green-600 font-normal">Applied</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Drag Instructions */}
      <div className="text-center text-sm text-slate-500 italic">
        💡 Drag items by the grip handle to reorder them
      </div>
    </div>
  );
}