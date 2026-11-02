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
3. Supabase Authentication > URL Configuration에서 Site URL 및 Redirect URLs 설정 (개발: `http://localhost:3000`, 운영: 배포 도메인).
4. Project URL과 Publishable key를 사용합니다. Server secret key는 필요하지 않습니다.
5. 로그인 이메일 인증을 켠 경우 확인 메일의 리디렉션 주소도 허용 목록에 있어야 합니다.

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

- Supabase Auth signUp({email,password}) 성공 시 세션이 반환되면 현재 브라우저 세션만 로그아웃하고 로그인 화면으로 이동합니다.
- 세션이 반환되지 않는 경우에는 기존 가입 이메일의 재가입 시도 또는 이메일 확인을 요구하는 설정 등 여러 원인이 있을 수 있으므로, 원인을 단정하지 않고 기존 계정 로그인/설정 점검을 안내합니다.
- 공용 Supabase 프로젝트 aleph_common > Authentication > Providers > Email > **Confirm email OFF**가 필요합니다. 이 설정은 다른 ALEPH 과제에도 공통 적용됩니다.
- **기존 auth.users 계정 및 다른 과제 테이블은 변경하지 않습니다.** 기존에 이메일 확인을 기다리는 계정이 이미 만들어졌다면 자동으로 가입 완료 처리되지 않을 수 있으므로, 우선 새 이메일로 테스트합니다.
- 비밀번호를 잊었을 때만 선택적으로 이메일 재설정 기능을 사용합니다. 이 기능에는 이메일 발송이 필요할 수 있습니다.
- 이메일 소유 확인 없이 가입하므로 실제 공개 서비스 운영 시에는 임의 이메일 입력, 계정 남용에 유의해야 합니다. 이번 과제의 테스트용 가입 흐름을 단순화한 선택입니다.

### 가입 및 로그인 검증

- [ ] Supabase 공용 Auth Email → Confirm email OFF 확인
- [ ] 신규 이메일로 가입 → 회원가입 완료 안내 → 로그인 화면
- [ ] 신규 비밀번호로 로그인 → 루틴 저장 및 기록 확인
- [ ] 이미 가입된 이메일 중복 가입 거절 및 비밀번호 오류 확인
- [ ] 계정 A/B가 서로의 루틴과 기록에 접근하지 못하는지 확인

## 비밀번호 재설정 링크가 localhost로 가는 문제 (2026-11-02)

FITPLAN 비밀번호 재설정 메일의 복귀 주소는 `https://fitplan-sdydy0298-dotcom.vercel.app/reset-password`입니다.
코드에서는 로컬 개발 서버에서 요청하더라도 기본적으로 운영 주소를 사용하며, 필요한 경우 `NEXT_PUBLIC_APP_URL`로 변경할 수 있습니다.

**필수 설정 — Supabase 관리자에서 한 번만 처리**

1. [aleph_common → Authentication → URL Configuration](https://supabase.com/dashboard/project/gbhmupoxedmyphjnudhb/auth/url-configuration)으로 이동합니다.
2. **Redirect URLs** 목록에 `https://fitplan-sdydy0298-dotcom.vercel.app/reset-password`를 정확히 추가하고 저장합니다.
3. 기존 ALEPH 다른 과제의 Redirect URLs는 그대로 유지합니다. **Site URL을 FITPLAN으로 무작정 바꾸지 마세요.** Site URL은 공용 Auth의 기본 복귀 주소로, 다른 과제에 영향을 줄 수 있습니다.
4. 변경 전에 받은 `localhost:3000` 메일 링크는 이미 잘못 만들어졌으므로 폐기하고 FITPLAN 배포 사이트에서 **새 비밀번호 재설정 메일을 다시 요청**합니다.
5. 새 메일 링크를 클릭하면 FITPLAN의 `/reset-password` 페이지에서 새 비밀번호를 설정하고, 자동 로그아웃 후 수동 로그인합니다.
6. 액세스 토큰과 갱신 토큰이 포함된 `#access_token=...` 링크는 누구에게도 전달하지 마세요. 세션 URL이 노출됐다면 안전을 위해 해당 계정의 세션을 종료하고 새 비밀번호를 설정합니다.

검증 시나리오: **새 메일의 링크가 운영 FITPLAN /reset-password로 연결되는지 → 비밀번호 업데이트 → 새 비밀번호 로그인**. 위 Auth URL 설정은 연결된 Supabase 도구에서 직접 변경할 수 없으며, 실제 재설정 링크의 동작은 사용자 브라우저 테스트가 필요합니다.
