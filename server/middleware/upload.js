const multer = require('multer');

const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

// Memory storage fallback (works without Cloudinary)
const memoryStorage = multer.memoryStorage();

let resumeStorage = memoryStorage;
let photoStorage = memoryStorage;

if (isCloudinaryConfigured) {
  try {
    const cloudinary = require('../config/cloudinary');
    const { CloudinaryStorage } = require('multer-storage-cloudinary');

    resumeStorage = new CloudinaryStorage({
      cloudinary,
      params: {
        folder: 'ai-interview/resumes',
        resource_type: 'raw',
        allowed_formats: ['pdf', 'doc', 'docx'],
      },
    });

    photoStorage = new CloudinaryStorage({
      cloudinary,
      params: {
        folder: 'ai-interview/photos',
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
      },
    });
  } catch (e) {
    console.warn('⚠️  Cloudinary not configured — using memory storage for uploads');
  }
} else {
  console.info('ℹ️  Cloudinary cloud_name not set — file uploads will use memory storage');
}

// Audio always uses memory (sent directly to Groq Whisper)
const audioStorage = multer.memoryStorage();

const uploadResume = multer({ storage: resumeStorage, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadPhoto  = multer({ storage: photoStorage,  limits: { fileSize: 3 * 1024 * 1024 } });
const uploadAudio  = multer({ storage: audioStorage,  limits: { fileSize: 25 * 1024 * 1024 } });

// PDF-only upload for AI resume parsing (always memory so we can read the buffer)
const uploadPDF = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed for resume upload'), false);
    }
  },
});

module.exports = { uploadResume, uploadPhoto, uploadAudio, uploadPDF };

