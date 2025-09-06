import React from "react";
import { Toaster as SonnerToaster } from "sonner";

const Toaster: React.FC = () => {
  return (
    <SonnerToaster
      theme="light"
      position="bottom-right"
      richColors
      toastOptions={{
        classNames: {
          title: "font-medium",
          description: "text-sm opacity-90",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
          closeButton: "bg-transparent hover:bg-muted",
        },
      }}
    />
  );
};

export default Toaster;
