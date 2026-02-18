import { useState, useEffect } from "react";

const LoadingScreen = () => {
  const [phase, setPhase] = useState<"reveal" | "move" | "done">("reveal");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("move"), 1400);
    const t2 = setTimeout(() => setPhase("done"), 2800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{
        backgroundColor: phase === "move" ? "transparent" : "hsl(var(--background))",
        transition: "background-color 0.5s ease",
        pointerEvents: phase === "move" ? "none" : "auto",
      }}
    >
      <div
        className="font-display font-bold"
        style={{
          fontSize: "clamp(2.5rem, 5vw, 4rem)",
          transition: "all 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
          ...(phase === "move"
            ? {
                position: "fixed",
                top: "28px",
                left: "24px",
                fontSize: "1.5rem",
                transform: "none",
                opacity: 0,
              }
            : {
                position: "relative",
                opacity: 1,
              }),
          color: "hsl(var(--foreground))",
          backgroundImage:
            phase === "reveal"
              ? "linear-gradient(90deg, hsl(var(--foreground)) 50%, hsl(var(--muted-foreground)) 50%)"
              : "none",
          backgroundSize: "200% 100%",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor:
            phase === "reveal" ? "transparent" : "hsl(var(--foreground))",
          animation:
            phase === "reveal" ? "text-color-reveal 1.2s ease forwards" : "none",
        }}
      >
        TrendZone
      </div>
    </div>
  );
};

export default LoadingScreen;
