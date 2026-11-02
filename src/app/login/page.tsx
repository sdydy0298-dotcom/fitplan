'use client';
import Link from 'next/link';
import {type FormEvent,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowLeft,ArrowRight,CheckCircle2,KeyRound,LockKeyhole,Mail,RotateCcw,ShieldCheck} from 'lucide-react';
import {browserDb} from '@/lib/supabase';
import {useAuth} from '@/components/AuthProvider';
import {friendlyError} from '@/lib/format';

type Mode='login'|'signup'|'recovery';
type Stage='email'|'otp'|'password';
const CODE_LENGTH=6;
const RESEND_WAIT_MS=65_000;

function readableAuthError(error:unknown):string{
 const code=typeof error==='object'&&error!==null&&'code' in error?String(error.code):'';
 const status=typeof error==='object'&&error!==null&&'status' in error?Number(error.status):0;
 const message=friendlyError(error);
 if(code==='email_address_not_authorized'||/email address not authorized/i.test(message)){
  return '이 이메일로 인증 메일을 보낼 수 없습니다. 인증 서버의 발송 범위가 제한되어 있어요. 운영자에게 메일 발송 설정을 문의해 주세요.';
 }
 if(status===429||code==='over_email_send_rate_limit'||/rate limit/i.test(message)){
  return '인증 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.';
 }
 if(['otp_expired','otp_disabled'].includes(code)||/expired/i.test(message)){
  return '인증번호가 만료됐습니다. 새 인증번호를 요청해 주세요.';
 }
 if(code==='otp_invalid'||/invalid.*(token|otp)/i.test(message)){
  return '인증번호가 올바르지 않습니다. 메일에 표시된 번호를 다시 확인해 주세요.';
 }
 if(code==='invalid_credentials')return '이메일 또는 비밀번호를 확인해 주세요.';
 return message;
}

export default function Login(){
 const {configured,refresh}=useAuth();
 const router=useRouter();
 const [mode,setMode]=useState<Mode>('login');
 const [stage,setStage]=useState<Stage>('email');
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [passwordAgain,setPasswordAgain]=useState('');
 const [otp,setOtp]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [retryAt,setRetryAt]=useState(0);
 const [retrySeconds,setRetrySeconds]=useState(0);

 useEffect(()=>{
  if(stage!=='otp')return;
  const tick=()=>setRetrySeconds(Math.max(0,Math.ceil((retryAt-Date.now())/1000)));
  tick();
  const timer=window.setInterval(tick,1000);
  return()=>window.clearInterval(timer);
 },[retryAt,stage]);

 const switchMode=(next:Mode)=>{
  setMode(next);setStage('email');setError('');setMessage('');
  setPassword('');setPasswordAgain('');setOtp('');setRetryAt(0);setRetrySeconds(0);
 };
 const sendCode=async()=>{
  if(busy||!configured)return;
  setError('');setMessage('');setBusy(true);
  try{
   const address=email.trim().toLowerCase();
   if(!address)throw new Error('이메일을 입력해 주세요.');
   // A passwordless email OTP is separate from the project's global Confirm Email toggle.
   // If the template is still link-only, the link opens /reset-password as a fallback.
   const {error}=await browserDb().auth.signInWithOtp({
    email:address,
    options:{
     shouldCreateUser:mode==='signup',
     emailRedirectTo:window.location.origin+'/reset-password'
    }
   });
   if(error)throw error;
   setEmail(address);setOtp('');setStage('otp');
   setRetryAt(Date.now()+RESEND_WAIT_MS);
   setRetrySeconds(Math.ceil(RESEND_WAIT_MS/1000));
   setMessage('인증 메일 발송 요청을 접수했습니다. 받은편지함과 스팸함을 확인하세요. 메일이 없다면 발송 서버 설정이 필요할 수 있습니다.');
  }catch(err){setError(readableAuthError(err));}
  finally{setBusy(false);}
 };
 const confirmCode=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();setError('');setMessage('');
  if(!/^\d{6}$/.test(otp))return setError('6자리 숫자 인증번호를 입력해 주세요.');
  setBusy(true);
  try{
   const {data,error}=await browserDb().auth.verifyOtp({email,token:otp,type:'email'});
   if(error)throw error;
   if(!data.session||!data.user)throw new Error('인증 세션을 확인하지 못했습니다. 다시 시도해 주세요.');
   setOtp('');setStage('password');
   setMessage('이메일 인증이 완료됐습니다. 사용할 비밀번호를 설정해 주세요.');
  }catch(err){setError(readableAuthError(err));}
  finally{setBusy(false);}
 };
 const finish=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();setError('');setMessage('');
  if(password.length<8)return setError('비밀번호는 8자 이상 입력해 주세요.');
  if(password!==passwordAgain)return setError('비밀번호 확인이 일치하지 않습니다.');
  setBusy(true);
  try{
   const db=browserDb();
   const {data:{session},error:sessionError}=await db.auth.getSession();
   if(sessionError||!session)throw new Error('인증 세션이 만료됐습니다. 이메일 인증부터 다시 진행해 주세요.');
   const {error}=await db.auth.updateUser({password});
   if(error)throw error;
   const {error:signOutError}=await db.auth.signOut();
   if(signOutError)throw signOutError;
   setMode('login');setStage('email');setPassword('');setPasswordAgain('');setOtp('');
   setMessage('이메일 인증과 비밀번호 설정이 끝났습니다. 이제 로그인해 주세요.');
  }catch(err){setError(readableAuthError(err));}
  finally{setBusy(false);}
 };
 const loginWithPassword=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();setError('');setMessage('');
  if(!password)return setError('비밀번호를 입력해 주세요.');
  setBusy(true);
  try{
   const {error}=await browserDb().auth.signInWithPassword({email:email.trim(),password});
   if(error)throw error;
   await refresh();
   const next=new URLSearchParams(window.location.search).get('next');
   router.push(next?.startsWith('/')&&!next.startsWith('//')?next:'/dashboard');
   router.refresh();
  }catch(err){setError(readableAuthError(err));}
  finally{setBusy(false);}
 };
 const recovery=mode==='recovery';
 const signup=mode==='signup';
 const inVerification=mode!=='login'&&stage==='otp';
 const settingPassword=mode!=='login'&&stage==='password';
 const title=settingPassword?'비밀번호를 설정해요.':inVerification?'이메일 인증번호 입력':recovery?'비밀번호를 찾으시나요?':signup?'새로운 운동의 시작.':'다시 만나서 반가워요.';
 const intro=settingPassword?'이메일 인증이 완료됐어요. 이제 로그인에 사용할 비밀번호를 정해 주세요.':
  inVerification?email+' 주소로 요청한 인증번호를 입력해 주세요.':
  recovery?'가입한 이메일로 인증번호를 받아 비밀번호를 변경할 수 있어요.':
  signup?'이메일을 인증하고 비밀번호를 설정하면 가입이 완료돼요.':
  '내 루틴과 운동 기록을 이어서 확인해 보세요.';

 return <div className="auth-wrap"><div className="auth-panel">
  <span className="eyebrow"><LockKeyhole size={14}/> FITPLAN ACCOUNT</span>
  <h1>{title}</h1>
  <p>{intro}</p>
  {!settingPassword&&<div className="auth-tab">
   <button type="button" className={mode==='login'?'active':''} onClick={()=>switchMode('login')}>로그인</button>
   <button type="button" className={signup?'active':''} onClick={()=>switchMode('signup')}>회원가입</button>
  </div>}
  {mode!=='login'&&<div className="otp-progress" aria-label="인증 진행 단계">
   {(['email','otp','password'] as Stage[]).map((part,i)=>
    <div key={part} className={'otp-progress-step '+(stage===part?'active':'')+((['email','otp','password'] as Stage[]).indexOf(stage)>i?'done':'')}>
     <span>{i+1}</span>
     <small>{i===0?'이메일':i===1?'인증번호':'비밀번호'}</small>
    </div>
   )}
  </div>}
  {mode==='login'&&<form onSubmit={loginWithPassword} className="form-stack auth-form">
   <label className="input-field">이메일<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
   <label className="input-field">비밀번호<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="비밀번호 입력"/></label>
   {error&&<div className="error-message" role="alert">{error}</div>}
   {message&&<div className="success-message" role="status">{message}</div>}
   <button type="submit" disabled={busy||!configured} className="btn btn-primary btn-lg">{busy?'로그인 중…':'로그인하기'}<ArrowRight size={17}/></button>
  </form>}
  {mode!=='login'&&stage==='email'&&<form onSubmit={e=>{e.preventDefault();void sendCode();}} className="form-stack auth-form">
   <label className="input-field">이메일 주소<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
   <p className="otp-hint"><Mail size={16}/>입력한 주소로 인증번호를 요청합니다. 인증이 끝나면 비밀번호를 설정할 수 있어요.</p>
   {signup&&<p className="field-hint">이미 가입한 이메일은 기존 계정이 사용되며, 인증 후 비밀번호를 새로 설정할 수 있어요.</p>}
   {error&&<div className="error-message" role="alert">{error}</div>}
   <button type="submit" disabled={busy||!configured} className="btn btn-primary btn-lg">{busy?'요청 중…':'인증번호 받기'}<ArrowRight size={17}/></button>
  </form>}
  {inVerification&&<form onSubmit={confirmCode} className="form-stack auth-form">
   <label className="input-field" htmlFor="fitplan-otp">이메일 인증번호</label>
   <input id="fitplan-otp" className="otp-input" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={CODE_LENGTH} pattern="[0-9]{6}" required autoFocus value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,CODE_LENGTH))} placeholder="000000" aria-describedby="otp-description"/>
   <p id="otp-description" className="field-hint">메일에 적힌 숫자 6자리를 입력해 주세요. 유효시간과 재요청 횟수는 인증 서버 정책을 따릅니다.</p>
   {error&&<div className="error-message" role="alert">{error}</div>}
   {message&&<div className="success-message" role="status">{message}</div>}
   <button type="submit" disabled={busy||otp.length!==CODE_LENGTH} className="btn btn-primary btn-lg">{busy?'인증 확인 중…':'인증번호 확인'}<ShieldCheck size={17}/></button>
   <div className="otp-help-row">
    <button type="button" className="text-link" disabled={busy} onClick={()=>{setStage('email');setOtp('');setError('');setMessage('');}}><ArrowLeft size={14}/>이메일 변경</button>
    <button type="button" className="text-link" disabled={busy||retrySeconds>0} onClick={()=>{void sendCode();}}><RotateCcw size={14}/>{retrySeconds>0?'재발송 '+retrySeconds+'초':'인증번호 재발송'}</button>
   </div>
  </form>}
  {settingPassword&&<form onSubmit={finish} className="form-stack auth-form">
   <div className="otp-verified"><CheckCircle2 size={18}/>이메일 인증이 완료됐어요.</div>
   <label className="input-field">새 비밀번호<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="8자 이상 입력"/></label>
   <label className="input-field">새 비밀번호 확인<input type="password" autoComplete="new-password" minLength={8} required value={passwordAgain} onChange={e=>setPasswordAgain(e.target.value)} placeholder="같은 비밀번호를 다시 입력"/></label>
   <p className="field-hint">다른 ALEPH 서비스에서 쓰던 계정이라면 비밀번호도 함께 변경됩니다.</p>
   {error&&<div className="error-message" role="alert">{error}</div>}
   {message&&<div className="success-message" role="status">{message}</div>}
   <button type="submit" disabled={busy} className="btn btn-primary btn-lg">{busy?'저장 중…':'비밀번호 설정 완료'}<KeyRound size={17}/></button>
  </form>}
  {mode==='login'&&<div className="otp-help-row otp-auth-bottom">
   <button type="button" className="text-link" onClick={()=>switchMode('recovery')}>비밀번호를 잊으셨나요?</button>
  </div>}
  {recovery&&stage!=='password'&&<div className="otp-help-row otp-auth-bottom">
   <button type="button" className="text-link" onClick={()=>switchMode('login')}>로그인 화면으로 돌아가기</button>
  </div>}
  <div className="notice" style={{marginTop:25}}><ShieldCheck size={17}/><span>내 운동 기록은 기본 비공개예요. 공유를 선택한 루틴만 다른 사람이 볼 수 있어요.</span></div>
  <p style={{fontSize:12,marginTop:25,textAlign:'center'}}><Link href="/exercises" className="text-link">로그인 없이 운동 가이드 구경하기 →</Link></p>
 </div></div>;
}
