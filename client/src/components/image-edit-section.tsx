import { useState } from "react";
import { ImageUploadModal } from "./image-upload-modal";
import { UseMutationResult } from "@tanstack/react-query";
import { MediaWithCaption } from "@shared/schema";

interface ImageEditSectionProps {
  rowId: string;
  images: MediaWithCaption[];
  location?: string;
  onClose: () => void;
  onAddImage: UseMutationResult<any, Error, { rowId: string; imageUrl: string; caption?: string; thumbnail?: string }, unknown>;
  onUpdateImage: UseMutationResult<any, Error, { rowId: string; imageIndex: number; imageUrl?: string; caption?: string; thumbnail?: string }, unknown>;
  onDeleteImage: UseMutationResult<any, Error, { rowId: string; imageIndex?: number }, unknown>;
  allMedia?: MediaWithCaption[];
}

export function ImageEditSection({ 
  rowId, 
  images, 
  location,
  onClose, 
  onAddImage, 
  onUpdateImage, 
  onDeleteImage,
  allMedia = []
}: ImageEditSectionProps) {
  const [uploadModalOpen, setUploadModalOpen] = useState(true);
  const [existingImages, setExistingImages] = useState<MediaWithCaption[]>(images);

  const handleSaveImages = async (newImages: MediaWithCaption[]) => {
    try {
      // Delete all existing images first
      if (existingImages.length > 0) {
        await onDeleteImage.mutateAsync({ rowId });
      }

      // Add all new images
      for (const img of newImages) {
        await onAddImage.mutateAsync({
          rowId,
          imageUrl: img.url,
          caption: img.caption,
          thumbnail: img.thumbnail,
        });
      }

      setExistingImages(newImages);
      setUploadModalOpen(false);
      onClose();
    } catch (error) {
      console.error('Error saving images:', error);
    }
  };

  const handleModalClose = (open: boolean) => {
    setUploadModalOpen(open);
    if (!open) {
      onClose();
    }
  };

  return (
    <ImageUploadModal
      open={uploadModalOpen}
      onOpenChange={handleModalClose}
      existingImages={existingImages}
      onSave={handleSaveImages}
      allMedia={allMedia}
    />
  );
}