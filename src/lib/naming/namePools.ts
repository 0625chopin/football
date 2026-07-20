/**
 * 국적별 이름 풀 — **13일차(2026-08-06), Task 007 착수분**
 *
 * 근거: `docs/require/06-prioritization-and-risks.md` D-17("이름 문화권 = 국적 기반
 * 다국적 혼합" — 선수의 `nationality` 필드를 근거로 해당 국가의 이름 풀에서 성·이름을
 * 생성한다) / D-16(FM 등 실데이터 미사용, 전부 시드 기반 절차적 생성) /
 * `docs/team-schedule/03-데이터밸런싱배당팀.md` 13일차. 소유: 3팀 데이터·밸런싱·배당팀
 * (CLAUDE.md `src/lib/naming/**`).
 *
 * ## 이 파일이 담는 것 / 담지 않는 것
 * - **담는 것**: 국적 코드(ISO 3166-1 alpha-2)별 이름(given) · 성(family) 후보군 정적
 *   데이터, 그리고 지원 국적 코드 목록.
 * - **담지 않는 것**: 실제 추첨 로직(같은 디렉터리 `generate.ts`), 실명 회피 필터
 *   (`blacklist.ts`).
 *
 * ## 왜 공통코드(`src/lib/config/**`)가 아니라 여기 정적 데이터인가
 * D-17 결정문 파급 ①은 "국가 목록과 각국 비중은 공통코드로 관리"라고 적었지만, 3팀이
 * 12일차에 동결한 공통코드 36그룹 카탈로그(`docs/require/05-data-requirements.md`
 * 5.12.1절 표 기준, `catalog.ts`)에는 국적/이름 풀 그룹이 없다 — 05문서 표 자체에 없던
 * 항목이라 9~12일차 어느 시점에도 등록되지 않았다. 이미 동결된 36그룹 카탈로그에 지금
 * 새 그룹을 끼워 넣는 것은 이 시점(13일차) 스코프 밖이므로, 이름 풀은 이 모듈이 직접
 * 소유하는 정적 데이터로 둔다. D-17과의 이 괴리는 팀장 보고 대상이다(문서 갱신은 팀장
 * 판단 이후).
 *
 * ## 데이터 성격
 * 아래 이름 성분(given/family)은 각 문화권에서 흔히 쓰이는 이름·성 **성분**일 뿐,
 * 특정 실존 인물을 지칭하지 않는다(D-16). 다만 무작위 조합 과정에서 실존 유명 인물의
 * 전체 성명과 우연히 일치할 수 있으므로, 그 방어는 `generate.ts`가 `blacklist.ts`를
 * 통해 수행한다(이 파일의 책임 밖).
 *
 * ## 국가 커버리지
 * D-17 "다국적 혼합" 취지에 맞춰 대륙별 대표 국가를 커버한다. 15일차 Mock 월드
 * 팩토리가 실제 선수에게 국적을 배정할 때는 반드시 `SUPPORTED_NATIONALITY_CODES` 안에서만
 * 골라야 한다 — 밖의 코드를 넘기면 `generate.ts`가 명시적으로 실패한다(조용한 폴백 없음,
 * "국적별 이름 풀 매칭 100%" 수락 기준 보호).
 */

import type { NationalityCode } from '@/types';

/**
 * 성명 표기 순서. 한중일(CJK)은 성이 앞에 오고 띄어쓰기 없이 붙여 쓰지만
 * (예: `김민준`), 그 외 국가는 이름이 앞에 오고 공백으로 구분한다(예: `Lucas Silva`).
 */
export type NameOrder = 'FAMILY_FIRST_NO_SPACE' | 'GIVEN_FIRST_SPACED';

/** 국적 하나의 이름 풀. */
export interface NationalityNamePool {
  /** ISO 3166-1 alpha-2 국적 코드. */
  readonly code: NationalityCode;
  /** 이 국적의 이름(given name) 후보군. */
  readonly givenNames: readonly string[];
  /** 이 국적의 성(family name) 후보군. */
  readonly familyNames: readonly string[];
  /** 이 국적의 성명 표기 순서. */
  readonly nameOrder: NameOrder;
}

/** 성이 이름보다 앞에 오고 띄어쓰기가 없는 국적 코드(한중일). */
const FAMILY_FIRST_NATIONALITY_CODES: ReadonlySet<string> = new Set(['KR', 'JP', 'CN']);

/**
 * 이름·성 후보를 해당 국적의 표기 순서에 맞춰 하나의 전체 성명 문자열로 합친다.
 * `generate.ts`와 `blacklist.ts`가 동일한 조합 결과를 보도록 이 함수 하나로 단일화한다.
 */
export function formatFullName(
  pool: NationalityNamePool,
  givenName: string,
  familyName: string,
): string {
  return pool.nameOrder === 'FAMILY_FIRST_NO_SPACE'
    ? `${familyName}${givenName}`
    : `${givenName} ${familyName}`;
}

/**
 * 원시 데이터. `code`는 아직 `NationalityCode`로 브랜드되지 않은 순수 문자열이며,
 * 아래 `NATIONALITY_NAME_POOLS` 조립 시 이 파일에서 **1회만** 캐스트한다
 * (`src/types/brand.ts` 규약 — 실제 값 생성은 단일 지점에서만).
 */
const RAW_NAME_POOLS: readonly {
  readonly code: string;
  readonly givenNames: readonly string[];
  readonly familyNames: readonly string[];
}[] = [
  {
    code: 'KR',
    givenNames: [
      '민준', '서준', '도윤', '예준', '시우', '주원', '하준', '지호', '지훈', '준서',
      '연우', '승우',
    ],
    familyNames: ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임'],
  },
  {
    code: 'JP',
    givenNames: [
      '大翔', '陽翔', '蓮', '樹', '悠真', '陸', '朝陽', '颯太', '結翔', '湊',
      '大和', '悠人',
    ],
    familyNames: ['佐藤', '鈴木', '高橋', '田中', '渡辺', '伊藤', '山本', '中村', '小林', '加藤'],
  },
  {
    code: 'CN',
    givenNames: ['伟', '强', '磊', '洋', '勇', '军', '杰', '涛', '明', '超', '刚', '波'],
    familyNames: ['王', '李', '张', '刘', '陈', '杨', '黄', '赵', '周', '吴'],
  },
  {
    code: 'BR',
    givenNames: [
      'Gabriel', 'Lucas', 'Matheus', 'Rafael', 'Bruno', 'Thiago', 'Felipe', 'Diego',
      'Vitor', 'Caio', 'Igor', 'Renan',
    ],
    familyNames: [
      'Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Rodrigues',
      'Almeida', 'Nascimento', 'Carvalho',
    ],
  },
  {
    code: 'AR',
    givenNames: [
      'Mateo', 'Santiago', 'Benjamin', 'Joaquin', 'Tomas', 'Facundo', 'Nicolas',
      'Franco', 'Ezequiel', 'Agustin', 'Ivan', 'Bruno',
    ],
    familyNames: [
      'Gonzalez', 'Rodriguez', 'Fernandez', 'Lopez', 'Martinez', 'Perez', 'Sosa',
      'Romero', 'Alvarez', 'Torres',
    ],
  },
  {
    code: 'MX',
    givenNames: [
      'Alejandro', 'Emiliano', 'Santiago', 'Diego', 'Leonardo', 'Angel', 'Rodrigo',
      'Fernando', 'Jesus', 'Ricardo', 'Ivan', 'Ulises',
    ],
    familyNames: [
      'Hernandez', 'Garcia', 'Martinez', 'Lopez', 'Gonzalez', 'Perez', 'Sanchez',
      'Ramirez', 'Cruz', 'Flores',
    ],
  },
  {
    code: 'ES',
    givenNames: [
      'Alejandro', 'Pablo', 'Alvaro', 'Sergio', 'Javier', 'Adrian', 'Hugo', 'Marcos',
      'Ivan', 'Ruben', 'Mario', 'Dani',
    ],
    familyNames: [
      'Garcia', 'Martinez', 'Lopez', 'Sanchez', 'Perez', 'Gomez', 'Fernandez',
      'Diaz', 'Moreno', 'Alvarez',
    ],
  },
  {
    code: 'PT',
    givenNames: [
      'Joao', 'Rui', 'Bruno', 'Tiago', 'Diogo', 'Andre', 'Nuno', 'Miguel', 'Pedro',
      'Ricardo', 'Fabio', 'Goncalo',
    ],
    familyNames: [
      'Silva', 'Santos', 'Ferreira', 'Pereira', 'Oliveira', 'Costa', 'Rodrigues',
      'Martins', 'Carvalho', 'Sousa',
    ],
  },
  {
    code: 'FR',
    givenNames: [
      'Lucas', 'Hugo', 'Louis', 'Nathan', 'Leo', 'Gabriel', 'Enzo', 'Theo', 'Adam',
      'Mathis', 'Antoine', 'Kylian',
    ],
    familyNames: [
      'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit',
      'Durand', 'Leroy', 'Moreau',
    ],
  },
  {
    code: 'DE',
    givenNames: [
      'Lukas', 'Leon', 'Finn', 'Paul', 'Jonas', 'Felix', 'Maximilian', 'Elias',
      'Tim', 'Niklas', 'Julian', 'Moritz',
    ],
    familyNames: [
      'Muller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner',
      'Becker', 'Schulz', 'Hoffmann',
    ],
  },
  {
    code: 'IT',
    givenNames: [
      'Alessandro', 'Lorenzo', 'Matteo', 'Andrea', 'Francesco', 'Gabriele',
      'Riccardo', 'Federico', 'Davide', 'Simone', 'Marco', 'Luca',
    ],
    familyNames: [
      'Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo',
      'Ricci', 'Marino', 'Greco',
    ],
  },
  {
    code: 'GB',
    givenNames: [
      'Jack', 'Oliver', 'Harry', 'George', 'Charlie', 'Jacob', 'Thomas', 'James',
      'William', 'Callum', 'Ethan', 'Alfie',
    ],
    familyNames: [
      'Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Johnson',
      'Davies', 'Robinson', 'Wright',
    ],
  },
  {
    code: 'NL',
    givenNames: [
      'Daan', 'Sem', 'Milan', 'Levi', 'Luuk', 'Finn', 'Sven', 'Bram', 'Thijs',
      'Ruben', 'Jesse', 'Dylan',
    ],
    familyNames: [
      'De Jong', 'Jansen', 'De Vries', 'Van den Berg', 'Van Dijk', 'Bakker',
      'Visser', 'Smit', 'Meijer', 'De Boer',
    ],
  },
  {
    code: 'HR',
    givenNames: [
      'Luka', 'Marko', 'Ivan', 'Josip', 'Ante', 'Filip', 'Petar', 'Karlo', 'Toni',
      'Nikola', 'Dominik', 'Bruno',
    ],
    familyNames: [
      'Horvat', 'Kovacevic', 'Babic', 'Maric', 'Juric', 'Kovac', 'Novak', 'Matic',
      'Knezevic', 'Vukovic',
    ],
  },
  {
    code: 'NG',
    givenNames: [
      'Chinedu', 'Emeka', 'Ifeanyi', 'Uche', 'Obinna', 'Chidi', 'Femi', 'Tunde',
      'Segun', 'Kayode', 'Ayo', 'Bayo',
    ],
    familyNames: [
      'Okafor', 'Okoro', 'Eze', 'Adeyemi', 'Balogun', 'Chukwu', 'Obi', 'Nwosu',
      'Adebayo', 'Okonkwo',
    ],
  },
  {
    code: 'SN',
    givenNames: [
      'Mamadou', 'Ibrahima', 'Ousmane', 'Cheikh', 'Moussa', 'Abdou', 'Modou',
      'Alassane', 'Pape', 'Serigne', 'Babacar', 'Lamine',
    ],
    familyNames: [
      'Diop', 'Ndiaye', 'Fall', 'Diallo', 'Gueye', 'Sow', 'Ba', 'Sarr', 'Faye',
      'Cisse',
    ],
  },
  {
    code: 'CI',
    givenNames: [
      'Kouame', 'Yao', 'Kouassi', 'Konan', 'Adama', 'Ibrahim', 'Serge', 'Didier',
      'Franck', 'Junior', 'Wilfried', 'Gervinho',
    ],
    familyNames: [
      'Kone', 'Traore', 'Diabate', 'Coulibaly', 'Bamba', 'Toure', 'Yao', 'Ouattara',
      'Kouadio', 'Gbagbo',
    ],
  },
  {
    code: 'GH',
    givenNames: [
      'Kwame', 'Kofi', 'Kwabena', 'Yaw', 'Kwesi', 'Kojo', 'Nana', 'Emmanuel',
      'Samuel', 'Daniel', 'Isaac', 'Jordan',
    ],
    familyNames: [
      'Mensah', 'Owusu', 'Boateng', 'Asante', 'Appiah', 'Amoah', 'Agyemang',
      'Osei', 'Adjei', 'Baffoe',
    ],
  },
  {
    code: 'CM',
    givenNames: [
      'Andre', 'Eric', 'Joel', 'Patrick', 'Vincent', 'Franck', 'Rigobert', 'Samuel',
      'Christian', 'Bertrand', 'Jean', 'Roger',
    ],
    familyNames: [
      'Etoo', 'Song', 'Onana', 'Mbia', 'Zambo', 'Ngom', 'Fotso', 'Ekambi', 'Toko',
      'Mvondo',
    ],
  },
  {
    code: 'EG',
    givenNames: [
      'Mohamed', 'Ahmed', 'Mahmoud', 'Omar', 'Karim', 'Youssef', 'Hassan', 'Amr',
      'Tarek', 'Ziad', 'Sherif', 'Islam',
    ],
    familyNames: [
      'Salah', 'Hassan', 'Ibrahim', 'Mostafa', 'Fathy', 'Farouk', 'Gaber', 'Adel',
      'Ashour', 'Ramadan',
    ],
  },
];

/**
 * 국적 코드 → 이름 풀 조회 맵. `NationalityCode` 브랜드는 이 조립 지점에서만 부여한다.
 */
export const NATIONALITY_NAME_POOLS: Readonly<Record<string, NationalityNamePool>> =
  Object.fromEntries(
    RAW_NAME_POOLS.map((pool) => [
      pool.code,
      {
        code: pool.code as NationalityCode,
        givenNames: pool.givenNames,
        familyNames: pool.familyNames,
        nameOrder: FAMILY_FIRST_NATIONALITY_CODES.has(pool.code)
          ? 'FAMILY_FIRST_NO_SPACE'
          : 'GIVEN_FIRST_SPACED',
      } satisfies NationalityNamePool,
    ]),
  );

/** 현재 이름 생성기가 지원하는 국적 코드 전체 목록(20개국). */
export const SUPPORTED_NATIONALITY_CODES: readonly NationalityCode[] = RAW_NAME_POOLS.map(
  (pool) => pool.code as NationalityCode,
);
