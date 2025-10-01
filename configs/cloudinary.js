const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create storage engine for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "library-management",
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [
      { width: 500, height: 500, crop: "limit", quality: "auto" },
      { format: "auto", fetch_format: "auto" },
    ],
  },
});

//File filter for images only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

//Utility function to delete image from cloudinary
const deleteImage = async (publicId) => {
  try {
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (error) {
    console.error("Error delete image from Cloudinary:", error);
  }
};

//Utility function to upload image from cloudinary
const uploadImage = async (filePath, folder = "library-management") => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      transformation: [
        { width: 500, height: 500, crop: "limit", quality: "auto" },
        { format: "auto", fetch_format: "auto" },
      ],
    });
    return result;
  } catch (error) {
    console.log("Error uploading image to Cloudinary", error);
    throw error;
  }
};

// Init Multer with storage engine
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, //5mb limit
  },
});

module.exports = { cloudinary, upload, deleteImage, uploadImage };
