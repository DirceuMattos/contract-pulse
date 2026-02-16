import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, actionIcon: ActionIcon }: EmptyStateProps) {
  return (
    <Card className="card-elevated">
      <CardContent className="py-12 text-center">
        <Icon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground mb-4">{description}</p>
        {actionLabel && onAction && (
          <Button onClick={onAction} className="gap-2">
            {ActionIcon && <ActionIcon className="w-4 h-4" />}
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
