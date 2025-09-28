const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { Readable } = require("stream");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const uploadUser = multer({ storage });

/**
 * @param {Buffer} buffer 
 * @param {string} folder 
 * @returns {Promise<Object>} 
 */
function uploadToCloudinary(buffer, folder = "techcart/profileImages") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    Readable.from(buffer).pipe(stream);
  });
}

module.exports = { cloudinary, uploadUser, uploadToCloudinary };
