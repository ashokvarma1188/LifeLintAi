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

module.exports = { uploadPdf, MAX_PDF_BYTES };
