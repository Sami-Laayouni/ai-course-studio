"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AdvancedTextarea } from "@/components/ui/advanced-textarea";
import { Maximize2 } from "lucide-react";

interface TextEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (value: string) => void;
  title: string;
  description?: string;
  placeholder?: string;
}

export function TextEditorModal({
  open,
  onOpenChange,
  value,
  onChange,
  title,
  description,
  placeholder = "Type your content here...",
}: TextEditorModalProps) {
  const [tempValue, setTempValue] = useState(value);

  React.useEffect(() => {
    if (open) {
      setTempValue(value);
    }
  }, [open, value]);

  const handleSave = () => {
    onChange(tempValue);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setTempValue(value);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Maximize2 className="h-5 w-5" />
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        <div className="py-4">
          <AdvancedTextarea
            value={tempValue}
            onChange={setTempValue}
            rows={20}
            placeholder={placeholder}
            previewLabel="Live Preview"
            className="min-h-[500px]"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

