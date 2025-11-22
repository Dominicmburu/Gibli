// resendEmailService.js
// Production-ready Resend email service for Node.js (Express backend)
// Structured for controllers/services architecture

import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * sendEmail
 * Generic email sender for transactional emails
 *
 * @param {object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} [options.from] - Optional custom sender
 */
export async function sendEmail({ to, subject, html, from }) {
	try {
		const response = await resend.emails.send({
			from: from || process.env.RESEND_FROM_EMAIL,
			to,
			subject,
			html,
		});

		return {
			success: true,
			messageId: response?.id,
		};
	} catch (err) {
		console.error('Resend Error: ', err);

		return {
			success: false,
			error: err?.message || 'Unknown email error',
		};
	}
}

/**
 * Templates Helper
 * You can expand this to load external templates or use React email templates.
 */
export function orderConfirmationTemplate(order) {
	return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Order #${order.id} Confirmed</h2>
      <p>Hello ${order.customerName},</p>
      <p>Thank you for ordering with us. Here are your details:</p>
      <ul>
        <li><strong>Total Amount:</strong> ${order.total}</li>
        <li><strong>Status:</strong> ${order.status}</li>
      </ul>
      <p>We will notify you when your parcel is on the way!</p>
    </div>
  `;
}

/**
 * Example: sendOrderConfirmation
 */
export async function sendOrderConfirmation(userEmail, order) {
	const html = orderConfirmationTemplate(order);

	return await sendEmail({
		to: userEmail,
		subject: `Your Order #${order.id} is Confirmed`,
		html,
	});
}

/**
 * Example: sendVerificationEmail
 */
export async function sendVerificationEmail(userEmail, token) {
	const url = `${process.env.FRONTEND_URL}/verify?token=${token}`;

	const html = `
    <p>Hello,</p>
    <p>Click the link below to verify your account:</p>
    <a href="${url}">Verify Account</a>
    <p>If you didn’t request this, you can ignore it.</p>
  `;

	return await sendEmail({
		to: userEmail,
		subject: 'Verify Your Account',
		html,
	});
}

/**
 * Example: sendPasswordReset
 */
export async function sendPasswordReset(userEmail, token) {
	const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

	const html = `
    <p>Password Reset Requested</p>
    <p>Click the link below to reset your password:</p>
    <a href="${url}">Reset Password</a>
    <p>This link will expire in 30 minutes.</p>
  `;

	return await sendEmail({
		to: userEmail,
		subject: 'Reset Your Password',
		html,
	});
}
