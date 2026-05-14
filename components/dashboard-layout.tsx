"use client";

import { useAuthStore } from "@/hooks/use-auth";
import { LogOut, ClipboardList, Settings, Plus, Search, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "./ui/button";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuthStore();

  return (
    <div className="flex h-screen bg-gray-50 flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col h-16 md:h-full">
        <div className="p-4 flex items-center justify-between md:justify-start h-16 md:h-auto border-b md:border-b-0 border-gray-200">
          <div className="flex items-center gap-2 text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            <span className="font-bold text-xl hidden md:block">CompraSync</span>
          </div>
          <div className="md:hidden flex items-center gap-2">
            <span className="text-sm font-medium">{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</span>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto hidden md:flex flex-col gap-1 p-4">
          <Link href="/" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-blue-700 bg-blue-50">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Home
          </Link>
          <Link href="/categories" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>
            Categorias
          </Link>
          <Link href="/products" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            Produtos
          </Link>
          <div className="mt-8 mb-2">
             <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">Minhas Listas</h3>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 hidden md:block">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
               {user?.user_metadata?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || <UserIcon />}
             </div>
             <div className="flex-1 min-w-0">
               <p className="text-sm font-medium text-gray-900 truncate">{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</p>
               <p className="text-xs text-gray-500 truncate">{user?.email}</p>
             </div>
             <Button variant="ghost" size="icon" onClick={signOut} className="flex-shrink-0 text-gray-400 hover:text-red-600">
               <LogOut className="w-5 h-5" />
             </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
