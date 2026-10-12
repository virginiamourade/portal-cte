import {redirect} from 'next/navigation';
import {access,isConfigured} from '../lib/auth';
import Portal from './portal';
export const dynamic='force-dynamic';
export default async function Page(){if(!isConfigured())redirect('/login');let user;try{user=await access();}catch{redirect('/login?erro=configuracao');}if(!user)redirect('/login');return <><form action="/api/auth/logout" method="post" style={{position:'fixed',right:20,bottom:18,zIndex:100}}><button style={{background:'#0f172a',color:'white',padding:'8px 16px',borderRadius:8}}>Sair</button></form><Portal/></>;}
