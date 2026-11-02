import type {Metadata,Viewport} from 'next';
import './globals.css';
import SiteHeader from '@/components/SiteHeader';
import {AuthProvider} from '@/components/AuthProvider';
export const metadata:Metadata={title:{default:'FITPLAN | 나에게 맞는 운동의 시작',template:'%s | FITPLAN'},description:'운동 루틴을 만들고, 실제 운동을 기록하고, 좋은 루틴을 함께 나누세요.',applicationName:'FITPLAN',icons:{icon:'/icon.svg',shortcut:'/icon.svg'}};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#102b36'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ko"><body><AuthProvider><SiteHeader/><main>{children}</main><footer className="site-footer"><span>© FITPLAN</span><span>Make a plan. Make progress.</span><a href="https://repdb.co" target="_blank" rel="noopener noreferrer">Exercise data by RepDB (repdb.co)</a></footer></AuthProvider></body></html>;}
