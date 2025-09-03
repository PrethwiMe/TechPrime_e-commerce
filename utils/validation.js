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
    street: Joi.string().required(),
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
    images: Joi.array().items(Joi.string().uri()).min(1).required(),
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

/* =====================
   COUPON VALIDATIONS
   ===================== */
const couponValidation = (data) => {
  const schema = Joi.object({
    code: Joi.string()
      .pattern(/^[A-Z0-9]{5,10}$/)
      .message("Coupon code must be 5–10 chars (A-Z, 0-9 only)")
      .required(),
    discountType: Joi.string().valid("percentage", "fixed").required(),
    discountValue: Joi.number().positive().required(),
    minPurchase: Joi.number().positive().default(0),
    expiryDate: Joi.date().greater("now").required(),
    isActive: Joi.boolean().default(true),
  });

  return schema.validate(data);
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
    addressId: Joi.string().required(),
    paymentMethod: Joi.string().valid("COD", "Online", "Wallet").required(),
    totalAmount: Joi.number().positive().required(),
  });

  return schema.validate(data);
};

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
   EXPORTS
   ===================== */
module.exports = {
  signupValidation,
  loginValidation,
  addressValidation,
  productValidation,
  categoryValidation,
  couponValidation,
  orderValidation,
  paymentValidation,
};
