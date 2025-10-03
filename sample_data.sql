-- Sample data for testing Student Documents feature
-- Run this in your Supabase SQL Editor to add test beneficiaries

-- Insert sample beneficiaries
INSERT INTO public.beneficiaries (
  name, date_of_birth, gender, disability_type, disability_percentage,
  guardian_name, guardian_phone, guardian_email, address, city, state, pincode,
  aadhaar_number, notes, created_at, updated_at
) VALUES 
(
  'Arjun Kumar', 
  '2010-05-15', 
  'male', 
  'physical', 
  75,
  'Ravi Kumar',
  '+91-9876543210',
  'ravi.kumar@example.com',
  '123 Gandhi Nagar',
  'Ahmedabad',
  'Gujarat',
  '380001',
  '1234-5678-9012',
  'Requires mobility assistance',
  NOW(),
  NOW()
),
(
  'Priya Sharma',
  '2012-08-22',
  'female',
  'visual',
  90,
  'Sunita Sharma',
  '+91-9876543211',
  'sunita.sharma@example.com',
  '456 Nehru Street',
  'Surat',
  'Gujarat',
  '395001',
  '2345-6789-0123',
  'Blind student with excellent academic performance',
  NOW(),
  NOW()
),
(
  'Rahul Patel',
  '2011-12-03',
  'male',
  'hearing',
  85,
  'Kiran Patel',
  '+91-9876543212',
  'kiran.patel@example.com',
  '789 Sardar Colony',
  'Vadodara',
  'Gujarat',
  '390001',
  '3456-7890-1234',
  'Uses sign language, very bright student',
  NOW(),
  NOW()
),
(
  'Meera Singh',
  '2009-03-18',
  'female',
  'intellectual',
  60,
  'Rajesh Singh',
  '+91-9876543213',
  'rajesh.singh@example.com',
  '321 Lotus Avenue',
  'Rajkot',
  'Gujarat',
  '360001',
  '4567-8901-2345',
  'Needs special educational support',
  NOW(),
  NOW()
);

-- Verify the data was inserted
SELECT id, name, disability_type, city, created_at 
FROM public.beneficiaries 
ORDER BY created_at DESC;