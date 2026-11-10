/**
 * Image processing utility for My Journey.
 * Handles format validation, resizing, and Canvas-based compression.
 */
export async function processImage(file) {
  if (!file || file.size === 0) {
    throw new Error("Invalid or empty file provided.");
  }

  // 1. Strict Format Verification
  const heicTypes = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'];
  const isHeicExt = file.name && file.name.match(/\.hei[cf]$/i);
  
  if (heicTypes.includes(file.type) || isHeicExt) {
    throw new Error("HEIC images are not natively supported by all browsers yet. Please upload a JPEG or PNG.");
  }

  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error(`Unsupported file format: ${file.type || file.name}. Please upload a JPEG, PNG, or WEBP.`);
  }

  // 2. Read and Compress
  return new Promise((resolve, reject) => {
    let objectUrl = null;
    try {
      objectUrl = URL.createObjectURL(file);
    } catch (err) {
      return reject(new Error("Failed to create temporary URL for the file."));
    }

    // Centralized cleanup function
    const cleanup = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
    };

    const img = new Image();
    
    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error("Canvas 2D context is not supported in this browser.");
        }

        const MAX_WIDTH = 1080;
        let width = img.width;
        let height = img.height;

        if (width === 0 || height === 0) {
          throw new Error("Invalid image dimensions.");
        }

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        
        // Ensure white background for PNG/WebP transparency to JPEG conversion
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        
        // EXIF Handling: Attempt createImageBitmap for native EXIF rotation support
        let bitmapSource = img;
        if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
          try {
            const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
            bitmapSource = bitmap;
          } catch (e) {
            console.warn("createImageBitmap failed, falling back to standard Image rendering.", e);
          }
        }
        
        ctx.drawImage(bitmapSource, 0, 0, width, height);

        canvas.toBlob((blob) => {
          cleanup();
          if (!blob) {
            reject(new Error("Image compression failed during rendering. The image might be too large."));
          } else {
            resolve(blob);
          }
        }, 'image/jpeg', 0.8);
        
      } catch (err) {
        cleanup();
        reject(new Error(err.message || "An error occurred while processing the image."));
      }
    };
    
    img.onerror = () => {
      cleanup();
      reject(new Error("Failed to decode the image file. The file may be corrupted."));
    };
    
    img.src = objectUrl;
  });
}