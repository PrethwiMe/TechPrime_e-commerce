
const cloudinary = require("cloudinary").v2;
const multer = require("multer");

// 🔹 Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 🔹 Multer setup for user photos (store in memory, not disk)
const storage = multer.memoryStorage();
const uploadUser = multer({ storage });

module.exports = { cloudinary, uploadUser };
