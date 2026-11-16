import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: sizeStr } = await params;
  const size = Number(sizeStr);
  if (size !== 192 && size !== 512) {
    return new Response("Not found", { status: 404 });
  }
  const maskable = request.nextUrl.searchParams.get("maskable") === "1";
  const artSize = maskable ? Math.round(size * 0.6) : Math.round(size * 0.9);
  const bg = maskable ? "#0f172a" : "#0a0a0a";

  const artwork = (
    <>
      <g>
        <line x1="18" y1="28" x2="18" y2="54" stroke="rgba(34,197,94,0.45)" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="15" y="34" width="6" height="12" rx="1" fill="rgba(34,197,94,0.45)" />
        <line x1="32" y1="24" x2="32" y2="52" stroke="rgba(239,68,68,0.45)" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="29" y="30" width="6" height="14" rx="1" fill="rgba(239,68,68,0.45)" />
        <line x1="46" y1="18" x2="46" y2="46" stroke="rgba(34,197,94,0.45)" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="43" y="24" width="6" height="12" rx="1" fill="rgba(34,197,94,0.45)" />
      </g>
      <path
        d="M 44 20 A 16 16 0 1 0 44 44"
        fill="none"
        stroke="#f8fafc"
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      <polyline
        points="30,38 36,32 40,35 48,26"
        fill="none"
        stroke="#22c55e"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="48" cy="26" r="2.5" fill="#22c55e" />
    </>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bg,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 64 64"
          width={artSize}
          height={artSize}
        >
          {!maskable && (
            <rect x="4" y="4" width="56" height="56" rx="14" fill="#0f172a" stroke="#334155" strokeWidth="1" />
          )}
          {artwork}
        </svg>
      </div>
    ),
    {
      width: size,
      height: size,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    }
  );
}
