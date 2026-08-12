import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export default function InstallPWA(){
  const [prompt,setPrompt]=useState(null);
  const [show,setShow]=useState(false);

  useEffect(()=>{
    const handler=(event)=>{
      // Keep Chrome's install event for our custom UI; the browser prompt is only
      // triggered after the user explicitly presses Install.
      event.preventDefault();
      setPrompt(event);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt",handler);
    return ()=>window.removeEventListener("beforeinstallprompt",handler);
  },[]);

  const install = async () => {
    if (!prompt) return;
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch (error) {
      console.debug("PWA install prompt closed:", error);
    } finally {
      setPrompt(null);
      setShow(false);
    }
  };

  if(!show||!prompt) return null;
  return <div className="pwa-install-banner"><div><strong>Install Benovelent</strong><span>Get faster, app-like access from your device.</span></div><div className="pwa-install-actions"><button className="btn btn-primary" onClick={install}><Download size={16}/> Install</button><button className="icon-btn" aria-label="Dismiss installation offer" onClick={()=>{setPrompt(null);setShow(false)}}><X size={16}/></button></div></div>
}
