import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// Convert base64 → file
function base64ToBlob(base64Data) {
  const parts = base64Data.split(";base64,");
  const contentType = parts[0].split(":")[1];
  const byteCharacters = atob(parts[1]);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
}

export async function POST(req) {
  try {
    const { image, latitude, longitude } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const fileName = `${Date.now()}.png`;
    const fileBlob = base64ToBlob(image);

    // Upload to storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from("captured-images")
      .upload(fileName, fileBlob, {
        contentType: "image/png",
      });

    if (storageError) throw storageError;

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("captured-images")
      .getPublicUrl(fileName);

    const imageUrl = publicUrlData.publicUrl;

    // Insert into DB
    const { data: dbData, error: dbError } = await supabase
      .from("photos")
      .insert([
        {
          image_url: imageUrl,
          latitude,
          longitude,
        },
      ])
      .select();

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, data: dbData[0] });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
