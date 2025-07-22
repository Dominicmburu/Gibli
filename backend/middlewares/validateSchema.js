// const validateSchema = (schema) => (req, res, next) => {
// 	const { error } = schema.validate(req.body);
// 	if (error) {
// 		return res.status(400).json({ error: error.details[0].message });
// 	}
// 	next();
// };
const validateSchema = (schema) => (req, res, next) => {
	const { error } = schema.validate(req.body, { abortEarly: false });
	if (error) {
		const messages = error.details.map((detail) => detail.message);
		return res.status(400).json({ errors: messages });
	}
	next();
};

export default validateSchema;
