const { z } = require('zod');

function validate(schema) {
  return (req, res, next) => {
    const data = { body: req.body, params: req.params, query: req.query };
    const result = schema.safeParse(data);
    if (!result.success) {
      return res.status(422).json({ error: result.error.errors[0].message });
    }
    req.validated = result.data;
    next();
  };
}

const bookRideSchema = z.object({
  body: z.object({
    pickup_address: z.string().min(1),
    dropoff_address: z.string().min(1),
    pickup_time: z
      .string()
      .refine((v) => !isNaN(Date.parse(v)), 'pickup_time must be ISO')
      .refine(
        (v) => new Date(v).getTime() - Date.now() >= 7 * 24 * 60 * 60 * 1000,
        'pickup_time must be at least 7 days in the future',
      ),
    payment_type: z.enum(['insurance', 'card']),
  }),
});

const loginSchema = z.object({
  body: z
    .object({
      email: z.string().email(),
      password: z.string().min(8).optional(),
      otp: z.string().length(6).optional(),
    })
    .refine((v) => v.password || v.otp, {
      message: 'password or otp required',
    }),
});

const signupSchema = z.object({
  body: z.object({
    email: z.string().email(),
    phone: z.string().min(1),
    password: z.string().min(8),
    role: z.enum(['patient', 'driver']),
  }),
});

const ridesQuerySchema = z.object({
  query: z.object({
    status: z.string().optional(),
    driver_id: z.string().optional(),
    patient_id: z.string().optional(),
  }),
});

const idSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

const paymentCreateSchema = z.object({
  body: z.object({
    rideId: z.string().uuid(),
    amount: z.number().positive(),
    customerId: z.string().min(1),
  }),
});

const rideCancelSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

const insuranceClaimSchema = z.object({
  body: z.object({
    rideId: z.string().uuid(),
    fileName: z.string().min(1),
    file: z.string().min(1),
  }),
});

module.exports = {
  validate,
  bookRideSchema,
  loginSchema,
  signupSchema,
  ridesQuerySchema,
  idSchema,
  paymentCreateSchema,
  rideCancelSchema,
  insuranceClaimSchema,
};
