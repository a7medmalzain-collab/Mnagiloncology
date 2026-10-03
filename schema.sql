-- مرجع للترحيل المستقبلي إلى PostgreSQL (Supabase / Netlify Database).
-- النسخة الحالية تخزن نفس الكيانات في Netlify Blobs.
create table doctors(id uuid primary key default gen_random_uuid(), name text not null, specialty text, bio text, active boolean default true);
create table patients(id uuid primary key default gen_random_uuid(), name text not null, phone text, age int, gender text, diagnosis text, notes text);
create table appointments(id text primary key, patient_id uuid references patients(id), doctor_id uuid references doctors(id), patient_name text not null, phone text not null, age int, visit_type text not null, date date not null, time time not null, status text default 'جديد', notes text, created timestamptz default now());
create table medications(id uuid primary key default gen_random_uuid(), name text not null, type text, use text, route text, notes text, availability text, public boolean default false);
create table treatment_protocols(id uuid primary key default gen_random_uuid(), name text not null, medication_id uuid references medications(id), details text, approved_by text, status text default 'مسودة');
create table follow_ups(id uuid primary key default gen_random_uuid(), patient_id uuid not null references patients(id) on delete cascade, last_visit date, next_visit date, tests text, plan text, notes text, status text default 'نشط');
create table services(id uuid primary key default gen_random_uuid(), title text not null, description text, active boolean default true);
create table faqs(id uuid primary key default gen_random_uuid(), question text not null, answer text not null, active boolean default true);
create table messages(id uuid primary key default gen_random_uuid(), name text not null, phone text, message text not null, status text default 'جديد');
