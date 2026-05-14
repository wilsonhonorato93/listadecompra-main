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

const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema)
  });

  const onSubmit = async (data: z.infer<typeof registerSchema>) => {
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.name,
          }
        }
      });

      if (signUpError) throw signUpError;
      
      if (signUpData.user) {
        toast.success("Conta criada com sucesso!");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar conta");
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
            <h1 className="text-2xl font-bold text-gray-900">Crie sua conta</h1>
            <p className="text-sm text-gray-500 mt-1">Comece a compartilhar suas listas de compra</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <Input 
                type="text" 
                placeholder="Seu nome" 
                {...register("name")}
                error={errors.name?.message}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <Input 
                type="email" 
                placeholder="seu@email.com" 
                {...register("email")}
                error={errors.email?.message}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                {...register("password")}
                error={errors.password?.message}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha</label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                {...register("confirmPassword")}
                error={errors.confirmPassword?.message}
              />
            </div>
            <Button type="submit" className="w-full mt-2" isLoading={isSubmitting}>
              Cadastrar
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Já tem uma conta?{" "}
            <a href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Faça login
            </a>
          </p>
        </motion.div>
      </div>
    </AuthGuard>
  );
}
