-- ============================================================================
-- DeshConnect InsForge Database Schema
-- Run this in the InsForge SQL editor or via the InsForge CLI
-- Project: desh-connect (qk8ksk3i.us-east)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. AUTHENTICATION TABLES (managed by InsForge Auth)
-- ============================================================================
-- InsForge manages auth.users automatically. We create a profiles table
-- that links to auth.users via id.

-- ============================================================================
-- 2. LOCATION TABLES
-- ============================================================================

CREATE TABLE divisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  capital text NOT NULL,
  districts_count integer NOT NULL DEFAULT 0,
  summary text,
  image text DEFAULT '/images/divisions/division.svg',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  division_id uuid NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
  summary text,
  image text DEFAULT '/images/districts/district.svg',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE upazilas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  district_id uuid NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  image text,
  summary text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 3. PROFILES (extends auth.users)
-- ============================================================================

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  avatar text,
  bio text,
  division_id uuid REFERENCES divisions(id),
  district_id uuid REFERENCES districts(id),
  upazila_id uuid REFERENCES upazilas(id),
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
  email_verified boolean DEFAULT false,
  terms_accepted_at timestamptz,
  blood_group text,
  gender text,
  date_of_birth date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 4. DIRECTORY TABLES (Places, Institutions, Businesses, Government Services)
-- ============================================================================

CREATE TABLE places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('heritage', 'beach', 'hill', 'forest', 'river', 'park', 'city')),
  summary text NOT NULL,
  description text NOT NULL,
  address text NOT NULL,
  latitude float8,
  longitude float8,
  image text NOT NULL,
  gallery text[] DEFAULT '{}',
  rating float4 DEFAULT 0,
  review_count integer DEFAULT 0,
  opening_hours text,
  entry_fee text,
  best_time text,
  verification text NOT NULL DEFAULT 'unverified' CHECK (verification IN ('unverified', 'verified', 'disputed')),
  source text,
  division_id uuid REFERENCES divisions(id),
  district_id uuid REFERENCES districts(id),
  upazila_id uuid REFERENCES upazilas(id),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'unpublished', 'archived')),
  last_checked_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('school', 'college', 'madrasah', 'hospital', 'health-centre')),
  description text NOT NULL,
  address text NOT NULL,
  phone text,
  email text,
  website text,
  emergency_phone text,
  latitude float8,
  longitude float8,
  image text NOT NULL,
  verification text NOT NULL DEFAULT 'unverified' CHECK (verification IN ('unverified', 'verified', 'disputed')),
  source text,
  division_id uuid REFERENCES divisions(id),
  district_id uuid REFERENCES districts(id),
  upazila_id uuid REFERENCES upazilas(id),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'unpublished', 'archived')),
  last_checked_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('hotel', 'restaurant', 'transport', 'shop', 'service', 'other')),
  description text NOT NULL,
  address text NOT NULL,
  phone text,
  website text,
  image text NOT NULL,
  verification text NOT NULL DEFAULT 'unverified' CHECK (verification IN ('unverified', 'verified', 'disputed')),
  division_id uuid REFERENCES divisions(id),
  district_id uuid REFERENCES districts(id),
  upazila_id uuid REFERENCES upazilas(id),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'unpublished', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE government_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('identity', 'land', 'health', 'education', 'transport', 'tax', 'other')),
  description text NOT NULL,
  office_address text NOT NULL,
  phone text,
  emergency_phone text,
  website text,
  hours text,
  required_documents text[] DEFAULT '{}',
  verification text NOT NULL DEFAULT 'unverified' CHECK (verification IN ('unverified', 'verified', 'disputed')),
  division_id uuid REFERENCES divisions(id),
  district_id uuid REFERENCES districts(id),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'unpublished', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 5. NEWS TABLE
-- ============================================================================

CREATE TABLE news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  excerpt text NOT NULL,
  body text NOT NULL,
  image text NOT NULL,
  category text NOT NULL CHECK (category IN ('national', 'district', 'health', 'education', 'sports', 'community')),
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source text,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'pending_review', 'rejected', 'draft', 'archived')),
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 6. REVIEWS TABLE
-- ============================================================================

CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden', 'deleted')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 7. COMMUNITY TABLES
-- ============================================================================

CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  image text,
  reactions integer DEFAULT 0,
  status text NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden', 'pending', 'deleted')),
  division_id uuid REFERENCES divisions(id),
  district_id uuid REFERENCES districts(id),
  upazila_id uuid REFERENCES upazilas(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden', 'deleted')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('post', 'place', 'news', 'blood_request', 'comment', 'review')),
  target_id uuid NOT NULL,
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'dismissed')),
  resolution text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('place')),
  target_id uuid NOT NULL,
  target_name text NOT NULL,
  submitted_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 8. BLOOD DONATION TABLES
-- ============================================================================

CREATE TABLE blood_donors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blood_group text NOT NULL,
  availability text NOT NULL DEFAULT 'available' CHECK (availability IN ('available', 'busy', 'unavailable')),
  preferred_contact text NOT NULL DEFAULT 'phone' CHECK (preferred_contact IN ('phone', 'sms', 'email', 'in-app')),
  contact_value text NOT NULL,
  last_donation_at date,
  donation_count integer DEFAULT 0,
  notes text,
  consent_listed boolean DEFAULT false,
  consent_contact boolean DEFAULT false,
  consent_expiry timestamptz NOT NULL,
  division_id uuid REFERENCES divisions(id),
  district_id uuid REFERENCES districts(id),
  upazila_id uuid REFERENCES upazilas(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE blood_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blood_group text NOT NULL,
  units integer NOT NULL CHECK (units BETWEEN 1 AND 20),
  patient text,
  hospital text NOT NULL,
  needed_by date NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'under_review' CHECK (status IN ('active', 'fulfilled', 'cancelled', 'expired', 'under_review')),
  division_id uuid REFERENCES divisions(id),
  district_id uuid REFERENCES districts(id),
  upazila_id uuid REFERENCES upazilas(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 9. SOCIAL & SAVED TABLES
-- ============================================================================

CREATE TABLE saved_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  place_id uuid NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, place_id)
);

CREATE TABLE connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('accepted', 'pending')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_ids uuid[] NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  read_by uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 10. NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  href text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 11. AUDIT LOGS TABLE
-- ============================================================================

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES profiles(id),
  actor_name text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text NOT NULL,
  outcome text NOT NULL,
  detail text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 12. INDEXES
-- ============================================================================

-- Profiles
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_division ON profiles(division_id);
CREATE INDEX idx_profiles_district ON profiles(district_id);

-- Places
CREATE INDEX idx_places_slug ON places(slug);
CREATE INDEX idx_places_category ON places(category);
CREATE INDEX idx_places_division ON places(division_id);
CREATE INDEX idx_places_district ON places(district_id);
CREATE INDEX idx_places_upazila ON places(upazila_id);
CREATE INDEX idx_places_status ON places(status);
CREATE INDEX idx_places_name ON places(name);

-- Institutions
CREATE INDEX idx_institutions_slug ON institutions(slug);
CREATE INDEX idx_institutions_category ON institutions(category);
CREATE INDEX idx_institutions_division ON institutions(division_id);
CREATE INDEX idx_institutions_district ON institutions(district_id);

-- Businesses
CREATE INDEX idx_businesses_slug ON businesses(slug);
CREATE INDEX idx_businesses_category ON businesses(category);
CREATE INDEX idx_businesses_division ON businesses(division_id);
CREATE INDEX idx_businesses_district ON businesses(district_id);

-- Government Services
CREATE INDEX idx_gov_services_slug ON government_services(slug);
CREATE INDEX idx_gov_services_category ON government_services(category);
CREATE INDEX idx_gov_services_division ON government_services(division_id);

-- News
CREATE INDEX idx_news_slug ON news(slug);
CREATE INDEX idx_news_category ON news(category);
CREATE INDEX idx_news_author ON news(author_id);
CREATE INDEX idx_news_status ON news(status);
CREATE INDEX idx_news_published_at ON news(published_at);

-- Reviews
CREATE INDEX idx_reviews_place ON reviews(place_id);
CREATE INDEX idx_reviews_author ON reviews(author_id);
CREATE INDEX idx_reviews_status ON reviews(status);

-- Posts
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_division ON posts(division_id);
CREATE INDEX idx_posts_district ON posts(district_id);

-- Comments
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_author ON comments(author_id);

-- Reports
CREATE INDEX idx_reports_target ON reports(target_type, target_id);
CREATE INDEX idx_reports_reporter ON reports(reporter_id);

-- Corrections
CREATE INDEX idx_corrections_target ON corrections(target_type, target_id);

-- Blood Donors
CREATE INDEX idx_blood_donors_user ON blood_donors(user_id);
CREATE INDEX idx_blood_donors_group ON blood_donors(blood_group);
CREATE INDEX idx_blood_donors_availability ON blood_donors(availability);
CREATE INDEX idx_blood_donors_consent ON blood_donors(consent_listed);
CREATE INDEX idx_blood_donors_division ON blood_donors(division_id);
CREATE INDEX idx_blood_donors_district ON blood_donors(district_id);

-- Blood Requests
CREATE INDEX idx_blood_requests_requester ON blood_requests(requester_id);
CREATE INDEX idx_blood_requests_group ON blood_requests(blood_group);
CREATE INDEX idx_blood_requests_status ON blood_requests(status);
CREATE INDEX idx_blood_requests_division ON blood_requests(division_id);
CREATE INDEX idx_blood_requests_district ON blood_requests(district_id);
CREATE INDEX idx_blood_requests_needed_by ON blood_requests(needed_by);

-- Saved Places
CREATE INDEX idx_saved_places_user ON saved_places(user_id);
CREATE INDEX idx_saved_places_place ON saved_places(place_id);

-- Connections
CREATE INDEX idx_connections_requester ON connections(requester_id);
CREATE INDEX idx_connections_addressee ON connections(addressee_id);
CREATE INDEX idx_connections_status ON connections(status);

-- Conversations
CREATE INDEX idx_conversations_updated ON conversations(updated_at);

-- Messages
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);

-- Audit Logs
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ============================================================================
-- 13. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE upazilas ENABLE ROW LEVEL SECURITY;
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY profiles_public_read ON profiles FOR SELECT USING (true);
CREATE POLICY profiles_update_own ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY profiles_insert_own ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Location tables - public read
CREATE POLICY divisions_public_read ON divisions FOR SELECT USING (true);
CREATE POLICY districts_public_read ON districts FOR SELECT USING (true);
CREATE POLICY upazilas_public_read ON upazilas FOR SELECT USING (true);

-- Directory tables - public read published, insert for authenticated
CREATE POLICY places_public_read ON places FOR SELECT USING (status = 'published');
CREATE POLICY places_insert_auth ON places FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY places_update_owner ON places FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND id = (
      SELECT author_id FROM places WHERE id = places.id)
    )
  )
);

CREATE POLICY institutions_public_read ON institutions FOR SELECT USING (status = 'published');
CREATE POLICY institutions_insert_auth ON institutions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY businesses_public_read ON businesses FOR SELECT USING (status = 'published');
CREATE POLICY businesses_insert_auth ON businesses FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY gov_services_public_read ON government_services FOR SELECT USING (status = 'published');
CREATE POLICY gov_services_insert_auth ON government_services FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- News policies
CREATE POLICY news_public_read ON news FOR SELECT USING (status = 'published');
CREATE POLICY news_insert_auth ON news FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY news_update_owner ON news FOR UPDATE USING (auth.uid() = author_id OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'moderator')));

-- Reviews policies
CREATE POLICY reviews_public_read ON reviews FOR SELECT USING (status = 'visible');
CREATE POLICY reviews_insert_auth ON reviews FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY reviews_update_owner ON reviews FOR UPDATE USING (auth.uid() = author_id);

-- Posts policies
CREATE POLICY posts_public_read ON posts FOR SELECT USING (status = 'visible');
CREATE POLICY posts_insert_auth ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY posts_update_owner ON posts FOR UPDATE USING (auth.uid() = author_id OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'moderator')));
CREATE POLICY posts_delete_owner ON posts FOR DELETE USING (auth.uid() = author_id OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'moderator')));

-- Comments policies
CREATE POLICY comments_public_read ON comments FOR SELECT USING (status = 'visible');
CREATE POLICY comments_insert_auth ON comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY comments_update_owner ON comments FOR UPDATE USING (auth.uid() = author_id OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'moderator')));

-- Reports policies
CREATE POLICY reports_read_own_or_staff ON reports FOR SELECT USING (
  auth.uid() = reporter_id OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'moderator'))
);
CREATE POLICY reports_insert_auth ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Corrections policies
CREATE POLICY corrections_read_own_or_staff ON corrections FOR SELECT USING (
  auth.uid() = submitted_id OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'moderator'))
);
CREATE POLICY corrections_insert_auth ON corrections FOR INSERT WITH CHECK (auth.uid() = submitted_id);

-- Blood Donors policies
CREATE POLICY blood_donors_public_read ON blood_donors FOR SELECT USING (consent_listed = true);
CREATE POLICY blood_donors_insert_auth ON blood_donors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY blood_donors_update_own ON blood_donors FOR UPDATE USING (auth.uid() = user_id);

-- Blood Requests policies
CREATE POLICY blood_requests_public_read ON blood_requests FOR SELECT USING (status = 'active');
CREATE POLICY blood_requests_insert_auth ON blood_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY blood_requests_update_owner ON blood_requests FOR UPDATE USING (auth.uid() = requester_id);

-- Saved Places policies
CREATE POLICY saved_places_read_own ON saved_places FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY saved_places_insert_own ON saved_places FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY saved_places_delete_own ON saved_places FOR DELETE USING (auth.uid() = user_id);

-- Connections policies
CREATE POLICY connections_read_own ON connections FOR SELECT USING (
  auth.uid() = requester_id OR auth.uid() = addressee_id
);
CREATE POLICY connections_insert_own ON connections FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Conversations policies
CREATE POLICY conversations_read_own ON conversations FOR SELECT USING (auth.uid() = ANY(participant_ids));

-- Messages policies
CREATE POLICY messages_read_own ON messages FOR SELECT USING (
  auth.uid() = ANY(SELECT participant_ids FROM conversations WHERE id = conversation_id)
);
CREATE POLICY messages_insert_auth ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND auth.uid() = ANY(SELECT participant_ids FROM conversations WHERE id = conversation_id)
);

-- Notifications policies
CREATE POLICY notifications_read_own ON notifications FOR SELECT USING (auth.uid() = user_id);

-- Audit logs - admin/moderator only
CREATE POLICY audit_logs_read_staff ON audit_logs FOR SELECT USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'moderator'))
);
CREATE POLICY audit_logs_insert_staff ON audit_logs FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'moderator'))
);

-- ============================================================================
-- 14. SEED DATA (optional - run manually if needed)
-- ============================================================================
-- Insert divisions
INSERT INTO divisions (slug, name, capital, districts_count, summary, image) VALUES
  ('dhaka', 'Dhaka', 'Dhaka', 13, 'Dhaka is one of the eight divisions of Bangladesh, with its divisional headquarters in Dhaka.', '/images/divisions/division.svg'),
  ('chattogram', 'Chattogram', 'Chattogram', 11, 'Chattogram is one of the eight divisions of Bangladesh, with its divisional headquarters in Chattogram.', '/images/divisions/division.svg'),
  ('rajshahi', 'Rajshahi', 'Rajshahi', 8, 'Rajshahi is one of the eight divisions of Bangladesh, with its divisional headquarters in Rajshahi.', '/images/divisions/division.svg'),
  ('khulna', 'Khulna', 'Khulna', 10, 'Khulna is one of the eight divisions of Bangladesh, with its divisional headquarters in Khulna.', '/images/divisions/division.svg'),
  ('barishal', 'Barishal', 'Barishal', 6, 'Barishal is one of the eight divisions of Bangladesh, with its divisional headquarters in Barishal.', '/images/divisions/division.svg'),
  ('sylhet', 'Sylhet', 'Sylhet', 4, 'Sylhet is one of the eight divisions of Bangladesh, with its divisional headquarters in Sylhet.', '/images/divisions/division.svg'),
  ('rangpur', 'Rangpur', 'Rangpur', 8, 'Rangpur is one of the eight divisions of Bangladesh, with its divisional headquarters in Rangpur.', '/images/divisions/division.svg'),
  ('mymensingh', 'Mymensingh', 'Mymensingh', 4, 'Mymensingh is one of the eight divisions of Bangladesh, with its divisional headquarters in Mymensingh.', '/images/divisions/division.svg');

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
