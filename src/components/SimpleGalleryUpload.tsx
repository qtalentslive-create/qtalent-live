import { useState, useRef } from "react";
import { Upload, X, ImageIcon, Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useProStatus } from "@/contexts/ProStatusContext";
import AvatarEditor from "react-avatar-editor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Capacitor } from "@capacitor/core";
import { cn } from "@/lib/utils";

interface SimpleGalleryUploadProps {
  currentImages: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

export function SimpleGalleryUpload({
  currentImages,
  onImagesChange,
  maxImages = 5,
  disabled = false,
}: SimpleGalleryUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<File | null>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [applyingCrop, setApplyingCrop] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const editorRef = useRef<AvatarEditor>(null);
  const { toast } = useToast();
  const { isProUser } = useProStatus();

  const effectiveMaxImages = isProUser ? Math.max(maxImages, 10) : 1; // Pro users get 10, Free users get 1

  const processImageToSquare = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = canvasRef.current;

      if (!canvas) {
        reject(new Error("Canvas not available"));
        return;
      }

      img.onload = () => {
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }

        // Set output size - square for gallery images
        const size = 800;
        canvas.width = size;
        canvas.height = size;

        // Calculate crop dimensions to center the image
        const sourceSize = Math.min(img.width, img.height);
        const sourceX = (img.width - sourceSize) / 2;
        const sourceY = (img.height - sourceSize) / 2;

        // Clear canvas and draw image centered and scaled
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceSize,
          sourceSize,
          0,
          0,
          size,
          size
        );

        // Convert to blob and then to file
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const processedFile = new File(
                [blob],
                `gallery-${Date.now()}.jpg`,
                {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                }
              );
              resolve(processedFile);
            } else {
              reject(new Error("Failed to process image"));
            }
          },
          "image/jpeg",
          0.9
        );
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleCropComplete = async () => {
    if (!editorRef.current || !imageToCrop || applyingCrop) return;

    try {
      setApplyingCrop(true);

      // Get the canvas with the cropped image
      const canvas = editorRef.current.getImageScaledToCanvas();

      // Convert canvas to blob asynchronously
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            setApplyingCrop(false);
            toast({
              title: "Error",
              description: "Failed to crop image. Please try again.",
              variant: "destructive",
            });
            return;
          }

          // Defer heavy operations to prevent UI blocking
          await new Promise<void>((resolve) => {
            Promise.resolve().then(() => {
              setTimeout(
                () => {
                  resolve();
                },
                Capacitor.isNativePlatform() ? 50 : 0
              );
            });
          });

          // Convert blob to file
          const croppedFile = new File([blob], `gallery-${Date.now()}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });

          // Clean up dialog first
          setCropDialogOpen(false);
          setImageToCrop(null);
          setApplyingCrop(false);

          // Upload the cropped image
          await uploadImage(croppedFile);

          // Process next file in queue if any
          if (pendingFiles.length > 0) {
            const nextFile = pendingFiles[0];
            setPendingFiles((prev) => prev.slice(1));
            // Small delay before opening next crop dialog
            setTimeout(() => {
              setImageToCrop(nextFile);
              setScale(1);
              setRotation(0);
              setCropDialogOpen(true);
            }, 300);
          }
        },
        "image/jpeg",
        0.9
      );
    } catch (error) {
      console.error("Error cropping image:", error);
      setApplyingCrop(false);
      toast({
        title: "Error",
        description: "Failed to crop image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCropCancel = () => {
    setCropDialogOpen(false);
    setImageToCrop(null);
    setScale(1);
    setRotation(0);

    // Process next file in queue if any
    if (pendingFiles.length > 0) {
      const nextFile = pendingFiles[0];
      setPendingFiles((prev) => prev.slice(1));
      setTimeout(() => {
        setImageToCrop(nextFile);
        setScale(1);
        setRotation(0);
        setCropDialogOpen(true);
      }, 300);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      // Get current user ID for proper file organization
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Create organized file path
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2);
      const fileName = `gallery-${timestamp}-${randomId}.jpg`;
      const filePath = `${user.id}/gallery/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("talent-pictures")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from("talent-pictures")
        .getPublicUrl(filePath);

      // Add to current images
      const newImages = [...currentImages, data.publicUrl];
      onImagesChange(newImages);

      toast({
        title: "Upload Successful",
        description: "Image uploaded and added to gallery",
      });

      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleFile = async (file: File) => {
    if (uploading || disabled) {
      console.log(
        "[SimpleGalleryUpload] Already processing or disabled, ignoring"
      );
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit
      toast({
        title: "File Too Large",
        description: "Please select an image under 10MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      // Defer state updates to next event loop to prevent UI blocking
      const delay = Capacitor.isNativePlatform() ? 150 : 50;
      await new Promise<void>((resolve) => {
        Promise.resolve().then(() => {
          setTimeout(() => {
            resolve();
          }, delay);
        });
      });

      // Open the crop dialog after async delay
      setImageToCrop(file);
      setScale(1);
      setRotation(0);
      setCropDialogOpen(true);
      setUploading(false);
    } catch (error) {
      console.error("Error processing file:", error);
      setUploading(false);
      toast({
        title: "Error",
        description: "Failed to process image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFiles = async (files: FileList) => {
    if (disabled) return;

    const remainingSlots = effectiveMaxImages - currentImages.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      toast({
        title: "Too Many Images",
        description: `You can only upload ${remainingSlots} more image(s). ${
          isProUser
            ? "Pro maximum is 10 photos"
            : "Free users are limited to 1 photo. Upgrade to Pro for up to 10 photos!"
        }.`,
        variant: "destructive",
      });
    }

    // Validate file types and sizes
    const validFiles = filesToProcess.filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid File Type",
          description: `${file.name} is not an image file`,
          variant: "destructive",
        });
        return false;
      }

      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        toast({
          title: "File Too Large",
          description: `${file.name} is too large. Please choose a smaller image.`,
          variant: "destructive",
        });
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) return;

    // If crop dialog is already open, queue the files
    if (cropDialogOpen || imageToCrop) {
      setPendingFiles((prev) => [...prev, ...validFiles]);
      return;
    }

    // Process first file immediately, queue the rest
    if (validFiles.length > 1) {
      setPendingFiles(validFiles.slice(1));
    }
    await handleFile(validFiles[0]);
  };

  const removeImage = (indexToRemove: number) => {
    if (disabled) return;

    const newImages = currentImages.filter(
      (_, index) => index !== indexToRemove
    );
    onImagesChange(newImages);

    toast({
      title: "Image Removed",
      description: "Image has been removed from your gallery",
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    if (disabled || uploading) return;

    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const canUploadMore = currentImages.length < effectiveMaxImages && !disabled;

  return (
    <div className="space-y-4">
      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Upload Area */}
      {canUploadMore && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          } ${uploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            if (!uploading && !disabled) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onClick={() =>
            !uploading && !disabled && fileInputRef.current?.click()
          }
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            disabled={uploading || disabled}
          />

          <div className="flex flex-col items-center space-y-3">
            {uploading ? (
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
            )}

            <div>
              <p className="font-medium">
                {uploading ? "Processing Images..." : "Add Gallery Photos"}
              </p>
              <p className="text-sm text-muted-foreground">
                {uploading
                  ? "Optimizing your photos for perfect display..."
                  : "Drag & drop or click to browse files"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                📸 You'll be able to crop and adjust each photo perfectly before
                saving
              </p>
              <p className="text-xs text-muted-foreground">
                Multiple files OK • JPG, PNG • Max 10MB each
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Grid */}
      {currentImages.length > 0 && (
        <div className="w-full max-w-full overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 w-full">
            {currentImages.map((imageUrl, index) => (
              <div
                key={index}
                className="relative aspect-square group w-full max-w-full overflow-hidden"
              >
                <img
                  src={imageUrl}
                  alt={`Gallery image ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                  loading="lazy"
                />
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress indicator */}
      {uploading && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Processing and uploading your images...
          </p>
        </div>
      )}

      {/* Info */}
      <div className="text-sm text-muted-foreground">
        {currentImages.length} of {effectiveMaxImages} photos uploaded
        {currentImages.length >= effectiveMaxImages && (
          <span className="ml-2 text-primary">• Gallery full</span>
        )}
      </div>

      {/* Crop Dialog */}
      <Dialog open={cropDialogOpen} onOpenChange={handleCropCancel}>
        <DialogContent
          className={cn(
            "max-w-2xl",
            Capacitor.isNativePlatform() &&
              "max-w-full h-[90vh] max-h-[90vh] rounded-t-2xl rounded-b-none z-[10001]"
          )}
          style={
            Capacitor.isNativePlatform()
              ? {
                  paddingTop: `calc(1rem + env(safe-area-inset-top))`,
                  paddingBottom: `calc(1rem + env(safe-area-inset-bottom))`,
                  zIndex: 10001,
                }
              : undefined
          }
        >
          <DialogHeader
            className={cn(Capacitor.isNativePlatform() && "px-4 pt-2 pb-2")}
          >
            <DialogTitle
              className={cn(
                Capacitor.isNativePlatform() && "text-lg font-bold"
              )}
            >
              Adjust Your Gallery Photo
            </DialogTitle>
            <DialogDescription>
              Crop and adjust your photo before adding to gallery
            </DialogDescription>
          </DialogHeader>

          <div
            className={cn(
              "space-y-6",
              Capacitor.isNativePlatform() &&
                "px-4 pb-4 overflow-y-auto max-h-[calc(90vh-8rem)]"
            )}
          >
            <div
              className={cn(
                "bg-primary/10 p-3 rounded-lg border border-primary/20",
                Capacitor.isNativePlatform() && "p-2.5 rounded-xl"
              )}
            >
              <p
                className={cn(
                  "text-sm font-medium mb-1",
                  Capacitor.isNativePlatform() && "text-xs"
                )}
              >
                💡 How to adjust:
              </p>
              <ul
                className={cn(
                  "text-xs text-muted-foreground space-y-1 ml-4 list-disc",
                  Capacitor.isNativePlatform() && "text-[10px] leading-relaxed"
                )}
              >
                <li>
                  <strong>Drag</strong> the image to reposition it inside the
                  square
                </li>
                <li>
                  <strong>Pinch</strong> on mobile or use the zoom slider below
                </li>
                <li>Your photo will be perfectly square</li>
              </ul>
            </div>

            {imageToCrop && (
              <div
                className={cn(
                  "flex flex-col items-center space-y-4",
                  Capacitor.isNativePlatform() && "space-y-3"
                )}
              >
                <div
                  className={cn(
                    "border-4 border-primary/20 rounded-lg overflow-hidden",
                    Capacitor.isNativePlatform() && "border-2"
                  )}
                >
                  <AvatarEditor
                    ref={editorRef}
                    image={imageToCrop}
                    width={Capacitor.isNativePlatform() ? 250 : 300}
                    height={Capacitor.isNativePlatform() ? 250 : 300}
                    border={0}
                    borderRadius={0}
                    color={[255, 255, 255, 0.6]}
                    scale={scale}
                    rotate={rotation}
                    className="cursor-move touch-pan-x touch-pan-y"
                  />
                </div>

                {/* Zoom Controls */}
                <div
                  className={cn(
                    "w-full max-w-md space-y-2",
                    Capacitor.isNativePlatform() && "px-2"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-between text-sm text-muted-foreground",
                      Capacitor.isNativePlatform() && "text-xs"
                    )}
                  >
                    <span className="flex items-center gap-1">
                      <ZoomOut
                        className={cn(
                          Capacitor.isNativePlatform()
                            ? "h-3.5 w-3.5"
                            : "h-4 w-4"
                        )}
                      />
                      Zoom
                    </span>
                    <span className="flex items-center gap-1">
                      <ZoomIn
                        className={cn(
                          Capacitor.isNativePlatform()
                            ? "h-3.5 w-3.5"
                            : "h-4 w-4"
                        )}
                      />
                    </span>
                  </div>
                  <Slider
                    value={[scale]}
                    onValueChange={(values) => setScale(values[0])}
                    min={1}
                    max={3}
                    step={0.01}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            <div
              className={cn(
                "flex space-x-2 pt-4",
                Capacitor.isNativePlatform() && "pt-3 gap-2"
              )}
            >
              <Button
                variant="outline"
                onClick={handleCropCancel}
                className={cn(
                  "flex-1",
                  Capacitor.isNativePlatform() &&
                    "h-11 text-base font-semibold rounded-xl"
                )}
              >
                <X
                  className={cn(
                    "h-4 w-4 mr-2",
                    Capacitor.isNativePlatform() && "h-4 w-4"
                  )}
                />
                Cancel
              </Button>
              <Button
                onClick={handleCropComplete}
                disabled={applyingCrop}
                className={cn(
                  "flex-1",
                  Capacitor.isNativePlatform() &&
                    "h-11 text-base font-semibold rounded-xl"
                )}
              >
                {applyingCrop ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Apply & Upload"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
