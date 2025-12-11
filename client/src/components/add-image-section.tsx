import { useState, useEffect } from "react";
import { UseMutationResult } from "@tanstack/react-query";
import { MediaWithCaption } from "@shared/schema";
import { ImageUploadModal } from "./image-upload-modal";

interface AddImageSectionProps {
  rowId: string;
  location?: string;
  onClose: () => void;
  onAddImage: UseMutationResult<any, Error, { rowId: string; imageUrl: string; caption?: string; thumbnail?: string }, unknown>;
  allMedia?: MediaWithCaption[];
}

export function AddImageSection({ rowId, location, onClose, onAddImage, allMedia = [] }: AddImageSectionProps) {
  const [uploadModalOpen, setUploadModalOpen] = useState(true);

  const handleSaveImages = async (images: MediaWithCaption[]) => {
    try {
      // Add all images
      for (const img of images) {
        await onAddImage.mutateAsync({
          rowId,
          imageUrl: img.url,
          caption: img.caption,
          thumbnail: img.thumbnail,
        });
      }

      setUploadModalOpen(false);
      onClose();
    } catch (error) {
      console.error('Error adding images:', error);
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
      onSave={handleSaveImages}
      allMedia={allMedia}
    />
  );
}