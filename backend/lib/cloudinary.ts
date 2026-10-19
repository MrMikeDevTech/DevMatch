import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

export type ImageTransform = {
    width?: number;
    height?: number;
    crop?: "fill" | "limit" | "thumb";
    gravity?: "face" | "auto";
};

export async function uploadImage(
    buffer: Buffer,
    folder: string,
    mimeType = "image/png"
): Promise<{ publicId: string }> {
    const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;
    const result = await cloudinary.uploader.upload(dataUri, { folder });
    return { publicId: result.public_id };
}

export function getImageUrl(publicId: string, transform: ImageTransform = {}): string {
    return cloudinary.url(publicId, {
        secure: true,
        format: "webp",
        ...transform
    });
}
