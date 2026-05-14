"use client";

import { AuthGuard } from "@/components/auth-guard";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useAuthStore } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { Plus, Search, Tag, Trash2, Edit2, Check } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export default function CategoriesPage() {
  const { user } = useAuthStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#3b82f6");

  const fetchCategories = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) {
        // Se a tabela não existir ainda, apenas parecemos vazios.
        console.error(error);
        if (error.code !== '42P01') {
          toast.error("Erro ao carregar categorias.");
        }
      } else {
        setCategories(data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [user]);

  const handleAddCategory = async () => {
    if (!user || !newCategoryName.trim()) return;
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: newCategoryName.trim(),
          color: newCategoryColor,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      setCategories([...categories, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCategoryName("");
      setIsAdding(false);
      toast.success("Categoria adicionada!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao adicionar categoria. Certifique-se de ter criado a tabela no banco.");
    }
  };

  const handleGenerateDefaultData = async () => {
    if (!user) return;
    try {
      const defaultCategories = [
        { name: "Alimentos", color: "#f59e0b", user_id: user.id },
        { name: "Limpeza", color: "#06b6d4", user_id: user.id },
        { name: "Bebidas", color: "#3b82f6", user_id: user.id },
        { name: "Higiene", color: "#10b981", user_id: user.id },
        { name: "Carnes", color: "#ef4444", user_id: user.id },
        { name: "Hortifruti", color: "#84cc16", user_id: user.id },
        { name: "Laticínios", color: "#fcd34d", user_id: user.id },
        { name: "Outros", color: "#9ca3af", user_id: user.id },
      ];

      const { error } = await supabase.from('categories').insert(defaultCategories);
      if (error) throw error;
      
      toast.success("Categorias padrão geradas!");
      fetchCategories();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar categorias. Verifique a tabela no banco.");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria?")) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      setCategories(categories.filter(c => c.id !== id));
      toast.success("Categoria excluída.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir categoria.");
    }
  };

  const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                <Tag className="w-8 h-8 text-blue-600" />
                Categorias
              </h1>
              <p className="text-gray-500 mt-1">Gerencie as categorias dos seus produtos.</p>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Buscar categoria..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                />
              </div>
              <Button variant="outline" onClick={handleGenerateDefaultData} className="hidden sm:flex">
                Gerar Padrão
              </Button>
              <Button onClick={() => setIsAdding(!isAdding)}>
                <Plus className="w-5 h-5 mr-2" />
                Nova Categoria
              </Button>
            </div>
          </div>

          {isAdding && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm flex flex-col md:flex-row gap-4 items-end"
            >
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Categoria</label>
                <input 
                  type="text" 
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Ex: Alimentos, Limpeza, etc."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cor</label>
                <input 
                  type="color" 
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="w-12 h-10 p-1 border border-gray-200 rounded-lg cursor-pointer"
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Button variant="outline" onClick={() => setIsAdding(false)}>Cancelar</Button>
                <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>Salvar</Button>
              </div>
            </motion.div>
          )}

          {loading ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
               {[1, 2, 3].map(i => (
                 <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-2xl"></div>
               ))}
             </div>
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-gray-100 border-dashed">
               <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                 <Tag className="w-8 h-8" />
               </div>
               <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhuma categoria</h3>
               <p className="text-gray-500 mb-4">Você ainda não cadastrou nenhuma categoria.</p>
               <Button onClick={() => setIsAdding(true)}>Criar Categoria</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredCategories.map((category) => (
                <motion.div 
                  key={category.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: category.color || '#3b82f6' }}
                    />
                    <span className="font-medium text-gray-900">{category.name}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity"
                    onClick={() => handleDeleteCategory(category.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
