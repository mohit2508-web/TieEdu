-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('SUPER_ADMIN', 'OPS', 'CONTENT_ADMIN');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'PARENT');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('STARTER', 'BASIC', 'PRO', 'PREMIUM');

-- CreateEnum
CREATE TYPE "SchoolStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'GRADUATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('LOGIN', 'PARENT_CONSENT', 'PAYMENT');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CourseLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "LessonKind" AS ENUM ('VIDEO', 'TEXT', 'QUIZ', 'ACTIVITY', 'PROJECT');

-- CreateEnum
CREATE TYPE "SchoolCourseStatus" AS ENUM ('ENABLED', 'DISABLED');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DROPPED');

-- CreateEnum
CREATE TYPE "LessonProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('AI_SEMINAR', 'WORKSHOP', 'TRAINER_VISIT');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "School" (
    "id" STRING NOT NULL,
    "code" STRING NOT NULL,
    "name" STRING NOT NULL,
    "shortName" STRING,
    "board" STRING,
    "city" STRING,
    "state" STRING,
    "plan" "Plan" NOT NULL DEFAULT 'STARTER',
    "status" "SchoolStatus" NOT NULL DEFAULT 'ACTIVE',
    "logoUrl" STRING,
    "brandColor" STRING,
    "referralCode" STRING NOT NULL,
    "referredByCode" STRING,
    "trialEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" STRING NOT NULL,
    "email" STRING,
    "phone" STRING,
    "name" STRING NOT NULL,
    "passwordHash" STRING,
    "role" "PlatformRole",
    "disabled" BOOL NOT NULL DEFAULT false,
    "locale" STRING NOT NULL DEFAULT 'en',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" STRING NOT NULL,
    "schoolId" STRING NOT NULL,
    "userId" STRING NOT NULL,
    "role" "MemberRole" NOT NULL,
    "classLevel" STRING,
    "section" STRING,
    "rollNo" STRING,
    "pinHash" STRING,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" STRING NOT NULL,
    "userId" STRING NOT NULL,
    "tokenHash" STRING NOT NULL,
    "userAgent" STRING,
    "ip" STRING,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" STRING NOT NULL,
    "phone" STRING NOT NULL,
    "codeHash" STRING NOT NULL,
    "purpose" "OtpPurpose" NOT NULL DEFAULT 'LOGIN',
    "attempts" INT4 NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentConsent" (
    "id" STRING NOT NULL,
    "schoolId" STRING NOT NULL,
    "subjectUserId" STRING NOT NULL,
    "parentUserId" STRING NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ParentConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notice" (
    "id" STRING NOT NULL,
    "schoolId" STRING NOT NULL,
    "title" STRING NOT NULL,
    "body" STRING NOT NULL,
    "kind" STRING NOT NULL DEFAULT 'general',
    "pinned" BOOL NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillTrack" (
    "id" STRING NOT NULL,
    "slug" STRING NOT NULL,
    "name" STRING NOT NULL,
    "description" STRING,
    "icon" STRING,
    "color" STRING,
    "sortOrder" INT4 NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" STRING NOT NULL,
    "slug" STRING NOT NULL,
    "title" STRING NOT NULL,
    "summary" STRING,
    "description" STRING,
    "skillTrackId" STRING NOT NULL,
    "level" "CourseLevel" NOT NULL DEFAULT 'BEGINNER',
    "gradeMin" INT4 NOT NULL DEFAULT 3,
    "gradeMax" INT4 NOT NULL DEFAULT 12,
    "durationMins" INT4 NOT NULL DEFAULT 0,
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "heroImageUrl" STRING,
    "outcomes" STRING[],
    "tags" STRING[],
    "version" INT4 NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3),
    "createdById" STRING,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" STRING NOT NULL,
    "courseId" STRING NOT NULL,
    "title" STRING NOT NULL,
    "summary" STRING,
    "sortOrder" INT4 NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" STRING NOT NULL,
    "moduleId" STRING NOT NULL,
    "title" STRING NOT NULL,
    "summary" STRING,
    "kind" "LessonKind" NOT NULL DEFAULT 'TEXT',
    "durationMins" INT4 NOT NULL DEFAULT 0,
    "sortOrder" INT4 NOT NULL DEFAULT 0,
    "contentUrl" STRING,
    "contentBody" STRING,
    "isPreview" BOOL NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolCourse" (
    "id" STRING NOT NULL,
    "schoolId" STRING NOT NULL,
    "courseId" STRING NOT NULL,
    "status" "SchoolCourseStatus" NOT NULL DEFAULT 'ENABLED',
    "note" STRING,
    "addedById" STRING,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" STRING NOT NULL,
    "schoolId" STRING NOT NULL,
    "courseId" STRING NOT NULL,
    "userId" STRING NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "progressPct" INT4 NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonProgress" (
    "id" STRING NOT NULL,
    "schoolId" STRING NOT NULL,
    "enrollmentId" STRING NOT NULL,
    "lessonId" STRING NOT NULL,
    "status" "LessonProgressStatus" NOT NULL DEFAULT 'COMPLETED',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" STRING NOT NULL,
    "lessonId" STRING NOT NULL,
    "passingScore" INT4 NOT NULL DEFAULT 60,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" STRING NOT NULL,
    "quizId" STRING NOT NULL,
    "prompt" STRING NOT NULL,
    "sortOrder" INT4 NOT NULL DEFAULT 0,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizOption" (
    "id" STRING NOT NULL,
    "questionId" STRING NOT NULL,
    "text" STRING NOT NULL,
    "isCorrect" BOOL NOT NULL DEFAULT false,
    "sortOrder" INT4 NOT NULL DEFAULT 0,

    CONSTRAINT "QuizOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" STRING NOT NULL,
    "schoolId" STRING NOT NULL,
    "enrollmentId" STRING NOT NULL,
    "quizId" STRING NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'SUBMITTED',
    "score" INT4 NOT NULL DEFAULT 0,
    "passed" BOOL NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAnswer" (
    "id" STRING NOT NULL,
    "attemptId" STRING NOT NULL,
    "questionId" STRING NOT NULL,
    "optionId" STRING NOT NULL,
    "isCorrect" BOOL NOT NULL,

    CONSTRAINT "QuizAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherCourseAssignment" (
    "id" STRING NOT NULL,
    "schoolId" STRING NOT NULL,
    "courseId" STRING NOT NULL,
    "userId" STRING NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherCourseAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" STRING NOT NULL,
    "schoolId" STRING NOT NULL,
    "number" STRING NOT NULL,
    "amountPaise" INT4 NOT NULL,
    "currency" STRING NOT NULL DEFAULT 'INR',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'OPEN',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "notes" STRING,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" STRING NOT NULL,
    "schoolId" STRING NOT NULL,
    "type" "BookingType" NOT NULL DEFAULT 'AI_SEMINAR',
    "title" STRING NOT NULL,
    "preferredAt" TIMESTAMP(3) NOT NULL,
    "mode" STRING NOT NULL DEFAULT 'ONLINE',
    "participants" INT4 NOT NULL DEFAULT 0,
    "status" "BookingStatus" NOT NULL DEFAULT 'REQUESTED',
    "notes" STRING,
    "requestedById" STRING,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" STRING NOT NULL,
    "schoolId" STRING NOT NULL,
    "courseId" STRING NOT NULL,
    "userId" STRING NOT NULL,
    "serial" STRING NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" STRING NOT NULL,
    "actorUserId" STRING,
    "schoolId" STRING,
    "action" STRING NOT NULL,
    "targetType" STRING,
    "targetId" STRING,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Unlock tables before building indexes / foreign keys.
-- CockroachDB (this cluster) creates tables WITH (schema_locked = true) by
-- default, which forbids the subsequent schema changes. Unlock them here.
ALTER TABLE "AuditLog" SET (schema_locked = false);
ALTER TABLE "Booking" SET (schema_locked = false);
ALTER TABLE "Certificate" SET (schema_locked = false);
ALTER TABLE "Course" SET (schema_locked = false);
ALTER TABLE "Enrollment" SET (schema_locked = false);
ALTER TABLE "Invoice" SET (schema_locked = false);
ALTER TABLE "Lesson" SET (schema_locked = false);
ALTER TABLE "LessonProgress" SET (schema_locked = false);
ALTER TABLE "Membership" SET (schema_locked = false);
ALTER TABLE "Module" SET (schema_locked = false);
ALTER TABLE "Notice" SET (schema_locked = false);
ALTER TABLE "OtpCode" SET (schema_locked = false);
ALTER TABLE "ParentConsent" SET (schema_locked = false);
ALTER TABLE "Quiz" SET (schema_locked = false);
ALTER TABLE "QuizAnswer" SET (schema_locked = false);
ALTER TABLE "QuizAttempt" SET (schema_locked = false);
ALTER TABLE "QuizOption" SET (schema_locked = false);
ALTER TABLE "QuizQuestion" SET (schema_locked = false);
ALTER TABLE "School" SET (schema_locked = false);
ALTER TABLE "SchoolCourse" SET (schema_locked = false);
ALTER TABLE "Session" SET (schema_locked = false);
ALTER TABLE "SkillTrack" SET (schema_locked = false);
ALTER TABLE "TeacherCourseAssignment" SET (schema_locked = false);
ALTER TABLE "User" SET (schema_locked = false);

-- CreateIndex
CREATE UNIQUE INDEX "School_code_key" ON "School"("code");

-- CreateIndex
CREATE UNIQUE INDEX "School_referralCode_key" ON "School"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Membership_schoolId_classLevel_section_idx" ON "Membership"("schoolId", "classLevel", "section");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_schoolId_userId_key" ON "Membership"("schoolId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_schoolId_rollNo_key" ON "Membership"("schoolId", "rollNo");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "OtpCode_phone_purpose_idx" ON "OtpCode"("phone", "purpose");

-- CreateIndex
CREATE INDEX "ParentConsent_schoolId_idx" ON "ParentConsent"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentConsent_schoolId_subjectUserId_parentUserId_key" ON "ParentConsent"("schoolId", "subjectUserId", "parentUserId");

-- CreateIndex
CREATE INDEX "Notice_schoolId_pinned_publishedAt_idx" ON "Notice"("schoolId", "pinned", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SkillTrack_slug_key" ON "SkillTrack"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");

-- CreateIndex
CREATE INDEX "Course_status_skillTrackId_idx" ON "Course"("status", "skillTrackId");

-- CreateIndex
CREATE INDEX "Course_gradeMin_gradeMax_idx" ON "Course"("gradeMin", "gradeMax");

-- CreateIndex
CREATE INDEX "Module_courseId_sortOrder_idx" ON "Module"("courseId", "sortOrder");

-- CreateIndex
CREATE INDEX "Lesson_moduleId_sortOrder_idx" ON "Lesson"("moduleId", "sortOrder");

-- CreateIndex
CREATE INDEX "SchoolCourse_schoolId_status_idx" ON "SchoolCourse"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolCourse_schoolId_courseId_key" ON "SchoolCourse"("schoolId", "courseId");

-- CreateIndex
CREATE INDEX "Enrollment_schoolId_userId_status_idx" ON "Enrollment"("schoolId", "userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_schoolId_courseId_userId_key" ON "Enrollment"("schoolId", "courseId", "userId");

-- CreateIndex
CREATE INDEX "LessonProgress_schoolId_enrollmentId_idx" ON "LessonProgress"("schoolId", "enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonProgress_enrollmentId_lessonId_key" ON "LessonProgress"("enrollmentId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "Quiz_lessonId_key" ON "Quiz"("lessonId");

-- CreateIndex
CREATE INDEX "QuizQuestion_quizId_sortOrder_idx" ON "QuizQuestion"("quizId", "sortOrder");

-- CreateIndex
CREATE INDEX "QuizOption_questionId_sortOrder_idx" ON "QuizOption"("questionId", "sortOrder");

-- CreateIndex
CREATE INDEX "QuizAttempt_schoolId_enrollmentId_quizId_idx" ON "QuizAttempt"("schoolId", "enrollmentId", "quizId");

-- CreateIndex
CREATE INDEX "QuizAnswer_attemptId_idx" ON "QuizAnswer"("attemptId");

-- CreateIndex
CREATE INDEX "TeacherCourseAssignment_schoolId_userId_idx" ON "TeacherCourseAssignment"("schoolId", "userId");

-- CreateIndex
CREATE INDEX "TeacherCourseAssignment_schoolId_courseId_idx" ON "TeacherCourseAssignment"("schoolId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherCourseAssignment_schoolId_courseId_userId_key" ON "TeacherCourseAssignment"("schoolId", "courseId", "userId");

-- CreateIndex
CREATE INDEX "Invoice_schoolId_status_idx" ON "Invoice"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_schoolId_number_key" ON "Invoice"("schoolId", "number");

-- CreateIndex
CREATE INDEX "Booking_schoolId_status_idx" ON "Booking"("schoolId", "status");

-- CreateIndex
CREATE INDEX "Booking_preferredAt_idx" ON "Booking"("preferredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_serial_key" ON "Certificate"("serial");

-- CreateIndex
CREATE INDEX "Certificate_schoolId_userId_idx" ON "Certificate"("schoolId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_schoolId_courseId_userId_key" ON "Certificate"("schoolId", "courseId", "userId");

-- CreateIndex
CREATE INDEX "AuditLog_schoolId_createdAt_idx" ON "AuditLog"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentConsent" ADD CONSTRAINT "ParentConsent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentConsent" ADD CONSTRAINT "ParentConsent_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentConsent" ADD CONSTRAINT "ParentConsent_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_skillTrackId_fkey" FOREIGN KEY ("skillTrackId") REFERENCES "SkillTrack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolCourse" ADD CONSTRAINT "SchoolCourse_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolCourse" ADD CONSTRAINT "SchoolCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizOption" ADD CONSTRAINT "QuizOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherCourseAssignment" ADD CONSTRAINT "TeacherCourseAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherCourseAssignment" ADD CONSTRAINT "TeacherCourseAssignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherCourseAssignment" ADD CONSTRAINT "TeacherCourseAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
