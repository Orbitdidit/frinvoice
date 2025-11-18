
import { useState, useRef } from "react";
import { UploadFile } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, Image as ImageIcon, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LineItemImageUpload({ images = [], onImagesChange, maxImages = 4 }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const uniqueId = useRef(`image-upload-${Math.random().toString(36).substr(2, 9)}`);

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    setUploading(true);
    try {
      const uploadPromises = Array.from(files).slice(0, maxImages - images.length).map(async (file) => {
        const result = await UploadFile({ file });
        return result.file_url;
      });
      
      const newImageUrls = await Promise.all(uploadPromises);
      const updatedImages = [...images, ...newImageUrls].slice(0, maxImages);
      onImagesChange(updatedImages);
    } catch (error) {
      console.error("Error uploading images:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    handleFileUpload(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const removeImage = (index) => {
    const updatedImages = images.filter((_, i) => i !== index);
    onImagesChange(updatedImages);
  };

  return (
    <div className="space-y-3">
      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <AnimatePresence>
            {images.map((imageUrl, index) => (
              <motion.div
                key={imageUrl}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative group"
              >
                <div className="aspect-square rounded-lg overflow-hidden bg-slate-100 border-2 border-slate-200">
                  <img
                    src={imageUrl}
                    alt={`Line item reference ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(index)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                {index === 0 && images.length > 1 && (
                  <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1 rounded">
                    Main
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Upload Area */}
      {images.length < maxImages && (
        <Card
          className={`border-2 border-dashed transition-all duration-200 ${
            dragOver 
              ? 'border-purple-400 bg-purple-50' 
              : 'border-slate-300 hover:border-slate-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <CardContent className="p-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                {uploading ? (
                  <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-slate-400" />
                )}
              </div>
              <p className="text-sm text-slate-600 mb-2">
                {uploading ? 'Uploading...' : `Add reference images (${images.length}/${maxImages})`}
              </p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
                id={uniqueId.current}
                disabled={uploading}
              />
              <label
                htmlFor={uniqueId.current}
                className="cursor-pointer"
              >
                <Button variant="outline" size="sm" disabled={uploading} asChild>
                  <span>
                    <Plus className="w-4 h-4 mr-1" />
                    Choose Images
                  </span>
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
