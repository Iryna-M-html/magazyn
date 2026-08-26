import { Readable } from 'node:stream';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  secure: true,
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function saveFileToCloudinary(buffer, folderName = 'products') {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `magazyn/${folderName}`, // Указали папку текущего проекта
        resource_type: 'image',
        overwrite: true,
        unique_filename: true,
        use_filename: false,
      },
      (err, result) => (err ? reject(err) : resolve(result)),
    );

    // Добавляем обработку ошибки потока для безопасности
    const stream = Readable.from(buffer);
    stream.on('error', (err) => reject(err));
    stream.pipe(uploadStream);
  });
}

export async function deleteFileFromCloudinary(publicId) {
  if (!publicId) return null;

  return new Promise((resolve, reject) =>
    cloudinary.uploader.destroy(
      publicId,
      {
        resource_type: 'image',
        invalidate: true,
      },
      (err, result) => (err ? reject(err) : resolve(result)),
    ),
  );
}
