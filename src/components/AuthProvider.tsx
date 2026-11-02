'use client';
import React,{createContext,useContext,useEffect,useMemo,useState} from 'react';
import type {User} from '@supabase/supabase-js';
import {browserDb,isConfigured} from '@/lib/supabase';

type AuthState={user:User|null;ready:boolean;configured:boolean;refresh:()=>Promise<void>};
const AuthContext=createContext<AuthState>({user:null,ready:false,configured:false,refresh:async()=>{}});
export function AuthProvider({children}:{children:React.ReactNode}){
 const configured=isConfigured(), [user,setUser]=useState<User|null>(null),[ready,setReady]=useState(false);
 const db=useMemo(()=>configured?browserDb():null,[configured]);
 useEffect(()=>{
  if(!db){setReady(true);return;}
  let live=true;
  db.auth.getUser().then(({data})=>{if(live){setUser(data.user);setReady(true);}}).catch(()=>{if(live)setReady(true);});
  const {data:{subscription}}=db.auth.onAuthStateChange((_event,session)=>{if(live){setUser(session?.user??null);setReady(true);}});
  return ()=>{live=false;subscription.unsubscribe();};
 },[db]);
 const refresh=async()=>{if(!db)return;const{data}=await db.auth.getUser();setUser(data.user);};
 return <AuthContext.Provider value={{user,ready,configured,refresh}}>{children}</AuthContext.Provider>;
}
export const useAuth=()=>useContext(AuthContext);
