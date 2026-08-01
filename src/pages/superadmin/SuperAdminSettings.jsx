import { useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import "../../styles/portalModule.css";

export default function SuperAdminSettings(){
 const {user}=useAuth();const [message,setMessage]=useState("");
 const save=async(e)=>{e.preventDefault();setMessage("Superadmin account settings are controlled by the secure administrator account. Use the administrator management area to manage other accounts.");};
 return <DashboardLayout><div className="portal-module"><header className="portal-module-header"><div><span>SYSTEM CONTROL</span><h1>Settings</h1><p>Review your privileged account and system preferences.</p></div></header>
 <section className="portal-panel"><h2>Current Account</h2><div className="portal-form-grid"><div className="portal-field"><label>Name</label><input value={user?.fullName||user?.name||""} readOnly/></div><div className="portal-field"><label>Email</label><input value={user?.email||""} readOnly/></div><div className="portal-field"><label>Role</label><input value="Super Administrator" readOnly/></div><div className="portal-field"><label>Account ID</label><input value={user?._id||""} readOnly/></div></div></section>
 <section className="portal-panel"><h2>Security</h2><p style={{color:"#666"}}>Keep privileged credentials private. Administrator creation, suspension, activation and password resets are available under <strong>Administrators</strong>.</p>{message&&<div className="portal-alert success">{message}</div>}<form onSubmit={save}><button className="portal-btn">Save Preferences</button></form></section>
 </div></DashboardLayout>
}
