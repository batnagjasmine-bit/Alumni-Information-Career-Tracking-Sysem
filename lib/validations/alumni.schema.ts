// lib/validations/alumni.schema.ts
import { z } from "zod";

export const alumniProfileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().optional(),
  student_id: z.string().optional(),
  studentIdNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  bio: z.string().optional(),
  linkedin_url: z
    .string()
    .optional()
    .refine((v) => !v || /^https?:\/\/(www\.)?linkedin\.com\//.test(v), {
      message: "Must be a valid LinkedIn URL",
    }),
  major: z.string().optional(),
  is_profile_public: z.boolean().default(true),
  course: z.string().optional(),
  resume_url: z.string().optional(),
});

export type AlumniProfileInput = z.infer<typeof alumniProfileSchema>;

// Required schema for 100% graduation clearance validation
export const alumniClearanceSchema = z
  .object({
    studentIdNumber: z
      .string()
      .min(1, "Student ID Number is required for 100% clearance validation"),
    student_id: z.string().optional(),
    full_name: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(100),
    course: z.string().min(1, "Course is required for clearance"),
    phone: z.string().min(1, "Contact number is required for clearance"),
    batch_year: z.coerce.number().int().min(2000, "Valid batch year is required"),
    graduation_year: z.coerce
      .number()
      .int()
      .min(2004, "Valid graduation year is required"),
    address: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    linkedin_url: z
      .string()
      .optional()
      .refine((v) => !v || /^https?:\/\/(www\.)?linkedin\.com\//.test(v), {
        message: "Must be a valid LinkedIn URL",
      }),
    bio: z.string().optional(),
    email: z.string().email("Valid email is required").optional(),
    employment_status: z.string().optional(),
    major: z.string().optional(),
    is_profile_public: z.boolean().default(true),
    resume_url: z.string().optional(),
  })
  .refine(
    (d) => Boolean(d.province || d.address || d.city),
    {
      message: "Province or address is required for clearance",
      path: ["province"],
    }
  )
  .refine(
    (d) => Boolean(d.bio || d.linkedin_url || d.email),
    {
      message: "Bio, LinkedIn URL, or email is required for clearance",
      path: ["linkedin_url"],
    }
  );

export const clearanceValidationSchema = alumniClearanceSchema;

export type AlumniClearanceInput = z.infer<typeof alumniClearanceSchema>;
export type ClearanceValidationInput = z.infer<typeof clearanceValidationSchema>;

