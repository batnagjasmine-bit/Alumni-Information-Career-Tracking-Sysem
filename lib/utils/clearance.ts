// lib/utils/clearance.ts

export type ClearanceStatus = "PENDING" | "SUBMITTED" | "CLEARED" | "REJECTED";

export interface AlumniProfileCompletenessInput {
  first_name?: string | null;
  firstName?: string | null;
  last_name?: string | null;
  lastName?: string | null;
  full_name?: string | null;
  fullName?: string | null;
  student_id?: string | null;
  studentIdNumber?: string | null;
  student_id_number?: string | null;
  studentId?: string | null;
  course?: string | null;
  batch_year?: number | string | null;
  batchYear?: number | string | null;
  graduation_year?: number | string | null;
  graduationYear?: number | string | null;
  phone?: string | null;
  contact_number?: string | null;
  contactNumber?: string | null;
  mobile?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  bio?: string | null;
  linkedin_url?: string | null;
  linkedinUrl?: string | null;
  email?: string | null;
  employment_status?: string | null;
  employmentStatus?: string | null;
  career_status?: string | null;
  careerStatus?: string | null;
  career_records?: unknown[] | null;
  careerRecords?: unknown[] | null;
  profile?: {
    first_name?: string | null;
    firstName?: string | null;
    last_name?: string | null;
    lastName?: string | null;
    full_name?: string | null;
    fullName?: string | null;
    email?: string | null;
    phone?: string | null;
    contact_number?: string | null;
    contactNumber?: string | null;
    [key: string]: unknown;
  } | null;
  alumni?: {
    student_id?: string | null;
    studentIdNumber?: string | null;
    student_id_number?: string | null;
    studentId?: string | null;
    course?: string | null;
    batch_year?: number | string | null;
    batchYear?: number | string | null;
    graduation_year?: number | string | null;
    graduationYear?: number | string | null;
    address?: string | null;
    city?: string | null;
    province?: string | null;
    bio?: string | null;
    linkedin_url?: string | null;
    linkedinUrl?: string | null;
    career_records?: unknown[] | null;
    careerRecords?: unknown[] | null;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

export interface AlumniCompletenessResult {
  percentage: number;
  missingFields: string[];
  isComplete: boolean;
}

export const CLEARANCE_GRADUATION_FIELDS = [
  "first name",
  "last name",
  "studentIdNumber",
  "course",
  "batch/graduation year",
  "contact number",
  "province/address",
  "bio/linkedin or email",
  "current employment/career status",
] as const;

/**
 * Pure function to calculate alumni profile completeness for mandatory graduation clearance.
 * Checks all required graduation fields:
 * - first name
 * - last name
 * - studentIdNumber
 * - course
 * - batch/graduation year
 * - contact number
 * - province/address
 * - bio/linkedin or email
 * - current employment/career status
 *
 * @param profile Alumni and profile record (flat or nested)
 * @param careerRecordsCount Count of career records owned by the alumni
 * @returns { percentage: number, missingFields: string[], isComplete: boolean }
 */
export function calculateAlumniCompleteness(
  profile?: AlumniProfileCompletenessInput | null,
  careerRecordsCount = 0
): AlumniCompletenessResult {
  const missingFields: string[] = [];

  if (!profile) {
    return {
      percentage: 0,
      missingFields: [...CLEARANCE_GRADUATION_FIELDS],
      isComplete: false,
    };
  }

  // 1. Full name breakdown for first and last name
  const rawFullName =
    profile.full_name ??
    profile.fullName ??
    profile.profile?.full_name ??
    profile.profile?.fullName;

  const fullNameTrimmed =
    typeof rawFullName === "string" ? rawFullName.trim() : "";
  const nameParts = fullNameTrimmed ? fullNameTrimmed.split(/\s+/) : [];

  // First Name
  const rawFirstName =
    profile.first_name ??
    profile.firstName ??
    profile.profile?.first_name ??
    profile.profile?.firstName;

  const hasFirstName =
    (typeof rawFirstName === "string" && rawFirstName.trim().length > 0) ||
    nameParts.length >= 1;

  if (!hasFirstName) {
    missingFields.push("first name");
  }

  // Last Name
  const rawLastName =
    profile.last_name ??
    profile.lastName ??
    profile.profile?.last_name ??
    profile.profile?.lastName;

  const hasLastName =
    (typeof rawLastName === "string" && rawLastName.trim().length > 0) ||
    nameParts.length >= 2;

  if (!hasLastName) {
    missingFields.push("last name");
  }

  // 2. studentIdNumber (supports studentIdNumber, student_id_number, student_id, studentId)
  const studentId =
    profile.studentIdNumber ??
    profile.student_id_number ??
    profile.student_id ??
    profile.studentId ??
    profile.alumni?.studentIdNumber ??
    profile.alumni?.student_id_number ??
    profile.alumni?.student_id ??
    profile.alumni?.studentId;

  const hasStudentIdNumber =
    typeof studentId === "string" && studentId.trim().length > 0;

  if (!hasStudentIdNumber) {
    missingFields.push("studentIdNumber");
  }

  // 3. course
  const course = profile.course ?? profile.alumni?.course;
  const hasCourse = typeof course === "string" && course.trim().length > 0;

  if (!hasCourse) {
    missingFields.push("course");
  }

  // 4. batch/graduation year
  const batchYear =
    profile.batch_year ??
    profile.batchYear ??
    profile.alumni?.batch_year ??
    profile.alumni?.batchYear;

  const graduationYear =
    profile.graduation_year ??
    profile.graduationYear ??
    profile.alumni?.graduation_year ??
    profile.alumni?.graduationYear;

  const hasBatchOrGradYear =
    (typeof batchYear === "number" && batchYear > 0) ||
    (typeof batchYear === "string" && batchYear.trim().length > 0) ||
    (typeof graduationYear === "number" && graduationYear > 0) ||
    (typeof graduationYear === "string" && graduationYear.trim().length > 0);

  if (!hasBatchOrGradYear) {
    missingFields.push("batch/graduation year");
  }

  // 5. contact number
  const contact =
    profile.phone ??
    profile.contact_number ??
    profile.contactNumber ??
    profile.mobile ??
    profile.profile?.phone ??
    profile.profile?.contact_number ??
    profile.profile?.contactNumber;

  const hasContactNumber =
    typeof contact === "string" && contact.trim().length > 0;

  if (!hasContactNumber) {
    missingFields.push("contact number");
  }

  // 6. province/address
  const province = profile.province ?? profile.alumni?.province;
  const address = profile.address ?? profile.alumni?.address;
  const city = profile.city ?? profile.alumni?.city;

  const hasProvinceOrAddress =
    (typeof province === "string" && province.trim().length > 0) ||
    (typeof address === "string" && address.trim().length > 0) ||
    (typeof city === "string" && city.trim().length > 0);

  if (!hasProvinceOrAddress) {
    missingFields.push("province/address");
  }

  // 7. bio/linkedin or email
  const bio = profile.bio ?? profile.alumni?.bio;
  const linkedin =
    profile.linkedin_url ??
    profile.linkedinUrl ??
    profile.alumni?.linkedin_url ??
    profile.alumni?.linkedinUrl;
  const email = profile.email ?? profile.profile?.email;

  const hasBioLinkedinOrEmail =
    (typeof bio === "string" && bio.trim().length > 0) ||
    (typeof linkedin === "string" && linkedin.trim().length > 0) ||
    (typeof email === "string" && email.trim().length > 0);

  if (!hasBioLinkedinOrEmail) {
    missingFields.push("bio/linkedin or email");
  }

  // 8. current employment/career status
  const totalCareerRecords =
    typeof careerRecordsCount === "number" && careerRecordsCount > 0
      ? careerRecordsCount
      : Array.isArray(profile.career_records)
      ? profile.career_records.length
      : Array.isArray(profile.careerRecords)
      ? profile.careerRecords.length
      : Array.isArray(profile.alumni?.career_records)
      ? (profile.alumni?.career_records?.length ?? 0)
      : Array.isArray(profile.alumni?.careerRecords)
      ? (profile.alumni?.careerRecords?.length ?? 0)
      : 0;

  const employmentStatus =
    profile.employment_status ??
    profile.employmentStatus ??
    profile.career_status ??
    profile.careerStatus;

  const hasCareerStatus =
    totalCareerRecords > 0 ||
    (typeof employmentStatus === "string" &&
      employmentStatus.trim().length > 0);

  if (!hasCareerStatus) {
    missingFields.push("current employment/career status");
  }

  const totalRequired = CLEARANCE_GRADUATION_FIELDS.length;
  const passedCount = totalRequired - missingFields.length;
  const percentage = Math.round((passedCount / totalRequired) * 100);
  const isComplete = missingFields.length === 0;

  return {
    percentage,
    missingFields,
    isComplete,
  };
}
