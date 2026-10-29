# engineering-8team · 우산 한 자루

공학설계입문 수업용 반응형 우산 대여 웹사이트입니다. HTML, CSS, 순수 JavaScript로 구현했으며 별도 패키지 설치가 필요 없습니다.

## 실행

```sh
cd /workspace/engineering-8team
python3 -m http.server 8000 --bind 0.0.0.0
```

브라우저에서 실행 중인 웹 서버에 접속하세요. GitHub Pages에서도 그대로 사용할 수 있습니다. 저장소의 Settings → Pages에서 `Deploy from a branch`, `main`, `/ (root)`를 선택하세요. 먼저 아래 파일들을 GitHub에 커밋하고 푸시해야 합니다.

```sh
git add index.html css/style.css js/app.js README.md
git commit -m "Add responsive umbrella rental simulation"
git push origin main
```

## 시뮬레이션

- 기본 우산 12개, 이 브라우저에서 1인 1개 대여를 시뮬레이션합니다.
- 대여하면 11개, 반납하면 12개로 변경되며 중복 대여와 반납을 막습니다.
- 대여 시각과 상태는 `localStorage`에 저장되어 새로고침 후에도 유지됩니다.
- 같은 출처의 다른 탭에도 상태 변경이 반영됩니다. Web Locks 지원 브라우저에서는 탭 간 변경을 직렬화합니다.
- 실제 사용자 인증, 공동 재고, 실제 보관함 제어 기능은 아직 없습니다. 다른 브라우저와 기기 간 데이터는 공유하지 않습니다.
- 초기화하려면 개발자 도구에서 이 사이트의 `engineering-8team:umbrella:v1` 저장 항목을 삭제하세요.
- 웹 폰트를 불러올 수 없어도 시스템 글꼴로 이용할 수 있습니다.

## Arduino UNO R4 WiFi 연동 구조

`js/app.js`의 UI는 어댑터의 `getStatus()`, `rent()`, `returnUmbrella()`에만 의존합니다. 현재 `SimulationAdapter`를 사용하며, 서버가 완성되면 `new HttpAdapter('/api')`로 교체할 수 있습니다. HttpAdapter는 향후 연동 예시이며 현재 서버는 제공하지 않습니다.

권장 구조: **브라우저 → HTTPS 서버 API → Arduino UNO R4 WiFi → 잠금장치·반납 센서**. 장치 인증 키를 브라우저 코드에 넣지 마세요. 서버는 사용자 인증, CSRF 방어, 재고 변경의 원자성, 중복 요청 방지, 장치 응답 시간 초과와 실패 처리를 담당해야 합니다. 실제 반납은 센서 확인 후 확정하고, 대여는 잠금 해제 성공을 확인한 뒤 확정하도록 설계하세요.

| API | 용도 |
| --- | --- |
| `GET /api/status` | 전체 수량과 현재 사용자의 대여 상태 |
| `POST /api/rentals` | 우산 대여 요청 |
| `POST /api/rentals/current/return` | 현재 우산 반납 요청 |

성공 응답은 모두 다음 구조를 사용합니다. 서버에서는 현재 로그인 사용자의 `rental`을 반환합니다.

```json
{
  "total": 12,
  "available": 11,
  "rental": {
    "id": "server-generated-id",
    "rentedAt": "2026-10-29T05:00:00.000Z"
  }
}
```

대여하지 않은 경우 `rental`은 `null`입니다. 실제 서버 연결 시 시뮬레이션 표시와 브라우저 저장 안내도 실제 동작에 맞게 변경하세요.

## 수동 검증

1. 최초 접속: 12개, 대여 가능, 반납 버튼 비활성.
2. 대여: 11개, 대여 중, 대여 시각 표시, 중복 대여 불가.
3. 새로고침: 대여 상태 유지.
4. 반납: 12개 복원, 중복 반납 불가.
5. 다른 탭: 대여·반납 상태 동기화.
6. 휴대폰 너비와 키보드 Tab으로 버튼 접근 확인.
