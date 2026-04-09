import { Link } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import Footer from '../../components/Footer';

const Section = ({ title, children }) => (
	<section className='mb-10'>
		<h2 className='text-xl font-bold text-primary-900 mb-4 pb-2 border-b border-gray-200'>{title}</h2>
		<div className='text-gray-700 space-y-3 text-sm leading-relaxed'>{children}</div>
	</section>
);

const PrivacyPolicy = () => {
	const lastUpdated = '9 April 2026';

	return (
		<div className='min-h-screen flex flex-col bg-gray-50'>
			<NavBar />

			<main className='flex-grow max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 text-left'>
				{/* Header */}
				<div className='mb-10'>
					<h1 className='text-3xl font-bold text-primary-900 mb-2'>Privacy Policy</h1>
					<p className='text-sm text-gray-500'>Last updated: {lastUpdated}</p>
					<div className='mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800'>
						This Privacy Policy is governed by Regulation (EU) 2016/679 of the European Parliament (GDPR). We are committed to protecting your personal data and your rights as a data subject.
					</div>
				</div>

				<Section title='1. Controller Identity'>
					<p>
						<strong>GibLi</strong> ("we", "us", "our") operates the online marketplace accessible at{' '}
						<strong>gibli.eu</strong>.
					</p>
					<p>
						<strong>Data Controller:</strong> GibLi<br />
						<strong>Website:</strong> https://gibli.eu<br />
						<strong>Contact:</strong>{' '}
						<a href='mailto:privacy@gibli.eu' className='text-secondary-600 hover:underline'>
							privacy@gibli.eu
						</a>
					</p>
					<p>
						For all questions regarding this Privacy Policy or the exercise of your rights, please contact us at the address above.
					</p>
				</Section>

				<Section title='2. Data We Collect'>
					<p>We collect and process the following categories of personal data:</p>
					<ul className='list-disc pl-5 space-y-2'>
						<li>
							<strong>Account data:</strong> name, email address, password (hashed), account type (buyer/seller), email verification status.
						</li>
						<li>
							<strong>Seller data:</strong> business name, VAT/tax number (where applicable), store description, bank details for payouts.
						</li>
						<li>
							<strong>Transaction data:</strong> order history, items purchased or sold, shipping addresses, payment method tokens (we do not store full card numbers — these are handled by Stripe).
						</li>
						<li>
							<strong>Communication data:</strong> messages exchanged via our platform chat, support emails.
						</li>
						<li>
							<strong>Technical data:</strong> IP address, browser type, device identifiers, cookies and similar technologies, session tokens.
						</li>
						<li>
							<strong>Usage data:</strong> pages visited, search queries, products viewed, wishlist items, cart contents.
						</li>
					</ul>
				</Section>

				<Section title='3. Legal Basis for Processing'>
					<p>We process your personal data on the following legal bases under Article 6 GDPR:</p>
					<ul className='list-disc pl-5 space-y-2'>
						<li>
							<strong>Art. 6(1)(b) — Contract performance:</strong> Processing necessary to execute a purchase, manage your account, process returns, and deliver orders.
						</li>
						<li>
							<strong>Art. 6(1)(a) — Consent:</strong> Non-essential cookies and marketing communications (you may withdraw consent at any time via our cookie banner or by contacting us).
						</li>
						<li>
							<strong>Art. 6(1)(c) — Legal obligation:</strong> Retaining invoices and financial records to comply with tax and accounting law.
						</li>
						<li>
							<strong>Art. 6(1)(f) — Legitimate interests:</strong> Fraud prevention, platform security, improving our services, and dispute resolution — where such interests are not overridden by your rights.
						</li>
					</ul>
				</Section>

				<Section title='4. How We Use Your Data'>
					<ul className='list-disc pl-5 space-y-2'>
						<li>Creating and managing your account</li>
						<li>Processing orders, payments, and refunds</li>
						<li>Sending transactional emails (order confirmations, shipping updates, password resets)</li>
						<li>Facilitating communication between buyers and sellers</li>
						<li>Managing seller subscriptions and payouts</li>
						<li>Detecting and preventing fraud and misuse</li>
						<li>Complying with our legal obligations</li>
						<li>Improving our platform (analytics, aggregated usage data)</li>
					</ul>
				</Section>

				<Section title='5. Cookies and Tracking Technologies'>
					<p>
						We use cookies and similar technologies to operate and improve our platform. Cookie consent is managed via <strong>Cookiebot</strong>. You can review and change your preferences at any time using the cookie settings button in the footer or cookie banner.
					</p>
					<p>We use the following categories of cookies:</p>
					<ul className='list-disc pl-5 space-y-2'>
						<li>
							<strong>Strictly necessary:</strong> Authentication session tokens (HttpOnly, cannot be disabled — required for login to function).
						</li>
						<li>
							<strong>Functional:</strong> User preferences, cart state.
						</li>
						<li>
							<strong>Analytics:</strong> Aggregated usage data to understand how the platform is used.
						</li>
						<li>
							<strong>Marketing:</strong> Only set with your explicit consent.
						</li>
					</ul>
					<p>
						Our authentication cookies are HttpOnly and Secure, meaning they cannot be accessed by JavaScript and are only sent over HTTPS.
					</p>
				</Section>

				<Section title='6. Third-Party Processors'>
					<p>We share your data with the following trusted sub-processors, each bound by a Data Processing Agreement (DPA):</p>
					<ul className='list-disc pl-5 space-y-2'>
						<li>
							<strong>Stripe, Inc.</strong> — Payment processing. Card data is sent directly to Stripe and never stored on our servers. Stripe is PCI-DSS Level 1 certified. See <a href='https://stripe.com/privacy' target='_blank' rel='noreferrer' className='text-secondary-600 hover:underline'>Stripe Privacy Policy</a>.
						</li>
						<li>
							<strong>Resend</strong> — Transactional email delivery (order confirmations, alerts). See <a href='https://resend.com/privacy' target='_blank' rel='noreferrer' className='text-secondary-600 hover:underline'>Resend Privacy Policy</a>.
						</li>
						<li>
							<strong>Cookiebot (Usercentrics)</strong> — Cookie consent management. See <a href='https://www.cookiebot.com/en/privacy-policy/' target='_blank' rel='noreferrer' className='text-secondary-600 hover:underline'>Cookiebot Privacy Policy</a>.
						</li>
					</ul>
					<p>We do not sell your personal data to third parties.</p>
				</Section>

				<Section title='7. International Data Transfers'>
					<p>
						Some of our third-party processors are located outside the European Economic Area (EEA). Where data is transferred outside the EEA, we ensure that appropriate safeguards are in place, including:
					</p>
					<ul className='list-disc pl-5 space-y-2'>
						<li>Standard Contractual Clauses (SCCs) approved by the European Commission</li>
						<li>Adequacy decisions under Article 45 GDPR</li>
					</ul>
					<p>
						Stripe Inc. operates under the EU-U.S. Data Privacy Framework. Resend uses Standard Contractual Clauses.
					</p>
				</Section>

				<Section title='8. Data Retention'>
					<ul className='list-disc pl-5 space-y-2'>
						<li>
							<strong>Account data:</strong> Retained for as long as your account is active. Upon account deletion, we anonymise or delete personal data within 30 days, unless we are required by law to retain it longer.
						</li>
						<li>
							<strong>Order and financial records:</strong> Retained for 7 years to comply with EU accounting and tax law.
						</li>
						<li>
							<strong>Communication data:</strong> Retained for 12 months after the conversation ends, or longer if required for an open dispute.
						</li>
						<li>
							<strong>Technical/log data:</strong> Retained for up to 90 days.
						</li>
					</ul>
				</Section>

				<Section title='9. Your Rights Under GDPR'>
					<p>As a data subject, you have the following rights under Articles 15–22 GDPR:</p>
					<ul className='list-disc pl-5 space-y-2'>
						<li><strong>Right of access (Art. 15):</strong> Request a copy of the personal data we hold about you.</li>
						<li><strong>Right to rectification (Art. 16):</strong> Request correction of inaccurate or incomplete data.</li>
						<li><strong>Right to erasure (Art. 17):</strong> Request deletion of your data ("right to be forgotten"), subject to legal retention obligations.</li>
						<li><strong>Right to restriction (Art. 18):</strong> Request that we limit how we use your data.</li>
						<li><strong>Right to data portability (Art. 20):</strong> Receive your data in a structured, commonly used format.</li>
						<li><strong>Right to object (Art. 21):</strong> Object to processing based on legitimate interests or for direct marketing.</li>
						<li><strong>Right to withdraw consent (Art. 7(3)):</strong> Where processing is based on consent, you may withdraw it at any time without affecting the lawfulness of prior processing.</li>
					</ul>
					<p>
						To exercise any of these rights, contact us at{' '}
						<a href='mailto:privacy@gibli.eu' className='text-secondary-600 hover:underline'>
							privacy@gibli.eu
						</a>
						. We will respond within <strong>30 days</strong> as required by Article 12 GDPR.
					</p>
					<p>
						You also have the right to lodge a complaint with your national supervisory authority. For EU residents, you can find your authority at{' '}
						<a href='https://edpb.europa.eu/about-edpb/about-edpb/members_en' target='_blank' rel='noreferrer' className='text-secondary-600 hover:underline'>
							edpb.europa.eu
						</a>.
					</p>
				</Section>

				<Section title='10. Data Security'>
					<p>
						We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, loss, or disclosure. These include:
					</p>
					<ul className='list-disc pl-5 space-y-2'>
						<li>HTTPS encryption for all data in transit</li>
						<li>HttpOnly and Secure flags on authentication cookies</li>
						<li>Hashed passwords (we never store passwords in plain text)</li>
						<li>Restricted database access with parameterised stored procedures</li>
						<li>Regular security reviews</li>
					</ul>
					<p>
						In the event of a personal data breach that poses a risk to your rights and freedoms, we will notify the relevant supervisory authority within 72 hours and affected individuals without undue delay, as required by Articles 33–34 GDPR.
					</p>
				</Section>

				<Section title='11. Children'>
					<p>
						Our platform is not directed to children under the age of 16. We do not knowingly collect personal data from minors. If you believe a child has provided us with personal data without parental consent, please contact us immediately at{' '}
						<a href='mailto:privacy@gibli.eu' className='text-secondary-600 hover:underline'>
							privacy@gibli.eu
						</a>{' '}
						and we will delete the data promptly.
					</p>
				</Section>

				<Section title='12. Changes to This Policy'>
					<p>
						We may update this Privacy Policy from time to time to reflect changes in law or our practices. We will notify you of material changes by email or via a prominent notice on the platform at least 30 days before the changes take effect. Continued use of the platform after that date constitutes acceptance of the updated policy.
					</p>
					<p>The current version is always available at <strong>gibli.eu/privacy</strong>.</p>
				</Section>

				{/* Footer links */}
				<div className='mt-12 pt-6 border-t border-gray-200 flex flex-wrap gap-4 text-sm text-gray-500'>
					<Link to='/terms' className='hover:text-secondary-600 transition-colors'>Terms of Service</Link>
					<Link to='/' className='hover:text-secondary-600 transition-colors'>Back to Home</Link>
					<a href='mailto:privacy@gibli.eu' className='hover:text-secondary-600 transition-colors'>privacy@gibli.eu</a>
				</div>
			</main>

			<Footer />
		</div>
	);
};

export default PrivacyPolicy;
