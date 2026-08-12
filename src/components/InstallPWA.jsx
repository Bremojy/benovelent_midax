import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export default function InstallPWA(){
  const [prompt,setPrompt]=useState(null); const [show,setShow]=useState(false);
  useEffect(()=>{ const handler=(e)=>{e.preventDefault();setPrompt(e);setShow(true)}; window.addEventListener("beforeinstallprompt",handler); return ()=>window.removeEventListener("beforeinstallprompt",handler)},[]);
  if(!show||!prompt) return null;
  return <div className="pwa-install-banner"><div><strong>Install Benovelent</strong><span>Get faster, app-like access from your device.</span></div><div className="pwa-install-actions"><button className="btn btn-primary" onClick={async()=>{await prompt.prompt();setShow(false)}}><Download size={16}/> Install</button><button className="icon-btn" onClick={()=>setShow(false)}><X size={16}/></button></div></div>
}
