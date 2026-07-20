/**
 * 실명 회피 블랙리스트 — **13일차(2026-08-06), Task 007 착수분**
 *
 * 근거: `docs/require/06-prioritization-and-risks.md` D-17 "주의" 항목 —
 * "실존 인물·실존 클럽과 우연히 동일한 이름이 생성될 수 있으므로, 실명 블랙리스트 필터를
 * 생성기에 둔다(D-16의 저작권·초상권 회피 취지 유지)". 소유: 3팀 데이터·밸런싱·배당팀
 * (CLAUDE.md `src/lib/naming/**`).
 *
 * ## 검사 대상
 * `namePools.ts`의 개별 이름 성분(given/family)이 아니라, `generate.ts`가
 * `formatFullName()`으로 **조합한 전체 성명 문자열**만 검사한다 — 흔한 이름 성분 하나가
 * 우연히 유명인의 이름·성과 같은 것은 문제가 아니며(그 자체로는 실존 인물을 지칭하지
 * 않음), 조합된 전체 성명이 특정 실존 인물과 정확히 일치하는 경우만 초상권·저작권
 * 리스크가 있다.
 *
 * ## 목록의 성격
 * 아래 목록은 **예시적**이며 전 세계 축구선수를 빠짐없이 망라하지 않는다(완전성을
 * 주장하지 않음). `namePools.ts`가 지원하는 20개국 각각에서 널리 알려진 선수를 다수
 * 포함해, 무작위 조합이 실제로 이 목록과 충돌할 가능성(예: 포르투갈 `Rui`+`Costa`,
 * 이집트 `Mohamed`+`Salah`, 카메룬 `Rigobert`+`Song`처럼 이름·성 각각이 이미 풀에 있어
 * 우연히 조합될 수 있는 경우)을 실제로 방어한다. 목록 확장이 필요해지면 이 파일에
 * 추가한다(재구현 없이 `RAW_BLACKLIST` 배열만 늘리면 됨).
 */

/** 정규화 전 원본 블랙리스트 — 국적별로 다수 포함(대소문자·공백은 아래에서 정규화). */
const RAW_BLACKLIST: readonly string[] = [
  // 한국
  '손흥민', '박지성', '이강인', '차범근',
  // 일본
  '本田圭佑', '長友佑都', '香川真司',
  // 중국
  '武磊', '郑智',
  // 브라질
  'Thiago Silva', 'Dani Alves', 'Marcelo Vieira', 'David Luiz', 'Alisson Becker',
  'Ederson Moraes', 'Gabriel Jesus',
  // 아르헨티나
  'Lionel Messi', 'Diego Maradona', 'Angel Di Maria', 'Javier Zanetti',
  'Gabriel Batistuta', 'Sergio Aguero',
  // 멕시코
  'Rafael Marquez', 'Javier Hernandez', 'Hugo Sanchez', 'Andres Guardado',
  // 스페인
  'Sergio Ramos', 'Andres Iniesta', 'Alvaro Morata', 'David Villa', 'Xavi Hernandez',
  // 포르투갈
  'Cristiano Ronaldo', 'Luis Figo', 'Rui Costa', 'Pepe Ferreira',
  // 프랑스
  'Kylian Mbappe', 'Zinedine Zidane', 'Antoine Griezmann', 'Paul Pogba',
  'Thierry Henry', 'Karim Benzema',
  // 독일
  'Manuel Neuer', 'Thomas Muller', 'Toni Kroos', 'Mesut Ozil', 'Philipp Lahm',
  // 이탈리아
  'Andrea Pirlo', 'Francesco Totti', 'Gianluigi Buffon', 'Paolo Maldini',
  'Alessandro Del Piero',
  // 잉글랜드
  'Wayne Rooney', 'David Beckham', 'Harry Kane', 'Steven Gerrard', 'Jack Grealish',
  // 네덜란드
  'Johan Cruyff', 'Frank Rijkaard', 'Virgil van Dijk', 'Frenkie de Jong',
  'Memphis Depay',
  // 크로아티아
  'Luka Modric', 'Ivan Rakitic', 'Mario Mandzukic',
  // 나이지리아
  'Jay-Jay Okocha', 'Victor Osimhen', 'Kanu Nwankwo', 'Obafemi Martins',
  // 세네갈
  'Sadio Mane', 'Idrissa Gueye', 'El Hadji Diouf', 'Kalidou Koulibaly',
  // 코트디부아르
  'Didier Drogba', 'Yaya Toure', 'Kolo Toure', 'Wilfried Zaha', 'Gervinho Kone',
  // 가나
  'Asamoah Gyan', 'Michael Essien', 'Andre Ayew', 'Sulley Muntari',
  // 카메룬
  "Samuel Eto'o", 'Roger Milla', 'Rigobert Song',
  // 이집트
  'Mohamed Salah', 'Ahmed Hassan', 'Mohamed Aboutrika',
];

/** 대소문자·앞뒤 공백·연속 공백 차이를 무시하도록 정규화한다. */
function normalize(fullName: string): string {
  return fullName.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** 정규화된 블랙리스트 — O(1) 조회를 위한 Set. */
const BLACKLIST_SET: ReadonlySet<string> = new Set(RAW_BLACKLIST.map(normalize));

/**
 * 조합된 전체 성명이 실존 인물 블랙리스트와 일치하는지 확인한다.
 * 대소문자·공백 차이는 무시하고 비교한다.
 */
export function isBlacklistedFullName(fullName: string): boolean {
  return BLACKLIST_SET.has(normalize(fullName));
}
