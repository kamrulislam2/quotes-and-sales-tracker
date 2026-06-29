-- Create Login Codes table
CREATE TABLE IF NOT EXISTS public.login_codes (
  login_id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.login_codes ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read login codes
DROP POLICY IF EXISTS "Allow authenticated to read login codes" ON public.login_codes;
CREATE POLICY "Allow authenticated to read login codes" ON public.login_codes
  FOR SELECT TO authenticated USING (true);

-- Allow admins to manage login codes
DROP POLICY IF EXISTS "Allow admins to manage login codes" ON public.login_codes;
CREATE POLICY "Allow admins to manage login codes" ON public.login_codes
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Seed initial login codes
INSERT INTO public.login_codes (login_id, code, name) VALUES
('SR616', 'i', 'Rifat boss'),
('Santu', 'd', NULL),
('Razib', 'h', NULL),
('Mithun', 't', NULL),
('SM1119', 'L', 'Soikot Mollik'),
('MD1019', 't', NULL),
('Riyad', 'y', NULL),
('JH', 'v', NULL),
('Ramin', 'b', NULL),
('AR619', 'v/y', NULL),
('SD919', 'd', NULL),
('SE419', 'e', 'Sanjid Shanjid'),
('FI', 'k', NULL),
('To720', 'o', NULL),
('Aziz', 'y', NULL),
('Juel', 'm / w', NULL),
('MF720', 'f', NULL),
('Rifat/Shohan', 'i, e, s,', NULL),
('MH122', 'h', NULL),
('MR720', 'r', NULL),
('NS720', 's', NULL),
('MK820', 'k', NULL),
('YK920', 'k', NULL),
('KB222', 'b', NULL),
('AH222', 'h', NULL),
('MN822', 'n', NULL),
('JC723', 'c', NULL),
('PD720', 'd', NULL),
('HD1022', 'd', NULL),
('SM1022', 'm', NULL),
('NZ720', 'z', NULL),
('YZ123', 'Z', NULL),
('RA123', 'A', NULL),
('NC723', 'c', NULL),
('SC723', 's', NULL),
('MD823', 'd', NULL),
('PN 1223', 'n', NULL),
('OD1221', 'o', NULL),
('SD1221', 'U', NULL),
('NE1123', 'e', NULL),
('JT1123', 't', NULL),
('RC1123', 'c', NULL),
('IC1123', 'i', NULL),
('AN1223', 'n', NULL),
('SI1223', 'i', NULL),
('BD0124', 'd', NULL),
('HM0224', 'm', 'Md Habib Ullah Meheraz'),
('RS0224', 's', 'Rubayet Hossen Sifat'),
('AP0124', 'p', 'A.H provat'),
('SU0224', 'u', 'Md Sharif Uddin'),
('TM0224', 'm', 'Tahsin Habib Mahin'),
('RI224', 'i', 'Rakibul Islam'),
('AA1223', 'a', 'Asraful Arfin'),
('RU0224', 'r', 'Rasel Uddin'),
('RAA324', 'a', 'Ramjan Ali Arif'),
('SA424', 'a', 'Shamim Ahmed Asadulllah'),
('SH1024', 'h', 'Shahed Hossain'),
('MI924', 'i', 'Mominul Islam'),
('RT623', 'T', 'Rehunuma Akhter tanz'),
('ST425', 't', 'Sabbir Alam Tuhin'),
('KI1024', 'k', 'Kamrul Islam – IT'),
('KK525', 'k', 'Kapil Karmakar'),
('AAN425', 'N', 'Md Ali Akbor Hossain Newton'),
('OS525', 'S', 'Md Omar Faruque Sunny')
ON CONFLICT (login_id) DO UPDATE SET 
  code = EXCLUDED.code, 
  name = COALESCE(EXCLUDED.name, login_codes.name);
