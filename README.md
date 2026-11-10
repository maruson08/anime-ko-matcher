# anime-ko-matcher

애니메이션 제목은 하나인데, 서비스마다 표기가 조금씩 다릅니다. 영문 제목으로는 검색이 되지만 한국어로는 찾기 어렵거나, 2기와 극장판이 다른 작품으로 잡히기도 합니다.

이 저장소는 그런 차이를 조금씩 줄이기 위해 만들었습니다. [Anime Archive](https://github.com/maruson08/anime-archive)에서 사용할 한국어 제목과 검색 별칭을 관리하고, 누구나 읽을 수 있는 JSON 파일로 배포합니다. 작품 정보를 전부 모으는 데이터베이스가 아니라 **확인된 매칭을 보완하는 작은 사전**에 가깝습니다.

## 어떻게 동작하나요?

1. `data/titles.json`에 제목과 별칭을 기록합니다.
2. GitHub Actions가 중복 ID와 데이터 형식을 검사하고 정적 JSON을 만듭니다.
3. GitHub Pages에서 `titles.json`을 제공합니다.
4. Anime Archive가 JSON을 가져와 자체 검색 결과의 제목을 보완합니다.

별도 서버는 없습니다. GitHub Pages는 JSON을 전달할 뿐, 요청마다 검색을 처리하지 않습니다. 실제 매칭은 호출하는 애플리케이션에서 실행합니다.

## 데이터 사용

배포 후에는 다음 주소로 접근할 수 있습니다.

```text
https://maruson08.github.io/anime-ko-matcher/titles.json
```

```js
import { matchTitle } from './matcher.mjs';

const response = await fetch(
  'https://maruson08.github.io/anime-ko-matcher/titles.json'
);
if (!response.ok) throw new Error('Title dataset unavailable');

const dataset = await response.json();
const result = matchTitle(dataset, {
  title: 'Chainsaw Man Reze Arc',
  type: 'movie',
});

console.log(result.matched ? result.koTitle : '기존 제목 유지');
```

예제의 `matcher.mjs`는 이 저장소의 `src/matcher.mjs`를 앱에 포함하거나 별도로 배포해서 사용하면 됩니다. JSON을 매 검색 요청마다 다시 받지 말고 캐시하는 편이 좋습니다. 다운로드에 실패하거나 일치하는 항목이 없으면 원래 제목을 그대로 사용하세요.

**매칭 기준:** 검수된 항목만 검색에 사용합니다. 등록된 작품 ID가 있으면 이를 우선 확인합니다. 그렇지 않으면 정규화한 제목의 정확한 별칭만 비교합니다. 시즌과 작품 유형이 맞지 않거나 후보가 여럿이면 결과를 억지로 선택하지 않습니다. 아직 자동 번역이나 유사도 기반 추측은 하지 않습니다.

## 제목 추가하기

`data/titles.json`에 항목을 추가하고 `npm test`를 실행하세요. 필요한 내용은 아래와 같습니다.

- `key`: 저장소 내부에서 사용하는 고유 키
- `type`: `tv`, `movie`, `ova`, `ona`, `special` 중 하나
- `season`: 확인된 시즌 번호, 해당 없으면 `null`
- `titles.ko`: 확인된 한국어 제목
- `aliases`: 실제 검색에서 쓰이는 다른 표기
- `ids`: **확인된 경우에만** 입력하는 AniList/MAL/TMDB 식별자
- `source`, `reviewed`: 입력 경위와 검수 여부. `reviewed: true`일 때는 `source: "verified"`와 `references`에 실제 확인한 HTTPS 출처가 필요합니다

초기 두 항목은 국내 서비스의 한국어 표기와 AniList의 개별 작품 페이지를 대조한 뒤 `reviewed: true`로 전환했습니다. 검수 근거는 각 항목의 `references`에 남겨 두었습니다. 다른 작품을 추가할 때도 **검수되지 않은 항목은 배포할 수 있어도 실제 매칭 결과에서는 제외**합니다.

```bash
npm test   # 빌드 및 매칭 테스트
npm run build
```

`docs/`는 빌드 산출물입니다. 사람이 수정할 파일은 `data/titles.json`입니다. 현재 예약 실행은 새로운 작품을 수집하지 않으며 기존 데이터를 검증한 뒤 다시 배포할 뿐입니다. 입력이 바뀌지 않으면 불필요한 커밋도 만들지 않습니다.

## 배포

GitHub 저장소의 **Settings → Pages → Build and deployment → Source**에서 **GitHub Actions**를 선택하세요. `main`에 변경 사항이 올라가거나 Actions에서 수동 실행하면 정적 데이터가 배포됩니다. `health.json`은 빌드 결과 요약이며 실시간 서버 상태를 뜻하지 않습니다.

## 데이터와 저작권

여기에는 자막 파일, 대사, 번역 본문, 포스터, 외부 서비스의 전체 카탈로그를 넣지 않습니다. 작품 식별에 필요한 짧은 명칭과 직접 관리하는 별칭만 다룹니다.

제목이나 숫자 자체가 일반적으로 저작권 보호 대상이 아니라 해도 **외부 서비스의 이용약관과 데이터베이스 권리**는 별개입니다. 외부 데이터를 대량 복제하거나, 이용 조건이 불분명한 자료를 자동 수집하지 않습니다. 출처를 확인할 수 없는 항목은 검수 전 상태로 표시합니다.

표기 오류나 권리 관련 요청이 있다면 GitHub Issue로 알려주세요. 확인 후 수정하거나 삭제하겠습니다.

## 아직 하지 않는 일

실제 자막을 찾거나 내려받는 기능, 화수별 자막 싱크, 모든 애니메이션의 자동 수집은 지원하지 않습니다. 누락된 작품을 발견할 때마다 검증 가능한 별칭을 더하는 것이 현재 목표입니다.
