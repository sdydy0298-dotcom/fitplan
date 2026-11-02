'use client';
import Link from 'next/link';
import {type FormEvent,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowLeft,ArrowRight,CheckCircle2,LockKeyhole,MailCheck,RotateCcw,ShieldCheck} from 'lucide-react';
import {browserDb} from '@/lib/supabase';
import {useAuth} from '@/components/AuthProvider';
import {friendlyError} from '@/lib/format';

type Mode='login'|'signup'|'recovery';
const COOLDOWN_MS=65_000;
const confirmationUrl=()=>window.location.origin+'/auth/confirmed';

function authErrorText(err:unknown):string{
 const code=typeof err==='object'&&err!==null&&'code' in err?String(err.code):'';
 const status=typeof err==='object'&&err!==null&&'status' in err?Number(err.status):0;
 const detail=friendlyError(err);
 if(code==='email_address_not_authorized'||/email address not authorized/i.test(detail))return '이 이메일로 인증 메일을 보낼 수 없습니다. Supabase 이메일 발송 설정을 확인해 주세요.';
 if(status===429||/rate limit/i.test(detail))return '이메일 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.';
 if(code==='email_not_confirmed')return '이메일 인증을 완료한 후 로그인해 주세요.';
 if(code==='invalid_credentials')return '이메일 또는 비밀번호가 올바르지 않습니다.';
 return detail;
}

export default function Login(){
 const {configured,refresh}=useAuth();
 const router=useRouter();
 const [mode,setMode]=useState<Mode>('login');
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [passwordAgain,setPasswordAgain]=useState('');
 const [confirmationPending,setConfirmationPending]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [resendAt,setResendAt]=useState(0);
 const [seconds,setSeconds]=useState(0);

 useEffect(()=>{
  if(!confirmationPending)return;
  const tick=()=>setSeconds(Math.max(0,Math.ceil((resendAt-Date.now())/1000)));
  tick();
  const timer=window.setInterval(tick,1000);
  return()=>window.clearInterval(timer);
 },[confirmationPending,resendAt]);

 const switchMode=(next:Mode)=>{
  setMode(next);setConfirmationPending(false);setError('');setNotice('');
  setPassword('');setPasswordAgain('');setResendAt(0);setSeconds(0);
 };

 const submit=async(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();setError('');setNotice('');setBusy(true);
  try{
   if(!configured)throw new Error('Supabase 연결 정보를 확인해 주세요.');
   const address=email.trim().toLowerCase();
   const db=browserDb();
   if(mode==='recovery'){
    const {error}=await db.auth.resetPasswordForEmail(address,{redirectTo:window.location.origin+'/reset-password'});
    if(error)throw error;
    setNotice('비밀번호 재설정 요청을 접수했습니다. 메일이 도착했다면 받은편지함에서 링크를 열어주세요. 메일이 없다면 스팸함이나 발송 설정을 확인해 주세요.');
    return;
   }
   if(mode==='signup'){
    if(password.length<8)throw new Error('비밀번호는 8자 이상 입력해 주세요.');
    if(password!==passwordAgain)throw new Error('비밀번호 확인이 일치하지 않습니다.');
    const {data,error}=await db.auth.signUp({
     email:address,
     password,
     options:{emailRedirectTo:confirmationUrl()}
    });
    if(error)throw error;
    setEmail(address);
    setPassword('');setPasswordAgain('');
    if(data.session){
     await db.auth.signOut();
     setMode('login');
     setNotice('계정이 생성됐지만 Supabase의 이메일 확인 기능이 꺼져 있어 확인 메일이 발송되지 않았습니다. 이메일 인증이 꼭 필요하다면 관리자가 공용 Auth 설정을 확인해야 합니다.');
    }else{
     setConfirmationPending(true);
     setResendAt(Date.now()+COOLDOWN_MS);
     setNotice('회원가입 요청을 처리했습니다. 새 계정이라면 이메일 인증 링크를 확인해 주세요. 이미 가입된 이메일은 새 계정이 만들어지지 않을 수 있으니 로그인을 이용해 주세요.');
    }
    return;
   }
   const {error}=await db.auth.signInWithPassword({email:address,password});
   if(error)throw error;
   await refresh();
   const next=new URLSearchParams(window.location.search).get('next');
   router.push(next?.startsWith('/')&&!next.startsWith('//')?next:'/dashboard');
   router.refresh();
  }catch(e){setError(authErrorText(e));}
  finally{setBusy(false);}
 };

 const resend=async()=>{
  if(busy||seconds>0)return;
  setBusy(true);setError('');setNotice('');
  try{
   const {error}=await browserDb().auth.resend({
    type:'signup',email,
    options:{emailRedirectTo:confirmationUrl()}
   });
   if(error)throw error;
   setResendAt(Date.now()+COOLDOWN_MS);
   setNotice('인증 메일 재발송을 요청했습니다. 메일이 도착하지 않으면 발송 제한이나 인증 설정을 확인해 주세요.');
  }catch(e){setError(authErrorText(e));}
  finally{setBusy(false);}
 };

 const signup=mode==='signup';
 const recovery=mode==='recovery';
 const title=confirmationPending?'이메일 인증을 완료해 주세요.':recovery?'비밀번호를 재설정해요.':signup?'새로운 운동의 시작.':'다시 만나서 반가워요.';
 const description=confirmationPending?'메일로 받은 확인 링크를 열면 가입 절차가 완료됩니다.':recovery?'가입한 이메일로 비밀번호 변경 링크를 보내드려요.':signup?'이메일과 비밀번호를 입력하고 메일 인증을 완료해 주세요.':'내 루틴과 운동 기록을 이어서 확인해 보세요.';

 return <div className="auth-wrap"><div className="auth-panel">
  <span className="eyebrow"><LockKeyhole size={14}/> FITPLAN ACCOUNT</span>
  <h1>{title}</h1>
  <p>{description}</p>
  {!confirmationPending&&mode!=='recovery'&&<div className="auth-tab">
   <button type="button" className={mode==='login'?'active':''} onClick={()=>switchMode('login')}>로그인</button>
   <button type="button" className={signup?'active':''} onClick={()=>switchMode('signup')}>회원가입</button>
  </div>}

  {confirmationPending?
   <div className="auth-confirmation" role="status">
    <div className="auth-confirmation-icon"><MailCheck size={27}/></div>
    <h2>받은편지함을 확인해 주세요</h2>
    <p className="auth-confirmation-address">{email}</p>
    <p>새 계정이라면 <strong>회원가입 확인 메일</strong>이 도착합니다. 메일에서 인증 링크를 클릭한 뒤 FITPLAN으로 돌아와 로그인해 주세요.</p>
    <p className="field-hint">메일이 보이지 않으면 스팸함도 확인하세요. 이미 가입된 이메일은 새 인증 메일이 발송되지 않을 수 있습니다.</p>
    {notice&&<div className="success-message" role="status">{notice}</div>}
    {error&&<div className="error-message" role="alert">{error}</div>}
    <div className="auth-confirmation-actions">
     <button type="button" className="btn btn-outline" disabled={busy||seconds>0} onClick={()=>void resend()}><RotateCcw size={16}/>{busy?'요청 중…':seconds>0?'재발송 '+seconds+'초':'인증 메일 재발송'}</button>
     <button type="button" className="btn btn-primary" onClick={()=>switchMode('login')}>로그인 화면으로 <ArrowRight size={16}/></button>
    </div>
    <button type="button" className="text-link auth-back" onClick={()=>{setConfirmationPending(false);setError('');setNotice('');}}><ArrowLeft size={14}/>이메일 다시 입력</button>
   </div>:
   <form onSubmit={submit} className="form-stack auth-form">
    <label className="input-field">이메일<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
    {mode!=='recovery'&&<label className="input-field">비밀번호<input type="password" autoComplete={signup?'new-password':'current-password'} minLength={signup?8:undefined} required value={password} onChange={e=>setPassword(e.target.value)} placeholder={signup?'8자 이상 입력':'비밀번호 입력'}/></label>}
    {signup&&<label className="input-field">비밀번호 확인<input type="password" autoComplete="new-password" minLength={8} required value={passwordAgain} onChange={e=>setPasswordAgain(e.target.value)} placeholder="비밀번호 한 번 더 입력"/></label>}
    {signup&&<p className="field-hint">가입 후 이메일로 받은 확인 링크를 열어 인증해 주세요. 기존 ALEPH 계정 이메일은 재가입할 수 없습니다.</p>}
    {recovery&&<p className="field-hint">가입한 이메일로 비밀번호 변경 링크를 보내드립니다.</p>}
    {error&&<div className="error-message" role="alert">{error}</div>}
    {notice&&<div className="success-message" role="status">{notice}</div>}
    <button type="submit" disabled={busy||!configured} className="btn btn-primary btn-lg">{busy?'처리 중…':signup?'회원가입하기':recovery?'재설정 메일 보내기':'로그인하기'}<ArrowRight size={17}/></button>
   </form>
  }

  {!confirmationPending&&<div className="auth-bottom-link">
   {recovery?<button type="button" className="text-link" onClick={()=>switchMode('login')}>로그인으로 돌아가기</button>:
    <button type="button" className="text-link" onClick={()=>switchMode('recovery')}>비밀번호를 잊으셨나요?</button>}
  </div>}
  <div className="notice" style={{marginTop:25}}><ShieldCheck size={17}/><span>내 운동 기록은 기본 비공개예요. 공유를 선택한 루틴만 다른 사람이 볼 수 있어요.</span></div>
  <p style={{fontSize:12,marginTop:25,textAlign:'center'}}><Link href="/exercises" className="text-link">로그인 없이 운동 가이드 구경하기 →</Link></p>
 </div></div>;
}
