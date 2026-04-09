import { Link } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import Footer from '../../components/Footer';

const Section = ({ title, children }) => (
	<section className='mb-10'>
		<h2 className='text-xl font-bold text-primary-900 mb-4 pb-2 border-b border-gray-200'>{title}</h2>
		<div className='text-gray-700 space-y-3 text-sm leading-relaxed'>{children}</div>
	</section>
);

const TermsOfService = () => {
	const lastUpdated = '9 April 2026';

	return (
		<div className='min-h-screen flex flex-col bg-gray-50'>
			<NavBar />

			<main className='flex-grow max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 text-left'>
				{/* Header */}
				<div className='mb-10'>
					<h1 className='text-3xl font-bold text-primary-900 mb-2'>Terms of Service</h1>
					<p className='text-sm text-gray-500'>Last updated: {lastUpdated}</p>
					<div className='mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800'>
						Please read these Terms carefully before using GibLi. By creating an account or placing an order, you agree to be bound by these Terms. If you do not agree, please do not use the platform.
					</div>
				</div>

				<Section title='1. About GibLi'>
					<p>
						GibLi ("we", "us", "our", "the Platform") is an online marketplace operating at <strong>gibli.eu</strong> that connects independent sellers ("Sellers") with buyers ("Buyers") across the European Union and beyond.
					</p>
					<p>
						GibLi acts as a marketplace operator and intermediary — not as the seller of goods listed by third-party Sellers. Each Seller is independently responsible for their listings, prices, stock accuracy, and fulfilment, in accordance with applicable EU and national law.
					</p>
					<p>
						These Terms of Service ("Terms") form a legally binding agreement between you and GibLi. They apply to all users of the Platform regardless of role. Supplementary terms (such as the Seller Agreement) may apply to Sellers.
					</p>
				</Section>

				<Section title='2. Eligibility'>
					<ul className='list-disc pl-5 space-y-2'>
						<li>You must be at least 18 years of age to use GibLi.</li>
						<li>You must be legally capable of entering into a binding contract in your jurisdiction.</li>
						<li>Sellers who are businesses must be lawfully registered and provide accurate business details. Consumer Sellers (individuals selling personal items) must comply with all applicable distance selling regulations.</li>
						<li>You may only hold one account per person or entity. Duplicate accounts may be suspended.</li>
					</ul>
				</Section>

				<Section title='3. Account Registration'>
					<p>
						To access most features of GibLi, you must register an account. You agree to:
					</p>
					<ul className='list-disc pl-5 space-y-2'>
						<li>Provide accurate, current, and complete information during registration.</li>
						<li>Maintain the security of your password. GibLi will never ask for your password.</li>
						<li>Notify us immediately of any unauthorised access to your account at <a href='mailto:support@gibli.eu' className='text-secondary-600 hover:underline'>support@gibli.eu</a>.</li>
						<li>Accept responsibility for all activity that occurs under your account.</li>
					</ul>
					<p>
						We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or otherwise threaten the integrity of the Platform.
					</p>
				</Section>

				<Section title='4. Buying on GibLi'>
					<h3 className='font-semibold text-gray-900 mt-4 mb-2'>4.1 Placing an Order</h3>
					<p>
						When you place an order on GibLi, you are making a binding offer to purchase goods from the individual Seller. Your order is confirmed when the Seller accepts it (status: <em>Confirmed</em>). Until then, no contract exists between you and the Seller.
					</p>
					<p>
						Payment is processed securely via Stripe at the time of checkout. GibLi does not store your card details.
					</p>

					<h3 className='font-semibold text-gray-900 mt-4 mb-2'>4.2 Right of Withdrawal (EU Consumer Rights Directive 2011/83/EU)</h3>
					<p>
						If you are a consumer (purchasing for personal, non-commercial use) and the Seller is a business, you have the right to withdraw from the contract without giving any reason within <strong>14 calendar days</strong> from the day you receive the goods.
					</p>
					<p>
						To exercise your right of withdrawal, you must inform the Seller of your decision via the order detail page on the Platform or by contacting us at <a href='mailto:support@gibli.eu' className='text-secondary-600 hover:underline'>support@gibli.eu</a> before the 14-day period expires.
					</p>
					<p>Exceptions to the right of withdrawal include:</p>
					<ul className='list-disc pl-5 space-y-1'>
						<li>Goods made to your personal specification or clearly personalised</li>
						<li>Sealed goods that are not suitable for return due to health or hygiene reasons, once unsealed</li>
						<li>Digital content once download or access has begun (with prior consent)</li>
					</ul>

					<h3 className='font-semibold text-gray-900 mt-4 mb-2'>4.3 Returns and Refunds</h3>
					<p>
						Where a valid withdrawal or return is exercised, the Seller must reimburse all payments received, including standard delivery costs, within <strong>14 days</strong> of receiving the returned goods or proof of return shipment (whichever comes first). Refunds are processed via the original payment method through Stripe.
					</p>
					<p>
						Sellers may offer return policies more generous than the statutory minimum. Any such extended policy is displayed on the Seller's store page and product listings.
					</p>

					<h3 className='font-semibold text-gray-900 mt-4 mb-2'>4.4 Delivery</h3>
					<p>
						Delivery timescales and costs are set by each Seller and displayed at checkout. Under EU law, unless otherwise agreed, goods must be delivered within 30 days of purchase. If a Seller fails to deliver within the agreed timeframe, you may cancel the order and receive a full refund.
					</p>

					<h3 className='font-semibold text-gray-900 mt-4 mb-2'>4.5 Conformity of Goods</h3>
					<p>
						Under EU Directive 2019/771 on the sale of goods, goods must conform with the contract description, be fit for purpose, and be free from defects. If goods are non-conforming, you may be entitled to repair, replacement, price reduction, or contract rescission. Please contact the Seller first; if unresolved, contact us.
					</p>
				</Section>

				<Section title='5. Selling on GibLi'>
					<h3 className='font-semibold text-gray-900 mt-4 mb-2'>5.1 Seller Subscription</h3>
					<p>
						To list products on GibLi, Sellers must subscribe to a paid seller plan. Subscription fees are billed periodically via Stripe. GibLi reserves the right to modify subscription pricing with at least 30 days' notice.
					</p>

					<h3 className='font-semibold text-gray-900 mt-4 mb-2'>5.2 Seller Obligations</h3>
					<p>By listing on GibLi, Sellers agree to:</p>
					<ul className='list-disc pl-5 space-y-1'>
						<li>List only goods they are legally entitled to sell and ship within the EU.</li>
						<li>Provide accurate descriptions, prices, and stock levels.</li>
						<li>Comply with all applicable laws, including consumer protection, VAT obligations, and product safety regulations (EU General Product Safety Regulation 2023/988).</li>
						<li>Honour confirmed orders and ship within the stated timeframe.</li>
						<li>Respond to Buyer messages and return requests in a timely manner.</li>
						<li>Not offer counterfeit, prohibited, or dangerous goods.</li>
					</ul>

					<h3 className='font-semibold text-gray-900 mt-4 mb-2'>5.3 Commission</h3>
					<p>
						GibLi charges a platform commission on each completed sale. The commission rate is displayed in your Seller dashboard and may vary by plan. Commission is deducted from payouts. Payouts are initiated after an order reaches <em>Delivered</em> status and any applicable refund window has passed.
					</p>

					<h3 className='font-semibold text-gray-900 mt-4 mb-2'>5.4 Prohibited Listings</h3>
					<p>The following categories are strictly prohibited on GibLi:</p>
					<ul className='list-disc pl-5 space-y-1'>
						<li>Counterfeit or intellectual-property-infringing items</li>
						<li>Weapons, firearms, or ammunition</li>
						<li>Controlled substances or narcotics</li>
						<li>Live animals</li>
						<li>Goods that violate EU sanctions</li>
						<li>Adult content, unless explicitly permitted by a separate agreement</li>
					</ul>
					<p>We may remove listings and suspend accounts that violate these restrictions without prior notice.</p>
				</Section>

				<Section title='6. Payments and Fees'>
					<p>
						All payments on GibLi are processed by <strong>Stripe</strong>. By using the Platform, you agree to Stripe's Terms of Service and Privacy Policy. GibLi does not store payment card information.
					</p>
					<p>
						Prices displayed on the Platform are inclusive of applicable VAT unless otherwise stated. Sellers are responsible for ensuring that their pricing complies with EU VAT rules (including OSS obligations where applicable).
					</p>
					<p>
						Payouts to Sellers are made in EUR via bank transfer. Currency conversion fees, if any, are the Seller's responsibility.
					</p>
				</Section>

				<Section title='7. Platform Rules and Conduct'>
					<p>All users of GibLi agree not to:</p>
					<ul className='list-disc pl-5 space-y-1'>
						<li>Use the Platform for any unlawful purpose</li>
						<li>Harass, threaten, or abuse other users</li>
						<li>Post false, misleading, or defamatory content</li>
						<li>Scrape, crawl, or extract data from the Platform without written consent</li>
						<li>Attempt to gain unauthorised access to the Platform or other users' accounts</li>
						<li>Circumvent the Platform to complete transactions off-platform to avoid fees</li>
						<li>Upload viruses, malicious code, or anything that could disrupt the Platform</li>
					</ul>
					<p>
						Violations may result in immediate account suspension and, where appropriate, reporting to law enforcement authorities.
					</p>
				</Section>

				<Section title='8. Intellectual Property'>
					<p>
						All content on the GibLi Platform (excluding user-uploaded content) — including design, logos, software, and text — is owned by or licensed to GibLi and is protected by EU and international intellectual property law.
					</p>
					<p>
						By uploading product images or descriptions to GibLi, you grant us a non-exclusive, royalty-free, worldwide licence to display that content on the Platform for the purpose of operating the marketplace. You confirm that you own or are licensed to use all content you upload, and that it does not infringe third-party rights.
					</p>
					<p>
						If you believe content on GibLi infringes your intellectual property rights, please contact us at <a href='mailto:legal@gibli.eu' className='text-secondary-600 hover:underline'>legal@gibli.eu</a> with full details.
					</p>
				</Section>

				<Section title='9. Limitation of Liability'>
					<p>
						To the maximum extent permitted by applicable EU law:
					</p>
					<ul className='list-disc pl-5 space-y-2'>
						<li>GibLi is a marketplace intermediary. We are not the seller of goods listed by third-party Sellers and are not liable for product quality, safety, or fitness for purpose beyond our obligations as a platform under the EU Digital Services Act (DSA, Regulation 2022/2065).</li>
						<li>We are not liable for indirect, incidental, or consequential losses arising from your use of the Platform.</li>
						<li>Our total aggregate liability to you in any 12-month period shall not exceed the total fees paid by you to GibLi during that period.</li>
					</ul>
					<p>
						Nothing in these Terms limits our liability for death or personal injury caused by our negligence, fraud, or any other liability that cannot be excluded under applicable law.
					</p>
					<p>
						Your statutory rights as a consumer under EU law are not affected by these Terms.
					</p>
				</Section>

				<Section title='10. Dispute Resolution'>
					<h3 className='font-semibold text-gray-900 mt-4 mb-2'>10.1 Between Buyers and Sellers</h3>
					<p>
						Disputes about an order (non-delivery, non-conformity, returns) should first be raised with the Seller via the Platform's messaging system. If unresolved within 14 days, contact GibLi support at <a href='mailto:support@gibli.eu' className='text-secondary-600 hover:underline'>support@gibli.eu</a>. GibLi will attempt to mediate in good faith.
					</p>

					<h3 className='font-semibold text-gray-900 mt-4 mb-2'>10.2 EU Online Dispute Resolution</h3>
					<p>
						Under EU Regulation 524/2013, the European Commission operates an Online Dispute Resolution (ODR) platform available at{' '}
						<a href='https://ec.europa.eu/consumers/odr' target='_blank' rel='noreferrer' className='text-secondary-600 hover:underline'>
							ec.europa.eu/consumers/odr
						</a>
						. Our email for ODR purposes is{' '}
						<a href='mailto:support@gibli.eu' className='text-secondary-600 hover:underline'>support@gibli.eu</a>.
					</p>
					<p>
						We are not currently obliged to participate in ADR (Alternative Dispute Resolution) proceedings but may choose to do so on a case-by-case basis.
					</p>
				</Section>

				<Section title='11. Governing Law and Jurisdiction'>
					<p>
						These Terms are governed by and construed in accordance with the laws of the European Union and, where national law applies, the laws of the Member State in which GibLi's registered address is located.
					</p>
					<p>
						If you are a consumer resident in an EU Member State, you benefit from the mandatory consumer protection provisions of your country of residence, which these Terms cannot override.
					</p>
				</Section>

				<Section title='12. Changes to These Terms'>
					<p>
						We may update these Terms to reflect changes in law, our services, or business operations. We will notify you of material changes by email or via a prominent notice on the Platform at least <strong>30 days</strong> before the changes take effect.
					</p>
					<p>
						If you do not agree with the updated Terms, you may close your account before the effective date. Continued use of the Platform after that date constitutes acceptance of the new Terms.
					</p>
				</Section>

				<Section title='13. Contact Us'>
					<p>For any questions about these Terms, please contact:</p>
					<p>
						<strong>GibLi Support</strong><br />
						<a href='mailto:support@gibli.eu' className='text-secondary-600 hover:underline'>support@gibli.eu</a><br />
						<a href='mailto:legal@gibli.eu' className='text-secondary-600 hover:underline'>legal@gibli.eu</a> (legal enquiries)<br />
						<a href='https://gibli.eu' className='text-secondary-600 hover:underline'>https://gibli.eu</a>
					</p>
				</Section>

				{/* Footer links */}
				<div className='mt-12 pt-6 border-t border-gray-200 flex flex-wrap gap-4 text-sm text-gray-500'>
					<Link to='/privacy' className='hover:text-secondary-600 transition-colors'>Privacy Policy</Link>
					<Link to='/' className='hover:text-secondary-600 transition-colors'>Back to Home</Link>
					<a href='mailto:legal@gibli.eu' className='hover:text-secondary-600 transition-colors'>legal@gibli.eu</a>
				</div>
			</main>

			<Footer />
		</div>
	);
};

export default TermsOfService;
