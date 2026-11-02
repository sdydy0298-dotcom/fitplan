'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {CheckCircle2,Info,LockKeyhole} from 'lucide-react';
import {browserDb,isConfigured} from '@/lib/supabase';

type Result='checking'|'success'|'failed';
export default function ConfirmedEmail(){
 const [result,setResult]=useState<Result>('checking');
 const [detail,setDetail]=useState('');
 useEffect(()=>{
  let live=true;
  const params=new URLSearchParams(window.location.search);
  const hash=new URLSearchParams(window.location.hash.replace(/^#/,''));
  const reason=params.get('error_description')||hash.get('error_description');
  if(reason){setDetail('인증 링크가 만료됐거나 올바르지 않습니다. 회원가입 메일을 다시 확인해 주세요.');setResult('failed');return;}
  if(!isConfigured()){setDetail('현재 인증 서버 연결이 구성되지 않았습니다.');setResult('failed');return;}
  async function check(){
   try{
    const db=browserDb();
    // Supabase JS processes the verification redirect and initializes a session.
    const {data,error}=await db.auth.getUser();
    if(!live)return;
    if(error||!data.user?.email_confirmed_at){
     setDetail('인증 결과를 확인하지 못했습니다. 인증 링크를 다시 열거나 로그인해 확인해 주세요.');
     setResult('failed');return;
    }
    const {error:outError}=await db.auth.signOut();
    if(!live)return;
    if(outError){setDetail('이메일 확인은 완료됐지만 자동 로그아웃에 실패했습니다. 로그아웃한 뒤 로그인해 주세요.');}
    setResult('success');
   }catch{
    if(live){setResult('failed');setDetail('인증 정보를 확인하는 중 오류가 발생했습니다. 로그인 화면에서 다시 확인해 주세요.');}
   }
  }
  void check();
  return()=>{live=false;};
 },[]);
 const success=result==='success';
 return <div className="auth-wrap"><div className="auth-panel auth-confirmed-page">
  <span className="eyebrow"><LockKeyhole size={14}/> FITPLAN ACCOUNT</span>
  {result==='checking'?<><h1>이메일 인증 확인 중</h1><p>메일의 확인 링크를 처리하고 있어요.</p></>:
  <>
   <div className={'auth-confirmation-icon '+(success?'':'auth-confirmation-icon-muted')}>
    {success?<CheckCircle2 size={29}/>:<Info size={29}/>}
   </div>
   <h1>{success?'이메일 인증이 완료됐어요.':'인증을 확인하지 못했어요.'}</h1>
   <p>{success?'이제 가입할 때 설정한 이메일과 비밀번호로 로그인할 수 있어요.':detail}</p>
   {success&&detail&&<p className="field-hint">{detail}</p>}
   <Link className="btn btn-primary btn-lg auth-confirm-login" href="/login">로그인 화면으로 돌아가기</Link>
  </>}
 </div></div>;
}
