import { Link } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound(){
  return <main className="modern-section not-found-page" id="main-content">
    <div className="modern-card" style={{maxWidth:760,margin:"48px auto",textAlign:"center"}}>
      <div className="icon" style={{margin:"0 auto 18px"}}><Home size={26}/></div>
      <span className="section-label">404</span>
      <h1 style={{margin:"10px 0 12px"}}>Page not found</h1>
      <p>The page you opened is not available. Use the options below to continue safely.</p>
      <div className="hero-buttons" style={{justifyContent:"center",marginTop:22}}>
        <Link className="modern-btn" to="/"><Home size={17}/> Website home</Link>
        <button className="modern-btn-secondary" type="button" onClick={()=>window.history.back()}><ArrowLeft size={17}/> Go back</button>
      </div>
    </div>
  </main>;
}
