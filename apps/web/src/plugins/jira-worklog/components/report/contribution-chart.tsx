import { cn } from '@/shared/lib/utils';

interface ContributionBar {
  label: string;
  seconds: number;
  color: string;
}

interface ContributionChartProps {
  bars: ContributionBar[];
  totalSeconds: number;
  className?: string;
}

const PALETTE = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-yellow-500',
];

function formatHours(seconds: number): string {
  const h = Math.round((seconds / 3600) * 10) / 10;
  return `${h}h`;
}

export function ContributionChart({ bars, totalSeconds, className }: ContributionChartProps) {
  if (bars.length === 0 || totalSeconds === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex h-6 w-full overflow-hidden rounded-md bg-muted">
        {bars.map((bar, i) => {
          const pct = (bar.seconds / totalSeconds) * 100;
          if (pct < 1) return null;
          return (
            <div
              key={bar.label}
              className={cn('h-full transition-all', PALETTE[i % PALETTE.length])}
              style={{ width: `${pct}%` }}
              title={`${bar.label}: ${formatHours(bar.seconds)} (${Math.round(pct)}%)`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {bars.map((bar, i) => (
          <div key={bar.label} className="flex items-center gap-1.5 text-xs">
            <span className={cn('h-2.5 w-2.5 rounded-sm shrink-0', PALETTE[i % PALETTE.length])} />
            <span className="text-muted-foreground">{bar.label}</span>
            <span className="font-medium tabular-nums">{formatHours(bar.seconds)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
