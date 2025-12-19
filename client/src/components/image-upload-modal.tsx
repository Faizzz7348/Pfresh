// Image Upload Modal Component - ImgBB Integration
import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Upload, Link, Image as ImageIcon, X, Edit2, Trash2, Save, Loader2, FolderOpen, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { MediaWithCaption } from "@shared/schema";

interface ImageUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingImages?: MediaWithCaption[];
  onSave: (images: MediaWithCaption[]) => void;
  maxImages?: number;
  allMedia?: MediaWithCaption[]; // All media from library
}

export function ImageUploadModal({ 
  open, 
  onOpenChange, 
  existingImages = [], 
  onSave,
  maxImages = 10,
  allMedia = []
}: ImageUploadModalProps) {
  const [images, setImages] = useState<MediaWithCaption[]>(existingImages);
  const [uploadMethod, setUploadMethod] = useState<"url" | "file">("url");
  const [urlInput, setUrlInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [useMediaLibrary, setUseMediaLibrary] = useState(false);
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadToImgBB = async (file: File): Promise<string> => {
    const reader = new FileReader();
    
    return new Promise((resolve, reject) => {
      reader.onload = async () => {
        try {
          const base64data = reader.result as string;
          
          // Upload to ImgBB via backend API
          const response = await fetch('/api/upload-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image: base64data,
              name: file.name,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
          }

          const result = await response.json();
          resolve(result.url);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const uploadUrlToImgBB = async (imageUrl: string): Promise<string> => {
    // Fetch image from URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch image from URL');
    }
    
    // Convert to blob then to base64
    const blob = await response.blob();
    const reader = new FileReader();
    
    return new Promise((resolve, reject) => {
      reader.onload = async () => {
        try {
          const base64data = reader.result as string;
          
          // Upload to ImgBB
          const uploadResponse = await fetch('/api/upload-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image: base64data,
              name: 'uploaded-image',
            }),
          });

          if (!uploadResponse.ok) {
            const error = await uploadResponse.json();
            throw new Error(error.error || 'Upload failed');
          }

          const result = await uploadResponse.json();
          resolve(result.url);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleUrlUpload = async () => {
    if (!urlInput.trim() || images.length >= maxImages) return;

    setIsUploading(true);
    try {
      toast({ title: "Uploading...", description: "Processing image URL" });
      
      const imgbbUrl = await uploadUrlToImgBB(urlInput.trim());
      
      const newImage: MediaWithCaption = {
        url: imgbbUrl,
        caption: "",
        description: "",
        type: "image"
      };

      setImages([...images, newImage]);
      setUrlInput("");
      
      toast({ 
        title: "Success", 
        description: "Image uploaded to ImgBB successfully!" 
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    if (filesToUpload.length === 0) {
      toast({
        title: "Limit Reached",
        description: `Maximum ${maxImages} images allowed`,
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    
    try {
      toast({
        title: "Uploading...",
        description: `Processing ${filesToUpload.length} image(s)`
      });

      const uploadedImages: MediaWithCaption[] = [];

      for (const file of filesToUpload) {
        const imgbbUrl = await uploadToImgBB(file);
        uploadedImages.push({
          url: imgbbUrl,
          caption: file.name.replace(/\.[^/.]+$/, ""),
          description: "",
          type: "image"
        });
      }

      setImages([...images, ...uploadedImages]);
      
      toast({
        title: "Success",
        description: `${uploadedImages.length} image(s) uploaded to ImgBB!`
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload images",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditTitle(images[index].caption || "");
    setEditDescription(images[index].description || "");
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    
    const updatedImages = [...images];
    updatedImages[editingIndex] = {
      ...updatedImages[editingIndex],
      caption: editTitle,
      description: editDescription
    };
    
    setImages(updatedImages);
    setEditingIndex(null);
    setEditTitle("");
    setEditDescription("");
  };

  const handleDelete = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    setImages(updatedImages);
  };

  const handleSave = () => {
    onSave(images);
    onOpenChange(false);
  };

  const toggleMediaSelection = (mediaId: string) => {
    const newSelected = new Set(selectedMediaIds);
    if (newSelected.has(mediaId)) {
      newSelected.delete(mediaId);
    } else {
      if (images.length + newSelected.size >= maxImages) {
        toast({
          title: "Maximum images reached",
          description: `You can only add up to ${maxImages} images.`,
          variant: "destructive",
        });
        return;
      }
      newSelected.add(mediaId);
    }
    setSelectedMediaIds(newSelected);
  };

  const handleAddFromLibrary = () => {
    const selectedMedia = allMedia.filter(media => selectedMediaIds.has(media.url));
    const newImages = [...images, ...selectedMedia];
    if (newImages.length > maxImages) {
      toast({
        title: "Too many images",
        description: `Maximum ${maxImages} images allowed.`,
        variant: "destructive",
      });
      return;
    }
    setImages(newImages);
    setSelectedMediaIds(new Set());
    toast({
      title: "Success",
      description: `Added ${selectedMedia.length} image(s) from library.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Image Manager
          </DialogTitle>
          <DialogDescription>
            Upload images to ImgBB (Max: {maxImages} images) • Current: {images.length}/{maxImages}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Media Source Switch */}
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
            <div className="flex items-center gap-3">
              {useMediaLibrary ? (
                <FolderOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              ) : (
                <Camera className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              )}
              <div>
                <Label htmlFor="media-switch" className="text-sm font-semibold cursor-pointer">
                  {useMediaLibrary ? "Browse Media Library" : "Upload New Images"}
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {useMediaLibrary ? "Select from existing media" : "Upload from URL or device"}
                </p>
              </div>
            </div>
            <Switch
              id="media-switch"
              checked={useMediaLibrary}
              onCheckedChange={setUseMediaLibrary}
            />
          </div>

          {/* Upload Section */}
          {!useMediaLibrary ? (
            <Tabs value={uploadMethod} onValueChange={(v) => setUploadMethod(v as "url" | "file")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="url" className="flex items-center gap-2">
                  <Link className="w-4 h-4" />
                  URL Upload
                </TabsTrigger>
                <TabsTrigger value="file" className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Device Upload
                </TabsTrigger>
              </TabsList>

              <TabsContent value="url" className="space-y-3 mt-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Paste image URL here..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUrlUpload()}
                    disabled={isUploading || images.length >= maxImages}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleUrlUpload}
                    disabled={isUploading || !urlInput.trim() || images.length >= maxImages}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upload"}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="file" className="mt-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 dark:hover:border-blue-400 dark:hover:bg-blue-900/40 transition-all"
                >
                  <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF up to 10MB • Multiple files supported
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    disabled={isUploading || images.length >= maxImages}
                    className="hidden"
                  />
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            /* Media Library Section */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  Media Library ({allMedia.length} items)
                </h3>
                {selectedMediaIds.size > 0 && (
                  <Button
                    onClick={handleAddFromLibrary}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Add Selected ({selectedMediaIds.size})
                  </Button>
                )}
              </div>
              
              {allMedia.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
                  <FolderOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-sm text-gray-500">No media in library</p>
                  <p className="text-xs text-gray-400 mt-1">Upload images first to build your library</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto p-2">
                  {allMedia.map((media, index) => {
                    const isSelected = selectedMediaIds.has(media.url);
                    const isAlreadyAdded = images.some(img => img.url === media.url);
                    
                    return (
                      <div
                        key={media.url + index}
                        onClick={() => !isAlreadyAdded && toggleMediaSelection(media.url)}
                        className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all ${
                          isAlreadyAdded 
                            ? 'opacity-50 cursor-not-allowed' 
                            : isSelected 
                            ? 'ring-2 ring-purple-500 ring-offset-2' 
                            : 'hover:ring-2 hover:ring-gray-300'
                        }`}
                      >
                        <img 
                          src={media.url} 
                          alt={media.caption || "Media"} 
                          className="w-full h-full object-cover"
                        />
                        {isSelected && !isAlreadyAdded && (
                          <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                            <div className="bg-purple-600 rounded-full w-8 h-8 flex items-center justify-center">
                              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                        )}
                        {isAlreadyAdded && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <p className="text-white text-xs font-medium">Already Added</p>
                          </div>
                        )}
                        {media.caption && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1">
                            <p className="text-white text-xs truncate">{media.caption}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Current Images - Horizontal Card Layout */}
          {images.length > 0 && (
            <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-base text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Selected Images ({images.length}/{maxImages})
                </h3>
              </div>
              
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {images.map((image, index) => (
                  <div 
                    key={index}
                    className="flex gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 hover:shadow-md transition-shadow"
                  >
                    {/* Image Thumbnail */}
                    <div className="flex-shrink-0">
                      <img 
                        src={image.url} 
                        alt={image.caption || `Image ${index + 1}`}
                        className="w-32 h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                      />
                    </div>
                    
                    {/* Image Details */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      {/* Title Section */}
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Title</span>
                            {editingIndex !== index && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleEdit(index);
                                }}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700/60 rounded transition-colors"
                              >
                                <Edit2 className="w-3 h-3 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" />
                              </button>
                            )}
                          </div>
                          {editingIndex === index ? (
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              placeholder="Enter image title..."
                              className="text-sm"
                              autoFocus
                            />
                          ) : (
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {image.caption || "No title"}
                            </p>
                          )}
                        </div>

                        {/* Description Section */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Description</span>
                            {editingIndex !== index && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleEdit(index);
                                }}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700/60 rounded transition-colors"
                              >
                                <Edit2 className="w-3 h-3 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" />
                              </button>
                            )}
                          </div>
                          {editingIndex === index ? (
                            <Textarea
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              placeholder="Enter description..."
                              className="text-sm min-h-[60px]"
                            />
                          ) : (
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                              {image.description || "No description"}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons - Bottom of card */}
                      {editingIndex === index ? (
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              handleSaveEdit();
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Save className="w-3 h-3 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.preventDefault();
                              setEditingIndex(null);
                              setEditTitle("");
                              setEditDescription("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleEdit(index);
                            }}
                            className="flex-1"
                          >
                            <Edit2 className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                          >
                            <ImageIcon className="w-3 h-3 mr-1" />
                            Select
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDelete(index);
                            }}
                            className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {images.length === 0 ? (
                "No images selected"
              ) : (
                `${images.length} image(s) ready to save`
              )}
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={isUploading || images.length === 0}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save ({images.length})
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
