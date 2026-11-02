'use client';
import Link from 'next/link';
import {type FormEvent,useState} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowRight,LockKeyhole,ShieldCheck} from 'lucide-react';
import {browserDb} from '@/lib/supabase';
import {useAuth} from '@/components/AuthProvider';
import {friendlyError} from '@/lib/format';

type Mode='login'|'signup'|'recovery';

function authErrorText(err:unknown):string{
 const code=typeof err==='object'&&err!==null&&'code' in err?String(err.code):'';
 const detail=friendlyError(err);
 if(code==='user_already_exists'||/user already registered|already exists/i.test(detail)){
  return '이미 가입된 이메일이에요. 로그인하거나 비밀번호 찾기를 이용해 주세요.';
 }
 if(code==='email_not_confirmed')return '이 계정은 이전에 이메일 인증 대기 상태로 생성됐습니다. 기존 계정의 상태를 먼저 확인해 주세요.';
 if(code==='invalid_credentials')return '이메일 또는 비밀번호가 올바르지 않습니다.';
 if(/rate limit|too many requests/i.test(detail))return '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.';
 return detail;
}

export default function Login(){
 const {configured,refresh}=useAuth();
 const router=useRouter();
 const [mode,setMode]=useState<Mode>('login');
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [passwordAgain,setPasswordAgain]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');

 const switchMode=(next:Mode)=>{
  setMode(next);setPassword('');setPasswordAgain('');
  setError('');setNotice('');
 };

 const submit=async(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  setError('');setNotice('');setBusy(true);
  try{
   if(!configured)throw new Error('Supabase 연결 정보를 확인해 주세요.');
   const db=browserDb();
   const address=email.trim().toLowerCase();
   if(mode==='recovery'){
    const {error}=await db.auth.resetPasswordForEmail(address,{
     redirectTo:window.location.origin+'/reset-password'
    });
    if(error)throw error;
    setNotice('비밀번호 재설정 메일을 요청했습니다. 이메일을 확인해 주세요.');
    return;
   }

   if(mode==='signup'){
    if(password.length<8)throw new Error('비밀번호는 8자 이상 입력해 주세요.');
    if(password!==passwordAgain)throw new Error('비밀번호 확인이 일치하지 않습니다.');

    // With Supabase Auth > Email > Confirm email disabled, signUp returns a session.
    // Never mark a pending / unconfirmed registration as completed.
    const {data,error}=await db.auth.signUp({email:address,password});
    if(error)throw error;
    if(!data.user)throw new Error('회원가입 결과를 확인하지 못했습니다. 다시 시도해 주세요.');
    if(!data.session){
     setError('지금 이메일로 새 계정을 바로 만들 수 없습니다. 이미 가입된 이메일이라면 로그인해 주세요. 처음 사용하는 이메일인데도 이 안내가 나오면 Supabase의 이메일 확인 설정을 점검해야 합니다.');
     return;
    }
    const {error:signOutError}=await db.auth.signOut({scope:'local'});
    if(signOutError)throw new Error('계정은 생성됐지만 자동 로그아웃에 실패했습니다. 로그아웃한 뒤 다시 로그인해 주세요.');
    setMode('login');setPassword('');setPasswordAgain('');
    setNotice('회원가입이 완료됐습니다. 이제 이메일과 비밀번호로 로그인해 주세요.');
    return;
   }

   const {error}=await db.auth.signInWithPassword({email:address,password});
   if(error)throw error;
   await refresh();
   const next=new URLSearchParams(window.location.search).get('next');
   router.push(next?.startsWith('/')&&!next.startsWith('//')?next:'/dashboard');
   router.refresh();
  }catch(err){setError(authErrorText(err));}
  finally{setBusy(false);}
 };

 const signup=mode==='signup';
 const recovery=mode==='recovery';
 const title=signup?'나만의 운동을 시작해요.':recovery?'비밀번호를 재설정해요.':'다시 만나서 반가워요.';
 const description=signup?'계정만 만들면 바로 운동 루틴을 저장할 수 있어요.':
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
  <form onSubmit={submit} className="form-stack auth-form">
   <label className="input-field">이메일
    <input type="email" autoComplete="email" required value={email}
     onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/>
   </label>
   {!recovery&&<label className="input-field">비밀번호
    <input type="password" autoComplete={signup?'new-password':'current-password'} minLength={signup?8:undefined}
     required value={password} onChange={e=>setPassword(e.target.value)}
     placeholder={signup?'8자 이상 입력':'비밀번호 입력'}/>
   </label>}
   {signup&&<label className="input-field">비밀번호 확인
    <input type="password" autoComplete="new-password" minLength={8}
     required value={passwordAgain} onChange={e=>setPasswordAgain(e.target.value)}
     placeholder="비밀번호를 다시 입력"/>
   </label>}
   {error&&<div className="error-message" role="alert">{error}</div>}
   {signup&&error&&<button type="button" className="btn btn-outline" onClick={()=>switchMode('login')}>이미 가입했나요? 로그인하기 <ArrowRight size={15}/></button>}
   {notice&&<div className="success-message" role="status">{notice}</div>}
   <button type="submit" disabled={busy||!configured} className="btn btn-primary btn-lg">
    {busy?'처리 중…':signup?'회원가입하기':recovery?'재설정 메일 보내기':'로그인하기'}
    <ArrowRight size={17}/>
   </button>
  </form>
  <div className="auth-bottom-link">
   {recovery?
    <button type="button" className="text-link" onClick={()=>switchMode('login')}>로그인으로 돌아가기</button>:
    <button type="button" className="text-link" onClick={()=>switchMode('recovery')}>비밀번호를 잊으셨나요?</button>}
  </div>
  <div className="notice" style={{marginTop:25}}>
   <ShieldCheck size={17}/><span>내 운동 기록은 기본 비공개예요. 공유를 선택한 루틴만 다른 사람이 볼 수 있어요.</span>
  </div>
  <p style={{fontSize:12,marginTop:25,textAlign:'center'}}>
   <Link href="/exercises" className="text-link">로그인 없이 운동 가이드 구경하기 →</Link>
  </p>
 </div></div>;
}
