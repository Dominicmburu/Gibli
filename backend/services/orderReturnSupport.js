import DbHelper from '../db/dbHelper.js';

const db = new DbHelper();

let schemaReadyPromise = null;

/**
 * Ensures the order return schema is in place (tables, columns, constraints).
 * Delegates all DDL to the EnsureOrderReturnSchema stored procedure.
 */
export async function ensureOrderReturnSchema() {
	if (!schemaReadyPromise) {
		schemaReadyPromise = db.executeProcedure('EnsureOrderReturnSchema', {}).catch((err) => {
			schemaReadyPromise = null;
			throw err;
		});
	}
	return schemaReadyPromise;
}

/** Milliseconds until return window ends (negative = expired). Uses DeliveredAt, else UpdatedAt. */
export function returnWindowRemainingMs(deliveredAt, updatedAt) {
	const base = deliveredAt || updatedAt;
	if (!base) return -1;
	const end = new Date(new Date(base).getTime() + 14 * 24 * 60 * 60 * 1000);
	return end.getTime() - Date.now();
}

/** mssql/tedious often returns lowercase column names — normalize for JSON API */
export function pickCol(row, pascalName) {
	if (!row || typeof row !== 'object') return undefined;
	if (row[pascalName] !== undefined && row[pascalName] !== null) return row[pascalName];
	const lower = pascalName.toLowerCase();
	if (row[lower] !== undefined && row[lower] !== null) return row[lower];
	const hit = Object.keys(row).find((k) => k.toLowerCase() === lower);
	return hit !== undefined ? row[hit] : undefined;
}

export function normalizeReturnRequest(row, mediaRows = []) {
	if (!row) return null;
	const Media = (mediaRows || []).map((m) => ({
		MediaId: pickCol(m, 'MediaId'),
		MediaUrl: pickCol(m, 'MediaUrl'),
		MediaType: pickCol(m, 'MediaType'),
		CreatedAt: pickCol(m, 'CreatedAt'),
	}));
	return {
		ReturnRequestId: pickCol(row, 'ReturnRequestId'),
		OrderId: pickCol(row, 'OrderId'),
		BuyerId: pickCol(row, 'BuyerId'),
		Reason: pickCol(row, 'Reason'),
		Status: pickCol(row, 'Status'),
		SellerInstructions: pickCol(row, 'SellerInstructions'),
		SellerRejectionReason: pickCol(row, 'SellerRejectionReason'),
		ResolutionType: pickCol(row, 'ResolutionType'),
		PartialRefundAmount: pickCol(row, 'PartialRefundAmount'),
		BuyerTrackingNumber: pickCol(row, 'BuyerTrackingNumber'),
		BuyerTrackingUrl: pickCol(row, 'BuyerTrackingUrl'),
		BuyerShippedAt: pickCol(row, 'BuyerShippedAt'),
		ProofUrl: pickCol(row, 'ProofUrl'),
		ProofUploadedAt: pickCol(row, 'ProofUploadedAt'),
		ExchangeTrackingNumber: pickCol(row, 'ExchangeTrackingNumber'),
		ExchangeTrackingUrl: pickCol(row, 'ExchangeTrackingUrl'),
		ExchangeShippedAt: pickCol(row, 'ExchangeShippedAt'),
		ExchangeDeliveredAt: pickCol(row, 'ExchangeDeliveredAt'),
		CreatedAt: pickCol(row, 'CreatedAt'),
		ResolvedAt: pickCol(row, 'ResolvedAt'),
		CommissionAmount: pickCol(row, 'CommissionAmount'),
		CommissionRate: pickCol(row, 'CommissionRate'),
		Media,
	};
}

export async function fetchLatestReturnRequest(orderId) {
	const req = await db.executeProcedure('GetLatestReturnRequest', { OrderId: orderId });
	const row = req.recordset?.[0];
	if (!row) return null;
	const rrId = pickCol(row, 'ReturnRequestId');
	const med = await db.executeProcedure('GetReturnMedia', { ReturnRequestId: rrId });
	return normalizeReturnRequest(row, med.recordset || []);
}

export async function fetchOrderRefundFields(orderId) {
	const r = await db.executeProcedure('GetOrderRefundFields', { OrderId: orderId });
	const row = r.recordset?.[0];
	if (!row) return {};
	return {
		DeliveredAt: pickCol(row, 'DeliveredAt'),
		RefundStatus: pickCol(row, 'RefundStatus'),
	};
}

export async function setOrderDeliveredTimestamp(orderId) {
	await db.executeProcedure('SetOrderDeliveredTimestamp', { OrderId: orderId });
}
