"use client";

import { AuthGuard } from "@/components/auth-guard";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useAuthStore } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { Plus, ArrowLeft, Check, Trash2, CheckSquare, UserPlus, Loader2, Save, X, EyeOff, Eye } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, use } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  name: string;
  quantity: number;
  category: string;
  checked: boolean;
  created_by: string;
  creator_name?: string;
  created_at: string;
  updated_at: string;
}

interface PageProps {
  params: Promise<{ listId: string }>;
}

export default function ListPage({ params }: PageProps) {
  const { listId } = use(params);
  const router = useRouter();
  const { user } = useAuthStore();
  const [items, setItems] = useState<Item[]>([]);
  const [listName, setListName] = useState("");
  const [newListTitle, setNewListTitle] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // App features state
  const [hideCompleted, setHideCompleted] = useState(false);

  // Add item form
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemCategory, setNewItemCategory] = useState("Geral");
  const [isAdding, setIsAdding] = useState(false);

  // Edit item form
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemName, setEditItemName] = useState("");
  const [editItemQuantity, setEditItemQuantity] = useState(1);

  // Share form
  const [isSharing, setIsSharing] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState("editor");

  const [isAdmin, setIsAdmin] = useState(false);

  // DB Metadata
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [dbProducts, setDbProducts] = useState<any[]>([]);

  const fetchDbData = async () => {
    if (!user) return;
    const { data: catData } = await supabase.from('categories').select('*').eq('user_id', user.id);
    if (catData) setDbCategories(catData);

    const { data: prodData } = await supabase.from('products').select('*').eq('user_id', user.id);
    if (prodData) setDbProducts(prodData);
  };

  const fetchItems = async () => {
    if (!listId) return;
    const { data, error } = await supabase
      .from('shopping_list_items')
      .select('*')
      .eq('list_id', listId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      toast.error("Erro ao carregar itens.");
      return;
    }
    setItems(data as Item[]);
    setLoading(false);
  };

  useEffect(() => {
    // Restore hide settings from session
    const savedHideCompleted = sessionStorage.getItem(`hide_completed_${listId}`);
    if (savedHideCompleted === 'true') {
      setHideCompleted(true);
    }
  }, [listId]);

  const toggleHideCompleted = () => {
    const newValue = !hideCompleted;
    setHideCompleted(newValue);
    sessionStorage.setItem(`hide_completed_${listId}`, String(newValue));
  };

  useEffect(() => {
    if (!user || !listId) return;

    // Fetch list metadata
    const fetchListMetadata = async () => {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select(`
          *,
          list_members(role)
        `)
        .eq('id', listId)
        .single();

      if (error) {
        console.error(error);
        toast.error("Erro ao carregar metadados da lista.");
        return;
      }

      setListName(data.title);
      setNewListTitle(data.title);
      
      const userMember = data.list_members.find((m: any) => true); // It will only return the current user's role due to RLS if we join specifically, but here it's any member.
      // Better: find by user.id
      const { data: memberData } = await supabase
        .from('list_members')
        .select('role')
        .eq('list_id', listId)
        .eq('user_id', user.id)
        .single();
      
      setIsAdmin(memberData?.role === "admin");
    };

    fetchListMetadata();
    fetchItems();
    fetchDbData();

    // Multicast subscriptions
    const listChannel = supabase
      .channel(`list:${listId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_lists', filter: `id=eq.${listId}` }, () => {
        fetchListMetadata();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_list_items', filter: `list_id=eq.${listId}` }, () => {
        fetchItems();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(listChannel);
    };
  }, [user, listId]);

  const handleUpdateTitle = async () => {
    if (!user || !newListTitle.trim() || newListTitle === listName) {
      setIsEditingTitle(false);
      return;
    }
    try {
      const { error } = await supabase
        .from('shopping_lists')
        .update({ title: newListTitle.trim(), updated_at: new Date().toISOString() })
        .eq('id', listId);

      if (error) throw error;
      setIsEditingTitle(false);
      toast.success("Nome da lista atualizado!");
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao atualizar título");
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newItemName.trim()) return;
    setIsAdding(true);
    try {
      const { error } = await supabase
        .from('shopping_list_items')
        .insert({
          list_id: listId,
          name: newItemName.trim(),
          quantity: newItemQuantity,
          category: newItemCategory,
          checked: false,
          created_by: user.id,
          creator_name: user.user_metadata.full_name || user.email
        });

      if (error) throw error;
      setNewItemName("");
      setNewItemQuantity(1);
      setNewItemCategory("Geral");
      toast.success("Item adicionado");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao adicionar item");
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleItem = async (item: Item) => {
    try {
      const { error } = await supabase
        .from('shopping_list_items')
        .update({ checked: !item.checked, updated_at: new Date().toISOString() })
        .eq('id', item.id);
      if (error) throw error;
    } catch (error: any) {
      console.error(error);
      toast.error("Você não tem permissão para editar.");
    }
  };

  const startEditing = (item: Item) => {
    setEditingItemId(item.id);
    setEditItemName(item.name);
    setEditItemQuantity(item.quantity);
  };

  const saveEditItem = async (id: string) => {
    if (!editItemName.trim() || editItemQuantity < 1) {
       toast.error("Nome inválido ou quantidade menor que 1");
       return;
    }
    try {
      const { error } = await supabase
        .from('shopping_list_items')
        .update({ name: editItemName.trim(), quantity: editItemQuantity, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      setEditingItemId(null);
      toast.success("Item atualizado");
    } catch(err: any) {
      toast.error("Erro ao atualizar item");
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('shopping_list_items')
        .delete()
        .eq('id', itemId);
      if (error) throw error;
      toast.success("Item excluído");
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao excluir item");
    }
  };

  const handleDeleteList = async () => {
    if (!confirm("Tem certeza que deseja excluir esta lista INTEIRA? Esta ação não pode ser desfeita.")) return;
    try {
      const { error } = await supabase
        .from('shopping_lists')
        .delete()
        .eq('id', listId);
      if (error) throw error;
      toast.success("Lista excluída");
      router.push("/");
    } catch(err: any) {
      console.error(err);
      toast.error("Erro ao excluir a lista. Apenas o dono/admin pode excluir.");
    }
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareEmail) return;
    try {
      setIsSharing(true);
      // In Supabase, we usually find a user by their email in our profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', shareEmail.toLowerCase())
        .single();
      
      if (profileError || !profile) {
        toast.error("Usuário não encontrado com esse e-mail.");
        setIsSharing(false);
        return;
      }
      
      const { error: memberError } = await supabase
        .from('list_members')
        .insert({
          list_id: listId,
          user_id: profile.id,
          role: shareRole as any
        });
      
      if (memberError) {
        if (memberError.code === '23505') {
          toast.error("Usuário já é membro desta lista.");
        } else {
          throw memberError;
        }
      } else {
        setShareEmail("");
        toast.success("Usuário adicionado à lista!");
      }
    } catch(err) {
      console.error(err);
      toast.error("Erro ao compartilhar a lista.");
    } finally {
      setIsSharing(false);
    }
  };

  const pendingItems = items.filter(item => !item.checked);
  const completedItems = items.filter(item => item.checked);

  const availableProducts = dbProducts.filter(p => {
    const cat = dbCategories.find(c => c.name === newItemCategory);
    return cat ? p.category_id === cat.id : false;
  });

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" className="rounded-full bg-white border border-gray-200">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              {isEditingTitle ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input 
                    value={newListTitle} 
                    onChange={e => setNewListTitle(e.target.value)} 
                    autoFocus
                    className="text-lg font-bold"
                  />
                  <Button size="icon" variant="default" onClick={handleUpdateTitle}><Check className="w-4 h-4"/></Button>
                  <Button size="icon" variant="ghost" onClick={() => { setIsEditingTitle(false); setNewListTitle(listName); }}><X className="w-4 h-4"/></Button>
                </div>
              ) : (
                <h1 
                  className="text-2xl font-bold text-gray-900 cursor-pointer hover:underline decoration-dashed decoration-gray-300 underline-offset-4"
                  onClick={() => setIsEditingTitle(true)}
                  title="Clique para editar"
                >
                  {listName || "Carregando..."}
                </h1>
              )}
            </div>
            
            <div className="flex items-center gap-2">
               <Button variant="outline" size="sm" onClick={toggleHideCompleted} className="text-gray-600 bg-white">
                  {hideCompleted ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                  {hideCompleted ? "Mostrar Concluídos" : "Ocultar Concluídos"}
               </Button>
               {isAdmin && (
                 <Button variant="destructive" size="sm" onClick={handleDeleteList}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir Lista
                 </Button>
               )}
            </div>
          </div>

          {/* Share Section */}
          {isAdmin && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center"><UserPlus className="w-4 h-4 mr-2"/> Compartilhar Lista</h3>
              <form onSubmit={handleShare} className="flex flex-col sm:flex-row gap-2">
                <Input 
                  type="email" 
                  placeholder="E-mail do usuário" 
                  value={shareEmail} 
                  onChange={e => setShareEmail(e.target.value)}
                  className="flex-1"
                />
                <select 
                  className="h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  value={shareRole}
                  onChange={e => setShareRole(e.target.value)}
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Visualizador</option>
                  <option value="admin">Administrador</option>
                </select>
                <Button type="submit" disabled={!shareEmail || isSharing}>
                  {isSharing ? <Loader2 className="w-4 h-4 animate-spin"/> : "Convidar"}
                </Button>
              </form>
            </div>
          )}

          {/* Add Item Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 mb-6">
            <form onSubmit={handleAddItem} className="flex flex-col sm:flex-row gap-3">
              <select 
                className="h-10 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                value={newItemCategory}
                onChange={e => {
                  setNewItemCategory(e.target.value);
                  setNewItemName("");
                }}
                disabled={loading}
              >
                <option value="Geral">Geral</option>
                {dbCategories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>

              <div className="flex-[2]">
                <Input 
                  value={newItemName}
                  onChange={(e) => {
                     setNewItemName(e.target.value);
                     const p = availableProducts.find(prod => prod.name.toLowerCase() === e.target.value.toLowerCase());
                     if (p && p.default_quantity) setNewItemQuantity(p.default_quantity);
                  }}
                  placeholder="Selecione ou digite o produto..."
                  className="w-full"
                  disabled={loading}
                  list="filtered-products"
                />
                <datalist id="filtered-products">
                  {availableProducts.map(p => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </div>

              <div className="flex items-center gap-1 bg-gray-50 border border-gray-300 rounded-lg pr-1 h-10">
                 <span className="text-sm text-gray-500 pl-3">Qtd:</span>
                 <Input 
                   type="number" 
                   min="0.1"
                   step="0.1"
                   value={newItemQuantity} 
                   onChange={e => setNewItemQuantity(Number(e.target.value))} 
                   className="w-16 h-full border-none bg-transparent shadow-none focus:ring-0 px-2"
                   disabled={loading}
                 />
              </div>
              
              <Button type="submit" disabled={!newItemName.trim() || isAdding}>
                 {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                 Adicionar
              </Button>
            </form>
          </div>

          {/* Items List */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-xl"></div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-gray-200">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                <CheckSquare className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Sua lista está vazia</h3>
              <p className="text-gray-500">Adicione itens para começar.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Pending Section */}
              <div className="space-y-2">
                 {pendingItems.length > 0 && <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider pl-2 mb-3">Itens Pendentes ({pendingItems.length})</h3>}
                 <AnimatePresence>
                   {pendingItems.map((item) => (
                     <motion.div
                       key={"pend-"+item.id}
                       layout
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, scale: 0.95 }}
                       className="flex items-center justify-between p-4 rounded-xl border bg-white border-gray-200 hover:border-blue-200 hover:shadow-sm transition-all group"
                     >
                        {editingItemId === item.id ? (
                          <div className="flex flex-1 items-center gap-2 flex-wrap">
                            <Input 
                              value={editItemName} 
                              onChange={e => setEditItemName(e.target.value)} 
                              className="flex-[2] min-w-[150px]"
                            />
                            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg pr-1">
                               <span className="text-sm text-gray-500 pl-3">Qtd:</span>
                               <Input 
                                 type="number" 
                                 min="1"
                                 value={editItemQuantity} 
                                 onChange={e => setEditItemQuantity(Number(e.target.value))} 
                                 className="w-16 border-none bg-transparent shadow-none focus:ring-0 px-2"
                               />
                            </div>
                            <Button size="icon" onClick={() => saveEditItem(item.id)}><Save className="w-4 h-4"/></Button>
                            <Button size="icon" variant="ghost" onClick={() => setEditingItemId(null)}><X className="w-4 h-4"/></Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => handleToggleItem(item)}>
                              <button className="w-6 h-6 rounded-md border flex items-center justify-center transition-colors border-gray-300 text-transparent group-hover:border-blue-400">
                                <Check className="w-4 h-4" />
                              </button>
                              <div className="flex flex-col">
                                <span className="font-medium transition-colors line-clamp-1 text-gray-900">
                                  {item.name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {item.quantity} unidades • {item.category} • Adicionado por {item.creator_name || 'Desconhecido'}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1 opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="sm" className="text-gray-500" onClick={(e) => {
                                e.stopPropagation();
                                startEditing(item);
                              }}>
                                Editar
                              </Button>
                              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-600" onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteItem(item.id);
                              }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </>
                        )}
                     </motion.div>
                   ))}
                 </AnimatePresence>
                 {pendingItems.length === 0 && items.length > 0 && (
                   <p className="text-sm text-gray-500 italic pl-2">Todos os itens foram concluídos!</p>
                 )}
              </div>

              {/* Completed Section */}
              {!hideCompleted && completedItems.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-gray-100">
                   <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider pl-2 mb-3">Itens Concluídos ({completedItems.length})</h3>
                   <AnimatePresence>
                     {completedItems.map((item) => (
                       <motion.div
                         key={"comp-"+item.id}
                         layout
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         exit={{ opacity: 0, scale: 0.95 }}
                         className="flex items-center justify-between p-4 rounded-xl border bg-gray-50/50 border-gray-100 transition-all group"
                       >
                            <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => handleToggleItem(item)}>
                              <button className="w-6 h-6 rounded-md border flex items-center justify-center transition-colors bg-blue-600 border-blue-600 text-white">
                                <Check className="w-4 h-4" />
                              </button>
                              <div className="flex flex-col">
                                <span className="font-medium transition-colors line-clamp-1 text-gray-400 line-through">
                                  {item.name}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {item.quantity} unidades • {item.category} • Adicionado por {item.creator_name || 'Desconhecido'}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1 opacity-0 md:opacity-100 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-600" onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteItem(item.id);
                              }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                       </motion.div>
                     ))}
                   </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
