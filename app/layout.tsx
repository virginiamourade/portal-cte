import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {title:"Portal CT-e | Gestão de transporte",description:"Documentos de transporte, ambientes e configurações fiscais para sua transportadora.",icons:{icon:"/favicon.svg"}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
