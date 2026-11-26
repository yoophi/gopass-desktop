# gopass-desktop

[gopass-ui](https://github.com/codecentric/gopass-ui)의 검색·관리 기능을 Tauri와 React로 다시 만드는 데스크톱 프로젝트입니다. 다른 앱에서 작업하던 중 키보드로 비밀값을 찾아 복사하고, 탐색기에서 로컬 [gopass](https://github.com/gopasspw/gopass) 저장소를 관리하는 두 가지 흐름에 집중합니다.

데스크톱 앱에서 경로를 검색하고 비밀 항목을 생성·수정·복사할 수 있습니다. 별도 Chrome 확장 팝업에서도 로컬 저장소의 항목 경로를 검색할 수 있습니다.

## 개발 환경

pnpm 워크스페이스에서 프런트엔드와 데스크톱 앱의 개발·빌드 명령을 실행합니다. Rust 크레이트는 같은 저장소의 Cargo 워크스페이스에 속합니다. Node.js, pnpm, Rust와 [OS별 Tauri 빌드 도구](https://v2.tauri.app/start/prerequisites/)가 필요합니다. 저장소 조회 시 앱의 `PATH`에서 설정된 `gopass` 실행 파일을 찾을 수 있어야 합니다.

```sh
pnpm install --frozen-lockfile
pnpm dev     # Tauri 개발 창
pnpm check   # TypeScript 검사, Vite 빌드, Rust 검사
pnpm build   # 데스크톱 실행 파일 빌드
```

### 기능 검증

`pnpm test:ui`는 항목 편집과 삭제, 검색창 갱신, 키보드 탐색, 한글 조합 이벤트, 비밀번호 점검과 릴리스 안내를 검사합니다. 처음 실행할 때는 `pnpm exec playwright install chromium`으로 테스트 브라우저를 설치합니다.

macOS에서 다음 명령으로 실제 gopass와의 연결을 확인할 수 있습니다. 테스트는 임시 저장소와 별도의 브라우저 프로필을 사용합니다.

```sh
scripts/test-local-store.sh
pnpm --filter @gopass/chrome-extension build
cargo build -p gopass-native-host
node scripts/test-extension.mjs
```

## 버전 정책

데스크톱 앱의 릴리스 버전은 CalVer `YYYY.M.PATCH` 형식을 따른다.

| 자리 | 뜻 | 예 |
|---|---|---|
| `YYYY` | 릴리스 연도 | `2026` |
| `M` | 릴리스 월. 앞에 0을 붙이지 않는다 | `11` |
| `PATCH` | 같은 달 안에서 0부터 올리는 순번 | `0` |

2026년 11월의 첫 릴리스는 `2026.11.0`, 같은 달의 다음 릴리스는 `2026.11.1`이고 태그는 `v2026.11.0`처럼 붙인다. 달이 바뀌면 `PATCH`는 0으로 돌아간다. 이 형식은 SemVer 비교 규칙으로도 순서가 맞아서 앱의 새 버전 확인이 그대로 동작한다.

버전을 올릴 때는 `apps/desktop/package.json`, `apps/desktop/src-tauri/Cargo.toml`, `apps/desktop/src-tauri/tauri.conf.json` 세 곳을 함께 바꾼다.

## 아키텍처

재사용 가능한 라이브러리는 언어와 관계없이 `packages/*`에 둡니다. `packages/ui`는 공용 React 컴포넌트와 테마를 제공하고, `packages/gopass-core`는 Rust 코어를 제공합니다. 앱은 각 라이브러리의 공개 API를 사용하며 공용 패키지는 앱에 의존하지 않습니다.

**Rust는 헥사고날 아키텍처를 따릅니다.** `packages/gopass-core`가 유스케이스와 외부 기능에 필요한 포트를 정의합니다. `apps/desktop/src-tauri/src/adapters`의 Tauri 명령은 유스케이스를 호출하는 인바운드 어댑터이고, `packages/gopass-cli`는 코어의 포트를 구현하는 아웃바운드 어댑터입니다. `main.rs`에서 구현체를 연결합니다. 코어에는 Tauri, 프로세스 실행, 파일 시스템 의존성을 두지 않습니다.

**React는 [Feature-Sliced Design](https://feature-sliced.design/docs/reference/layers)을 따릅니다.** `apps/desktop/src`에서 상위 레이어가 하위 레이어를 참조합니다. 현재 `app`은 앱 시작과 Query 공급자, `pages/explorer`는 화면 조합, `features/filter-entries`는 검색 입력과 상태, `entities/entry`는 항목 조회, `shared`는 앱에만 필요한 공통 코드를 둘 때 사용합니다. 슬라이스 외부에서는 해당 슬라이스의 `index.ts` 공개 API로 접근하고 같은 레이어의 다른 슬라이스를 직접 참조하지 않습니다.

### Chrome 확장과 공유할 경계

| 패키지 | 사용처 | 책임 |
| --- | --- | --- |
| `@gopass/entries` | 데스크톱 WebView, 확장 팝업·서비스 워커 | 항목 경로 조회 계약(`EntryCatalog`)과 경로 검색. 브라우저 API나 React에 의존하지 않습니다. |
| `@gopass/ui` | 데스크톱 WebView, 확장 팝업 | React 입력 컴포넌트와 Tailwind 테마 |
| `gopass-core`, `gopass-cli` | 데스크톱 프로세스, Chrome 확장용 로컬 네이티브 호스트 | 항목 조회 유스케이스와 로컬 gopass 실행 |

데스크톱은 `EntryCatalog.listPaths()`를 Tauri IPC로 구현합니다. Chrome 확장은 같은 계약을 Native Messaging으로 구현하고, 로컬 호스트에서 Rust 패키지를 재사용합니다. 창 상태, 권한, 메시지 처리는 각 앱이 소유합니다.

### Chrome 확장 설치

루트에서 `pnpm build:extension`을 실행합니다. Chrome의 `chrome://extensions`에서 개발자 모드를 켜고 **압축해제된 확장 프로그램을 로드**로 `apps/chrome-extension/dist`를 선택합니다.

macOS의 Google Chrome에는 다음 명령으로 로컬 호스트를 등록합니다. Linux에서는 첫 번째 경로로 `~/.config/google-chrome/NativeMessagingHosts`를 사용합니다. 등록 후에는 실행 파일이 해당 경로에 있어야 합니다.

```sh
node scripts/native-manifest.mjs "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts" target/release/gopass-native-host
```

Windows에서는 같은 스크립트에 매니페스트를 보관할 디렉터리와 `target/release/gopass-native-host.exe`를 전달합니다. 생성된 매니페스트의 절대 경로를 `HKCU\Software\Google\Chrome\NativeMessagingHosts\dev.yoophi.gopass`의 기본 문자열 값으로 등록합니다. 확장 팝업에서 로컬 호스트로 요청할 수 있는 작업은 경로 목록 조회입니다. [Chrome Native Messaging 문서](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging)

## 주요 기능

화면별 완료 기준과 구현 상태는 [기능 체크리스트](FEATURES.md)에서 관리합니다.

| 화면 | 할 수 있는 일 |
| --- | --- |
| 빠른 검색 | 전역 단축키로 검색창을 열고 경로나 이름으로 항목을 찾습니다. 방향키로 선택하고 Enter로 복사한 뒤 원래 앱으로 돌아갑니다. |
| 저장소 탐색기 | 폴더 트리를 키보드로 탐색하고 검색어로 목록을 좁힙니다. |
| 항목 상세·편집 | 비밀값을 생성하거나 직접 입력합니다. 값을 표시하거나 복사하고, 여러 줄 원문을 편집하고, 삭제 전 내용을 확인합니다. 항목별 변경 이력도 조회합니다. |
| 저장소 관리 | 마운트를 추가·해제하고 저장소를 동기화합니다. 변경 결과를 탐색기와 빠른 검색창에 반영합니다. |
| 비밀번호 점검 | 비밀번호 강도를 확인하고 개선이 필요한 항목을 찾습니다. |
| 설정·환경 진단 | 검색 단축키와 생성할 비밀번호 길이를 설정합니다. gopass 실행, 저장소 접근, GPG 복호화 상태를 확인합니다. |

## 기술 구성

| 기술 | 역할 |
| --- | --- |
| Tauri 2 · Rust | 데스크톱 창, 트레이, 전역 단축키를 관리하고 로컬 gopass CLI를 호출합니다. |
| React · TypeScript · Vite | 탐색기와 빠른 검색창을 구성하고 빌드합니다. |
| Tailwind CSS · shadcn/ui | 검색 목록, 입력 폼, 대화상자를 구성합니다. 탐색기에는 키보드 이동과 선택을 지원하는 [Headless Tree](https://github.com/lukasbach/headless-tree)를 사용합니다. |
| Zustand | 탐색기 검색어처럼 창 안에서 공유하는 화면 상태를 관리합니다. |
| TanStack Query (React Query) | 항목 목록, 마운트, 변경 이력을 조회하고 저장소가 바뀌면 관련 목록을 갱신합니다. |

## 구현 기준

- 빠른 복사는 Rust에서 `gopass show -c`를 호출하고 화면에는 작업 결과만 전달합니다. 평문은 사용자가 표시·편집을 요청했을 때만 가져오고, 해당 화면을 닫거나 숨기면 편집 상태를 비웁니다.
- 한글 입력 중 Enter를 눌러 조합을 확정할 때는 항목 복사가 실행되지 않아야 합니다.
- 빈 저장소도 정상 상태로 표시하고 첫 항목 생성으로 안내합니다.
- 전역 단축키를 등록할 수 없는 환경에서는 앱 메뉴로 검색창을 열 수 있게 합니다. Linux Wayland의 전역 호출 방식은 별도 검증 대상입니다. [전역 단축키 라이브러리 지원 환경](https://github.com/tauri-apps/global-hotkey#platforms-supported)
