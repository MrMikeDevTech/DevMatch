import { Router, type Request, type Response } from "express";
import multer from "multer";
import { requireOnboarded } from "@/lib/authGuard";
import { getImageUrl, uploadImage, type ImageTransform } from "@/lib/cloudinary";

const router = Router();
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, callback) => {
        callback(null, file.mimetype.startsWith("image/"));
    }
});

const AVATAR_TRANSFORM: ImageTransform = { width: 250, height: 250, crop: "fill", gravity: "face" };
const BANNER_TRANSFORM: ImageTransform = { width: 1500, height: 500, crop: "fill" };
const POST_IMAGE_TRANSFORM: ImageTransform = { width: 1600, crop: "limit" };

async function handleUpload(
    req: Request,
    res: Response,
    folder: string,
    transform: ImageTransform
): Promise<void> {
    if (!req.file) {
        res.status(400).json({ error: "image file is required" });
        return;
    }
    const { publicId } = await uploadImage(req.file.buffer, folder, req.file.mimetype);
    res.status(201).json({ url: getImageUrl(publicId, transform) });
}

router.post("/avatar", requireOnboarded, upload.single("image"), (req, res) =>
    handleUpload(req, res, "devmatch/avatars", AVATAR_TRANSFORM)
);

router.post("/banner", requireOnboarded, upload.single("image"), (req, res) =>
    handleUpload(req, res, "devmatch/banners", BANNER_TRANSFORM)
);

router.post("/post-image", requireOnboarded, upload.single("image"), (req, res) =>
    handleUpload(req, res, "devmatch/posts", POST_IMAGE_TRANSFORM)
);

export default router;
