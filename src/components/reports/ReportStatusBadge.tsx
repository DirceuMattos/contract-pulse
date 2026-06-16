import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ReportStatus } from '@/types';
import { STATUS_LABELS } from '@/lib/reportSectionSchemas';

const COLORS: Record<ReportStatus, string> = {
  draft: 'bg-gray-200 text-gray-800 hover:bg-gray-200',
  review: 'bg-yellow-200 text-yellow-900 hover:bg-yellow-200',
  approved: 'bg-green-200 text-green-900 hover:bg-green-200',
  published: 'bg-blue-200 text-blue-900 hover:bg-blue-200',
};

export function ReportStatusBadge({ status, className }: { status: ReportStatus; className?: string }) {
  return (
    <Badge className={cn('font-medium border-0', COLORS[status], className)}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
