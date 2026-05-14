import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAccess() {
  console.log('Testando conexão com o banco de dados Supabase...');
  
  // Teste 1: Conexão básica com o banco
  const { data: dbData, error: dbError } = await supabase.from('profiles').select('*').limit(1);
  if (dbError) {
    if (dbError.code === '42P01') {
      console.log('DB Conexão: OK! A comunicação ocorreu bem, porém a tabela "profiles" ainda não existe. Você deve rodar os scripts SQL no Supabase.');
    } else {
      console.log('DB Conexão ERRO:', dbError.message);
    }
  } else {
    console.log('DB Conexão: OK!');
  }

  // Teste 2: Identidade do usuário
  console.log('\nTestando acesso de API Auth para: mbwsolucoes@gmail.com');
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: 'mbwsolucoes@gmail.com',
    password: 'senha_invalida_de_teste' // Senha incorreta de propósito para ver como a API responde
  });

  if (authError) {
    if (authError.message === 'Invalid login credentials') {
       console.log('API Auth: OK! A API de autenticação do Supabase respondeu corretamente e reconhece suas requisições (Credenciais inválidas esperadas).');
    } else {
       console.log('API Auth ERRO:', authError.message);
    }
  } else {
    console.log('API Auth: Sucesso no login!');
  }
}

testAccess();
