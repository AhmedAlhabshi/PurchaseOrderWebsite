import { z } from "zod";

const email = z.string().trim().email("Enter a valid email address.").max(254).transform(v => v.toLowerCase());
const password = z.string().min(8, "Use at least 8 characters for your password.").max(128);
export const loginSchema = z.object({ email, password });
export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(1, "Your name is required.").max(100),
  phone: z.string().trim().min(7, "Enter your phone number.").max(30)
    .regex(/^[+\d\s().-]+$/, "Enter a valid phone number.")
    .refine(v => v.replace(/\D/g, "").length >= 7, "Enter a valid phone number."),
});
