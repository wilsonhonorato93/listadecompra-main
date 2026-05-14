"use client";

import { AuthGuard } from "@/components/auth-guard";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useAuthStore } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { Plus, Search, PackageSearch, Trash2, Tag } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Product {
  id: string;
  name: string;
  category_id: string;
  default_quantity: number;
  created_at: string;
  categories?: Category;
}

export default function ProductsPage() {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const [isAdding, setIsAdding] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("");
  const [newProductQuantity, setNewProductQuantity] = useState("1");

  const fetchData = async () => {
    if (!user) return;
    try {
      // Fetch categories
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });
        
      if (!catError) setCategories(catData || []);

      // Fetch products
      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .select(`
          *,
          categories (
            id,
            name,
            color
          )
        `)
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (prodError) {
        console.error(prodError);
        if (prodError.code !== '42P01') {
          toast.error("Erro ao carregar produtos.");
        }
      } else {
        setProducts(prodData as any || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleAddProduct = async () => {
    if (!user || !newProductName.trim()) return;
    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: newProductName.trim(),
          category_id: newProductCategory || null,
          default_quantity: parseFloat(newProductQuantity) || 1,
          user_id: user.id
        })
        .select(`
          *,
          categories (
            id,
            name,
            color
          )
        `)
        .single();

      if (error) throw error;

      setProducts([...products, data as any].sort((a, b) => a.name.localeCompare(b.name)));
      setNewProductName("");
      setNewProductCategory("");
      setNewProductQuantity("1");
      setIsAdding(false);
      toast.success("Produto adicionado!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao adicionar produto. Verifique a tabela no banco.");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts(products.filter(p => p.id !== id));
      toast.success("Produto excluído.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir produto.");
    }
  };

  const handleGenerateDefaultData = async () => {
    if (!user) return;
    try {
      const { data: currentCategories } = await supabase.from('categories').select('*').eq('user_id', user.id);
      
      const getCatId = (name: string) => currentCategories?.find(c => c.name.toLowerCase() === name.toLowerCase())?.id || null;

      const defaultProducts = [
        { name: "Arroz 5kg", category_id: getCatId("Alimentos"), default_quantity: 1, user_id: user.id },
        { name: "Feijão 1kg", category_id: getCatId("Alimentos"), default_quantity: 2, user_id: user.id },
        { name: "Macarrão 500g", category_id: getCatId("Alimentos"), default_quantity: 2, user_id: user.id },
        { name: "Detergente", category_id: getCatId("Limpeza"), default_quantity: 3, user_id: user.id },
        { name: "Sabão em Pó", category_id: getCatId("Limpeza"), default_quantity: 1, user_id: user.id },
        { name: "Papel Higiênico", category_id: getCatId("Higiene"), default_quantity: 1, user_id: user.id },
        { name: "Leite 1L", category_id: getCatId("Bebidas"), default_quantity: 12, user_id: user.id },
        { name: "Café 500g", category_id: getCatId("Alimentos"), default_quantity: 2, user_id: user.id },
        { name: "Óleo", category_id: getCatId("Alimentos"), default_quantity: 2, user_id: user.id },
        { name: "Açúcar 1kg", category_id: getCatId("Alimentos"), default_quantity: 2, user_id: user.id },
        { name: "Sal 1kg", category_id: getCatId("Alimentos"), default_quantity: 1, user_id: user.id },
        { name: "Pão de Forma", category_id: getCatId("Alimentos"), default_quantity: 1, user_id: user.id },
        { name: "Manteiga", category_id: getCatId("Laticínios"), default_quantity: 1, user_id: user.id },
        { name: "Cebola", category_id: getCatId("Hortifruti"), default_quantity: 1, user_id: user.id },
        { name: "Alho", category_id: getCatId("Hortifruti"), default_quantity: 1, user_id: user.id },
        { name: "Carne Moída", category_id: getCatId("Carnes"), default_quantity: 1, user_id: user.id },
        { name: "Frango", category_id: getCatId("Carnes"), default_quantity: 2, user_id: user.id },
      ];

      const { error } = await supabase.from('products').insert(defaultProducts);
      if (error) throw error;
      
      toast.success("Produtos padrão gerados!");
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar produtos. Verifique se as categorias já foram criadas.");
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                <PackageSearch className="w-8 h-8 text-blue-600" />
                Produtos Base
              </h1>
              <p className="text-gray-500 mt-1">Gerencie produtos frequentes para adicionar facilmente às listas.</p>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Buscar produto..." 
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
                Novo Produto
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Produto</label>
                <input 
                  type="text" 
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="Ex: Arroz 5kg"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div className="w-full md:w-1/4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select 
                  value={newProductCategory}
                  onChange={(e) => setNewProductCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Sem categoria</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="w-full md:w-32">
                <label className="block text-sm font-medium text-gray-700 mb-1">Qtd. Padrão</label>
                <input 
                  type="number" 
                  min="0.1"
                  step="0.1"
                  value={newProductQuantity}
                  onChange={(e) => setNewProductQuantity(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Button variant="outline" onClick={() => setIsAdding(false)}>Cancelar</Button>
                <Button onClick={handleAddProduct} disabled={!newProductName.trim()}>Salvar</Button>
              </div>
            </motion.div>
          )}

          {loading ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
               {[1, 2, 3].map(i => (
                 <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-2xl"></div>
               ))}
             </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-gray-100 border-dashed">
               <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                 <PackageSearch className="w-8 h-8" />
               </div>
               <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum produto</h3>
               <p className="text-gray-500 mb-4">Cadastre produtos frequentes para facilitar a criação de listas.</p>
               <Button onClick={() => setIsAdding(true)}>Criar Produto</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <motion.div 
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col group relative"
                >
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity h-8 w-8"
                    onClick={() => handleDeleteProduct(product.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  
                  <h3 className="font-semibold text-gray-900 mb-1 pr-8">{product.name}</h3>
                  <div className="flex items-center gap-2 mt-auto pt-2 text-sm text-gray-500">
                    <span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium">Qtd: {product.default_quantity}</span>
                    {product.categories && (
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" style={{ color: product.categories.color }} />
                        {product.categories.name}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
