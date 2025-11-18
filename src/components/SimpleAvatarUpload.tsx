import { useState, useRef } from "react";
import {
  Upload,
  X,
  User,
  ZoomIn,
  ZoomOut,
  Loader2,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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

interface SimpleAvatarUploadProps {
  currentImage?: string;
  onImageChange: (imageUrl: string | null) => void;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

export function SimpleAvatarUpload({
  currentImage,
  onImageChange,
  onFileChange,
  disabled = false,
}: SimpleAvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentImage || null
  );
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<File | null>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [applyingCrop, setApplyingCrop] = useState(false);
  const editorRef = useRef<AvatarEditor>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    // Prevent multiple simultaneous file processing
    if (uploading) {
      console.log("[SimpleAvatarUpload] Already processing a file, ignoring");
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
      // This allows the file picker to close properly before processing
      // Use longer delay on native platforms for better stability
      const delay = Capacitor.isNativePlatform() ? 150 : 50;
      await new Promise<void>((resolve) => {
        // Use microtask queue for immediate but non-blocking execution
        Promise.resolve().then(() => {
          // Use setTimeout to ensure file picker UI has closed
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
          const croppedFile = new File([blob], `avatar-${Date.now()}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });

          // Create preview URL
          const preview = URL.createObjectURL(croppedFile);
          setPreviewUrl(preview);

          // Clean up dialog first
          setCropDialogOpen(false);
          setImageToCrop(null);
          setApplyingCrop(false);

          // Update parent component asynchronously to prevent blocking
          setTimeout(
            () => {
              onFileChange(croppedFile);

              toast({
                title: "Image Ready",
                description: "Profile picture cropped and ready for upload",
              });
            },
            Capacitor.isNativePlatform() ? 100 : 0
          );
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
  };

  const handleEditPosition = () => {
    if (imageToCrop) {
      setCropDialogOpen(true);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    // Immediately reset input to allow re-selection
    const input = e.target;
    input.value = "";

    // Process file asynchronously to prevent UI blocking
    try {
      await handleFile(file);
    } catch (error) {
      console.error("Error handling file:", error);
      toast({
        title: "Error",
        description: "Failed to process image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const removeImage = () => {
    if (previewUrl && previewUrl !== currentImage) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    onImageChange(null);
    onFileChange(null);

    toast({
      title: "Image Removed",
      description: "Profile picture has been removed",
    });
  };

  return (
    <div className="space-y-4">
      {/* Current/Preview Image */}
      {previewUrl && (
        <div className="flex flex-col items-center space-y-3">
          <div className="relative group">
            <Avatar className="w-32 h-32">
              <AvatarImage src={previewUrl} alt="Profile preview" />
              <AvatarFallback>
                <User className="w-16 h-16" />
              </AvatarFallback>
            </Avatar>

            {/* Re-upload overlay button - appears on hover/touch */}
            {!disabled && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 w-full h-full bg-black/60 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity rounded-full flex items-center justify-center cursor-pointer"
                aria-label="Change profile picture"
              >
                <Camera className="h-8 w-8 text-white" />
              </button>
            )}
          </div>

          {/* Re-upload button - always visible for better UX */}
          {!disabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Camera className="h-4 w-4 mr-2" />
              Change Photo
            </Button>
          )}

          {/* Edit position button */}
          {!disabled && imageToCrop && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditPosition}
              className="text-xs"
            >
              Adjust Crop
            </Button>
          )}
        </div>
      )}

      {/* Hidden file input - always present for re-upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        className="hidden"
      />

      {/* Upload Area - Only show when no image */}
      {!previewUrl && (
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          } ${
            disabled || uploading
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer"
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled && !uploading) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onClick={() =>
            !uploading && !disabled && fileInputRef.current?.click()
          }
        >
          <div className="flex flex-col items-center space-y-4">
            {uploading ? (
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
            )}

            <div>
              <p className="font-medium text-lg">Upload Profile Picture</p>
              <p className="text-sm text-muted-foreground">
                Drag & drop or click to select
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                📸 You'll be able to crop and adjust your photo perfectly before
                saving
              </p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG • Max 10MB
              </p>
            </div>
          </div>
        </div>
      )}

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
              Adjust Your Profile Picture
            </DialogTitle>
            <DialogDescription>
              Crop and adjust your profile picture before saving
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
                  circle
                </li>
                <li>
                  <strong>Pinch</strong> on mobile or use the zoom slider below
                </li>
                <li>Your photo will be perfectly circular</li>
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
                    "border-4 border-primary/20 rounded-full overflow-hidden",
                    Capacitor.isNativePlatform() && "border-2"
                  )}
                >
                  <AvatarEditor
                    ref={editorRef}
                    image={imageToCrop}
                    width={Capacitor.isNativePlatform() ? 250 : 300}
                    height={Capacitor.isNativePlatform() ? 250 : 300}
                    border={0}
                    borderRadius={Capacitor.isNativePlatform() ? 125 : 150}
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
                    Applying...
                  </>
                ) : (
                  "Apply Crop"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
