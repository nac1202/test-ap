import React from 'react';
import { Wrench } from 'lucide-react';
import { cn } from '../../lib/utils';

export const DEFAULT_MAINTENANCE_MESSAGE =
  '現在、システムメンテナンスを予定しています。詳しい日時は全社お知らせをご確認ください。';

interface MaintenanceBannerProps {
  message?: string;
  className?: string;
}

export function MaintenanceBanner({
  message = DEFAULT_MAINTENANCE_MESSAGE,
  className,
}: MaintenanceBannerProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'w-full bg-amber-400 text-amber-950 text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 flex items-center justify-center gap-2 z-[45] shrink-0 shadow-sm border-b border-amber-500/30',
        className
      )}
    >
      <Wrench className="h-4 w-4 shrink-0 text-amber-900" />
      <span className="text-center leading-normal break-words max-w-4xl">
        {message}
      </span>
    </div>
  );
}
