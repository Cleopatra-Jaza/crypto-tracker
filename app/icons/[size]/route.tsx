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
  const artSize = maskable ? Math.round(size * 0.6) : Math.round(size * 0.8);
  const fontSize = Math.round(artSize * 0.55);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
        }}
      >
        <div
          style={{
            width: artSize,
            height: artSize,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#22c55e",
            borderRadius: Math.round(artSize * 0.22),
            color: "#ffffff",
            fontSize,
            fontWeight: 700,
          }}
        >
          C
        </div>
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
