"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion } from "motion/react";
import { ClipboardList } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido")
});

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    const defaultPassword = "TestePassword123!";
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: defaultPassword,
      });

      if (signInError) {
        // If user doesn't exist, try to sign up
        if (signInError.message.includes('Invalid login credentials')) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: data.email,
            password: defaultPassword,
            options: {
              data: {
                full_name: data.email.split('@')[0],
              }
            }
          });

          if (signUpError) throw signUpError;
          
          if (signUpData.user) {
            toast.success("Conta de teste criada automaticamente!");
          }
        } else {
          throw signInError;
        }
      } else {
        toast.success("Login realizado com sucesso!");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao realizar login");
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
              <ClipboardList className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Acesso de Teste</h1>
            <p className="text-sm text-gray-500 mt-1 text-center">Informe um e-mail para acesso. Não é necessária a senha nesta etapa de teste.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <Input 
                type="email" 
                placeholder="seu@email.com" 
                {...register("email")}
                error={errors.email?.message}
              />
            </div>
            <Button type="submit" className="w-full mt-6" isLoading={isSubmitting}>
              Entrar
            </Button>
          </form>
        </motion.div>
      </div>
    </AuthGuard>
  );
}
