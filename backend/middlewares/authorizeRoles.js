export function authorizeRoles(...allowedRoles) {
	return (req, res, next) => {
		if (!allowedRoles.includes(req.user.role)) {
			return res.status(403).json({ message: 'Forbidden: Insufficient privileges' });
		}
		next();
	};
}

// app.post('/api/admin/stats', authenticate, authorizeRoles('admin'), handlerFunction);
