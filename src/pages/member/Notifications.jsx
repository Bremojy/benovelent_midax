import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import NotificationItem from "../../components/notifications/NotificationItem";
import API from "../../services/api";
import "./notifications.css";

export default function Notifications() {
  const [notifications,setNotifications]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  const load=async()=>{try{setLoading(true);const {data}=await API.get("/notifications");if(!data?.success)throw new Error(data?.message||"Unable to load notifications.");setNotifications(data.notifications||[]);}catch(e){setError(e.response?.data?.message||e.message||"Unable to load notifications.");}finally{setLoading(false)}};
  useEffect(()=>{load()},[]);
  const markAll=async()=>{try{await API.put("/notifications/read-all");await load()}catch(e){setError(e.response?.data?.message||e.message||"Unable to update notifications.")}};
  const mark=async(id)=>{try{await API.put(`/notifications/${id}/read`);setNotifications(n=>n.map(x=>x._id===id?{...x,read:true}:x))}catch(e){setError(e.response?.data?.message||e.message||"Unable to update notification.")}};
  return <DashboardLayout><div className="notifications-page"><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><h1>Notifications</h1><button className="notification-mark-all" onClick={markAll}>Mark all as read</button></div>{error&&<div className="support-alert error">{error}</div>}{loading?<p>Loading notifications...</p>:notifications.length===0?<p>No notifications yet.</p>:notifications.map(item=><div key={item._id} onClick={()=>!item.read&&mark(item._id)} style={{cursor:item.read?"default":"pointer",opacity:item.read?.72:1}}><NotificationItem notification={{...item,id:item._id,time:new Date(item.createdAt).toLocaleString("en-KE")}} /></div>)}</div></DashboardLayout>
}
