-- Create Todos Table
CREATE TABLE IF NOT EXISTS public.todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  codename TEXT NOT NULL,
  task TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Working' CHECK (status IN ('Working', 'Completed')),
  comment TEXT,
  todo_date DATE DEFAULT CURRENT_DATE NOT NULL,
  is_all_time BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row-Level Security
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- Select policy: Only allowed for auth.uid() = user_id
CREATE POLICY "Allow users to read own todos" ON public.todos
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Insert policy: Only allowed for auth.uid() = user_id
CREATE POLICY "Allow users to insert own todos" ON public.todos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Update policy: Only allowed for auth.uid() = user_id
CREATE POLICY "Allow users to update own todos" ON public.todos
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Delete policy: Only allowed for auth.uid() = user_id
CREATE POLICY "Allow users to delete own todos" ON public.todos
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS todos_user_id_idx ON public.todos(user_id);
CREATE INDEX IF NOT EXISTS todos_todo_date_idx ON public.todos(todo_date);
