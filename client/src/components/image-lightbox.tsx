import { useEffect, useRef, useState } from "react";
import { MediaWithCaption } from "@shared/schema";
import { Loader2, ImageOff } from "lucide-react";

interface ImageLightboxProps {
  images: MediaWithCaption[];
  rowId: string;
}

export function ImageLightbox({ images, rowId }: ImageLightboxProps) {
  const galleryRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

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
    return (
      <div className="flex items-center justify-center mx-auto">
        <div className="flex items-center justify-center w-10 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <ImageOff className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        </div>
      </div>
    );
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
    <div ref={containerRef} className="flex items-center justify-center">
      {/* First image as clickable preview with loading state */}
      <a
        href={images[0].url}
        data-src={images[0].url}
        data-sub-html={getSubHtml(images[0], 0)}
        className="lightbox-item cursor-pointer relative inline-block"
      >
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          </div>
        )}
        <img
          src={images[0].url}
          alt={images[0].caption || "Image"}
          className={`w-10 h-8 object-cover rounded-lg border border-gray-200 dark:border-gray-700 hover:opacity-80 transition-all duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageError(true);
            setImageLoaded(true);
          }}
        />
        
        {/* Count badge inside image */}
        {images.length > 1 && (
          <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-md backdrop-blur-sm">
            +{images.length - 1}
          </span>
        )}
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
    </div>
  );
}
