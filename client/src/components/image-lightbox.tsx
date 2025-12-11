import { useEffect, useRef } from "react";
import { MediaWithCaption } from "@shared/schema";

interface ImageLightboxProps {
  images: MediaWithCaption[];
  rowId: string;
}

export function ImageLightbox({ images, rowId }: ImageLightboxProps) {
  const galleryRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let gallery: any = null;

    const loadLightGallery = async () => {
      if (!containerRef.current || images.length === 0) return;

      try {
        // Dynamically import lightgallery
        const { default: lightGallery } = await import("lightgallery");
        const lgThumbnail = await import("lightgallery/plugins/thumbnail");
        const lgZoom = await import("lightgallery/plugins/zoom");
        const lgFullscreen = await import("lightgallery/plugins/fullscreen");

        // Import CSS
        await import("lightgallery/css/lightgallery.css");
        await import("lightgallery/css/lg-thumbnail.css");
        await import("lightgallery/css/lg-zoom.css");
        await import("lightgallery/css/lg-fullscreen.css");

        gallery = lightGallery(containerRef.current, {
          licenseKey: "GPLv3",
          plugins: [lgThumbnail.default, lgZoom.default, lgFullscreen.default],
          speed: 500,
          download: false,
          selector: ".lightbox-item",
          thumbnail: true,
          animateThumb: true,
        });

        galleryRef.current = gallery;
      } catch (error) {
        console.error("Failed to load LightGallery:", error);
      }
    };

    loadLightGallery();

    return () => {
      if (galleryRef.current) {
        try {
          galleryRef.current.destroy();
        } catch (e) {
          console.warn("Error destroying lightGallery:", e);
        }
      }
    };
  }, [images, rowId]);

  if (images.length === 0) {
    return <span className="text-xs text-muted-foreground">No image</span>;
  }

  // Build sub-html with title and description
  const getSubHtml = (image: MediaWithCaption, index: number) => {
    const parts = [];
    if (image.caption) {
      parts.push(`<h4>${image.caption}</h4>`);
    }
    if (image.description) {
      parts.push(`<p>${image.description}</p>`);
    }
    if (parts.length === 0) {
      parts.push(`<p>Image ${index + 1}</p>`);
    }
    return parts.join("");
  };

  return (
    <div ref={containerRef} className="flex items-center justify-center gap-2">
      {/* First image as clickable preview */}
      <a
        href={images[0].url}
        data-src={images[0].url}
        data-sub-html={getSubHtml(images[0], 0)}
        className="lightbox-item cursor-pointer"
      >
        <img
          src={images[0].url}
          alt={images[0].caption || "Image"}
          className="w-10 h-8 object-cover rounded border border-gray-200 dark:border-gray-700 hover:opacity-80 transition-opacity"
        />
      </a>

      {/* Hidden images for gallery */}
      {images.slice(1).map((image, index) => (
        <a
          key={index + 1}
          href={image.url}
          data-src={image.url}
          data-sub-html={getSubHtml(image, index + 1)}
          className="lightbox-item"
          style={{ display: "none" }}
        >
          <img src={image.url} alt={image.caption || `Image ${index + 2}`} />
        </a>
      ))}

      {/* Count badge */}
      {images.length > 1 && (
        <span className="text-xs text-muted-foreground">
          +{images.length - 1}
        </span>
      )}
    </div>
  );
}
