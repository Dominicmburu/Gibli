import { PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import s3 from './s3ClientSetup.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
export async function uploadToS3(fileBuffer, fileName, mimeType, folder) {
	const Key = `${folder}/${uuidv4()}-${fileName}`;

	const params = {
		Bucket: process.env.AWS_BUCKET_NAME,
		Key,
		Body: fileBuffer,
		ContentType: mimeType,
	};

	await s3.send(new PutObjectCommand(params));

	return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${Key}`;
}
