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

// ═══════════════════════════════════════════════════════════
// SUBSCRIPTION EMAILS
// ═══════════════════════════════════════════════════════════

/**
 * Sent when a seller successfully completes a subscription checkout.
 */
export async function sendSubscriptionConfirmationEmail(email, businessName, planName, price, billingCycle, endDate) {
	const billingText = billingCycle === 'yearly' ? 'per year' : billingCycle === 'monthly' ? 'per month' : '';
	const renewalText = endDate
		? `Your subscription renews on <strong>${new Date(endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.`
		: '';

	const html = `
	<div style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;">
	  <div style="background:#6d28d9;padding:30px;border-radius:12px 12px 0 0;text-align:center;">
	    <h1 style="color:white;margin:0;font-size:24px;">Subscription Activated!</h1>
	  </div>
	  <div style="padding:30px;background:#fff;border:1px solid #e5e7eb;border-top:none;">
	    <h2 style="color:#1f2937;">Hi ${businessName || 'Seller'},</h2>
	    <p>Your subscription has been successfully activated. Here are your plan details:</p>
	    <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:20px 0;">
	      <p style="margin:5px 0;"><strong>Plan:</strong> ${planName}</p>
	      <p style="margin:5px 0;"><strong>Price:</strong> &euro;${Number(price).toFixed(2)} ${billingText}</p>
	      <p style="margin:5px 0;">${renewalText}</p>
	    </div>
	    <p>Your reduced commission rate is now active on all your sales. Thank you for being a valued seller!</p>
	    <p style="color:#6b7280;font-size:14px;margin-top:30px;">
	      <strong>Marketplace Support Team</strong><br/>
	      Need help? Reply to this email.
	    </p>
	  </div>
	</div>`;

	try {
		const { error } = await resend.emails.send({
			from: FROM_EMAIL,
			to: email,
			subject: `Subscription Confirmed: ${planName}`,
			html,
		});
		if (error) console.error('Error sending subscription confirmation email:', error);
		else console.log(`✅ Subscription confirmation sent to ${email}`);
	} catch (err) {
		console.error('Error sending subscription confirmation email:', err);
	}
}

/**
 * Renewal reminder — sent 14, 7, and 1 day(s) before the subscription renews.
 */
export async function sendSubscriptionRenewalReminder(email, businessName, subscription, daysLeft) {
	const endDate = new Date(subscription.CurrentPeriodEnd).toLocaleDateString('en-GB', {
		day: 'numeric', month: 'long', year: 'numeric',
	});
	const urgency = daysLeft === 1 ? 'Last Day' : daysLeft === 7 ? '1 Week Left' : '2 Weeks Left';
	const autoRenewMsg = subscription.CancelAtPeriodEnd
		? `<p style="background:#fef3c7;padding:12px;border-radius:6px;border-left:4px solid #f59e0b;">
		     <strong>Note:</strong> Your subscription is set to cancel on ${endDate}. After that, you will be moved to the Free Plan (5% commission).
		     If you'd like to continue, please log in and reactivate your subscription.
		   </p>`
		: `<p style="background:#d1fae5;padding:12px;border-radius:6px;border-left:4px solid #10b981;">
		     Your subscription will <strong>automatically renew</strong> on ${endDate} and &euro;${Number(subscription.Price).toFixed(2)} will be charged.
		     If you do not wish to continue, you can cancel before that date in your dashboard.
		   </p>`;

	const html = `
	<div style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;">
	  <div style="background:#6d28d9;padding:30px;border-radius:12px 12px 0 0;text-align:center;">
	    <h1 style="color:white;margin:0;font-size:24px;">${urgency} — Subscription Renewal</h1>
	  </div>
	  <div style="padding:30px;background:#fff;border:1px solid #e5e7eb;border-top:none;">
	    <h2 style="color:#1f2937;">Hi ${businessName || 'Seller'},</h2>
	    <p>Your <strong>${subscription.PlanName}</strong> subscription ${daysLeft === 1 ? 'expires tomorrow' : `expires in ${daysLeft} days`} on <strong>${endDate}</strong>.</p>
	    ${autoRenewMsg}
	    <p>Visit your <a href="${process.env.FRONTEND_URL}/seller-subscription" style="color:#6d28d9;">subscription dashboard</a> to manage your plan.</p>
	    <p style="color:#6b7280;font-size:14px;margin-top:30px;">
	      <strong>Marketplace Support Team</strong>
	    </p>
	  </div>
	</div>`;

	try {
		const { error } = await resend.emails.send({
			from: FROM_EMAIL,
			to: email,
			subject: subscription.CancelAtPeriodEnd
			? `[${urgency}] Your ${subscription.PlanName} expires on ${endDate}`
			: `[${urgency}] Your ${subscription.PlanName} renews on ${endDate}`,
			html,
		});
		if (error) console.error('Error sending renewal reminder:', error);
		else console.log(`✅ Renewal reminder (${daysLeft}d) sent to ${email}`);
	} catch (err) {
		console.error('Error sending renewal reminder:', err);
	}
}

/**
 * Sent when a subscription payment fails.
 */
export async function sendSubscriptionPaymentFailedEmail(email, businessName, planName) {
	const html = `
	<div style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;">
	  <div style="background:#dc2626;padding:30px;border-radius:12px 12px 0 0;text-align:center;">
	    <h1 style="color:white;margin:0;font-size:24px;">Payment Failed</h1>
	  </div>
	  <div style="padding:30px;background:#fff;border:1px solid #e5e7eb;border-top:none;">
	    <h2 style="color:#1f2937;">Hi ${businessName || 'Seller'},</h2>
	    <p>We were unable to process the payment for your <strong>${planName}</strong> subscription.</p>
	    <p style="background:#fee2e2;padding:12px;border-radius:6px;border-left:4px solid #dc2626;">
	      Please update your payment details to avoid losing access to your reduced commission rate.
	    </p>
	    <p>Visit your <a href="${process.env.FRONTEND_URL}/seller-subscription" style="color:#6d28d9;">subscription dashboard</a> to update your payment method.</p>
	    <p>If payment continues to fail, your subscription will be cancelled and you will be moved to the Free Plan (5% commission).</p>
	    <p style="color:#6b7280;font-size:14px;margin-top:30px;">
	      <strong>Marketplace Support Team</strong>
	    </p>
	  </div>
	</div>`;

	try {
		const { error } = await resend.emails.send({
			from: FROM_EMAIL,
			to: email,
			subject: `Payment Failed — ${planName} Subscription`,
			html,
		});
		if (error) console.error('Error sending payment failed email:', error);
		else console.log(`✅ Payment failed email sent to ${email}`);
	} catch (err) {
		console.error('Error sending payment failed email:', err);
	}
}

/**
 * Sent when a seller cancels their subscription.
 */
export async function sendSubscriptionCancelledEmail(email, businessName, planName, endDate) {
	const formattedDate = new Date(endDate).toLocaleDateString('en-GB', {
		day: 'numeric', month: 'long', year: 'numeric',
	});

	const html = `
	<div style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;">
	  <div style="background:#6b7280;padding:30px;border-radius:12px 12px 0 0;text-align:center;">
	    <h1 style="color:white;margin:0;font-size:24px;">Subscription Cancelled</h1>
	  </div>
	  <div style="padding:30px;background:#fff;border:1px solid #e5e7eb;border-top:none;">
	    <h2 style="color:#1f2937;">Hi ${businessName || 'Seller'},</h2>
	    <p>Your <strong>${planName}</strong> subscription has been set to cancel.</p>
	    <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:20px 0;">
	      <p style="margin:5px 0;">Your subscription will remain <strong>active until ${formattedDate}</strong>.</p>
	      <p style="margin:5px 0;">After that date, you will be automatically moved to the <strong>Free Plan</strong> (5% commission).</p>
	    </div>
	    <p>Changed your mind? You can reactivate your subscription anytime before <strong>${formattedDate}</strong> in your <a href="${process.env.FRONTEND_URL}/seller-subscription" style="color:#6d28d9;">subscription dashboard</a>.</p>
	    <p style="color:#6b7280;font-size:14px;margin-top:30px;">
	      <strong>Marketplace Support Team</strong>
	    </p>
	  </div>
	</div>`;

	try {
		const { error } = await resend.emails.send({
			from: FROM_EMAIL,
			to: email,
			subject: `Subscription Cancelled — Active Until ${formattedDate}`,
			html,
		});
		if (error) console.error('Error sending cancellation email:', error);
		else console.log(`✅ Cancellation email sent to ${email}`);
	} catch (err) {
		console.error('Error sending cancellation email:', err);
	}
}

/**
 * Sent when a subscription expires (period ends and was not renewed).
 */
export async function sendSubscriptionExpiredEmail(email, businessName, planName) {
	const html = `
	<div style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;">
	  <div style="background:#6b7280;padding:30px;border-radius:12px 12px 0 0;text-align:center;">
	    <h1 style="color:white;margin:0;font-size:24px;">Subscription Expired</h1>
	  </div>
	  <div style="padding:30px;background:#fff;border:1px solid #e5e7eb;border-top:none;">
	    <h2 style="color:#1f2937;">Hi ${businessName || 'Seller'},</h2>
	    <p>Your <strong>${planName}</strong> subscription has expired.</p>
	    <p style="background:#f3f4f6;padding:12px;border-radius:6px;">
	      You have been moved to the <strong>Free Plan</strong>. A 5% commission will now be applied to all your sales.
	    </p>
	    <p>Want to continue with a reduced commission rate? <a href="${process.env.FRONTEND_URL}/seller-subscription" style="color:#6d28d9;">Resubscribe here</a>.</p>
	    <p style="color:#6b7280;font-size:14px;margin-top:30px;">
	      <strong>Marketplace Support Team</strong>
	    </p>
	  </div>
	</div>`;

	try {
		const { error } = await resend.emails.send({
			from: FROM_EMAIL,
			to: email,
			subject: `Your ${planName} Subscription Has Expired`,
			html,
		});
		if (error) console.error('Error sending expiry email:', error);
		else console.log(`✅ Expiry email sent to ${email}`);
	} catch (err) {
		console.error('Error sending expiry email:', err);
	}
}

// ═══════════════════════════════════════════════════════════
// ORDER EMAILS
// ═══════════════════════════════════════════════════════════

/**
 * Order status update email sent to buyer when seller changes order status.
 * Not sent for: Sold (internal accounting), Cancelled (buyer-initiated).
 */
export async function sendOrderStatusUpdateEmail(buyerEmail, buyerName, orderId, status, orderItems, totalAmount, reason = null, trackingInfo = null) {
	const statusConfigs = {
		Confirmed: {
			subject: '✅ Your Order Has Been Confirmed',
			headerColor: '#006B1A',
			headerText: 'Order Confirmed!',
			message: 'Great news! The seller has confirmed your order and is preparing your items for dispatch.',
			subMessage: "You'll receive another update once your order has been shipped.",
		},
		Rejected: {
			subject: '❌ Your Order Was Not Accepted',
			headerColor: '#dc2626',
			headerText: 'Order Rejected',
			message: "We're sorry — the seller was unable to fulfil your order. If a payment was taken it will be refunded to your original payment method within a few business days.",
			subMessage: reason
				? `Reason from seller: <em>${reason}</em><br/><br/>Feel free to browse our marketplace for alternative products.`
				: 'Feel free to browse our marketplace for alternative products.',
		},
		Shipped: {
			subject: '📦 Your Order Is On Its Way!',
			headerColor: '#2563eb',
			headerText: 'Order Shipped!',
			message: 'Your order has been dispatched by the seller and is on its way to you.',
			subMessage: 'Delivery times depend on the shipping method selected at checkout. Keep an eye on your door!',
		},
		Delivered: {
			subject: '🏠 Your Order Has Been Delivered',
			headerColor: '#059669',
			headerText: 'Order Delivered',
			message: 'Your order has been marked as delivered. We hope you love your purchase!',
			subMessage: 'If anything is not right, please get in touch within the 14-day return window.',
		},
	};

	const config = statusConfigs[status];
	if (!config) return; // Sold, Cancelled — no email

	const shortId = String(orderId).slice(0, 8).toUpperCase();

	const itemRows = (orderItems || [])
		.map(
			(item) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">${item.ProductName}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;">x${item.Quantity}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;">€${Number(item.UnitPrice ?? item.Price).toFixed(2)}</td>
      </tr>`
		)
		.join('');

	const itemTable =
		itemRows.length > 0
			? `<table style="width:100%;border-collapse:collapse;margin-top:10px;">
        <thead>
          <tr style="background:#f4f4f4;">
            <th style="padding:10px;border:1px solid #ddd;text-align:left;">Product</th>
            <th style="padding:10px;border:1px solid #ddd;text-align:center;">Qty</th>
            <th style="padding:10px;border:1px solid #ddd;text-align:center;">Price</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>`
			: '';

	const html = `
  <div style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;">
    <div style="background:${config.headerColor};padding:30px;border-radius:12px 12px 0 0;text-align:center;">
      <h1 style="color:white;margin:0;font-size:24px;">${config.headerText}</h1>
    </div>
    <div style="padding:30px;background:#fff;border:1px solid #e5e7eb;border-top:none;">
      <h2 style="color:#1f2937;">Hi ${buyerName || 'Customer'},</h2>
      <p>${config.message}</p>

      <div style="background:#f3f4f6;padding:15px;border-radius:8px;margin:15px 0;">
        <p style="margin:0 0 4px 0;font-size:13px;color:#6b7280;">Order Reference: <strong>#${shortId}</strong></p>
        <p style="margin:0;font-size:13px;color:#6b7280;">Order Total: <strong>€${Number(totalAmount).toFixed(2)}</strong></p>
      </div>

      ${itemTable}

      ${status === 'Shipped' && trackingInfo ? `
      <div style="background:#eff6ff;padding:15px;border-radius:8px;margin:20px 0;border-left:4px solid #2563eb;">
        <p style="margin:0 0 8px 0;font-weight:bold;color:#1d4ed8;font-size:14px;">Tracking Information</p>
        <p style="margin:0 0 6px 0;font-size:13px;color:#374151;">
          Tracking Number: <strong>${trackingInfo.trackingNumber}</strong>
        </p>
        ${trackingInfo.trackingUrl ? `<p style="margin:0;font-size:13px;">
          <a href="${trackingInfo.trackingUrl}" style="color:#2563eb;text-decoration:underline;">Track your package &rarr;</a>
        </p>` : ''}
      </div>` : ''}

      <p style="margin-top:20px;color:#555;">${config.subMessage}</p>

      <p style="color:#6b7280;font-size:14px;margin-top:30px;">
        <strong>Marketplace Support Team</strong><br/>
        E-commerce made simple for you by us.
      </p>
    </div>
  </div>`;

	try {
		const { error } = await resend.emails.send({
			from: FROM_EMAIL,
			to: buyerEmail,
			subject: config.subject,
			html,
		});
		if (error) console.error(`❌ Error sending order ${status} email:`, error);
		else console.log(`✅ Order ${status} email sent to ${buyerEmail}`);
	} catch (err) {
		console.error(`❌ Error sending order ${status} email:`, err);
	}
}

/**
 * Auto-cancellation email — sent to buyer when a seller fails to respond within 24 hours.
 */
export async function sendOrderAutoCancelledEmail(buyerEmail, buyerName, orderId, orderItems, totalAmount) {
	const shortId = String(orderId).slice(0, 8).toUpperCase();

	const itemRows = (orderItems || [])
		.map(
			(item) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">${item.ProductName}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;">x${item.Quantity}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;">€${Number(item.Price).toFixed(2)}</td>
      </tr>`
		)
		.join('');

	const itemTable =
		itemRows.length > 0
			? `<table style="width:100%;border-collapse:collapse;margin-top:10px;">
        <thead>
          <tr style="background:#f4f4f4;">
            <th style="padding:10px;border:1px solid #ddd;text-align:left;">Product</th>
            <th style="padding:10px;border:1px solid #ddd;text-align:center;">Qty</th>
            <th style="padding:10px;border:1px solid #ddd;text-align:center;">Price</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>`
			: '';

	const html = `
  <div style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;">
    <div style="background:#b45309;padding:30px;border-radius:12px 12px 0 0;text-align:center;">
      <h1 style="color:white;margin:0;font-size:24px;">Order Automatically Cancelled</h1>
    </div>
    <div style="padding:30px;background:#fff;border:1px solid #e5e7eb;border-top:none;">
      <h2 style="color:#1f2937;">Hi ${buyerName || 'Customer'},</h2>
      <p>We're sorry — your order was automatically cancelled because the seller did not confirm or reject it within <strong>24 hours</strong>.</p>

      <div style="background:#fef3c7;padding:15px;border-radius:8px;margin:15px 0;border-left:4px solid #f59e0b;">
        <p style="margin:0 0 4px 0;font-size:13px;color:#6b7280;">Order Reference: <strong>#${shortId}</strong></p>
        <p style="margin:0;font-size:13px;color:#6b7280;">Order Total: <strong>€${Number(totalAmount).toFixed(2)}</strong></p>
      </div>

      ${itemTable}

      <p style="margin-top:20px;color:#555;">If a payment was taken, it will be refunded to your original payment method within a few business days.</p>
      <p style="color:#555;">We apologise for any inconvenience. Feel free to browse our marketplace for alternative products.</p>

      <p style="color:#6b7280;font-size:14px;margin-top:30px;">
        <strong>Marketplace Support Team</strong><br/>
        E-commerce made simple for you by us.
      </p>
    </div>
  </div>`;

	try {
		const { error } = await resend.emails.send({
			from: FROM_EMAIL,
			to: buyerEmail,
			subject: '⚠️ Your Order Has Been Automatically Cancelled',
			html,
		});
		if (error) console.error('❌ Error sending auto-cancel email:', error);
		else console.log(`✅ Auto-cancel email sent to ${buyerEmail}`);
	} catch (err) {
		console.error('❌ Error sending auto-cancel email:', err);
	}
}

// ═══════════════════════════════════════════════════════════
// RETURN / REFUND EMAILS
// ═══════════════════════════════════════════════════════════

/**
 * Notifies the seller when a buyer submits a return request.
 */
export async function sendReturnSubmittedEmail(sellerEmail, sellerName, orderId, buyerName, reason) {
	const shortId = String(orderId).slice(0, 8).toUpperCase();
	const html = `
	<div style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;">
	  <div style="background:#b45309;padding:30px;border-radius:12px 12px 0 0;text-align:center;">
	    <h1 style="color:white;margin:0;font-size:24px;">Return Request Received</h1>
	  </div>
	  <div style="padding:30px;background:#fff;border:1px solid #e5e7eb;border-top:none;">
	    <h2 style="color:#1f2937;">Hi ${sellerName || 'Seller'},</h2>
	    <p>Buyer <strong>${buyerName || 'A buyer'}</strong> has submitted a return request for order <strong>#${shortId}</strong>.</p>
	    <div style="background:#fef3c7;padding:15px;border-radius:8px;margin:15px 0;border-left:4px solid #f59e0b;">
	      <p style="margin:0 0 6px 0;font-size:13px;font-weight:bold;color:#92400e;">Buyer reason:</p>
	      <p style="margin:0;font-size:13px;color:#78350f;">${reason}</p>
	    </div>
	    <p style="background:#fee2e2;padding:12px;border-radius:6px;border-left:4px solid #dc2626;font-size:13px;">
	      <strong>You have 3 days to approve or reject this request.</strong> If you do not respond, the return will be auto-approved and the buyer will be refunded automatically.
	    </p>
	    <p style="color:#6b7280;font-size:14px;margin-top:30px;"><strong>Marketplace Support Team</strong></p>
	  </div>
	</div>`;
	try {
		const { error } = await resend.emails.send({ from: FROM_EMAIL, to: sellerEmail, subject: `Return Request — Order #${shortId}`, html });
		if (error) console.error('Error sending return submitted email:', error);
		else console.log(`Return submitted email sent to ${sellerEmail}`);
	} catch (err) {
		console.error('Error sending return submitted email:', err);
	}
}

/**
 * Notifies the buyer when a seller approves their return request.
 */
export async function sendReturnApprovedEmail(buyerEmail, buyerName, orderId, sellerInstructions) {
	const shortId = String(orderId).slice(0, 8).toUpperCase();
	const html = `
	<div style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;">
	  <div style="background:#059669;padding:30px;border-radius:12px 12px 0 0;text-align:center;">
	    <h1 style="color:white;margin:0;font-size:24px;">Return Approved</h1>
	  </div>
	  <div style="padding:30px;background:#fff;border:1px solid #e5e7eb;border-top:none;">
	    <h2 style="color:#1f2937;">Hi ${buyerName || 'Customer'},</h2>
	    <p>Good news — the seller has approved your return request for order <strong>#${shortId}</strong>.</p>
	    <div style="background:#d1fae5;padding:15px;border-radius:8px;margin:15px 0;border-left:4px solid #059669;">
	      <p style="margin:0 0 6px 0;font-size:13px;font-weight:bold;color:#065f46;">Seller instructions:</p>
	      <p style="margin:0;font-size:13px;color:#064e3b;white-space:pre-wrap;">${sellerInstructions}</p>
	    </div>
	    <p style="color:#6b7280;font-size:14px;margin-top:30px;"><strong>Marketplace Support Team</strong></p>
	  </div>
	</div>`;
	try {
		const { error } = await resend.emails.send({ from: FROM_EMAIL, to: buyerEmail, subject: `Return Approved — Order #${shortId}`, html });
		if (error) console.error('Error sending return approved email:', error);
		else console.log(`Return approved email sent to ${buyerEmail}`);
	} catch (err) {
		console.error('Error sending return approved email:', err);
	}
}

/**
 * Notifies the buyer when a seller rejects their return request.
 */
export async function sendReturnRejectedEmail(buyerEmail, buyerName, orderId, rejectionReason) {
	const shortId = String(orderId).slice(0, 8).toUpperCase();
	const html = `
	<div style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;">
	  <div style="background:#dc2626;padding:30px;border-radius:12px 12px 0 0;text-align:center;">
	    <h1 style="color:white;margin:0;font-size:24px;">Return Request Declined</h1>
	  </div>
	  <div style="padding:30px;background:#fff;border:1px solid #e5e7eb;border-top:none;">
	    <h2 style="color:#1f2937;">Hi ${buyerName || 'Customer'},</h2>
	    <p>Unfortunately, the seller has declined your return request for order <strong>#${shortId}</strong>.</p>
	    <div style="background:#fee2e2;padding:15px;border-radius:8px;margin:15px 0;border-left:4px solid #dc2626;">
	      <p style="margin:0 0 6px 0;font-size:13px;font-weight:bold;color:#991b1b;">Seller reason:</p>
	      <p style="margin:0;font-size:13px;color:#7f1d1d;">${rejectionReason}</p>
	    </div>
	    <p style="color:#6b7280;font-size:14px;margin-top:30px;"><strong>Marketplace Support Team</strong></p>
	  </div>
	</div>`;
	try {
		const { error } = await resend.emails.send({ from: FROM_EMAIL, to: buyerEmail, subject: `Return Declined — Order #${shortId}`, html });
		if (error) console.error('Error sending return rejected email:', error);
		else console.log(`Return rejected email sent to ${buyerEmail}`);
	} catch (err) {
		console.error('Error sending return rejected email:', err);
	}
}

/**
 * Notifies the buyer when a refund has been processed via Stripe.
 */
export async function sendRefundProcessedEmail(buyerEmail, buyerName, orderId, amount) {
	const shortId = String(orderId).slice(0, 8).toUpperCase();
	const html = `
	<div style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;">
	  <div style="background:#6d28d9;padding:30px;border-radius:12px 12px 0 0;text-align:center;">
	    <h1 style="color:white;margin:0;font-size:24px;">Refund Processed</h1>
	  </div>
	  <div style="padding:30px;background:#fff;border:1px solid #e5e7eb;border-top:none;">
	    <h2 style="color:#1f2937;">Hi ${buyerName || 'Customer'},</h2>
	    <p>Your refund for order <strong>#${shortId}</strong> has been processed.</p>
	    <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:20px 0;">
	      <p style="margin:0;font-size:15px;">Refund amount: <strong>&euro;${Number(amount).toFixed(2)}</strong></p>
	      <p style="margin:8px 0 0 0;font-size:13px;color:#6b7280;">Funds typically appear within 5–10 business days depending on your bank.</p>
	    </div>
	    <p style="color:#6b7280;font-size:14px;margin-top:30px;"><strong>Marketplace Support Team</strong></p>
	  </div>
	</div>`;
	try {
		const { error } = await resend.emails.send({ from: FROM_EMAIL, to: buyerEmail, subject: `Refund Processed — Order #${shortId}`, html });
		if (error) console.error('Error sending refund processed email:', error);
		else console.log(`Refund processed email sent to ${buyerEmail}`);
	} catch (err) {
		console.error('Error sending refund processed email:', err);
	}
}

export async function sendPartialRefundAgreedEmail(buyerEmail, buyerName, orderId, amount, sellerNote) {
	const shortId = String(orderId).slice(0, 8).toUpperCase();
	const noteBlock = sellerNote
		? `<div style="background:#fef9c3;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #ca8a04;">
		       <p style="margin:0;font-size:13px;color:#92400e;font-weight:600;">Note from seller</p>
		       <p style="margin:6px 0 0 0;font-size:14px;color:#78350f;">${sellerNote}</p>
		     </div>`
		: '';
	const html = `
	<div style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;">
	  <div style="background:#0369a1;padding:30px;border-radius:12px 12px 0 0;text-align:center;">
	    <h1 style="color:white;margin:0;font-size:24px;">Partial Refund Agreed</h1>
	  </div>
	  <div style="padding:30px;background:#fff;border:1px solid #e5e7eb;border-top:none;">
	    <h2 style="color:#1f2937;">Hi ${buyerName || 'Customer'},</h2>
	    <p>The seller has agreed to a partial refund for order <strong>#${shortId}</strong>. You get to keep the item.</p>
	    <div style="background:#f0f9ff;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #0369a1;">
	      <p style="margin:0;font-size:15px;">Partial refund amount: <strong>&euro;${Number(amount).toFixed(2)}</strong></p>
	      <p style="margin:8px 0 0 0;font-size:13px;color:#6b7280;">You keep the item — no need to ship anything back.</p>
	      <p style="margin:8px 0 0 0;font-size:13px;color:#6b7280;">Funds typically appear within 5–10 business days.</p>
	    </div>
	    ${noteBlock}
	    <p style="color:#6b7280;font-size:14px;margin-top:30px;"><strong>Marketplace Support Team</strong></p>
	  </div>
	</div>`;
	try {
		const { error } = await resend.emails.send({ from: FROM_EMAIL, to: buyerEmail, subject: `Partial Refund Agreed — Order #${shortId}`, html });
		if (error) console.error('Error sending partial refund email:', error);
		else console.log(`Partial refund agreed email sent to ${buyerEmail}`);
	} catch (err) {
		console.error('Error sending partial refund email:', err);
	}
}

export async function sendBuyerShippedEmail(sellerEmail, sellerName, orderId, buyerName, trackingNumber, trackingUrl) {
	const shortId = String(orderId).slice(0, 8).toUpperCase();
	const html = `
	<div style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;">
	  <div style="background:#2563eb;padding:30px;border-radius:12px 12px 0 0;text-align:center;">
	    <h1 style="color:white;margin:0;font-size:24px;">Item Shipped</h1>
	  </div>
	  <div style="padding:30px;background:#fff;border:1px solid #e5e7eb;border-top:none;">
	    <h2 style="color:#1f2937;">Hi ${sellerName || 'there'},</h2>
	    <p>The buyer <strong>${buyerName || 'Customer'}</strong> has shipped the returned item for order <strong>#${shortId}</strong>.</p>
	    <div style="background:#eff6ff;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #2563eb;">
	      <p style="margin:0 0 8px 0;font-size:15px;font-weight:600;">Tracking Number</p>
	      <p style="margin:0;font-size:15px;font-family:monospace;">${trackingNumber}</p>
	      ${trackingUrl ? `<p style="margin:8px 0 0 0;"><a href="${trackingUrl}" style="color:#2563eb;">Track the shipment &rarr;</a></p>` : ''}
	    </div>
	    <p>Once you receive the item and confirm it's in acceptable condition, please confirm receipt in your dashboard to complete the return and issue the refund.</p>
	    <p style="color:#6b7280;font-size:14px;margin-top:30px;"><strong>Marketplace Support Team</strong></p>
	  </div>
	</div>`;
	try {
		const { error } = await resend.emails.send({ from: FROM_EMAIL, to: sellerEmail, subject: `Item Shipped — Return for Order #${shortId}`, html });
		if (error) console.error('Error sending buyer shipped email:', error);
		else console.log(`Buyer shipped email sent to ${sellerEmail}`);
	} catch (err) {
		console.error('Error sending buyer shipped email:', err);
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

export async function sendNewReviewEmail(sellerEmail, sellerName, productName, buyerName, rating) {
	const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
	const htmlContent = `
    <div style="font-family:Arial,sans-serif;color:#333;max-width:600px;">
      <div style="background:linear-gradient(135deg,#0057B8,#0096C7);padding:24px 32px;border-radius:12px 12px 0 0;">
        <h2 style="color:#fff;margin:0;font-size:22px;">New Review on Your Product</h2>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:28px 32px;">
        <p>Hi <strong>${sellerName || 'Seller'}</strong>,</p>
        <p>A buyer has left a new review for one of your products on <strong>The Marketplace</strong>.</p>
        <div style="background:#f9fafb;border-radius:10px;padding:18px 22px;margin:20px 0;border-left:4px solid #0057B8;">
          <p style="margin:4px 0;"><strong>Product:</strong> ${productName}</p>
          <p style="margin:4px 0;"><strong>Buyer:</strong> ${buyerName}</p>
          <p style="margin:4px 0;font-size:20px;color:#F59E0B;">${stars}</p>
        </div>
        <p>Log in to your seller dashboard to view the full review and respond.</p>
        <p style="color:#6b7280;font-size:13px;margin-top:24px;">The Marketplace Team</p>
      </div>
    </div>`;

	try {
		const { data, error } = await resend.emails.send({
			from: FROM_EMAIL,
			to: sellerEmail,
			subject: `⭐ New ${rating}-star review on "${productName}"`,
			html: htmlContent,
		});
		if (error) { console.error('❌ Error sending review notification email:', error); return; }
		console.log(`✅ Review notification sent to ${sellerEmail}:`, data);
	} catch (error) {
		console.error('❌ Error sending review notification email:', error);
	}
}
