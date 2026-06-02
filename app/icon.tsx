import { ImageResponse } from "next/og";

// Favicon — 32×32 PNG generated at edge. Used by browser tab + Bing favicon.
// Matches the Crypto Invoicing logo motif: jade square monogram with corner
// nodes + center "C" glyph on dark slate.

export const runtime = "edge";
export const size = { width: 32, height: 32 } as const;
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0f1513",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#69dab6",
          fontFamily: "system-ui, sans-serif",
          fontWeight: 700,
          fontSize: 22,
          letterSpacing: -1,
          borderRadius: 6,
        }}
      >
        CI
      </div>
    ),
    size,
  );
}
