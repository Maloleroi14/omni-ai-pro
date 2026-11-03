import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ImagePlus, Paperclip, Loader2, X, Camera } from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";

export interface UploadedFile {
  type: "image" | "file";
  name: string;
  base64: string;
  mimeType: string;
}

interface FileUploadButtonProps {
  onFileSelect: (file: UploadedFile) => void;
  disabled?: boolean;
  currentFile?: UploadedFile | null;
  onClearFile?: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_FILE_TYPES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/pdf",
  "application/json",
  "text/html",
  "text/css",
  "text/javascript",
  "application/javascript",
];

export function FileUploadButton({ 
  onFileSelect, 
  disabled, 
  currentFile, 
  onClearFile 
}: FileUploadButtonProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const isMobile = useIsMobile();

  const processFile = async (file: File, type: "image" | "file") => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Fichier trop volumineux (max 10MB)");
      return;
    }

    setIsProcessing(true);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove the data URL prefix to get pure base64
          const base64Data = result.split(",")[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      onFileSelect({
        type,
        name: file.name,
        base64,
        mimeType: file.type,
      });

      setPopoverOpen(false);
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Erreur lors du traitement du fichier");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Type d'image non supporté. Utilisez JPG, PNG, GIF ou WebP.");
      return;
    }

    processFile(file, "image");
    e.target.value = "";
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Camera always captures as image
    processFile(file, "image");
    e.target.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's an image (will process as image)
    if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
      processFile(file, "image");
    } else if (ALLOWED_FILE_TYPES.includes(file.type) || file.name.endsWith(".md") || file.name.endsWith(".txt")) {
      processFile(file, "file");
    } else {
      toast.error("Type de fichier non supporté. Utilisez des images, PDF, ou fichiers texte.");
      return;
    }

    e.target.value = "";
  };

  if (currentFile) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-lg text-xs">
        {currentFile.type === "image" ? (
          <ImagePlus className="w-3 h-3 text-primary" />
        ) : (
          <Paperclip className="w-3 h-3 text-primary" />
        )}
        <span className="max-w-[100px] truncate">{currentFile.name}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 p-0 hover:bg-destructive/20"
          onClick={onClearFile}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageChange}
        disabled={disabled || isProcessing}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraCapture}
        disabled={disabled || isProcessing}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.csv,.pdf,.json,.html,.css,.js,.ts,.tsx,.jsx"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isProcessing}
      />

      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0"
            disabled={disabled || isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Paperclip className="w-5 h-5" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div className="flex flex-col gap-1">
            {isMobile && (
              <Button
                variant="ghost"
                className="justify-start gap-2"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="w-4 h-4" />
                Prendre une photo
              </Button>
            )}
            <Button
              variant="ghost"
              className="justify-start gap-2"
              onClick={() => imageInputRef.current?.click()}
            >
              <ImagePlus className="w-4 h-4" />
              Photo / Image
            </Button>
            <Button
              variant="ghost"
              className="justify-start gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-4 h-4" />
              Fichier
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
