import { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Point { x: number; y: number }

// ─── Canvas réutilisable avec debug ──────────────────────────────────────────
function CanvasTest({ label, id }: { label: string; id: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [debug, setDebug] = useState("");

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);

    // Grille
    ctx.strokeStyle = "#e5e7eb";
    for (let x = 0; x < c.width; x += 50) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, c.height); ctx.stroke();
    }
    for (let y = 0; y < c.height; y += 50) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.width, y); ctx.stroke();
    }

    // Points
    points.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? "#22c55e" : "#ef4444";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#000";
      ctx.font = "10px sans-serif";
      ctx.fillText(`${Math.round(p.x)},${Math.round(p.y)}`, p.x + 10, p.y - 5);
    });

    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [points]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * c.width;
    const y = ((e.clientY - rect.top) / rect.height) * c.height;
    setPoints(prev => [...prev, { x, y }]);

    const computedStyle = window.getComputedStyle(c);
    const parentEl = c.parentElement;
    const parentStyle = parentEl ? window.getComputedStyle(parentEl) : null;

    // Remonter l'arbre DOM pour trouver les transforms
    let transforms = "";
    let el: HTMLElement | null = c;
    while (el) {
      const s = window.getComputedStyle(el);
      if (s.transform && s.transform !== "none") {
        transforms += `  ${el.tagName}.${el.className.slice(0,30)} → ${s.transform}\n`;
      }
      el = el.parentElement;
    }

    setDebug(
      `[${id}] client: ${e.clientX}, ${e.clientY}\n` +
      `rect: L=${rect.left.toFixed(1)} T=${rect.top.toFixed(1)} W=${rect.width.toFixed(1)} H=${rect.height.toFixed(1)}\n` +
      `buffer: ${c.width}×${c.height}\n` +
      `computedCSS: ${computedStyle.width}×${computedStyle.height}\n` +
      `offsetW×H: ${c.offsetWidth}×${c.offsetHeight}\n` +
      `ratio W: ${(rect.width / c.width).toFixed(4)}  H: ${(rect.height / c.height).toFixed(4)}\n` +
      `result: ${x.toFixed(1)}, ${y.toFixed(1)}\n` +
      `--- parent transforms ---\n${transforms || "  (aucun)"}`
    );
  };

  return (
    <div>
      <p style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>{label}</p>
      <canvas
        ref={canvasRef}
        width={400}
        height={250}
        onClick={handleClick}
        style={{ border: "2px solid #8b5cf6", cursor: "crosshair", background: "#fff", display: "block" }}
      />
      <pre style={{ fontSize: 10, background: "#f3f4f6", padding: 8, borderRadius: 6, whiteSpace: "pre-wrap", marginTop: 4, maxHeight: 200, overflow: "auto" }}>
        {debug || "Cliquez..."}
      </pre>
      <button onClick={() => setPoints([])} style={{ marginTop: 4, padding: "2px 8px", fontSize: 11, cursor: "pointer" }}>Reset</button>
    </div>
  );
}

// ─── Page de test ────────────────────────────────────────────────────────────
export default function TestCanvas() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 16 }}>Test Canvas — diagnostic décalage</h2>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>

        {/* TEST 1 : canvas nu, aucun parent spécial */}
        <CanvasTest label="① Canvas nu (pas de Dialog)" id="nu" />

        {/* TEST 2 : canvas dans un div avec overflow-hidden + h fixe (comme le wrapper du DetourageTab) */}
        <div>
          <p style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>② Dans div overflow-hidden h-[300px]</p>
          <div style={{ overflow: "hidden", height: 300, border: "1px solid #ccc", borderRadius: 8 }}>
            <CanvasTest label="" id="overflow" />
          </div>
        </div>
      </div>

      {/* TEST 3 : bouton pour ouvrir le Dialog */}
      <button
        onClick={() => setDialogOpen(true)}
        style={{ marginTop: 24, padding: "8px 20px", background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 }}
      >
        ③ Ouvrir dans un Dialog (même structure que CreationsAtelier)
      </button>

      {/* Dialog identique à celui de CreationsAtelier */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[90vw] max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>Test Canvas dans Dialog</DialogTitle>
          </DialogHeader>
          <div className="h-[70vh] overflow-hidden p-4">
            <CanvasTest label="Canvas dans Dialog → max-w-[90vw] max-h-[85vh] p-0 overflow-hidden → div h-[70vh]" id="dialog" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
