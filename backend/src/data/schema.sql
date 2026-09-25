-- TieEdu Platform Production PostgreSQL Database DDL Schema Specification (v3)
-- Fully optimized for PgBouncer pooling & read-replica scaling

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    college_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'candidate', -- 'candidate', 'admin', 'tpo'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Companies Directory
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    industry VARCHAR(150),
    difficulty_rating INT CHECK (difficulty_rating BETWEEN 1 AND 5),
    avg_process_days INT,
    avg_rounds INT,
    ctc_min NUMERIC(5,2),
    ctc_max NUMERIC(5,2),
    unlock_count INT DEFAULT 0,
    accuracy_score INT DEFAULT 94,
    status VARCHAR(50) DEFAULT 'published',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Company Tags
CREATE TABLE company_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    tag_name VARCHAR(100) NOT NULL
);

-- 4. Content Modules (Hiring Rounds)
CREATE TABLE content_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    module_type VARCHAR(50) NOT NULL, -- 'technical_question', 'hr_behavioural', 'system_design'
    title VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 1,
    is_premium BOOLEAN DEFAULT true
);

-- 5. Content Items (Q&A Entities)
CREATE TABLE content_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID REFERENCES content_modules(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    is_free_preview BOOLEAN DEFAULT false,
    difficulty VARCHAR(50) DEFAULT 'medium',
    role_tag VARCHAR(100),
    frequency_tag VARCHAR(50) DEFAULT 'high',
    status VARCHAR(50) DEFAULT 'published'
);

-- 6. Content Blocks (Notion Engine Payloads)
CREATE TABLE content_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
    block_type VARCHAR(50) NOT NULL, -- 'markdown', 'code', 'diagram', 'callout'
    block_order INT NOT NULL,
    payload JSONB NOT NULL
);

-- 7. Orders (Razorpay Orders)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    razorpay_order_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(50) DEFAULT 'created',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Transactions (HMAC Webhooks)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    payment_id VARCHAR(255) UNIQUE NOT NULL,
    signature VARCHAR(512) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'captured',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. User Unlocks
CREATE TABLE user_unlocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    company_id UUID REFERENCES companies(id),
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    plan_tier VARCHAR(50) NOT NULL, -- 'pro_monthly', 'pro_quarterly', 'elite_pass'
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'active'
);

-- 11. Candidate Reports
CREATE TABLE candidate_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id),
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(150),
    accuracy_rating INT CHECK (accuracy_rating BETWEEN 1 AND 5),
    outcome VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending_review',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Report Rounds
CREATE TABLE report_rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES candidate_reports(id) ON DELETE CASCADE,
    round_name VARCHAR(150),
    summary TEXT,
    difficulty VARCHAR(50)
);

-- 13. User XP Logs
CREATE TABLE user_xp_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    xp_amount INT NOT NULL,
    action_type VARCHAR(100) NOT NULL, -- 'report_approved', 'daily_streak', 'quiz'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. User Streaks
CREATE TABLE user_streaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) UNIQUE,
    current_streak INT DEFAULT 1,
    longest_streak INT DEFAULT 1,
    last_active_date DATE DEFAULT CURRENT_DATE
);

-- 15. Leaderboard
CREATE TABLE leaderboard (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_name VARCHAR(255) NOT NULL,
    college_name VARCHAR(255),
    xp_total INT DEFAULT 0,
    streak_days INT DEFAULT 0,
    rank INT
);

-- 16. PDF Exports
CREATE TABLE pdf_exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id),
    candidate_email VARCHAR(255) NOT NULL,
    exported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. Campus Cohorts (B2B)
CREATE TABLE campus_cohorts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_name VARCHAR(255) NOT NULL,
    batch_year INT NOT NULL,
    total_students INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active'
);

-- 18. Campus Students
CREATE TABLE campus_students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cohort_id UUID REFERENCES campus_cohorts(id) ON DELETE CASCADE,
    student_email VARCHAR(255) NOT NULL,
    readiness_score INT DEFAULT 80
);

-- 19. Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 20. Coupons
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_percent INT DEFAULT 0,
    discount_flat NUMERIC(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- 21. Webhooks Log
CREATE TABLE webhooks_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 22. Content Revisions
CREATE TABLE content_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES content_items(id),
    revision_number INT NOT NULL,
    payload_snapshot JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
