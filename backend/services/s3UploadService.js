import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import s3 from './s3ClientSetup.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

export async function uploadToS3(fileBuffer, fileName, mimeType, folder) {
	// Extract extension safely
	const ext = path.extname(fileName).toLowerCase();
	const nameWithoutExt = path.basename(fileName, ext);

	// Sanitize the name part only
	const sanitizedName = nameWithoutExt
		.replace(/\s+/g, '-')
		.replace(/[^\w\-]/g, '')
		.substring(0, 100);

	const sanitizedFileName = `${sanitizedName}${ext}`;
	const Key = `${folder}/${uuidv4()}-${sanitizedFileName}`;

	const params = {
		Bucket: process.env.AWS_BUCKET_NAME,
		Key,
		Body: fileBuffer,
		ContentType: mimeType,
	};

	await s3.send(new PutObjectCommand(params));

	return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${Key}`;
}

// New function to delete from S3
export async function deleteFromS3(imageUrl) {
	try {
		// Extract the Key from the full S3 URL
		// URL format: https://bucket-name.s3.region.amazonaws.com/folder/uuid-filename.ext
		const url = new URL(imageUrl);
		const Key = url.pathname.substring(1); // Remove leading '/'

		const params = {
			Bucket: process.env.AWS_BUCKET_NAME,
			Key,
		};

		await s3.send(new DeleteObjectCommand(params));
		return { success: true, key: Key };
	} catch (error) {
		console.error('Error deleting from S3:', error);
		throw error;
	}
}

// Helper to delete multiple images
export async function deleteMultipleFromS3(imageUrls) {
	const results = await Promise.allSettled(imageUrls.map((url) => deleteFromS3(url)));

	const successful = results.filter((r) => r.status === 'fulfilled').length;
	const failed = results.filter((r) => r.status === 'rejected').length;

	return { successful, failed, total: imageUrls.length };
}
