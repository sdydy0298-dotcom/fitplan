'use client';
import Link from 'next/link';
import {type FormEvent,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowLeft,ArrowRight,CheckCircle2,LockKeyhole,Mail,RotateCcw,ShieldCheck} from 'lucide-react';
import {browserDb} from '@/lib/supabase';
import {useAuth} from '@/components/AuthProvider';
import {friendlyError} from '@/lib/format';

type Mode='login'|'signup'|'recovery';
const RESEND_WAIT_MS=65_000;
const numericCode=(value:string)=>value.replace(/\D/g,'').slice(0,6);
const validEmail=(value:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const redirectAfterConfirmation=()=>window.location.origin+'/auth/confirmed';

function authErrorText(err:unknown):string{
 const code=typeof err==='object'&&err!==null&&'code' in err?String(err.code):'';
 const status=typeof err==='object'&&err!==null&&'status' in err?Number(err.status):0;
 const detail=friendlyError(err);
 if(code==='email_address_not_authorized'||/email address not authorized/i.test(detail))return '이메일 발송이 제한돼 있습니다. Supabase 인증 메일 설정을 확인해 주세요.';
 if(status===429||/rate limit|too many requests/i.test(detail))return '인증 메일 요청이 너무 많습니다. 잠시 뒤 다시 시도해 주세요.';
 if(/otp_expired|token.*expired|expired/i.test(code+' '+detail))return '인증번호가 만료됐습니다. 재발송을 요청해 주세요.';
 if(/otp_invalid|token.*invalid|invalid.*(token|otp)/i.test(code+' '+detail))return '인증번호가 올바르지 않습니다. 다시 확인해 주세요.';
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
 const [code,setCode]=useState('');
 const [sentTo,setSentTo]=useState('');
 const [verified,setVerified]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [resendAt,setResendAt]=useState(0);
 const [seconds,setSeconds]=useState(0);

 useEffect(()=>{
  if(!sentTo||verified)return;
  const tick=()=>setSeconds(Math.max(0,Math.ceil((resendAt-Date.now())/1000)));
  tick();
  const timer=window.setInterval(tick,1000);
  return()=>window.clearInterval(timer);
 },[sentTo,resendAt,verified]);

 const switchMode=(next:Mode)=>{
  setMode(next);setError('');setNotice('');setPassword('');setPasswordAgain('');
  setCode('');setSentTo('');setVerified(false);setResendAt(0);setSeconds(0);
 };
 const clearSignupVerification=()=>{
  setSentTo('');setCode('');setVerified(false);setError('');setNotice('');
  setResendAt(0);setSeconds(0);
 };

 const sendSignupCode=async()=>{
  if(busy||!configured||verified||Boolean(sentTo&&seconds>0))return;
  setError('');setNotice('');
  const address=email.trim().toLowerCase();
  if(!validEmail(address))return setError('올바른 이메일 주소를 입력해 주세요.');
  if(password.length<8)return setError('비밀번호는 8자 이상 입력해 주세요.');
  if(password!==passwordAgain)return setError('비밀번호 확인이 일치하지 않습니다.');
  setBusy(true);
  try{
   const db=browserDb();
   if(sentTo){
    const {error}=await db.auth.resend({type:'signup',email:sentTo,options:{emailRedirectTo:redirectAfterConfirmation()}});
    if(error)throw error;
   }else{
    // signUp registers the chosen password, and sends a Confirm sign up email.
    // The email template must include {{ .Token }} to show a numeric code.
    const {data,error}=await db.auth.signUp({
     email:address,password,options:{emailRedirectTo:redirectAfterConfirmation()}
    });
    if(error)throw error;
    if(data.session){
     await db.auth.signOut();
     throw new Error('현재 Supabase에서 이메일 인증 없이 가입이 허용돼 있습니다. 인증번호 방식으로 가입하려면 공용 Auth의 이메일 확인 설정을 먼저 활성화해야 합니다.');
    }
    setEmail(address);
    setSentTo(address);
   }
   setResendAt(Date.now()+RESEND_WAIT_MS);
   setSeconds(Math.ceil(RESEND_WAIT_MS/1000));
   setCode('');
   setNotice('회원가입 인증 메일을 요청했습니다. 메일에 숫자 인증번호가 없다면 Supabase의 Confirm sign up 템플릿에 인증번호 표시가 필요합니다.');
  }catch(e){setError(authErrorText(e));}
  finally{setBusy(false);}
 };

 const resendExistingSignup=async()=>{
  if(busy||!configured||sentTo||verified)return;
  setError('');setNotice('');
  const address=email.trim().toLowerCase();
  if(!validEmail(address))return setError('가입을 요청한 이메일을 입력해 주세요.');
  if(password.length<8||password!==passwordAgain)return setError('인증 후 사용할 비밀번호와 비밀번호 확인도 입력해 주세요.');
  setBusy(true);
  try{
   const {error}=await browserDb().auth.resend({type:'signup',email:address,options:{emailRedirectTo:redirectAfterConfirmation()}});
   if(error)throw error;
   setSentTo(address);setEmail(address);setCode('');
   setResendAt(Date.now()+RESEND_WAIT_MS);setSeconds(Math.ceil(RESEND_WAIT_MS/1000));
   setNotice('기존 가입 요청에 대한 인증번호 재발송을 요청했습니다. 이미 가입이 완료된 이메일이라면 로그인하거나 비밀번호 찾기를 이용해 주세요.');
  }catch(e){setError(authErrorText(e));}
  finally{setBusy(false);}
 };

 const verifySignupCode=async()=>{
  if(busy||!sentTo||verified)return;
  setError('');setNotice('');
  if(!/^\d{6}$/.test(code))return setError('이메일로 받은 6자리 숫자를 입력해 주세요.');
  setBusy(true);
  try{
   const db=browserDb();
   const {data,error}=await db.auth.verifyOtp({email:sentTo,token:code,type:'email'});
   if(error)throw error;
   if(!data.user||!data.user.email_confirmed_at)throw new Error('인증 결과를 확인하지 못했습니다. 인증번호를 다시 확인해 주세요.');
   // Also save the password from the current form. This makes an older, still-pending
   // signup usable after its confirmation email has been resent.
   const {error:passwordError}=await db.auth.updateUser({password});
   if(passwordError)throw passwordError;
   // Supabase creates a session on verification; this app requires manual login.
   const {error:signOutError}=await db.auth.signOut();
   if(signOutError)throw signOutError;
   setVerified(true);setCode('');setPassword('');setPasswordAgain('');
   setNotice('이메일 인증이 완료됐습니다. 회원가입 완료를 누른 뒤 로그인해 주세요.');
  }catch(e){setError(authErrorText(e));}
  finally{setBusy(false);}
 };

 const finishSignup=()=>{
  if(!verified)return;
  switchMode('login');
  setNotice('회원가입이 완료됐습니다. 가입한 이메일과 비밀번호로 로그인해 주세요.');
 };

 const submitLogin=async(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();setError('');setNotice('');setBusy(true);
  try{
   if(!configured)throw new Error('인증 서버 연결 정보를 확인해 주세요.');
   const {error}=await browserDb().auth.signInWithPassword({email:email.trim(),password});
   if(error)throw error;
   await refresh();
   const next=new URLSearchParams(window.location.search).get('next');
   router.push(next?.startsWith('/')&&!next.startsWith('//')?next:'/dashboard');
   router.refresh();
  }catch(e){setError(authErrorText(e));}
  finally{setBusy(false);}
 };

 const submitRecovery=async(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();setError('');setNotice('');setBusy(true);
  try{
   if(!configured)throw new Error('인증 서버 연결 정보를 확인해 주세요.');
   const {error}=await browserDb().auth.resetPasswordForEmail(email.trim(),{
    redirectTo:window.location.origin+'/reset-password'
   });
   if(error)throw error;
   setNotice('비밀번호 재설정 메일을 요청했습니다. 메일이 도착하면 안내 링크를 열어 주세요. 메일이 오지 않으면 발송 제한이나 스팸함을 확인해 주세요.');
  }catch(e){setError(authErrorText(e));}
  finally{setBusy(false);}
 };

 const signup=mode==='signup';
 const recovery=mode==='recovery';
 const title=signup?'나만의 운동을 시작해요.':recovery?'비밀번호를 재설정해요.':'다시 만나서 반가워요.';
 const description=signup?'이메일 인증을 마치면 나만의 루틴을 저장할 수 있어요.':
  recovery?'가입한 이메일로 비밀번호 변경 안내를 보내드려요.':
  '내 루틴과 운동 기록을 이어서 확인해 보세요.';

 return <div className="auth-wrap"><div className="auth-panel">
  <span className="eyebrow"><LockKeyhole size={14}/> FITPLAN ACCOUNT</span>
  <h1>{title}</h1>
  <p>{description}</p>

  {!recovery&&<div className="auth-tab">
   <button type="button" className={mode==='login'?'active':''} onClick={()=>switchMode('login')}>로그인</button>
   <button type="button" className={signup?'active':''} onClick={()=>switchMode('signup')}>회원가입</button>
  </div>}

  {mode==='login'&&<form onSubmit={submitLogin} className="form-stack auth-form">
   <label className="input-field">이메일<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
   <label className="input-field">비밀번호<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="비밀번호 입력"/></label>
   {error&&<div className="error-message" role="alert">{error}</div>}
   {notice&&<div className="success-message" role="status">{notice}</div>}
   <button type="submit" disabled={busy||!configured} className="btn btn-primary btn-lg">{busy?'로그인 중…':'로그인하기'}<ArrowRight size={17}/></button>
  </form>}

  {signup&&<div className="form-stack auth-form">
   <div className="signup-email-row">
    <label className="input-field">이메일
     <input type="email" autoComplete="email" required disabled={Boolean(sentTo)}
       value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/>
    </label>
    {sentTo?<button className="btn btn-outline btn-sm" type="button" disabled={busy||verified} onClick={clearSignupVerification}><ArrowLeft size={14}/>수정</button>:null}
   </div>
   <label className="input-field">비밀번호
    <input type="password" autoComplete="new-password" minLength={8} required disabled={Boolean(sentTo)}
      value={password} onChange={e=>setPassword(e.target.value)} placeholder="8자 이상 입력"/>
   </label>
   <label className="input-field">비밀번호 확인
    <input type="password" autoComplete="new-password" minLength={8} required disabled={Boolean(sentTo)}
      value={passwordAgain} onChange={e=>setPasswordAgain(e.target.value)} placeholder="비밀번호 다시 입력"/>
   </label>
   <div className="signup-send-row">
    <button type="button" className="btn btn-outline" disabled={busy||verified||Boolean(sentTo&&seconds>0)||!configured} onClick={()=>void sendSignupCode()}>
     <Mail size={16}/>{busy?'처리 중…':sentTo?(seconds>0?'재발송 '+seconds+'초':'인증번호 재발송'):'인증번호 보내기'}
    </button>
    <span className="field-hint">이메일과 비밀번호를 입력한 다음 요청해 주세요.</span>
   </div>
   <div className="signup-code-panel">
    <label className="input-field" htmlFor="signup-verification-code">이메일 인증번호
     <input id="signup-verification-code" type="text" inputMode="numeric" autoComplete="one-time-code"
       pattern="[0-9]{6}" maxLength={6} disabled={!sentTo||verified} required
       value={code} onChange={e=>setCode(numericCode(e.target.value))}
       placeholder="000000" className="signup-code-input"/>
    </label>
    <button type="button" className="btn btn-ghost" disabled={busy||!sentTo||verified||code.length!==6}
      onClick={()=>void verifySignupCode()}>
      {verified?<><CheckCircle2 size={16}/>인증 완료</>:<><ShieldCheck size={16}/>인증 확인</>}
    </button>
   </div>
   {sentTo&&!verified&&<p className="field-hint">메일의 6자리 숫자를 입력하세요. 메일이 링크로만 왔다면 발송 서버의 회원가입 확인 템플릿 설정이 필요해요.</p>}
   {verified&&<div className="signup-verified"><CheckCircle2 size={18}/>이메일 인증 완료 · {sentTo}</div>}
   {error&&<div className="error-message" role="alert">{error}</div>}
   {notice&&<div className="success-message" role="status">{notice}</div>}
   <button type="button" className="btn btn-primary btn-lg" disabled={!verified||busy}
     onClick={finishSignup}>회원가입 완료 <ArrowRight size={17}/></button>
   {!sentTo&&<div className="signup-existing-help"><p className="field-hint">기존 ALEPH 공용 계정에 등록한 이메일은 중복 가입할 수 없습니다.</p><button type="button" className="text-link" disabled={busy||!configured} onClick={()=>void resendExistingSignup()}>이미 가입 요청했나요? 인증번호 다시 받기</button></div>}
  </div>}

  {recovery&&<form className="form-stack auth-form" onSubmit={submitRecovery}>
   <label className="input-field">이메일<input type="email" autoComplete="email" required value={email}
     onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
   {error&&<div className="error-message" role="alert">{error}</div>}
   {notice&&<div className="success-message" role="status">{notice}</div>}
   <button type="submit" className="btn btn-primary btn-lg" disabled={busy||!configured}>{busy?'요청 중…':'비밀번호 재설정 메일 받기'}<ArrowRight size={17}/></button>
  </form>}

  <div className="auth-bottom-link">
   {recovery?<button type="button" className="text-link" onClick={()=>switchMode('login')}>로그인 화면으로 돌아가기</button>:
    mode==='login'?<button type="button" className="text-link" onClick={()=>switchMode('recovery')}>비밀번호를 잊으셨나요?</button>:null}
  </div>
  <div className="notice" style={{marginTop:25}}><ShieldCheck size={17}/><span>내 운동 기록은 기본 비공개예요. 공유를 선택한 루틴만 다른 사람이 볼 수 있어요.</span></div>
  <p style={{fontSize:12,marginTop:25,textAlign:'center'}}><Link href="/exercises" className="text-link">로그인 없이 운동 가이드 구경하기 →</Link></p>
 </div></div>;
}
