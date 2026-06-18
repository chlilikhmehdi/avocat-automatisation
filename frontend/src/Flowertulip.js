import { useState, useEffect, useRef } from "react";

const rand = (min, max) => Math.random() * (max - min) + min;

// ── Petal SVG path for a tulip petal ──────────────────────────────────────
function TulipPetal({ color, shadowColor, style }) {
  return (
    <svg viewBox="0 0 60 100" style={{ overflow: "visible", ...style }}>
      <defs>
        <radialGradient id={`pg-${color.replace("#", "")}`} cx="40%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="100%" stopColor={shadowColor} stopOpacity="0.9" />
        </radialGradient>
      </defs>
      <path
        d="M30 95 C10 70 -5 45 5 20 C10 5 20 0 30 0 C40 0 50 5 55 20 C65 45 50 70 30 95Z"
        fill={`url(#pg-${color.replace("#", "")})`}
        stroke={shadowColor}
        strokeWidth="0.5"
        strokeOpacity="0.3"
      />
      <path
        d="M30 95 C25 65 22 40 26 15"
        fill="none"
        stroke="#fff"
        strokeWidth="1"
        strokeOpacity="0.25"
      />
    </svg>
  );
}

// ── Single tulip flower ───────────────────────────────────────────────────
function Tulip({ x, y, scale = 1, hue = 340, delay = 0, bloom = false }) {
  const color = `hsl(${hue}, 80%, 60%)`;
  const darkColor = `hsl(${hue}, 75%, 38%)`;
  const lightColor = `hsl(${hue}, 85%, 75%)`;

  const petalConfig = [
    { rot: -40, tx: -14, color, shadow: darkColor },
    { rot: -18, tx: -6, color: lightColor, shadow: color },
    { rot: 0, tx: 0, color, shadow: darkColor },
    { rot: 18, tx: 6, color: lightColor, shadow: color },
    { rot: 40, tx: 14, color, shadow: darkColor },
  ];

  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`} style={{ transformOrigin: `${x}px ${y}px` }}>
      {/* Stem */}
      <path
        d={`M0,0 C-4,${-50 * scale * 0.8} -2,${-90 * scale * 0.8} 0,${-120 * scale * 0.8}`}
        fill="none"
        stroke={`hsl(120, 55%, 32%)`}
        strokeWidth={3 * scale}
        strokeLinecap="round"
        style={{
          opacity: bloom ? 1 : 0,
          transform: bloom ? "scaleY(1)" : "scaleY(0)",
          transformOrigin: "0px 0px",
          transition: `all 0.8s cubic-bezier(0.34,1.56,0.64,1) ${delay + 0.1}s`,
        }}
      />
      {/* Leaf */}
      <ellipse
        cx={-12 * scale}
        cy={-70 * scale * 0.8}
        rx={10 * scale}
        ry={5 * scale}
        fill={`hsl(120, 55%, 38%)`}
        transform={`rotate(-30, ${-12 * scale}, ${-70 * scale * 0.8})`}
        style={{
          opacity: bloom ? 0.9 : 0,
          transition: `opacity 0.5s ease ${delay + 0.4}s`,
        }}
      />
      {/* Petals */}
      {petalConfig.map((p, i) => (
        <g
          key={i}
          transform={`translate(${p.tx * scale}, ${-128 * scale * 0.8}) rotate(${p.rot})`}
          style={{
            transformOrigin: `${p.tx * scale}px ${-128 * scale * 0.8}px`,
            opacity: bloom ? 1 : 0,
            transform: bloom
              ? `translate(${p.tx * scale}px, ${-128 * scale * 0.8}px) rotate(${p.rot}deg) scale(1)`
              : `translate(${p.tx * scale}px, ${-128 * scale * 0.8}px) rotate(${p.rot}deg) scale(0)`,
            transition: `all 0.7s cubic-bezier(0.34,1.56,0.64,1) ${delay + 0.3 + i * 0.06}s`,
          }}
        >
          <svg
            width={30 * scale}
            height={50 * scale}
            viewBox="0 0 60 100"
            overflow="visible"
          >
            <defs>
              <radialGradient id={`g${hue}-${i}`} cx="40%" cy="30%" r="65%">
                <stop offset="0%" stopColor="#fff" stopOpacity="0.45" />
                <stop offset="100%" stopColor={p.shadow} stopOpacity="0.9" />
              </radialGradient>
            </defs>
            <path
              d="M30 95 C10 70 -5 45 5 20 C10 5 20 0 30 0 C40 0 50 5 55 20 C65 45 50 70 30 95Z"
              fill={`url(#g${hue}-${i})`}
            />
          </svg>
        </g>
      ))}
    </g>
  );
}

// ── Floating heart ────────────────────────────────────────────────────────
function FloatingHeart({ x, delay, size = 16, color = "#ff6b8a" }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        bottom: "10%",
        fontSize: size,
        color,
        animation: `floatHeart ${rand(4, 7)}s ease-in infinite`,
        animationDelay: `${delay}s`,
        opacity: 0,
        userSelect: "none",
        pointerEvents: "none",
        filter: "drop-shadow(0 0 4px rgba(255,107,138,0.5))",
      }}
    >
      ♥
    </div>
  );
}

// ── Firefly / particle ────────────────────────────────────────────────────
function Firefly({ x, y, delay }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 4,
        height: 4,
        borderRadius: "50%",
        background: "radial-gradient(circle, #ffe066 0%, #ffaa00 60%, transparent 100%)",
        boxShadow: "0 0 8px 3px rgba(255,220,80,0.7)",
        animation: `firefly ${rand(3, 6)}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        pointerEvents: "none",
      }}
    />
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function FlowerTulip() {
  const [bloom, setBloom] = useState(false);
  const [showMsg, setShowMsg] = useState(false);
  const [petals, setPetals] = useState([]);
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setBloom(true), 600);
    const t2 = setTimeout(() => setShowMsg(true), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Falling petals on click
  const addPetals = () => {
    if (clicked) return;
    setClicked(true);
    const newPetals = Array.from({ length: 22 }, (_, i) => ({
      id: Date.now() + i,
      x: rand(5, 95),
      delay: rand(0, 1.2),
      hue: rand(320, 360),
      size: rand(12, 26),
      spin: rand(-180, 180),
      dur: rand(3, 5.5),
    }));
    setPetals(prev => [...prev, ...newPetals]);
    setTimeout(() => setClicked(false), 800);
  };

  // Tulip arrangement
  const tulips = [
    { x: 50, y: 420, scale: 1.15, hue: 340, delay: 0 },
    { x: 160, y: 440, scale: 0.95, hue: 355, delay: 0.15 },
    { x: 260, y: 430, scale: 1.05, hue: 325, delay: 0.08 },
    { x: 360, y: 445, scale: 0.9, hue: 10, delay: 0.22 },  // coral
    { x: 460, y: 435, scale: 1.1, hue: 345, delay: 0.12 },
    { x: 550, y: 442, scale: 0.88, hue: 330, delay: 0.28 },
    { x: 650, y: 438, scale: 1.0, hue: 350, delay: 0.18 },
    // small background ones
    { x: 100, y: 460, scale: 0.7, hue: 300, delay: 0.35 },
    { x: 310, y: 460, scale: 0.72, hue: 315, delay: 0.4 },
    { x: 510, y: 458, scale: 0.68, hue: 5, delay: 0.45 },
    { x: 200, y: 455, scale: 0.75, hue: 0, delay: 0.32 },
    { x: 600, y: 455, scale: 0.73, hue: 355, delay: 0.38 },
  ];

  const hearts = Array.from({ length: 14 }, (_, i) => ({
    x: `${rand(2, 95)}%`,
    delay: rand(0, 6),
    size: rand(12, 22),
    color: `hsl(${rand(330, 360)}, 80%, ${rand(60, 75)}%)`,
  }));

  const fireflies = Array.from({ length: 20 }, (_, i) => ({
    x: `${rand(3, 97)}%`,
    y: `${rand(10, 85)}%`,
    delay: rand(0, 5),
  }));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,600&family=Cormorant+Garamond:ital,wght@0,300;1,300;1,400&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          background: #0a040f;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .scene {
          position: relative;
          width: 720px;
          height: 540px;
          overflow: hidden;
          border-radius: 28px;
          background: linear-gradient(
            175deg,
            #110820 0%,
            #1a062e 30%,
            #200835 55%,
            #0f0518 80%,
            #070210 100%
          );
          box-shadow:
            0 0 80px rgba(200, 80, 160, 0.18),
            0 0 30px rgba(120, 40, 180, 0.22),
            inset 0 0 120px rgba(0,0,0,0.5);
          cursor: pointer;
        }

        /* Stars */
        .stars {
          position: absolute; inset: 0; pointer-events: none;
        }
        .star {
          position: absolute;
          border-radius: 50%;
          background: white;
          animation: twinkle var(--dur) ease-in-out infinite;
          animation-delay: var(--delay);
        }

        /* Moon glow */
        .moon {
          position: absolute;
          top: 28px; right: 60px;
          width: 56px; height: 56px;
          border-radius: 50%;
          background: radial-gradient(circle at 38% 38%, #fff9e0, #ffe082 60%, #ffb74d);
          box-shadow:
            0 0 30px 12px rgba(255, 230, 100, 0.3),
            0 0 80px 30px rgba(255, 200, 60, 0.12);
          animation: moonPulse 5s ease-in-out infinite;
        }
        .moon::after {
          content: '';
          position: absolute;
          inset: 4px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), transparent 60%);
        }

        /* Ground */
        .ground {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 130px;
          background: linear-gradient(180deg, transparent 0%, #1a0a2e 30%, #120820 100%);
          border-radius: 0 0 28px 28px;
        }
        .grass {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 60px;
          background: linear-gradient(0deg, #0f1a0a 0%, #1a2d0e 50%, transparent 100%);
          border-radius: 0 0 28px 28px;
        }

        /* Name text */
        .name-wrap {
          position: absolute;
          top: 38px; left: 0; right: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          pointer-events: none;
        }
        .name-label {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-weight: 300;
          font-size: 13px;
          letter-spacing: 5px;
          color: rgba(255, 180, 220, 0.55);
          text-transform: uppercase;
        }
        .name-main {
          font-family: 'Playfair Display', serif;
          font-style: italic;
          font-weight: 700;
          font-size: 52px;
          background: linear-gradient(135deg, #ffd6e8 0%, #ffb3d4 30%, #ff85b8 55%, #e8528a 80%, #c23070 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(0 0 18px rgba(255,100,160,0.5));
          opacity: 0;
          transform: translateY(14px);
          animation: revealName 1s cubic-bezier(0.22,1,0.36,1) 2.0s forwards;
          line-height: 1.1;
        }
        .love-msg {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 15.5px;
          color: rgba(255, 200, 225, 0.72);
          letter-spacing: 1.5px;
          opacity: 0;
          transform: translateY(10px);
          animation: revealName 1s ease 2.9s forwards;
          text-align: center;
          padding: 0 20px;
          line-height: 1.7;
        }

        /* Petal rain */
        .petal-rain {
          position: absolute;
          top: -20px;
          font-size: var(--size);
          color: hsl(var(--hue), 80%, 70%);
          filter: drop-shadow(0 0 4px hsla(var(--hue), 80%, 60%, 0.5));
          animation: petalFall var(--dur) cubic-bezier(0.25, 0.46, 0.45, 0.94) var(--delay) forwards;
          pointer-events: none;
          user-select: none;
          opacity: 0;
        }

        /* Floating hearts */
        @keyframes floatHeart {
          0%   { opacity: 0; transform: translateY(0) scale(0.5) rotate(-10deg); }
          15%  { opacity: 0.85; }
          85%  { opacity: 0.4; }
          100% { opacity: 0; transform: translateY(-260px) scale(1.2) rotate(10deg); }
        }

        @keyframes firefly {
          0%, 100% { opacity: 0; transform: translate(0,0) scale(1); }
          25%  { opacity: 0.9; transform: translate(${rand(-20, 20)}px, ${rand(-15, 15)}px) scale(1.3); }
          50%  { opacity: 0.5; transform: translate(${rand(-25, 25)}px, ${rand(-20, 20)}px) scale(0.8); }
          75%  { opacity: 0.8; transform: translate(${rand(-15, 15)}px, ${rand(-10, 10)}px) scale(1.1); }
        }

        @keyframes twinkle {
          0%, 100% { opacity: 0.1; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.3); }
        }

        @keyframes moonPulse {
          0%, 100% { box-shadow: 0 0 30px 12px rgba(255,230,100,0.3), 0 0 80px 30px rgba(255,200,60,0.12); }
          50%  { box-shadow: 0 0 44px 18px rgba(255,230,100,0.4), 0 0 100px 40px rgba(255,200,60,0.18); }
        }

        @keyframes revealName {
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes petalFall {
          0%   { opacity: 0.9; transform: translateX(0) rotate(0deg); left: var(--sx); }
          100% { opacity: 0; transform: translateX(calc(var(--drift) * 60px)) rotate(var(--spin)); top: 105%; }
        }

        .hint {
          position: absolute;
          bottom: 14px; left: 0; right: 0;
          text-align: center;
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 12px;
          color: rgba(255,160,200,0.35);
          letter-spacing: 2px;
          animation: hintPulse 3s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes hintPulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.7; }
        }

        .glow-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(60px);
        }
      `}</style>

      <div className="scene" onClick={addPetals}>

        {/* Atmosphere orbs */}
        <div className="glow-orb" style={{
          width: 320, height: 320, top: -80, left: -80,
          background: "radial-gradient(circle, rgba(150,30,200,0.12) 0%, transparent 70%)"
        }} />
        <div className="glow-orb" style={{
          width: 280, height: 280, top: -60, right: -60,
          background: "radial-gradient(circle, rgba(220,60,140,0.1) 0%, transparent 70%)"
        }} />
        <div className="glow-orb" style={{
          width: 400, height: 200, bottom: 0, left: "50%",
          transform: "translateX(-50%)",
          background: "radial-gradient(ellipse, rgba(180,40,120,0.14) 0%, transparent 70%)"
        }} />

        {/* Stars */}
        <div className="stars">
          {Array.from({ length: 55 }, (_, i) => (
            <div
              key={i}
              className="star"
              style={{
                left: `${rand(1, 99)}%`,
                top: `${rand(1, 55)}%`,
                width: rand(1, 3),
                height: rand(1, 3),
                "--dur": `${rand(2, 5)}s`,
                "--delay": `${rand(0, 4)}s`,
              }}
            />
          ))}
        </div>

        {/* Moon */}
        <div className="moon" />

        {/* Fireflies */}
        {fireflies.map((f, i) => (
          <Firefly key={i} x={f.x} y={f.y} delay={f.delay} />
        ))}

        {/* Name */}
        <div className="name-wrap">
          <span className="name-label">pour ma bien-aimée</span>
          <span className="name-main">Asmae</span>
          {showMsg && (
            <span className="love-msg">
              Comme la tulipe qui fleurit sous la lune,<br />
              tu illumines chaque instant de ma vie ♥
            </span>
          )}
        </div>

        {/* Tulips SVG */}
        <svg
          width="720"
          height="480"
          viewBox="0 0 720 480"
          style={{ position: "absolute", bottom: 0, left: 0, pointerEvents: "none" }}
        >
          {tulips.map((t, i) => (
            <Tulip key={i} {...t} bloom={bloom} />
          ))}
        </svg>

        {/* Ground layers */}
        <div className="ground" />
        <div className="grass" />

        {/* Floating hearts */}
        {hearts.map((h, i) => (
          <FloatingHeart key={i} x={h.x} delay={h.delay} size={h.size} color={h.color} />
        ))}

        {/* Petal rain */}
        {petals.map(p => (
          <div
            key={p.id}
            className="petal-rain"
            style={{
              "--size": `${p.size}px`,
              "--hue": p.hue,
              "--delay": `${p.delay}s`,
              "--dur": `${p.dur}s`,
              "--spin": `${p.spin}deg`,
              "--drift": rand(-1, 1),
              "--sx": `${p.x}%`,
              left: `${p.x}%`,
            }}
          >
            🌸
          </div>
        ))}

        <div className="hint">✦ touchez pour faire pleuvoir les pétales ✦</div>
      </div>
    </>
  );
}