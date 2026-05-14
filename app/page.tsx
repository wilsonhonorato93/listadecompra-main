"use client";

import { AuthGuard } from "@/components/auth-guard";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useAuthStore } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { Plus, Search, Users, Clock, ClipboardList, Database } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface ShoppingList {
  id: string;
  title: string;
  owner_id: string;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchLists = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select(`
          *,
          member_count:list_members(count)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      const formattedLists = data.map(list => ({
        ...list,
        member_count: list.member_count[0].count
      })) as ShoppingList[];

      setLists(formattedLists);
    } catch (error) {
      console.error('Error fetching lists:', error);
      toast.error("Erro ao carregar listas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();

    // Set up realtime subscription
    if (!user) return;
    const channel = supabase
      .channel('public:shopping_lists')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_lists' }, () => {
        fetchLists();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleCreateList = async () => {
    if (!user) return;
    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .insert({
          title: "Nova Lista",
          owner_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Add owner as admin member
      const { error: memberError } = await supabase
        .from('list_members')
        .insert({
          list_id: data.id,
          user_id: user.id,
          role: 'admin'
        });

      if (memberError) throw memberError;

      toast.success("Lista criada!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar lista.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleGenerateTestData = async () => {
    if (!user) return;
    setIsGenerating(true);
    try {
      // Lista 1: Churrasco
      const { data: list1, error: e1 } = await supabase
        .from('shopping_lists')
        .insert({ title: "Churrasco de Domingo", owner_id: user.id })
        .select().single();
      if (e1) throw e1;

      await supabase.from('list_members').insert({ list_id: list1.id, user_id: user.id, role: 'admin' });

      const items1 = [
        { list_id: list1.id, name: "Picanha", quantity: 2, category: "Alimentos", created_by: user.id, creator_name: user.user_metadata.full_name },
        { list_id: list1.id, name: "Carvão", quantity: 1, category: "Outros", created_by: user.id, creator_name: user.user_metadata.full_name },
        { list_id: list1.id, name: "Refrigerante", quantity: 3, category: "Bebidas", created_by: user.id, creator_name: user.user_metadata.full_name },
        { list_id: list1.id, name: "Pão de Alho", quantity: 2, category: "Alimentos", created_by: user.id, creator_name: user.user_metadata.full_name },
        { list_id: list1.id, name: "Cerveja", quantity: 4, category: "Bebidas", created_by: user.id, creator_name: user.user_metadata.full_name },
      ];
      await supabase.from('shopping_list_items').insert(items1);

      // Lista 2: Compras do Mês
      const { data: list2, error: e2 } = await supabase
        .from('shopping_lists')
        .insert({ title: "Compras do Mês", owner_id: user.id })
        .select().single();
      if (e2) throw e2;

      await supabase.from('list_members').insert({ list_id: list2.id, user_id: user.id, role: 'admin' });

      const items2 = [
        { list_id: list2.id, name: "Arroz 5kg", quantity: 1, category: "Alimentos", created_by: user.id, creator_name: user.user_metadata.full_name },
        { list_id: list2.id, name: "Feijão 1kg", quantity: 2, category: "Alimentos", created_by: user.id, creator_name: user.user_metadata.full_name },
        { list_id: list2.id, name: "Detergente", quantity: 3, category: "Limpeza", created_by: user.id, creator_name: user.user_metadata.full_name },
        { list_id: list2.id, name: "Papel Higiênico", quantity: 1, category: "Higiene", created_by: user.id, creator_name: user.user_metadata.full_name },
        { list_id: list2.id, name: "Leite", quantity: 12, category: "Bebidas", created_by: user.id, creator_name: user.user_metadata.full_name },
      ];
      await supabase.from('shopping_list_items').insert(items2);
      
      toast.success("Dados de teste gerados com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar dados de teste.");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredLists = lists.filter(list => list.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Suas Listas</h1>
              <p className="text-gray-500 mt-1">Gerencie e compartilhe suas listas de compras.</p>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Buscar lista..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                />
              </div>
              <Button variant="outline" onClick={handleGenerateTestData} isLoading={isGenerating} title="Gerar dados de teste" className="hidden sm:flex">
                <Database className="w-4 h-4 mr-2 text-blue-600" />
                Gerar Dados
              </Button>
              <Button onClick={handleCreateList} isLoading={isCreating}>
                <Plus className="w-5 h-5 mr-2" />
                Nova Lista
              </Button>
            </div>
          </div>

          {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {[1, 2, 3].map(i => (
                 <div key={i} className="h-40 bg-gray-100 animate-pulse rounded-2xl"></div>
               ))}
             </div>
          ) : filteredLists.length === 0 ? (
            <div className="flex flex-col flex-1 items-center justify-center p-12 text-center bg-white rounded-2xl border border-gray-100 shadow-sm border-dashed">
               <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                 <ClipboardList className="w-8 h-8" />
               </div>
               <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma lista encontrada</h3>
               <p className="text-gray-500 max-w-sm mb-6">Você ainda não tem nenhuma lista ou não encontramos resultados para sua busca.</p>
               <div className="flex gap-3">
                 <Button onClick={handleCreateList} isLoading={isCreating}>Criar sua primeira lista</Button>
                 <Button variant="outline" onClick={handleGenerateTestData} isLoading={isGenerating}>Gerar listas de teste</Button>
               </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLists.map((list) => (
                <Link href={`/list/${list.id}`} key={list.id}>
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -4 }}
                    className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all h-full flex flex-col group cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-semibold text-lg text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">{list.title}</h3>
                    </div>
                    
                    <div className="mt-auto space-y-3 pt-4 border-t border-gray-50">
                      <div className="flex items-center text-sm text-gray-500">
                        <Users className="w-4 h-4 mr-2" />
                        {list.member_count} membro{list.member_count !== 1 ? 's' : ''}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="w-4 h-4 mr-2" />
                        Atualizado {list.updated_at ? formatDistanceToNow(new Date(list.updated_at), { locale: ptBR, addSuffix: true }) : 'agora'}
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
