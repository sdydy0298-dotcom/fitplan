'use client';
import Link from 'next/link';
import {FormEvent,useState} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowRight,LockKeyhole,ShieldCheck} from 'lucide-react';
import {browserDb} from '@/lib/supabase';
import {useAuth} from '@/components/AuthProvider';
import {friendlyError} from '@/lib/format';
export default function Login(){
 const [mode,setMode]=useState<'login'|'signup'|'recovery'>('login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const {configured,refresh}=useAuth(),router=useRouter();
 const submit=async(e:FormEvent)=>{
  e.preventDefault();setError('');setMessage('');setBusy(true);
  try{
   if(!configured)throw new Error('Supabase 연결 설정이 필요합니다.');
   if(mode!=='recovery'&&password.length<8)throw new Error('비밀번호는 8자 이상 입력해 주세요.');
   const db=browserDb();
   if(mode==='recovery'){const {error}=await db.auth.resetPasswordForEmail(email.trim(),{redirectTo:`${window.location.origin}/reset-password`});if(error)throw error;setMessage('재설정 요청을 처리했습니다. 이 주소로 메일을 받을 수 있다면 받은편지함과 스팸함에서 안내를 확인해 주세요. 메일이 안 오면 이메일 발송 설정 확인이 필요합니다.');return;}
   if(mode==='signup'){
    const {data,error}=await db.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:`${window.location.origin}/login`}});
    if(error)throw error;
    if(data.session)await db.auth.signOut();
    setMode('login');setPassword('');
    setMessage(data.session?'회원가입이 완료됐습니다. 이제 로그인해 주세요.':'가입 요청을 처리했습니다. 새 이메일이라면 인증 메일을 확인해 주세요. 이미 가입한 이메일이면 새 계정이 생성되지 않으므로 기존 비밀번호로 로그인하거나 비밀번호 찾기를 이용해 주세요.');
   }else{
    const {error}=await db.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;
    await refresh();
    const next=new URLSearchParams(window.location.search).get('next');
    router.push(next?.startsWith('/')&&!next.startsWith('//')?next:'/dashboard');router.refresh();
   }
  }catch(err){setError(friendlyError(err));}finally{setBusy(false);}
 };
 return <div className="auth-wrap"><div className="auth-panel"><span className="eyebrow"><LockKeyhole size={14}/> YOUR ACCOUNT</span><h1>{mode==='recovery'?'비밀번호 재설정':mode==='login'?'다시 만나서 반가워요.':'운동의 시작을 함께해요.'}</h1><p>{mode==='recovery'?'가입한 이메일로 비밀번호 변경 안내를 보내드려요.':mode==='login'?'내 루틴과 기록은 여기 그대로 있어요.':'계정을 만들고 나만의 루틴을 저장해 보세요.'}</p>{mode!=='recovery'&&<div className="auth-tab"><button type="button" className={mode==='login'?'active':''} onClick={()=>{setMode('login');setError('');setMessage('');}}>로그인</button><button type="button" className={mode==='signup'?'active':''} onClick={()=>{setMode('signup');setError('');setMessage('');}}>회원가입</button></div>}<form onSubmit={submit} className="form-stack auth-form"><label className="input-field">이메일<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>{mode!=='recovery'&&<label className="input-field">비밀번호<input type="password" autoComplete={mode==='login'?'current-password':'new-password'} minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="8자 이상 입력"/></label>}{mode==='signup'&&<p className="field-hint">기존 ALEPH 과제와 회원 인증 계정은 공유합니다. 이미 가입한 이메일이라면 로그인해 주세요.</p>}{error&&<div className="error-message" role="alert">{error}</div>}{message&&<div className="success-message" role="status">{message}</div>}<button type="submit" disabled={busy||!configured} className="btn btn-primary btn-lg">{busy?'처리 중…':mode==='login'?'로그인하기':mode==='signup'?'계정 만들기':'재설정 이메일 보내기'}<ArrowRight size={17}/></button></form><div className="button-row" style={{justifyContent:'center',marginTop:16}}><button className="text-link" type="button" onClick={()=>{setMode(mode==='recovery'?'login':'recovery');setError('');setMessage('');setPassword('');}}>{mode==='recovery'?'로그인 화면으로 돌아가기':'비밀번호를 잊으셨나요?'}</button></div><div className="notice" style={{marginTop:25}}><ShieldCheck size={17}/><span>내 운동 기록은 기본 비공개예요. 공유를 선택한 루틴만 다른 사람이 볼 수 있어요.</span></div><p style={{fontSize:12,marginTop:25,textAlign:'center'}}><Link href="/exercises" className="text-link">로그인 없이 운동 가이드 구경하기 →</Link></p></div></div>;
}
