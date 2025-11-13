# 🗺️ 일본 맛집 지도 (日本のグルメ マップ)

Google Maps API와 JSON 데이터를 활용하여 제작한 인터랙티브 맛집 지도 웹 애플리케이션입니다.

사용자는 로그인을 한 후에만 지도에 표시된 맛집 마커를 확인할 수 있으며, 마커를 클릭하여 가게의 상세 정보와 리뷰를 인터랙티브하게 탐색할 수 있습니다.

## 📸 스크린샷

## ✨ 핵심 기능

* **Google 지도 연동:** Google Maps JavaScript API를 사용하여 지도를 표시합니다.
* **데이터 기반 마커 생성:**
    * `data/shops.json` 파일에서 가게의 위치(위도/경도), 이름, 주소 등 상세 정보를 불러옵니다.
    * `data/reviews.json` 파일에서 `shop_id`를 기준으로 가게별 리뷰를 불러옵니다.
* **로그인/회원가입:**
    * 사용자가 로그인(또는 회원가입)을 해야만 지도 위의 맛집 마커가 표시됩니다.
    * 인증 상태는 Local Storage를 통해 관리됩니다.
* **커스텀 인포윈도우 (정보 창):**
    * 마커 클릭 시, 가게 사진과 상세 정보가 포함된 **2단 레이아웃**의 커스텀 정보 창이 열립니다.
    * `images/` 폴더의 이미지를 `shop_id`와 매칭하여 표시합니다.
* **인포윈도우 내 페이지 전환:**
    * 정보 창 내부의 '리뷰 보기' 버튼 클릭 시, 팝업이 닫히지 않고 해당 가게의 리뷰 목록 페이지로 전환됩니다.
    * '돌아가기' 버튼을 통해 다시 가게 정보 페이지로 이동할 수 있습니다.
* **향상된 UX:**
    * Google 지도의 기본 닫기(X) 버튼과 불필요한 상단/좌우 여백을 CSS로 모두 제거하여 깔끔한 UI를 구현했습니다.
    * 지도의 빈 공간이나 다른 마커를 클릭하면, 열려있던 정보 창이 자동으로 닫힙니다.

## 🛠️ 사용한 기술

* **Frontend:** HTML5, CSS3, JavaScript (ES6+ Vanilla JS)
* **Framework/Library:** Tailwind CSS (CDN)
* **API:** Google Maps JavaScript API, Fetch API (JSON 데이터 로드)
* **Data:** JSON

## 📁 프로젝트 구조

/  
├── map.html                  (메인 HTML 파일)  
├── data/  
│   ├── shops.json            (가게 정보 데이터)  
│   └── reviews.json          (리뷰 정보 데이터)  
├── js/  
│   └── map-logic.js          (지도 로직)  
└── images/  
    ├── 1.jpg  
    ├── 2.jpg  
    └── ...


## 🚀 설치 및 실행 방법

### 1. Google Maps API 키 발급 (필수)

1.  Google Cloud Platform(GCP)에서 'Maps JavaScript API' 사용 설정 후, API 키를 발급받아야 합니다.
2.  발급받은 API 키를 **`map.html`** 파일 하단의 `<script>` 태그에 있는 `YOUR_API_KEY_HERE` 부분에 붙여넣으세요.

    ```html
    <script async
      src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY_HERE&callback=initMap">
    </script>
    ```

### 2. 로컬 서버로 실행 (필수)

이 프로젝트는 `fetch()` API를 사용하여 `data/` 폴더의 JSON 파일을 불러옵니다. 브라우저의 보안 정책(CORS)으로 인해, 로컬의 `map.html` 파일을 더블 클릭하여 직접 열면 **작동하지 않습니다.**

반드시 VS Code의 **`Live Server`** 확장 프로그램이나 다른 로컬 서버 환경을 통해 실행해야 합니다.

* (예: VS Code에서 `map.html` 우클릭 후 `Open with Live Server` 선택)

### 3. 데이터 확인

* `images/` 폴더에 `shops.json`의 `shop_id`와 일치하는 `숫자.jpg` (예: `1.jpg`, `2.jpg`...) 파일이 있는지 확인하세요.
* `data/` 폴더에 `shops.json`과 `reviews.json` 파일이 있는지 확인하세요.
