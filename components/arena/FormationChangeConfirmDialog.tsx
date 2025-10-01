'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface FormationChangeConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function FormationChangeConfirmDialog({
  isOpen,
  onConfirm,
  onCancel
}: FormationChangeConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Formation ändern?</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Wenn du die Formation änderst, verlierst du alle ausgewählten Spieler.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Möchtest du fortfahren?
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="w-full sm:w-auto"
          >
            Nein
          </Button>
          <Button
            onClick={onConfirm}
            className="w-full sm:w-auto"
          >
            Ja
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}