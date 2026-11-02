'use client';
import {type FormEvent,useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,LockKeyhole} from 'lucide-react';
import {browserDb,isConfigured} from '@/lib/supabase';
import {friendlyError} from '@/lib/format';
export default function ResetPassword(){
 const [checking,setChecking]=useState(true),[ready,setReady]=useState(false);
 const [password,setPassword]=useState(''),[confirm,setConfirm]=useState('');
 const [busy,setBusy]=useState(false),[complete,setComplete]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  let live=true;
  if(!isConfigured()){setError('Supabase 연결 설정이 필요합니다.');setChecking(false);return;}
  browserDb().auth.getSession().then(({data,error})=>{
   if(!live)return;
   if(error||!data.session)setError('유효한 재설정 링크가 아닙니다. 로그인 화면에서 다시 요청해 주세요.');
   else setReady(true);
  }).catch(()=>{if(live)setError('재설정 링크를 확인하지 못했습니다. 다시 요청해 주세요.');})
  .finally(()=>{if(live)setChecking(false);});
  return()=>{live=false;};
 },[]);
 const submit=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();setError('');
  if(password.length<8)return setError('비밀번호는 8자 이상 입력해 주세요.');
  if(password!==confirm)return setError('두 비밀번호가 일치하지 않습니다.');
  setBusy(true);
  try{
   const {error}=await browserDb().auth.updateUser({password});if(error)throw error;
   await browserDb().auth.signOut();setComplete(true);
  }catch(e){setError(friendlyError(e));}finally{setBusy(false);}
 };
 return <div className="auth-wrap"><div className="auth-panel">
  <span className="eyebrow"><LockKeyhole size={14}/> ACCOUNT RECOVERY</span>
  <h1>{complete?'비밀번호 변경 완료':'새 비밀번호 설정'}</h1>
  <p>{complete?'새 비밀번호로 로그인해 주세요.':'이메일로 받은 재설정 링크를 통해 새 비밀번호를 설정하세요.'}</p>
  {checking?<p className="small">재설정 링크 확인 중…</p>:complete?
   <Link className="btn btn-primary btn-lg" href="/login">로그인하러 가기 <ArrowRight size={17}/></Link>:ready?
   <form onSubmit={submit} className="form-stack auth-form">
    <label className="input-field">새 비밀번호<input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)}/></label>
    <label className="input-field">새 비밀번호 확인<input type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
    {error&&<div className="error-message" role="alert">{error}</div>}
    <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>{busy?'변경 중…':'비밀번호 변경하기'}<ArrowRight size={17}/></button>
   </form>:<><div className="error-message" role="alert">{error}</div><Link href="/login" className="btn btn-outline">로그인 화면으로 돌아가기</Link></>}
 </div></div>;
}
