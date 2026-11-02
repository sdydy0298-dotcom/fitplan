import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers(){
    return [{
      source:'/share/:path*',
      headers:[
        {key:'Referrer-Policy',value:'no-referrer'},
        {key:'X-Robots-Tag',value:'noindex, nofollow'},
        {key:'Cache-Control',value:'private, no-store, max-age=0'}
      ]
    }];
  }
};
export default nextConfig;
