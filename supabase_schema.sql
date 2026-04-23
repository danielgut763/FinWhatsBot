-- Criação da tabela de despesas (expenses)
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC(10, 2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  month_key TEXT NOT NULL,
  installment_info TEXT, -- Ex: "1/5"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Criação da tabela de categorias (opcional, para customização de cores no painel)
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#1D9E75',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inserindo algumas categorias padrão
INSERT INTO categories (name, color) VALUES 
('comida', '#1D9E75'),
('transporte', '#378ADD'),
('lazer', '#D85A30'),
('casa', '#7F77DD'),
('saude', '#D4537E'),
('educacao', '#639922');
