type MarketHistoryPoint = {
  date: string;
  price: number;
};

type MarketHistoryChartProps = {
  points: MarketHistoryPoint[];
};

const SVG_WIDTH = 760;
const SVG_HEIGHT = 260;
const PADDING_X = 14;
const PADDING_Y = 18;

function formatChartDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatValueLabel(value: number) {
  return `$${value.toFixed(2)}`;
}

function buildCoordinates(points: MarketHistoryPoint[]) {
  const prices = points.map((point) => point.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || Math.max(maxPrice, 1);

  const usableWidth = SVG_WIDTH - PADDING_X * 2;
  const usableHeight = SVG_HEIGHT - PADDING_Y * 2;

  return points.map((point, index) => {
    const x =
      points.length === 1 ? SVG_WIDTH / 2 : PADDING_X + (index / (points.length - 1)) * usableWidth;
    const y = PADDING_Y + ((maxPrice - point.price) / range) * usableHeight;

    return { x, y };
  });
}

export default function MarketHistoryChart({ points }: MarketHistoryChartProps) {
  if (points.length === 0) {
    return null;
  }

  const coordinates = buildCoordinates(points);
  const prices = points.map((point) => point.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const lastCoordinate = coordinates[coordinates.length - 1];
  const linePath = coordinates
    .map((coordinate, index) => `${index === 0 ? "M" : "L"} ${coordinate.x} ${coordinate.y}`)
    .join(" ");
  const areaPath = `${linePath} L ${coordinates[coordinates.length - 1].x} ${SVG_HEIGHT - PADDING_Y} L ${coordinates[0].x} ${SVG_HEIGHT - PADDING_Y} Z`;
  const gridLines = [PADDING_Y, SVG_HEIGHT / 2, SVG_HEIGHT - PADDING_Y];

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50/70">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          aria-hidden="true"
          className="h-60 w-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="market-history-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(15 23 42 / 0.14)" />
              <stop offset="100%" stopColor="rgb(15 23 42 / 0)" />
            </linearGradient>
          </defs>

          {gridLines.map((y) => (
            <line
              key={y}
              x1={PADDING_X}
              x2={SVG_WIDTH - PADDING_X}
              y1={y}
              y2={y}
              stroke="rgb(203 213 225)"
              strokeDasharray="4 8"
              strokeWidth="1"
            />
          ))}

          <path d={areaPath} fill="url(#market-history-fill)" />
          <path
            d={linePath}
            fill="none"
            stroke="rgb(15 23 42)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
          <circle
            cx={lastCoordinate.x}
            cy={lastCoordinate.y}
            r="5"
            fill="white"
            stroke="rgb(15 23 42)"
            strokeWidth="2"
          />
        </svg>
      </div>

      <div className="flex items-center justify-between gap-4 text-xs text-slate-400">
        <span>{formatValueLabel(minPrice)}</span>
        <span>{formatChartDate(points[0].date)}</span>
        <span>{formatChartDate(points[points.length - 1].date)}</span>
        <span>{formatValueLabel(maxPrice)}</span>
      </div>
    </div>
  );
}
