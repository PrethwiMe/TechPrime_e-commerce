const Joi = require("joi");

const signupValidation = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(3).max(30).required(),

    email: Joi.string()
      .email()
      .message("Invalid email format")
      .required(),

    phone: Joi.string()
      .pattern(/^[6-9]\d{9}$/)
      .message("Phone must be a valid 10-digit Indian number")
      .required(),

    password: Joi.string()
      .pattern(new RegExp("^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[!@#$%^&*]).{8,}$"))
      .message(
        "Password must be at least 8 chars, include uppercase, lowercase, number & special char"
      )
      .required(),

    confirmPassword: Joi.ref("password"),
  });

  return schema.validate(data);
};

// Login
const loginValidation = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });

  return schema.validate(data);
};

// Address
const addressValidation = (data) => {
  const schema = Joi.object({
    fullName: Joi.string().min(3).max(50).required(),
    phone: Joi.string()
      .pattern(/^[6-9]\d{9}$/)
      .message("Invalid phone number")
      .required(),
    pincode: Joi.string()
      .pattern(/^\d{6}$/)
      .message("Pincode must be a 6-digit number")
      .required(),
    state: Joi.string().required(),
    city: Joi.string().required(),
    line1: Joi.string().required(),
  });
               
  return schema.validate(data);
};

/* =====================
   CHECKOUT VALIDATIONS
   ===================== */
const checkoutValidation = (data) => {
  const schema = Joi.object({
    selectedAddress: Joi.string()
      .guid({ version: ["uuidv4", "uuidv5"] })
      .message("Invalid address ID format")
      .required(),

    paymentMethod: Joi.string()
      .valid("COD", "Online", "Wallet", "creditCard", "debitCard", "netBanking", "upi")
      .required(),

    couponCode: Joi.string()
      .allow("")
      .pattern(/^[A-Z0-9]{0,10}$/)
      .message("Coupon code must be up to 10 chars (A-Z, 0-9 only)"),

    fullName: Joi.string().min(3).max(50).required(),

    phone: Joi.string()
      .pattern(/^[6-9]\d{9}$/)
      .message("Phone must be a valid 10-digit Indian number")
      .required(),

    line1: Joi.string().min(3).max(100).required(),
    city: Joi.string().min(2).max(50).required(),
    state: Joi.string().min(2).max(50).required(),

    pincode: Joi.string()
      .pattern(/^\d{6}$/)
      .message("Pincode must be a valid 6-digit number")
      .required(),
  });

  return schema.validate(data);
};


/* =====================
   PRODUCT VALIDATIONS
   ===================== */
const productValidation = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(1000).required(),
    price: Joi.number().positive().precision(2).required(),
    stock: Joi.number().integer().min(0).required(),
    categoryId: Joi.string().required(),
    brand: Joi.string().allow(""),
    images: Joi.array().min(3).required(),
  });

  return schema.validate(data);
};

/* =====================
   CATEGORY VALIDATIONS
   ===================== */
const categoryValidation = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    description: Joi.string().max(200).allow(""),
    status: Joi.boolean().default(true),
  });

  return schema.validate(data);
};


const couponValidation = (data) => {
 
  const schema = Joi.object({
  id: Joi.string().optional().messages({
      "string.base": "Coupon ID must be a string"
    }),
    code: Joi.string()
      .pattern(/^[A-Z0-9]{5,10}$/)
      .required()
      .messages({
        "string.pattern.base": "Coupon code must be 5–10 chars (A-Z, 0-9 only)",
        "any.required": "Coupon code is required"
      }),

    discount: Joi.number()
      .positive()
      .min(1)
      .max(100)
      .required()
      .messages({
        "number.base": "Discount must be a number",
        "number.min": "Discount must be at least 1",
        "number.max": "Discount cannot exceed 100",
        "any.required": "Discount is required"
      }),

    minPurchase: Joi.number()
      .positive()
      .default(0)
      .messages({
        "number.base": "Minimum purchase must be a number",
        "number.min": "Minimum purchase must be positive"
      }),

    validFrom: Joi.date()
      .iso()
      .required()
      .custom((value, helpers) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const inputDate = new Date(value);
        inputDate.setHours(0, 0, 0, 0);
        if (inputDate < today) return helpers.error("date.less");
        return value;
      })
      .messages({
        "date.less": "Valid From must be today or a future date",
        "any.required": "Valid From is required",
      }),

    validUntil: Joi.date()
      .iso()
      .required()
      .custom((value, helpers) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const inputDate = new Date(value);
        inputDate.setHours(0, 0, 0, 0);
        if (inputDate < today) return helpers.error("date.less");
        return value;
      })
      .greater(Joi.ref("validFrom"))
      .messages({
        "date.less": "Valid Until must be today or a future date",
        "date.greater": "Valid Until must be after Valid From",
        "any.required": "Valid Until is required",
      }),

    isActive: Joi.boolean().default(true),
  });

  return schema.validate(data, { abortEarly: false });
};



/* =====================
   ORDER VALIDATIONS
   ===================== */
const orderValidation = (data) => {
  const schema = Joi.object({
    userId: Joi.string().required(),
    items: Joi.array()
      .items(
        Joi.object({
          productId: Joi.string().required(),
          quantity: Joi.number().integer().min(1).required(),
        })
      )
      .min(1)
      .required(),
    selectedAddress: Joi.string().required(),
    paymentMethod: Joi.string().valid("COD", "Online", "Wallet", "creditCard", "debitCard", "upi", "netBanking").required(),
    totalAmount: Joi.number().positive().required(),
  });

  return schema.validate(data);
};


const variantSchema = Joi.object({
  processor: Joi.string().trim().required(),
  ram: Joi.string().trim().required(),
  storage: Joi.string().trim().required(),
  graphics: Joi.string().trim().required(),
  color: Joi.string().trim().required(),
  display: Joi.string().trim().required(),
  price: Joi.number().positive().required(),
  stock: Joi.number().integer().min(0).required(),
});

/* =====================
   PAYMENT VALIDATIONS
   ===================== */
const paymentValidation = (data) => {
  const schema = Joi.object({
    orderId: Joi.string().required(),
    amount: Joi.number().positive().required(),
    method: Joi.string().valid("COD", "Online", "Wallet").required(),
    status: Joi.string().valid("pending", "paid", "failed").default("pending"),
  });

  return schema.validate(data);
};
/* =====================
   USER PROFILE VALIDATION
   ===================== */
const userProfileValidation = (data) => {
  const schema = Joi.object({
    id: Joi.string().optional(),  // changed to optional

    firstName: Joi.string()
      .min(2)
      .max(30)
      .optional()
      .messages({
        "string.min": "First name must have at least 2 characters",
      }),

    lastName: Joi.string()
      .min(2)
      .max(30)
      .optional()
      .messages({
        "string.min": "Last name must have at least 2 characters",
      }),

    phone: Joi.string()
      .pattern(/^[6-9]\d{9}$/)
      .message("Phone must be a valid 10-digit Indian number")
      .optional(),
  });

  return schema.validate(data, { abortEarly: false }); // show all errors at once
};


/* =====================
   OFFER VALIDATION
   ===================== */
const offerValidation = (data) => {
  const schema = Joi.object({
    appliesTo: Joi.string()
      .valid("product", "category")   // ✅ correct
      .required()
      .messages({
        "any.only": "Offer must apply either to 'product' or 'category'",
        "any.required": "appliesTo field is required"
      }),

    productId: Joi.when("appliesTo", {
      is: "product",
      then: Joi.string().length(24).required().messages({
        "any.required": "Product ID is required when appliesTo is 'product'",
        "string.length": "Product ID must be a valid 24-character ObjectId"
      }),
      otherwise: Joi.forbidden()
    }),

    categoryId: Joi.when("appliesTo", {
      is: "category",   
      then: Joi.string().length(24).required().messages({
        "any.required": "Category ID is required when appliesTo is 'category'",
        "string.length": "Category ID must be a valid 24-character ObjectId"
      }),
      otherwise: Joi.forbidden()
    }),

    offerValue: Joi.number()
      .min(1)
      .required()
      .messages({
        "number.base": "Offer value must be a number",
        "number.min": "Offer value must be at least 1",
        "any.required": "Offer value is required"
      }),

    startDate: Joi.date().iso().required().messages({
      "date.format": "Start date must be a valid ISO date (YYYY-MM-DD)",
      "any.required": "Start date is required"
    }),

    endDate: Joi.date().iso().greater(Joi.ref("startDate")).required().messages({
      "date.format": "End date must be a valid ISO date (YYYY-MM-DD)",
      "date.greater": "End date must be greater than start date",
      "any.required": "End date is required"
    })
  });

  return schema.validate(data, { abortEarly: false });
};


module.exports = {
  signupValidation,
  loginValidation,
  addressValidation,
  checkoutValidation, 
  productValidation,
  categoryValidation,
  couponValidation,
  orderValidation,
  paymentValidation,
  userProfileValidation,
  offerValidation
};
