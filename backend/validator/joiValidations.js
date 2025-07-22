import Joi from 'joi';

const passwordPattern = new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$');

export const registerUserSchema = Joi.object({
	Email: Joi.string().email().required().messages({
		'string.empty': 'Email is required',
		'string.email': 'Please enter a valid email address',
	}),
	Username: Joi.string().required().messages({
		'string.empty': 'Username is required',
		'any.required': 'Username is required',
	}),
	Password: Joi.string().required().messages({
		'string.empty': 'Password is required',
		'string.pattern.base':
			'Password must be at least 8 characters and include one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*)',
	}),
	// Password: Joi.string().pattern(passwordPattern).required().messages({
	// 	'string.empty': 'Password is required',
	// 	'string.pattern.base':
	// 		'Password must be at least 8 characters and include one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*)',
	// }),

	ConfirmPassword: Joi.any().valid(Joi.ref('Password')).required().messages({
		'any.only': 'Password and ConfirmPassword do not match',
		'any.required': 'Confirm Password is required',
	}),
});
export const registerSellerSchema = Joi.object({
	BusinessNumber: Joi.string().required().messages({
		'string.empty': 'BusinessNumber is required',
		'any.required': 'BusinessNumber is required',
	}),
	BusinessName: Joi.string().required().messages({
		'string.empty': 'BusinessName is required',
		'any.required': 'BusinessName is required',
	}),
	Country: Joi.string().required().messages({
		'string.empty': 'Country is required',
		'any.required': 'Country is required',
	}),
});

export const loginUserSchema = Joi.object({
	Email: Joi.string().email().required(),
	Password: Joi.string().required(),
});

export const productSchema = Joi.object({
	Name: Joi.string().required().messages({
		'string.empty': 'Product Name is required',
		'any.required': 'Product Name is required',
	}),
	ImageUrl: Joi.string().required().messages({
		'string.empty': 'ImageUrl is required',
		'any.required': 'ImageUrl is required',
	}),
	Price: Joi.number().required().messages({
		'number.base': 'Price must be a valid number',
		'any.required': 'Price is required',
	}),
	Description: Joi.string().required().messages({
		'string.empty': ' Description is required',
		'any.required': ' Description is required',
	}),
	Stock: Joi.number().required().messages({
		'number.base': 'Stock must be a valid number',
		'any.required': 'Stock  amount is required',
	}),
});

export const cartInsertionSchema = Joi.object({
	UserId: Joi.string().required(),
	ProductId: Joi.string().required(),
	//Quantity: Joi.number().required(),
});
