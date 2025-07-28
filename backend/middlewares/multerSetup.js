import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({
	storage,
	limits: { files: 4 },
});

export default upload;
