/**
 * The core transformation, drawn: a tangle of ad-hoc dependencies on the left
 * resolving into an ordered, addressable structure on the right.
 *
 * Inline SVG rather than an image file so it stays crisp at any size, inherits
 * the brand colours, and costs no extra request.
 */

const SCATTER: Array<[number, number, number]> = [
  [46, 58, 7],
  [128, 34, 5],
  [180, 96, 9],
  [36, 140, 6],
  [104, 118, 11],
  [166, 182, 6],
  [58, 214, 8],
  [136, 246, 6],
  [24, 288, 5],
  [178, 292, 7],
  [92, 320, 9],
];

// Deliberately criss-crossing: everything routes through the two busiest nodes,
// which is the promoter-dependency problem stated visually.
const TANGLE: Array<[number, number]> = [
  [0, 4],
  [1, 4],
  [2, 4],
  [3, 4],
  [4, 5],
  [4, 6],
  [4, 10],
  [6, 10],
  [7, 10],
  [8, 10],
  [9, 10],
  [1, 2],
  [3, 8],
  [5, 7],
];

const COLS = 4;
const ROWS = 5;
const CELL = 62;
const GRID_X = 316;
const GRID_Y = 44;

export default function HeroVisual() {
  const nodes = SCATTER.map(([x, y, r]) => ({ x, y, r }));

  const cells = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      cells.push({
        x: GRID_X + col * CELL,
        y: GRID_Y + row * CELL,
        // The top-left block is the "you" node — no longer load-bearing.
        anchor: row === 0 && col === 0,
      });
    }
  }

  return (
    <svg
      viewBox="0 0 560 420"
      role="img"
      aria-labelledby="hero-visual-title hero-visual-desc"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title id="hero-visual-title">
        From scattered dependencies to institution-grade structure
      </title>
      <desc id="hero-visual-desc">
        On the left, a tangle of connections all routing through two overloaded
        points. On the right, the same work laid out as an even, ordered grid.
      </desc>

      {/* ---------------------------------------------------- left: tangle */}
      <g>
        {TANGLE.map(([a, b], i) => (
          <line
            key={i}
            x1={nodes[a].x}
            y1={nodes[a].y}
            x2={nodes[b].x}
            y2={nodes[b].y}
            stroke="#6b6b6b"
            strokeOpacity={0.42}
            strokeWidth={1}
          />
        ))}
        {nodes.map((n, i) => (
          <circle
            key={i}
            cx={n.x}
            cy={n.y}
            r={n.r}
            fill={n.r >= 9 ? "#0b1f40" : "#ffffff"}
            stroke={n.r >= 9 ? "#0b1f40" : "#6b6b6b"}
            strokeWidth={1.4}
          />
        ))}
      </g>

      {/* --------------------------------------------------- centre: seam */}
      <g>
        <line
          x1={268}
          y1={26}
          x2={268}
          y2={352}
          stroke="#dce0e6"
          strokeWidth={1}
          strokeDasharray="3 6"
        />
        <g transform="translate(268 189)">
          <circle r={17} fill="#0b1f40" />
          <path
            d="M-5 -5 L4 0 L-5 5 Z"
            fill="#ffffff"
            transform="translate(1 0)"
          />
        </g>
      </g>

      {/* ----------------------------------------------------- right: grid */}
      <g>
        <rect
          x={GRID_X - 26}
          y={GRID_Y - 26}
          width={(COLS - 1) * CELL + 52}
          height={(ROWS - 1) * CELL + 52}
          fill="none"
          stroke="#dce0e6"
          strokeWidth={1}
          rx={2}
        />
        {/* Orthogonal rails — every node reachable, none load-bearing. */}
        {Array.from({ length: ROWS }, (_, row) => (
          <line
            key={`h${row}`}
            x1={GRID_X}
            y1={GRID_Y + row * CELL}
            x2={GRID_X + (COLS - 1) * CELL}
            y2={GRID_Y + row * CELL}
            stroke="#0b1f40"
            strokeOpacity={0.16}
            strokeWidth={1}
          />
        ))}
        {Array.from({ length: COLS }, (_, col) => (
          <line
            key={`v${col}`}
            x1={GRID_X + col * CELL}
            y1={GRID_Y}
            x2={GRID_X + col * CELL}
            y2={GRID_Y + (ROWS - 1) * CELL}
            stroke="#0b1f40"
            strokeOpacity={0.16}
            strokeWidth={1}
          />
        ))}
        {cells.map((c, i) => (
          <rect
            key={i}
            x={c.x - 5}
            y={c.y - 5}
            width={10}
            height={10}
            fill={c.anchor ? "#6b6b6b" : "#0b1f40"}
            rx={1}
          />
        ))}
      </g>

      {/* -------------------------------------------------------- captions */}
      <g
        fontFamily="var(--font-sans), sans-serif"
        fontSize={11}
        fontWeight={600}
        letterSpacing="1.6"
        fill="#6b6b6b"
      >
        <text x={4} y={382}>
          WHERE YOU ARE
        </text>
        <text x={GRID_X - 26} y={382}>
          INSTITUTION-GRADE
        </text>
      </g>
    </svg>
  );
}
