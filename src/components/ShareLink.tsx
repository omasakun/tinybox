import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { keyManager } from "@/lib/key-manager";
import { useAtom } from "@/lib/utils";
import { keyLoadedFromExternal, hasUploadedFilesStore, keyHashStore } from "@/lib/stores";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

interface ShareLinkProps {
  onKeyChange?: () => Promise<void>;
}

const ShareLink: React.FC<ShareLinkProps> = ({ onKeyChange }) => {
  const [linkSaved, setLinkSaved] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [keyLoadedFromUrl] = useAtom(keyLoadedFromExternal);
  const [hasUploadedFiles] = useAtom(hasUploadedFilesStore);
  const [keyHash] = useAtom(keyHashStore);

  // Generate QR code when showQR is enabled
  useEffect(() => {
    if (showQR) {
      const generateQRCode = async () => {
        try {
          const shareUrl = keyManager.getShareUrl();
          const dataUrl = await QRCode.toDataURL(shareUrl, {
            errorCorrectionLevel: "medium",
          });
          setQrCodeDataUrl(dataUrl);
        } catch (error) {
          console.error("Failed to generate QR code:", error);
          toast.error("Failed to generate QR code");
        }
      };
      generateQRCode();
    }
  }, [showQR]);

  // Add beforeunload event listener to warn user if key is unsaved
  // Skip warning if key was loaded from URL or no files have been uploaded
  useEffect(() => {
    // Don't show warning if:
    // 1. Link is already saved, OR
    // 2. Key was loaded from URL (user already has the key), OR
    // 3. No files have been uploaded (nothing to lose)
    if (linkSaved || keyLoadedFromUrl || !hasUploadedFiles) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [linkSaved, keyLoadedFromUrl, hasUploadedFiles]);

  const copyShareLink = async () => {
    try {
      const shareUrl = keyManager.getShareUrl();
      await navigator.clipboard.writeText(shareUrl);
      setLinkSaved(true);
      toast.success("Share link copied");
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy share link");
    }
  };

  const generateNewKey = async () => {
    if (!confirm("Generate new key? Previous files will be inaccessible.")) return;

    try {
      await keyManager.generateNewKey();
      setLinkSaved(false);
      setShowQR(false); // Hide QR code when generating new key
      toast.success("New key generated");

      if (onKeyChange) {
        await onKeyChange();
      }
    } catch (error) {
      console.error("Key generation failed:", error);
      toast.error("Failed to generate new key");
    }
  };

  const toggleQRCode = () => {
    setShowQR(!showQR);
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-baseline space-x-2">
          <div className={`h-2 w-2 rounded-full ${linkSaved ? "bg-green-500" : "bg-red-500"}`} />
          <div className="text-sm font-medium">Link {linkSaved ? "saved" : "not saved"}</div>
          <div className="flex-1" />
          <div className="font-mono text-xs font-medium">Key:{keyHash ?? "--------"}</div>
        </div>

        <div className="space-y-2">
          <Button onClick={copyShareLink} className="w-full">
            Copy Share Link
          </Button>
          <Button onClick={toggleQRCode} variant="outline" className="w-full">
            {showQR ? "Hide QR Code" : "Show QR Code"}
          </Button>
          <Button onClick={generateNewKey} variant="outline" className="w-full">
            Generate New Key
          </Button>
        </div>

        {/* QR Code Display */}
        {showQR && qrCodeDataUrl && (
          <div className="flex justify-center py-4">
            <img src={qrCodeDataUrl} alt="Share Link QR Code" className="w-32" />
          </div>
        )}

        <div className="text-xs text-gray-500">
          <p className="font-medium">Warning:</p>
          <p>Save the link before closing. Without it, files are permanently lost.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShareLink;
