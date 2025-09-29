import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const transporter = nodemailer.createTransport({
	host: 'smtp.gmail.com',
	port: 465,
	secure: true,
	// port: 587,
	// secure: false, // true for port 465, false for other ports
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASS,
	},
});

export async function sendWelcomeEmail(recipient) {
	try {
		await transporter.sendMail({
			from: `Marketplace <${process.env.EMAIL_USER}>`,
			to: `${recipient}`,
			subject: `Thanks for registering `,
			html: `
                <h1>Hello and Welcome to Marketplace!</h1>
                <p>We’re excited to have you on board.</p><br/>
				<br/>
				<p>Whether you are just looking around or actively searching for your next purchase, we have you covered.</p>
                <p>, <br/>Best regards, Support Team</p>
            `,
		});
	} catch (error) {
		console.error('Error while sending email', error);
	}
}
export async function sendForgotPasswordEmail(recipient, link) {
	try {
		await transporter.sendMail({
			from: `Marketplace <${process.env.EMAIL_USER}>`,
			to: `${recipient}`,
			subject: `Password Reset Request `,
			html: `
                <h1>Link Expires in 5 minutes</h1>
                <p>Use the attached link to reset your password</p><br/>
				<br/>
				<p>We have received your request to change the password, Please use this link </p><br/>
				
				<p>${link} <br/><br/>to change your old password and set a new one.
				
				Please Note the above link is valid for the next 5 minutes only.</p>

                <p><br/>Best regards, Support Team</p>
            `,
		});
	} catch (error) {
		console.error('Error while sending email', error);
	}
}
export async function sellerRegistrationEmail(recipient) {
	try {
		await transporter.sendMail({
			from: `Marketplace <${process.env.EMAIL_USER}>`,
			to: `${recipient}`,
			subject: `Onboard Seller Request `,
			html: `
                <h1>Start Selling In the  Marketplace!</h1>
                <p>We’re excited to have you become a seller on the platform.</p><br/>
				<br/>
				<p>As a security and customer trust policy we will run checks on the information you provided for your business</p>
				<p>Once verification is complete you ca now start selling</p>
				<p>This process may take 2-4 business days, please bear with us as we enforce customer trust.</p>
                <p>, <br/>Best regards, Support Team</p>
            `,
		});
	} catch (error) {
		console.error('Error while sending email', error);
	}
}
export async function sendOrderPlacedEmail(recipient, cartItems) {
	try {
		const itemRows = cartItems
			.map(
				(item) => `
			<tr>
				<td style="padding: 8px; border: 1px solid #ddd;">${item.Name}</td>
				<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.Quantity}</td>
				<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.Price}</td>
			</tr>
		`
			)
			.join('');

		const htmlContent = `
			<div style="font-family: Arial, sans-serif; color: #333;">
				<h2 style="color: #006B1A;">Hi Sokoni Customer,</h2>
				<p>Thanks for shopping with <strong>Sokoni</strong>!</p>
				<p>Your order has been placed successfully. Here’s a summary of what you’ve ordered:</p>

				<table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
					<thead>
						<tr style="background-color: #f4f4f4;">
							<th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Product</th>
							<th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Quantity</th>
							<th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Price Per Unit</th>
						</tr>
					</thead>
					<tbody>
						${itemRows}
					</tbody>
				</table>

				<p style="margin-top: 20px;">We’ll keep you posted on the delivery status. If you have any questions, feel free to reply to this email.</p>
				
				<p>Thanks again for choosing Sokoni!</p>
				
				<p style="color: #555;"><strong>Sokoni Team</strong><br/>E-commerce made simple, it should be illegal </p>
				
				<hr style="margin-top: 30px;">
				
			</div>
		`;

		await transporter.sendMail({
			from: `Sokoni <${process.env.EMAIL_USER}>`,
			to: recipient,
			subject: '🛒 Your Sokoni Order Confirmation',
			html: htmlContent,
		});
	} catch (error) {
		console.error('Error while sending order email', error);
	}
}
