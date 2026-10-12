import 'server-only';
import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
export function isConfigured(){return !!process.env.NEXT_PUBLIC_SUPABASE_URL&&!!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;}
export async function supabase(){if(!isConfigured())throw Error('Configure o Supabase na hospedagem.');const jar=await cookies();return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{cookieOptions:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'},cookies:{getAll(){return jar.getAll();},setAll(items){try{items.forEach(({name,value,options})=>jar.set(name,value,options));}catch{/* Server Components refresh through proxy.ts. */}}}});}
