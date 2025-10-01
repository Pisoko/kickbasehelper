'use client';

import React from 'react';

interface BudgetTrackerProps {
  totalCost: number;
  remainingBudget: number;
  budget: number;
}

export function BudgetTracker({ totalCost, remainingBudget, budget }: BudgetTrackerProps) {
  const usedPercentage = (totalCost / budget) * 100;
  
  const formatCurrency = (amount: number) => {
    return `€${(amount / 1000000).toFixed(1)}M`;
  };

  return (
    <div className="bg-card rounded-lg border p-4">
      <h3 className="text-lg font-semibold mb-3">Budget</h3>
      
      <div className="space-y-3">
        {/* Budget Overview */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Gesamt Budget:</span>
          <span className="font-medium">{formatCurrency(budget)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Ausgegeben:</span>
          <span className="font-medium">{formatCurrency(totalCost)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Verfügbar:</span>
          <span className={`font-medium ${
            remainingBudget < 0 
              ? 'text-destructive' 
              : remainingBudget < 50000000 
                ? 'text-yellow-600' 
                : 'text-green-600'
          }`}>
            {formatCurrency(remainingBudget)}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>{usedPercentage.toFixed(1)}%</span>
            <span>100%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                usedPercentage > 100 
                  ? 'bg-destructive' 
                  : usedPercentage > 90 
                    ? 'bg-yellow-500' 
                    : 'bg-primary'
              }`}
              style={{ width: `${Math.min(usedPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Warning */}
        {usedPercentage > 90 && (
          <div className={`text-xs p-2 rounded ${
            usedPercentage > 100 
              ? 'bg-destructive/10 text-destructive' 
              : 'bg-yellow-500/10 text-yellow-600'
          }`}>
            {usedPercentage > 100 
              ? 'Budget überschritten!' 
              : 'Budget fast aufgebraucht!'
            }
          </div>
        )}
      </div>
    </div>
  );
}