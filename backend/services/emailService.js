import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { Resend } from 'resend';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// const resendTransporter = new Resend(process.env.RESEND_KEY);
// export async function sendWelcomeEmail(recipient) {
// 	try {
// 		await resendTransporter.emails.send({
// 			from: `Marketplace <${process.env.EMAIL_USER}>`,
// 			to: `${recipient}`,
// 			subject: `Thanks for registering `,
// 			html: `
//                 <h1>Hello and Welcome to Marketplace!</h1>
//                 <p>We’re excited to have you on board.</p><br/>
// 				<br/>
// 				<p>Whether you are just looking around or actively searching for your next purchase, we have you covered.</p>
// 				<p>To ensure trust and authenticity we would like you to verify your email.</p>
// 				<p>=====NOTE TO SELF: =========== Verification link will go here</p>
//                 <p>, <br/>Best regards, Support Team</p>
//             `,
// 		});
// 	} catch (error) {
// 		console.error('Error while sending email', error);
// 	}
// }

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
				<p>To ensure trust and authenticity we would like you to verify your email.</p>
				<p>=====NOTE TO SELF: =========== Verification link will go here</p>
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

/**
 * Utility to format item rows into HTML
 */
function generateItemTable(items) {
	const rows = items
		.map(
			(item) => `
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">${item.ProductName}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;">${item.Quantity}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;">€ ${item.Price}</td>
        </tr>`
		)
		.join('');

	return `
    <table style="width:100%;border-collapse:collapse;margin-top:10px;">
      <thead>
        <tr style="background-color:#f4f4f4;">
          <th style="padding:10px;border:1px solid #ddd;text-align:left;">Product</th>
          <th style="padding:10px;border:1px solid #ddd;text-align:center;">Quantity</th>
          <th style="padding:10px;border:1px solid #ddd;text-align:center;">Price</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}
/**
 * 1️⃣ Buyer Order Confirmation Email
 */
export async function sendBuyerOrderConfirmationEmail(buyerEmail, buyerName, items, total) {
	const htmlContent = `
    <div style="font-family:Arial,sans-serif;color:#333;">
      <h2 style="color:#006B1A;">Hi ${buyerName || 'Customer'},</h2>
      <p>Thank you for your order with <strong>us</strong>!</p>
      <p>Here’s a summary of your purchase:</p>

      ${generateItemTable(items)}

      <p style="margin-top:15px;font-weight:bold;">Total Amount:€ ${total}</p>

      <p style="margin-top:20px;">We’ll notify you when your order is shipped. For any inquiries, reply to this email.</p>

      <p style="color:#555;">
        <strong>Marketplace Support Team</strong><br/>
        E-commerce made simple for you by us.
      </p>
    </div>`;

	try {
		await transporter.sendMail({
			from: `Marketplace <${process.env.EMAIL_USER}>`,
			to: buyerEmail,
			subject: '🛒 Your Marketplace Order Confirmation',
			html: htmlContent,
		});
		console.log(`✅ Buyer order confirmation sent to ${buyerEmail}`);
	} catch (error) {
		console.error('❌ Error sending buyer confirmation email:', error);
	}
}

/**
 * 2️⃣ Seller New Order Notification Email
 */
export async function sendSellerOrderNotificationEmail(sellerEmail, sellerName, items) {
	const htmlContent = `
    <div style="font-family:Arial,sans-serif;color:#333;">
      <h2 style="color:#0057B8;">Hi ${sellerName || 'Seller'},</h2>
      <p>You’ve received a new order on <strong>The Marketplace</strong>!</p>
      <p>Here are the items a buyer purchased from your store:</p>

      ${generateItemTable(items)}

      <p style="margin-top:20px;">Please prepare the order for shipment as soon as possible.</p>

      <p style="color:#555;">
        <strong> Marketplace</strong><br/>
        Delivering smiles, one parcel at a time.
      </p>
    </div>`;

	try {
		await transporter.sendMail({
			from: `Marketplace <${process.env.EMAIL_USER}>`,
			to: sellerEmail,
			subject: '📦 New Order Received',
			html: htmlContent,
		});
		console.log(`✅ Seller notification sent to ${sellerEmail}`);
	} catch (error) {
		console.error('❌ Error sending seller notification email:', error);
	}
}
