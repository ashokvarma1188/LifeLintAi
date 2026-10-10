const multer = require("multer");

const MAX_PDF_BYTES = 4 * 1024 * 1024;

/*
 * PDFs are held in memory and written straight into the record document, so
 * nothing depends on a writable filesystem.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_BYTES },
  fileFilter: (req, file, cb) => {
    const isPdf =
      file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return cb(new Error("Only PDF medical reports are allowed"));
    }
    cb(null, true);
  },
});

/** Accepts an optional `pdf` file and turns multer failures into clean JSON. */
const uploadPdf = (req, res, next) =>
  upload.single("pdf")(req, res, (err) => {
    if (!err) return next();

    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "PDF must be smaller than 4 MB" });
    }
    return res.status(400).json({ message: err.message || "Upload failed" });
  });

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

/* Held in memory just long enough to forward to Gemini as inline data — never written to disk. */
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (req, file, cb) => {
    const isImage = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
    if (!isImage) {
      return cb(new Error("Only JPG, PNG or WEBP photos are allowed"));
    }
    cb(null, true);
  },
});

/** Accepts an optional `photo` file and turns multer failures into clean JSON. */
const uploadPhoto = (req, res, next) =>
  imageUpload.single("photo")(req, res, (err) => {
    if (!err) return next();

    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "Photo must be smaller than 6 MB" });
    }
    return res.status(400).json({ message: err.message || "Upload failed" });
  });

const MAX_SOS_MEDIA_BYTES = 5 * 1024 * 1024;
const SOS_MEDIA_TYPES = {
  photo: ["image/jpeg", "image/png", "image/webp"],
  voice: ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/aac", "audio/wav"],
};

/* A scene photo or a short voice note attached to an SOS chat (field `file`, with `kind` = photo | voice). */
const sosMediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SOS_MEDIA_BYTES },
  fileFilter: (req, file, cb) => {
    const base = file.mimetype.split(";")[0];
    const allowed = [...SOS_MEDIA_TYPES.photo, ...SOS_MEDIA_TYPES.voice];
    if (!allowed.includes(base)) return cb(new Error("Only photos (JPG, PNG, WEBP) or voice notes are allowed"));
    cb(null, true);
  },
});

const uploadSosMedia = (req, res, next) =>
  sosMediaUpload.single("file")(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "File must be smaller than 5 MB" });
    }
    return res.status(400).json({ message: err.message || "Upload failed" });
  });

module.exports = { uploadPdf, MAX_PDF_BYTES, uploadPhoto, MAX_IMAGE_BYTES, uploadSosMedia, SOS_MEDIA_TYPES };
