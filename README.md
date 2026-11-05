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

## FITPLAN 전용 회원가입·로그인 (2026-11-02)

FITPLAN은 기존 `aleph_common` Supabase 프로젝트와 `fitplan` 스키마를 유지합니다.
다른 과제의 계정 및 비밀번호를 재사용하지 않습니다. FITPLAN 회원은
`fitplan.users`에서 실제 이메일로 관리합니다.

### 구조

- `fitplan.users`: FITPLAN 회원의 이메일, 내부 로그인 주소, 표시 이름, 가입일 및 로그인 시각. 이메일은 FITPLAN 안에서만 유일합니다.
- Supabase Auth: 비밀번호 해시와 JWT 세션을 관리합니다. 실제 이메일 대신 FITPLAN 전용 임의 내부 주소(`fp-...@fitplan.invalid`)로 별도 Auth ID를 생성합니다.
- `fitplan.profiles`, 운동 루틴·기록 및 공유 RLS: 해당 FITPLAN Auth ID를 사용합니다.
- 다른 ALEPH 서비스에 같은 실제 이메일이 있더라도 FITPLAN 회원가입은 별도로 가능합니다. 비밀번호도 서로 다르게 설정할 수 있습니다.

### 이용 흐름

1. 회원가입 화면에서 이메일·비밀번호·비밀번호 확인 입력
2. `fitplan-register` Edge Function (`action: 'register-v2'`)에서 요청 제한과 FITPLAN 회원 중복 검사
3. 새 내부 Auth 계정 생성, `fitplan.users`·`fitplan.profiles` 등록 후 성공 메시지 표시
4. 로그인 화면에서 실사용 이메일·FITPLAN 비밀번호 입력
5. `fitplan-register` (`action: 'login-v2'`)이 내부 로그인 주소를 찾아 암호 인증 후 세션을 전달
6. 브라우저가 Supabase 세션을 저장하고 `fitplan` RLS로 개인 데이터를 조회·저장

**주의:** 실제 이메일 주소의 소유권을 검증하지 않는 과제/데모 방식입니다. FITPLAN에서 이메일 인증/재발송 및 비밀번호 재설정 기능은 제공하지 않습니다. 공개 운영 시에는 이메일 인증과 계정 복구 및 추가적인 자동 가입 방지를 검토해야 합니다. 비밀번호나 서버 비밀 키를 FITPLAN 테이블, 프런트엔드 소스에 저장하지 않습니다.

### 배포·재현

- 서버 코드: `supabase/functions/fitplan-register/index.ts`
- 추가 회원 테이블 DDL: `supabase/schema.sql` 마지막 부분
- 요청 제한 DDL: `supabase/fitplan_signup_throttle.sql`
- Edge Function은 JWT 확인을 비활성화하고, Origin·공개키·입력값 검증과 DB 기반 요청 제한을 수행합니다.
- 기존 공용 Auth 설정 및 다른 과제 테이블은 건드리지 않습니다.

### 확인할 내용

- [x] FITPLAN 회원 테이블 생성 및 RLS 확인
- [x] 회원가입·로그인 API 및 웹사이트 코드 반영
- [x] GitHub/Vercel 배포 상태 확인
- [ ] 신규 이메일 회원가입 → 로그인 → 로그아웃 → 재로그인 브라우저 테스트
- [ ] 다른 과제와 같은 이메일로 서로 다른 비밀번호 사용 테스트
- [ ] 실제 루틴 저장·기록·공유 및 계정 A/B 간 RLS 확인

## 주간 운동 루틴 시작과 이번 주만 수정 (2026-11-04)

**사용 순서**

1. [내 루틴](/routines)에서 원하는 루틴을 열고 **이 루틴으로 시작**을 선택합니다. 여러 루틴을 저장해도 실제 플래너는 선택된 루틴 **하나**만 반복합니다.
2. [운동 플래너](/planner)에서 이번 주 요일과 달성률을 확인합니다. 다음 주에도 기본 루틴이 자동 반복됩니다.
3. 특정 요일에 운동을 추가하거나 빼고 싶다면 **이번 주만 수정**을 선택합니다. 운동 종목, 순서, 목표 세트·반복 횟수·중량을 수정하고 저장하세요. 기본 루틴은 그대로 남습니다.
4. **운동 시작**을 눌러 해당 요일의 주간 계획을 불러옵니다. 계획한 세트 중 실제 수행한 세트만 **완료** 체크합니다. 체크한 세트만 운동 기록에 저장되고 일부 수행은 일부 완료로 표시됩니다.
5. 기본 루틴 자체를 영구 수정하려면 [내 루틴](/routines)에서 **내 루틴 수정**을 누릅니다. 진행 중인 주간 계획을 보존하고 다음 주 반복 계획에 변경된 템플릿이 반영됩니다.
6. 다른 사람이 공유한 루틴을 가져왔다면 **운동 추가·삭제하고 나만의 루틴 만들기** 또는 **수정 없이 이 루틴으로 시작** 중 하나를 선택할 수 있습니다.

**데이터 구성**

- 회원·인증·기존 운동 데이터는 기존 Supabase 프로젝트의 `fitplan` 스키마에 유지합니다.
- `fitplan.plan_versions`: 활성화한 루틴의 시점별 스냅샷. 과거 주차 계획을 복원할 때 사용합니다.
- `fitplan.weekly_plans`: 사용자당 주차 하나의 고유 스냅샷. 주 단위 커스터마이징을 저장합니다.
- `supabase/fitplan_weekly_plans.sql`: 별도 FITPLAN 환경 구축 시 적용하는 추가 DDL 및 RLS.
- 기존 테이블을 초기화하거나 다른 과제 계정을 삭제하지 않았습니다.
- `npm run check:planner`, `npm run check:week-plan`으로 계산 및 자동 반복 단위 테스트를 실행할 수 있습니다.

**확인 필요:** 새 계정에서 실제 루틴 시작 → 주차 편집 → 부분 기록 → 이전 주 확인을 브라우저에서 검증해 주세요. 루틴 삭제나 한 주 중간의 다른 루틴 재선택은 해당 주의 완료 계산에 영향을 줄 수 있습니다.


## 최종 제출 · FITPLAN 3차 기능 (2026-11-05)

### 새로 추가한 기능

| 위치 | 기능 | 주요 내용 |
| --- | --- | --- |
| `/calendar` | 월간 운동 캘린더 | 실제 기록과 당시 주간 계획으로 완료·일부 완료·미기록·예정·휴식·루틴 시작 전을 표시, 날짜 클릭 후 종목별 세트 확인 |
| `/progress` | 운동 성장 그래프 | 최근 4·12·24주 선택, 주간 수행 세트·주간 목표 달성률·종목별 최고 중량 추이와 최근/이전 기록 비교 |
| `/discover` | 공개 루틴 둘러보기 | 제목 검색, 주간 운동 일수 필터, 공개 루틴 상세·내 계정 복사·개인화 |
| `/workouts` | 운동 기록 검색·필터 | 운동 종목·루틴·메모 검색, 7·30·90일/직접 날짜 범위, 루틴 선택, 정렬 및 기록 수정·삭제 |

### 공개 루틴 개인정보 보호

- 공유 링크를 생성하는 것만으로는 `/discover`에 공개되지 않습니다.
- 루틴 상세 화면에서 **공유 링크 만들기 → 공개 루틴 둘러보기에 표시**를 별도로 체크해야 목록에 나타납니다.
- 체크 해제 시 목록에서만 숨기고 기존 링크는 유지됩니다. **공유 중지** 시 목록에서 숨기고 기존 링크도 무효화합니다.
- 공개 목록 API는 루틴 이름·설명·운동 요일·종목 수·토큰만 반환하고, 작성자의 이메일·회원 ID·운동 기록은 포함하지 않습니다.
- 모든 기존 공유 링크는 마이그레이션의 기본값 `discoverable=false`로 유지됩니다. 실제 사용자 동의 없이 공개 목록으로 전환하지 않습니다.
- 운영 DB 변경: `supabase/final_public_discovery.sql`, `fitplan.routine_shares.discoverable`, `fitplan.list_discoverable_routines` (읽기 전용 공개 RPC).

### 계산 기준과 한계

- 월간 캘린더는 기존 `weekly_plans` 스냅샷이 있는 경우 해당 주의 계획을 그대로 읽고, 아직 저장되지 않은 주는 `plan_versions`를 통해 조회 시점에 기본 계획을 예측합니다. 이 화면에서 개인 운동 기록을 자동 생성하지 않습니다.
- 계획 세트 수에 대한 실제 완료 세트는 중복 초과 계산하지 않도록 종목별 상한을 적용합니다. 계획 없이 운동한 날은 자유 운동으로 구분합니다.
- 성장 분석은 기록한 운동 세트와 중량을 계산하는 것이며 신체 능력 또는 건강 상태를 판정하는 기능이 아닙니다.
- 기존 회원·루틴·운동 기록과 다른 ALEPH 스키마는 변경하지 않았습니다.

### 직접 재현하는 방법

1. **캘린더:** 로그인 → `/calendar` → 이전 달·이번 달 이동 → 특정 날짜 선택 → 운동 종목·달성률 확인
2. **성장 분석:** `/progress` → 4주/12주/24주 변경 → 기록된 종목 선택 → 중량 그래프와 주간 세트·달성률 확인
3. **공개 탐색:** 내 루틴에서 공유 활성화 → **공개 루틴 둘러보기에 표시** 체크 → 시크릿 창 `/discover` 목록 확인 → 다른 계정에서 복사·수정 → 다시 체크 해제해 목록에서 사라지는지 확인
4. **운동 기록:** `/workouts` → 운동 이름 검색 → 기간·루틴 필터·정렬 → 조건 초기화 후 기록 수정 확인

### 자동 테스트

- `npm run check:planner`
- `npm run check:week-plan`
- `npm run check:workout-resume`
- `npm run check:final`
- `npm run check:auth-cors`
- `npm run typecheck && npm run build`

실제 환경에서 테스트용 이메일은 회원가입 요청 제한에 걸릴 수 있습니다. 이 제한을 끄거나 우회하지 말고 기존 테스트 계정 재사용 또는 DB 계산 테스트로 검증합니다.

전체 검증 내역과 남은 제한 사항은 `FINAL_RELEASE_QA.md`를 참고하세요.
