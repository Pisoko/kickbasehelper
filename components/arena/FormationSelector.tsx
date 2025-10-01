'use client';

import React from 'react';
import { FormationType, FORMATIONS } from '@/lib/arena-types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FormationSelectorProps {
  currentFormation: FormationType;
  onFormationChange: (formation: FormationType) => void;
}

export function FormationSelector({ currentFormation, onFormationChange }: FormationSelectorProps) {
  const formations = Object.keys(FORMATIONS) as FormationType[];

  return (
    <div className="bg-card rounded-lg border p-4">
      <h3 className="text-lg font-semibold mb-3">Formation wählen</h3>
      <Select value={currentFormation} onValueChange={onFormationChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Formation auswählen" />
        </SelectTrigger>
        <SelectContent>
          {formations.map((formation) => (
            <SelectItem key={formation} value={formation}>
              {formation}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}