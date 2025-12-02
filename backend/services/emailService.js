import { Resend } from 'resend';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

// Your verified domain email
const FROM_EMAIL = `Marketplace <noreply@gibli.eu>`;

export async function sendVerificationEmail(recipient, token) {
	const verificationLink = `${process.env.FRONTEND_URL}/verify/${token}`;
	try {
		const { data, error } = await resend.emails.send({
			from: FROM_EMAIL,
			to: recipient,
			subject: 'Verify your Marketplace account',
			html: `
				<h2>Welcome to Marketplace!</h2>
				<p>Please verify your email by clicking the link below:</p>
				<a href="${verificationLink}" target="_blank"
				style="background-color:#007bff; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">Verify Email</a>
				
				<p><br/>Best regards, Support Team</p>
			`,
		});

		if (error) {
			console.error('Error sending verification email:', error);
			return;
		}

		console.log('✅ Verification email sent:', data);
	} catch (error) {
		console.error('Error sending verification email', error);
	}
}

export async function sendWelcomeEmail(recipient) {
	try {
		const { data, error } = await resend.emails.send({
			from: FROM_EMAIL,
			to: recipient,
			subject: 'Thanks for registering',
			html: `
                <h1>Hello and Welcome to Marketplace!</h1>
                <p>We're excited to have you on board.</p><br/>
				<br/>
				<p>Whether you are just looking around or actively searching for your next purchase, we have you covered.</p>
				<p>To ensure trust and authenticity we would like you to verify your email.</p>
                <p><br/>Best regards, Support Team</p>
            `,
		});

		if (error) {
			console.error('Error sending welcome email:', error);
			return;
		}

		console.log('✅ Welcome email sent:', data);
	} catch (error) {
		console.error('Error while sending email', error);
	}
}

export async function sendForgotPasswordEmail(recipient, link) {
	try {
		const { data, error } = await resend.emails.send({
			from: FROM_EMAIL,
			to: recipient,
			subject: 'Password Reset Request',
			html: `
                <h1>Link Expires in 5 minutes</h1>
                <p>Use the attached link to reset your password</p><br/>
				<br/>
				<p>We have received your request to change the password. Please use this link:</p><br/>
				
				<p>${link}<br/><br/>to change your old password and set a new one.
				
				Please Note the above link is valid for the next 5 minutes only.</p>

                <p><br/>Best regards, Support Team</p>
            `,
		});

		if (error) {
			console.error('Error sending password reset email:', error);
			return;
		}

		console.log('✅ Password reset email sent:', data);
	} catch (error) {
		console.error('Error while sending email', error);
	}
}

export async function sellerRegistrationEmail(recipient) {
	try {
		const { data, error } = await resend.emails.send({
			from: FROM_EMAIL,
			to: recipient,
			subject: 'Onboard Seller Request',
			html: `
                <h1>Start Selling In the Marketplace!</h1>
                <p>We're excited to have you become a seller on the platform.</p><br/>
				<br/>
				<p>As a security and customer trust policy we will run checks on the information you provided for your business</p>
				<p>Once verification is complete you can now start selling</p>
				<p>This process may take 2-4 business days, please bear with us as we enforce customer trust.</p>
                <p><br/>Best regards, Support Team</p>
            `,
		});

		if (error) {
			console.error('Error sending seller registration email:', error);
			return;
		}

		console.log('✅ Seller registration email sent:', data);
	} catch (error) {
		console.error('Error while sending email', error);
	}
}

/**
 * Utility to format item rows into HTML for SELLER emails
 */
function generateSellerItemTable(items, shippingOptions) {
	const rows = items
		.map((item) => {
			const shippingType = shippingOptions?.[item.ProductId] || 'standard';
			const shippingLabel = shippingType === 'express' ? 'Express' : 'Standard';

			return `
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">${item.ProductName}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;">${item.Quantity}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;">€${item.Price}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;">${shippingLabel}</td>
        </tr>`;
		})
		.join('');

	return `
    <table style="width:100%;border-collapse:collapse;margin-top:10px;">
      <thead>
        <tr style="background-color:#f4f4f4;">
          <th style="padding:10px;border:1px solid #ddd;text-align:left;">Product</th>
          <th style="padding:10px;border:1px solid #ddd;text-align:center;">Quantity</th>
          <th style="padding:10px;border:1px solid #ddd;text-align:center;">Price</th>
          <th style="padding:10px;border:1px solid #ddd;text-align:center;">Shipping Type</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

/**
 * Utility to format item rows into HTML for BUYER emails
 */
function generateBuyerItemTable(items, shippingOptions) {
	const rows = items
		.map((item) => {
			const shippingType = shippingOptions?.[item.ProductId] || 'standard';
			const shippingLabel = shippingType === 'express' ? 'Express' : 'Standard';

			return `
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">${item.ProductName}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;">${item.Quantity}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;">€${item.Price}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;">${item.SellerName || 'N/A'}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;">${item.SellerCountry || 'N/A'}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;">${shippingLabel}</td>
        </tr>`;
		})
		.join('');

	return `
    <table style="width:100%;border-collapse:collapse;margin-top:10px;">
      <thead>
        <tr style="background-color:#f4f4f4;">
          <th style="padding:10px;border:1px solid #ddd;text-align:left;">Product</th>
          <th style="padding:10px;border:1px solid #ddd;text-align:center;">Quantity</th>
          <th style="padding:10px;border:1px solid #ddd;text-align:center;">Price</th>
          <th style="padding:10px;border:1px solid #ddd;text-align:center;">Seller</th>
          <th style="padding:10px;border:1px solid #ddd;text-align:center;">Seller Country</th>
          <th style="padding:10px;border:1px solid #ddd;text-align:center;">Shipping Type</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

/**
 * 1️⃣ Buyer Order Confirmation Email
 */
export async function sendBuyerOrderConfirmationEmail(buyerEmail, buyerName, items, total, shippingOptions) {
	const htmlContent = `
    <div style="font-family:Arial,sans-serif;color:#333;">
      <h2 style="color:#006B1A;">Hi ${buyerName || 'Customer'},</h2>
      <p>Thank you for your order with <strong>us</strong>!</p>
      <p>Here's a summary of your purchase:</p>

      ${generateBuyerItemTable(items, shippingOptions)}

      <p style="margin-top:15px;font-weight:bold;">Total Amount: €${total}</p>

      <p style="margin-top:20px;">We'll notify you when your order is shipped. For any inquiries, reply to this email.</p>

      <p style="color:#555;">
        <strong>Marketplace Support Team</strong><br/>
        E-commerce made simple for you by us.
      </p>
    </div>`;

	try {
		const { data, error } = await resend.emails.send({
			from: FROM_EMAIL,
			to: buyerEmail,
			subject: '🛒 Your Marketplace Order Confirmation',
			html: htmlContent,
		});

		if (error) {
			console.error('❌ Error sending buyer confirmation email:', error);
			return;
		}

		console.log(`✅ Buyer order confirmation sent to ${buyerEmail}:`, data);
	} catch (error) {
		console.error('❌ Error sending buyer confirmation email:', error);
	}
}

/**
 * 2️⃣ Seller New Order Notification Email
 */
export async function sendSellerOrderNotificationEmail(
	sellerEmail,
	sellerName,
	items,
	shippingOptions,
	shippingAddress,
	orderTotal
) {
	const deliveryLocation = `${shippingAddress.City}, ${shippingAddress.StateOrProvince || ''}, ${
		shippingAddress.Country
	}`.replace(', ,', ',');

	const htmlContent = `
    <div style="font-family:Arial,sans-serif;color:#333;">
      <h2 style="color:#0057B8;">Hi ${sellerName || 'Seller'},</h2>
      <p>You've received a new order on <strong>The Marketplace</strong>!</p>
      <p>Here are the items a buyer purchased from your store:</p>

      ${generateSellerItemTable(items, shippingOptions)}

      <div style="margin-top:20px;padding:15px;background-color:#f9f9f9;border-left:4px solid #0057B8;">
        <p style="margin:5px 0;"><strong>Order Total:</strong> €${orderTotal.toFixed(2)}</p>
        <p style="margin:5px 0;"><strong>Delivery Location:</strong> ${deliveryLocation}</p>
      </div>

      <p style="margin-top:20px;">Please prepare the order for shipment as soon as possible.</p>

      <p style="color:#555;">
        <strong>Marketplace</strong><br/>
        Delivering smiles, one parcel at a time.
      </p>
    </div>`;

	try {
		const { data, error } = await resend.emails.send({
			from: FROM_EMAIL,
			to: sellerEmail,
			subject: '📦 New Order Received',
			html: htmlContent,
		});

		if (error) {
			console.error('❌ Error sending seller notification email:', error);
			return;
		}

		console.log(`✅ Seller notification sent to ${sellerEmail}:`, data);
	} catch (error) {
		console.error('❌ Error sending seller notification email:', error);
	}
}
