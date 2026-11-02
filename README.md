# FITPLAN — 운동 루틴 제작·기록·공유 플랫폼

Next.js + TypeScript + Supabase(PostgreSQL/Auth/RLS) + Vercel 기반의 반응형 웹앱입니다.

> GitHub main은 Vercel에 연동되며, 기존 aleph_common 프로젝트 내부의 fitplan 스키마와 함께 사용합니다. 계정/루틴/공유 동작은 실제 테스트로 확인해야 합니다.

## 구현 범위

- 운동 종목 30개와 종목별 WebP 운동 자세 일러스트: 부위별 가이드, 안전 주의사항, 외부 운동 동작 영상 가이드 링크
- 이메일 회원가입/로그인/로그아웃
- 요일별 운동 루틴 생성·조회·수정·삭제(세트·횟수·목표 중량)
- 기본 목록에 없는 운동을 사용자가 직접 등록하고, 내 루틴·운동 기록에서 반복 사용
- 날짜별 운동 수행 기록 생성·조회·수정·삭제(실제 세트·횟수·중량)
- 종목별 최근 vs 직전 기록 비교 및 누적 통계
- 비공개 기본값, 선택한 루틴만 링크 공유·해제
- 비로그인 공개 링크 열람, 로그인한 다른 계정의 독립 사본 생성(직접 등록 운동도 복사)
- 소유자별 PostgreSQL RLS 정책(상위·하위 테이블) 및 모바일 반응형 화면

## 0. 환경 요구사항

Node.js 22 이상, npm, 기존 aleph_common Supabase 프로젝트의 fitplan 스키마, Vercel 계정(배포 시) 필요합니다.

## 1. 의존성 설치

```bash
npm install
```

처음 설치하면 `package-lock.json`이 생성됩니다. **그 파일도 GitHub에 함께 커밋하세요.** 이번 소스 배포 작업 환경에서는 npm 레지스트리 접근이 불가능해 lockfile과 실제 Next 빌드 검증이 완료되지 않았습니다. 연결 가능한 PC/Workbench에서 `npm install && npm run build`로 검증해야 합니다.

## 2. 기존 aleph_common 프로젝트의 fitplan 스키마 활용

기존 aleph_common 프로젝트 내부의 fitplan 스키마만 사용합니다. 다른 과제 스키마는 변경하지 않습니다.

1. Supabase 기존 aleph_common 프로젝트 선택 (기존 과제 테이블 불변).
2. 기존 aleph_common에는 이미 9개 테이블과 RLS, 공유 RPC가 구축되어 있습니다. 새 환경에서는 `supabase/schema.sql`을 먼저 적용합니다.
3. 사용자별 운동 등록을 사용하려면 **그다음** `supabase/custom_exercises.sql`을 실행합니다. 운영 aleph_common에는 이미 적용되어 있으므로 재실행하지 않습니다.
3. 기존 Supabase Authentication > URL Configuration은 다른 ALEPH 과제와 공유하므로 유지합니다. 이번 회원가입은 이메일 링크로 복귀하지 않습니다.
4. Project URL과 Publishable key를 사용합니다. Server secret key는 필요하지 않습니다.
5. FITPLAN 회원가입에 메일 인증은 사용하지 않습니다. 전용 `fitplan-register` Edge Function과 `fitplan.signup_rate_limits`가 필요합니다.

> `schema.sql`은 신규 프로젝트 설치용입니다. 기존 스키마에 여러 번 반복 적용하는 마이그레이션 도구가 아닙니다. `exercise_catalog`에는 앱과 일치하는 초기 30개 종목이 삽입됩니다.

## 3. 환경변수

`.env.example`을 복사해서 `.env.local`에 값을 채워 넣으세요.

```bash
cp .env.example .env.local
```

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
# Secret key is not required: shared routine RPCs are scoped to fitplan schema.
```

- `NEXT_PUBLIC_...` 값만 브라우저에 전송됩니다.
- 공개 공유는 fitplan.get_public_routine RPC, 로그인 복사는 fitplan.copy_public_routine RPC를 사용합니다.
- 기존 과제에서 사용하는 별도 서버 비밀 키를 FITPLAN에 복사하지 마세요.
- 익명 사용자는 공유 토큰으로 허용된 루틴 콘텐츠만 읽고 개인 기록은 읽지 못합니다.

## 4. 실행 / 빌드

```bash
npm run dev
# http://localhost:3000
npm run typecheck
npm run build
```

`.env.local` 없이도 랜딩 화면과 운동 가이드 목록은 열 수 있습니다. **가입·운동 루틴 저장·기록·공유는 실제 DB가 연결되어야 동작합니다.**

## 5. Vercel 배포

1. GitHub에 코드를 푸시하고 Vercel의 `New Project`에서 해당 저장소 Import.
2. 위 환경변수 2개를 Vercel 프로젝트 환경변수에 각각 등록.
3. 프로덕션 URL을 Supabase Auth Redirect URLs에 추가.
4. 재배포한 뒤 아래의 테스트를 수행.

## 6. 계획 v1 검증 체크리스트

- [ ] 새 계정 A 회원가입/로그인 후 루틴 작성 → 저장 → 로그아웃·재로그인 후 유지
- [ ] 운동 가이드 30개와 각 운동의 그림·설명·주의사항·외부 링크 확인
- [ ] A 루틴의 월/수/금 운동 편집 및 저장, 다른 계정 B의 비공개 접근 차단
- [ ] A의 운동 기록 생성/수정/삭제, 같은 종목 2회 이상 기록 후 이전 기록 비교
- [ ] 공유 전 익명 접근 불가 → 공유 활성화 후 시크릿 창 열람 가능
- [ ] 공유 페이지의 개발자 도구 응답에서 이메일·계정 ID·개인 운동 기록이 포함되지 않는지 확인
- [ ] B 계정에서 링크 복사 → 복사된 사본 변경 → A의 원본 변화 없음
- [ ] A 계정에서 공유 중지 → 기존 공유 링크 재조회 시 404
- [ ] Supabase API에 B로 직접 접근하여 A의 `routines`, `routine_days`, `routine_items`, `workout_sessions`, `workout_entries`, `workout_sets` 조회/변조 불가 확인
- [ ] PC/모바일에서 회원가입, 루틴 편집, 운동 기록, 공유 흐름 확인
- [ ] `npm run typecheck` 및 `npm run build` 통과, Vercel 배포 환경에서 재검증

## 운동 영상 안내

운동 상세의 외부 링크는 Muscle & Strength 운동 가이드 사이트로 연결되며, 사이트에 포함된 영상은 원 저작권자에게 있습니다. 일부 영상 또는 URL은 제공 업체 정책에 따라 변경될 수 있습니다. 초기 데이터 30개에 대한 링크의 운영 환경 실접속 검증은 배포 전에 수행해야 합니다. 안전 안내는 일반 정보이며 개인 맞춤 의료 조언이 아닙니다.

## Workbench 검토용

Workbench는 이 저장소의 코드를 작성한 주체가 아니라 **독립적인 코드 리뷰 및 요구사항 검증 도구**로 이용할 예정입니다. `plan.md`의 각 항목과 소스 파일을 비교하고, 실제 실행 및 DB 검증 전에는 `PASS`로 판정하지 않도록 합니다.


## 운동 그림 출처와 라이선스

운동 가이드 그림 30개는 [RepDB Free Exercise Dataset](https://github.com/RepDB/exercise-dataset)의 운동별 512×512 WebP 일러스트를 사용합니다. 앱 내 이용이 허용되는 무료 에셋이며 출처 표시가 필요합니다. 사이트 푸터에 **Exercise data by RepDB (repdb.co)** 링크를 표시합니다. 데이터셋 형태로 별도 재배포하거나 이미지 생성 모델의 입력·학습에 사용하지 않습니다. 파일은 실제 사이트를 위한 `public/exercises/`의 개별 정적 이미지로 포함됩니다. 자세한 조건은 원본 저장소의 `LICENSE-DATA.md`를 참고하세요.

## 사용자 운동 직접 등록

- `루틴 만들기`와 `운동 기록`에서 **목록에 없는 운동 직접 등록**을 눌러 이름·부위·기구를 입력합니다.
- 운동은 계정별로 비공개 저장되고, 다음 루틴과 운동 기록에서 반복 선택할 수 있습니다. 기본 가이드 30개는 그대로 유지됩니다.
- 공유 루틴을 익명 열람할 때 직접 등록 운동은 이름만 노출합니다. 다른 계정에서 복사하면 해당 계정 소유의 운동으로 복제합니다.
- 새 계정 A/B로 직접 등록·재사용·타인 목록 비공개·공유·복사를 별도 검증해야 합니다.

## 간단 회원가입 (2026-11-02 최종 변경)

FITPLAN 필수 요구사항은 계정 생성·로그인·로그아웃 및 계정별 RLS 분리입니다.
회원가입은 이메일, 비밀번호, 비밀번호 확인을 입력하고 **회원가입하기**를 누르는 방식입니다.
이메일 인증번호와 인증 링크 절차는 FITPLAN 회원가입에서 사용하지 않습니다.

- 회원가입은 FITPLAN 전용 Supabase Edge Function `fitplan-register`를 호출합니다. 서버에서 `auth.admin.createUser({email,password,email_confirm:true})`를 실행하고 성공 시 로그인 화면으로 이동합니다. 브라우저에는 관리자 키를 제공하지 않습니다.
- 이미 가입된 이메일은 서버에서 중복 가입을 거절합니다. 기존 계정으로 로그인해야 합니다. 미인증으로 남아 있는 기존 계정의 비밀번호를 새 가입 요청으로 덮어쓰지 않습니다.
- **공용 Supabase의 Confirm email 설정은 변경할 필요가 없습니다.** FITPLAN 가입 요청만 별도 서버에서 신규 계정의 이메일 확인을 생략하며, 다른 ALEPH 서비스의 가입 방식은 유지됩니다.
- **기존 auth.users 계정 및 다른 과제 테이블은 변경하지 않습니다.** 기존에 이메일 확인을 기다리는 계정이 이미 만들어졌다면 자동으로 가입 완료 처리되지 않을 수 있으므로, 우선 새 이메일로 테스트합니다.
- 이메일 발송 한도 문제로 이번 과제에서 비밀번호 찾기·이메일 재설정 기능은 제공하지 않습니다. 계정 복구는 운영자 관리 범위로 남겨 두며 개인 메일 토큰을 공유하지 않습니다.
- 이메일 소유 확인 없이 가입하므로 실제 공개 서비스 운영 시에는 임의 이메일 입력, 계정 남용에 유의해야 합니다. 이번 과제의 테스트용 가입 흐름을 단순화한 선택입니다.

### 가입 및 로그인 검증

- [x] FITPLAN 전용 서버 등록 기능과 요청 제한 적용, 공용 Confirm email 변경 불필요
- [ ] 신규 이메일로 가입 → 회원가입 완료 안내 → 로그인 화면
- [ ] 신규 비밀번호로 로그인 → 루틴 저장 및 기록 확인
- [ ] 이미 가입된 이메일 중복 가입 거절 및 비밀번호 오류 확인
- [ ] 계정 A/B가 서로의 루틴과 기록에 접근하지 못하는지 확인

## 메일 관련 기능 제외 (2026-11-02)

- 이번 과제의 P0 기능인 계정 생성·로그인·로그아웃, 개인 루틴·기록, 공유·복사에 집중합니다.
- FITPLAN UI의 '비밀번호 찾기', '/reset-password', '/auth/confirmed' 및 이메일 인증/인증번호 요청 화면은 사용하지 않습니다.
- 비밀번호를 잃어버린 계정의 직접 복구 UI는 없습니다. 계정 복구 기능은 향후 별도의 이메일 발송 체계를 구축한 뒤 추가할 수 있습니다.
- FITPLAN만 서버에서 신규 계정을 이메일 확인 없이 생성합니다. **기존 공용 Supabase Confirm email 설정은 그대로 둡니다.** 계정 생성 남용을 줄이기 위해 IP·이메일·전체 요청 횟수를 제한합니다.
- 기존 인증 대기 계정은 다른 이메일로 새로 가입해 검증합니다. 관리자로부터 계정을 확인하거나 기존 계정으로 로그인해도 됩니다.


## FITPLAN 단독 인증 없는 가입 서버 (2026-11-02)

- `supabase/functions/fitplan-register/index.ts`는 Supabase Edge Function으로 배포됩니다. 브라우저는 공개 키로 해당 함수를 호출하지만 **관리자 키는 함수의 서버 환경에서만 사용**합니다.
- 서버는 이름/비밀번호 형식을 확인한 뒤 `auth.admin.createUser({email,password,email_confirm:true})`로 **새 계정만 생성**합니다. 기존 계정을 수정하거나 비밀번호를 초기화하지 않습니다.
- 계정 생성 성공 시 세션을 브라우저에 주지 않고 로그인 페이지에서 직접 이메일·비밀번호로 로그인하게 합니다.
- `supabase/fitplan_signup_throttle.sql`은 신규 가입 서버의 요청 수 제한을 위한 테이블과 DB 함수를 구성하며, DB상 키에는 원본 이메일/IP가 아닌 서버에서 해시한 값만 저장합니다. RLS를 켜고 관리자 역할 외 접근을 금지합니다.
- FITPLAN 운영 도메인과 `localhost:3000`만 CORS/Origin 허용 목록에 포함합니다. 브라우저의 Origin 제한만으로 자동화 남용이 완전히 차단되는 것은 아니므로 DB의 시간당 IP 제한·이메일 제한·전체 제한을 병행합니다.
- 기존 `aleph_common`의 Auth Confirm email 설정을 바꾸지 않으므로 다른 ALEPH 앱의 이메일 확인 정책에는 영향을 주지 않습니다. 다만 **FITPLAN이 만드는 계정은 같은 Auth 사용자 저장소에 속하므로** 다른 앱에서도 그 계정으로 로그인 가능한지 별도 정책 검토가 필요합니다.
- 이 방식은 이메일 주소의 실제 소유권을 확인하지 않습니다. 과제/데모 환경의 간단 가입 용도로만 사용하며, 공개 서비스에서는 이메일 확인이나 추가적인 가입 남용 방지 조치를 권장합니다.
- 운영 테스트: 완전히 새 이메일 A/B로 각각 가입·로그인·로그아웃, 기존 이메일 중복 가입 거절, 루틴 저장·RLS 분리 확인. **실제 브라우저 가입·로그인 통합 테스트는 아직 완료 전입니다.**
