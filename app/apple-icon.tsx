import { ImageResponse } from "next/og";

// apple-touch-icon — 180×180 PNG. iOS home-screen + Safari pinned tab icon.

export const runtime = "edge";
export const size = { width: 180, height: 180 } as const;
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0a0f0d 0%, #171d1b 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#69dab6",
          fontFamily: "system-ui, sans-serif",
          fontWeight: 700,
          fontSize: 110,
          letterSpacing: -4,
          borderRadius: 36,
          border: "4px solid #69dab6",
          boxShadow: "0 0 40px rgba(105, 218, 182, 0.25)",
        }}
      >
        CI
      </div>
    ),
    size,
  );
}
