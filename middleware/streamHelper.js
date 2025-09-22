//helper for cloundnary

const streamifier = require("streamifier");
const { cloudinary } = require("../middleware/cloudinary");

const streamUpload = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "user_profiles",
        resource_type: "image"
      },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

module.exports = streamUpload;
