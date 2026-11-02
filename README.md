# FITPLAN — 운동 루틴 제작·기록·공유 플랫폼

Next.js + TypeScript + Supabase(PostgreSQL/Auth/RLS) + Vercel 기반의 반응형 웹앱입니다.

> 이 저장소는 구현 소스입니다. 신규 Supabase 프로젝트와 환경변수를 연결해야 로그인·데이터 저장·공유 API가 작동합니다. 현재 제공된 코드만으로 운영 배포가 완료된 것은 아닙니다.

## 구현 범위

- 운동 종목 18개: 부위별 가이드, 안전 주의사항, 외부 운동 동작 영상 가이드 링크
- 이메일 회원가입/로그인/로그아웃
- 요일별 운동 루틴 생성·조회·수정·삭제(세트·횟수·목표 중량)
- 날짜별 운동 수행 기록 생성·조회·수정·삭제(실제 세트·횟수·중량)
- 종목별 최근 vs 직전 기록 비교 및 누적 통계
- 비공개 기본값, 선택한 루틴만 링크 공유·해제
- 비로그인 공개 링크 열람, 로그인한 다른 계정의 독립 사본 생성
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
2. fitplan 스키마, 9개 테이블, RLS 및 RPC는 aleph_common에 설치되어 있습니다. 신규 환경일 때에만 `supabase/schema.sql`을 적용합니다.
3. Supabase Authentication > URL Configuration에서 Site URL 및 Redirect URLs 설정 (개발: `http://localhost:3000`, 운영: 배포 도메인).
4. Project URL과 Publishable key를 사용합니다. Server secret key는 필요하지 않습니다.
5. 로그인 이메일 인증을 켠 경우 확인 메일의 리디렉션 주소도 허용 목록에 있어야 합니다.

> `schema.sql`은 신규 프로젝트 설치용입니다. 기존 스키마에 여러 번 반복 적용하는 마이그레이션 도구가 아닙니다. `exercise_catalog`에는 앱과 일치하는 초기 18개 종목이 삽입됩니다.

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
- [ ] 운동 가이드 18개와 각 운동의 설명·주의사항·외부 링크 확인
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

운동 상세의 외부 링크는 Muscle & Strength 운동 가이드 사이트로 연결되며, 사이트에 포함된 영상은 원 저작권자에게 있습니다. 일부 영상 또는 URL은 제공 업체 정책에 따라 변경될 수 있습니다. 초기 데이터 18개에 대한 링크의 운영 환경 실접속 검증은 배포 전에 수행해야 합니다. 안전 안내는 일반 정보이며 개인 맞춤 의료 조언이 아닙니다.

## Workbench 검토용

Workbench는 이 저장소의 코드를 작성한 주체가 아니라 **독립적인 코드 리뷰 및 요구사항 검증 도구**로 이용할 예정입니다. `plan.md`의 각 항목과 소스 파일을 비교하고, 실제 실행 및 DB 검증 전에는 `PASS`로 판정하지 않도록 합니다.
