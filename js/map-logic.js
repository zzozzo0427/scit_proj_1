// ----------------------------------------------------------------------
// map-logic.js (JSON 구조 변경 및 경로 수정 완료)
// ----------------------------------------------------------------------
let currentInfoWindow = null;

let map;
let isLoggedIn = false;
let allMarkers = [];

// UI 요소 참조 (원본과 동일)
let loginForm;
let logoutInfo;
let loginModal;
let modalLoginButton;
let modalCloseButton;
let showLoginModalButton;

let signUpModal;
let openSignUpLink;
let signUpModalCloseButton;

// 임시 사용자 목록 (원본과 동일)
const initialUsers = [
    { id: "siwon", password: "siwon1234", email: "siwon@gmail.com" },
    { id: "somin", password: "somin1234", email: "somin@naver.com" },
    { id: "mingi", password: "mingi1234", email: "mingi@naver.com" },
    { id: "hyoju", password: "hyoju1234", email: "hyoju@gmail.com" }
];

/**
 * [수정됨] data/ 폴더의 shops.json과 reviews.json 파일을 fetch API로 불러옵니다.
 * (사용자가 '복수형'이 맞다고 확인)
 * @returns {Promise<Object>} { shops: Array, reviews: Array }
 */
async function fetchAllData() {
    console.log("Fetching shop and review data...");
    try {
        const [shopResponse, reviewResponse] = await Promise.all([
            fetch('../data/shops.json'),   // 1. shops 데이터 (경로 수정됨)
            fetch('../data/reviews.json')  // 2. reviews 데이터 (경로 수정됨)
        ]);

        if (!shopResponse.ok || !reviewResponse.ok) {
            throw new Error('Failed to fetch one or more JSON files.');
        }

        const shops = await shopResponse.json();
        const reviews = await reviewResponse.json();

        console.log('Shops and Reviews loaded successfully.');
        return { shops, reviews };

    } catch (error) {
        console.error('Failed to fetch data.', error);
        return { shops: [], reviews: [] };
    }
}

// 지도 초기화 함수 (window.initMap)
window.initMap = async () => {
    try {
        // Local Storage에 초기 사용자 목록 저장 (원본과 동일)
        if (localStorage.getItem('user_siwon') === null) {
            console.log("Local Storage에 초기 사용자 목록 저장 중...");
            initialUsers.forEach(user => {
                const key = 'user_' + user.id;
                const userData = { username: user.id, password: user.password, email: user.email };
                localStorage.setItem(key, JSON.stringify(userData));
            });
        }

        // UI 요소 초기화 (원본과 동일)
        loginForm = document.getElementById('loginForm');
        logoutInfo = document.getElementById('logoutInfo');
        loginModal = document.getElementById('loginModal');
        modalLoginButton = document.getElementById('modalLoginButton');
        modalCloseButton = document.getElementById('modalCloseButton');
        showLoginModalButton = document.getElementById('showLoginModalButton');
        signUpModal = document.getElementById('signUpModal');
        openSignUpLink = document.getElementById('openSignUpLink');
        signUpModalCloseButton = document.getElementById('signUpModalCloseButton');

        // --- [수정됨] JSON 데이터 비동기 로드 ---
        const { shops, reviews } = await fetchAllData();
        // --- JSON 데이터 로드 끝 ---

        // 지도 초기 위치 (원본과 동일)
        const initialPosition = { lat: 35.0, lng: 134.0 };
        const mapOptions = {
            center: initialPosition,
            zoom: 7,
            minZoom: 2,
        };

        map = new google.maps.Map(document.getElementById("map"), mapOptions);

        // [추가!] 지도를 클릭하면 열려있는 인포윈도우를 닫는 리스너
        map.addListener('click', () => {
            if (currentInfoWindow) {
                currentInfoWindow.close();
                currentInfoWindow = null; // 추적 변수 초기화
            }
        });

        // 1. [수정됨] JSON의 lat/lng로 마커 생성 (예외 처리 포함)
        processShopData(shops, reviews);

        // 2. 초기 로그인 상태 UI/마커 업데이트 (원본과 동일)
        updateAuthUI();
        updateMapVisibility();

        // 3. 이벤트 리스너 설정 (원본과 동일)
        showLoginModalButton.addEventListener('click', openLoginModal);
        modalCloseButton.addEventListener('click', closeLoginModal);
        openSignUpLink.addEventListener('click', handleOpenSignUpFromLogin);
        signUpModalCloseButton.addEventListener('click', closeSignUpModal);
        document.getElementById('signUpButton').addEventListener('click', handleSignUp);

        loginModal.addEventListener('click', (e) => {
            if (e.target === loginModal) closeLoginModal();
        });
        signUpModal.addEventListener('click', (e) => {
            if (e.target === signUpModal) closeSignUpModal();
        });

        modalLoginButton.addEventListener('click', handleLogin);
        document.getElementById('formLogoutButton').addEventListener('click', handleLogout);

    } catch (error) {
        // 오류 처리 (원본과 동일)
        console.error('Google Map Initialization Error:', error);
        document.getElementById('map').innerHTML = `<div class="h-full w-full flex items-center justify-center bg-gray-200 text-red-600 text-center p-8">
                <p class="text-xl font-bold">지도 로드 실패!</p><br/>
                <p>API 키가 유효한지 확인해주세요.</p>
            </div>`;
    }
};

/**
 * [수정됨] shops 배열을 반복하며 마커를 생성합니다.
 * (위도/경도 데이터 포맷 예외 처리 로직 추가)
 * @param {Array<Object>} shops - shops.json 데이터
 * @param {Array<Object>} reviews - reviews.json 데이터
 */
function processShopData(shops, reviews) {
    // 리뷰 데이터를 shop_id 기준으로 미리 그룹화 (효율성)
    const reviewsByShopId = reviews.reduce((acc, review) => {
        const shopId = review.shop_id;
        if (!acc[shopId]) {
            acc[shopId] = [];
        }
        acc[shopId].push(review);
        return acc;
    }, {});

    // 모든 가게(shop)를 순회합니다.
    for (const shop of shops) {
        let location; // 1. location 변수 선언

        try {
            // 2. [수정됨] 위도/경도 파싱 로직
            if (typeof shop.latitude === 'string') {
                // shop_id: 10과 같이 "lat, lng" 문자열로 된 경우
                const parts = shop.latitude.split(',');
                if (parts.length < 2) throw new Error('Invalid string coordinate format.');
                const lat = parseFloat(parts[0].trim());
                const lng = parseFloat(parts[1].trim());
                location = new google.maps.LatLng(lat, lng);

            } else if (typeof shop.latitude === 'number' && typeof shop.longitude === 'number') {
                // 일반적인 숫자 lat, lng
                location = new google.maps.LatLng(shop.latitude, shop.longitude);
            } else {
                // 위도/경도 데이터가 유효하지 않은 경우
                throw new Error('Missing or invalid coordinate data.');
            }

            // 3. (location이 성공적으로 생성된 경우) 리뷰 찾기
            const shopReviews = reviewsByShopId[shop.shop_id] || [];

            // 4. 마커 추가
            addGourmetMarker(shop, location, shopReviews);

        } catch (error) {
            // 한두 개의 데이터 오류로 전체 앱이 멈추지 않도록 로그만 남기고 계속 진행
            console.warn(`[마커 추가 실패] ${shop.name}: ${error.message}`);
            continue; // 이 shop은 건너뜀
        }
    }
}

/**
 * [수정된 함수] - 반올림 방식의 '붉은색' 별점
 * 숫자 평점을 '반올림'하여 간단한 별(★/☆) HTML로 변환합니다.
 * @param {number} score - 평점 (예: 4.6)
 * @returns {string} - 예: "★★★★☆"
 */
function getStarRatingHtml(score) {
    // 1. 숫자가 아니거나 null이면 빈 문자열 반환
    if (isNaN(score) || score === null) {
        return '<span style="color: #e0e0e0; font-size: 13px;">평가 없음</span>';
    }

    // 2. 점수를 가장 가까운 정수(full number)로 반올림 (예: 4.6 -> 5, 4.2 -> 4)
    const roundedScore = Math.round(score);

    let starsHtml = '';
    const maxStars = 5;

    // 3. 5번 반복
    for (let i = 1; i <= maxStars; i++) {
        if (i <= roundedScore) {
            starsHtml += '★'; // 꽉 찬 별
        } else {
            starsHtml += '☆'; // 빈 별
        }
    }

    // 4. 붉은색/회색 스타일을 입혀 반환 (레퍼런스 참고)
    return `
        <span style="color: #ef4444; font-size: 1.1rem; line-height: 1; white-space: nowrap;">${starsHtml}</span>
    `;
}

/**
 * [최종 수정] - 2단 레이아웃 복귀
 * @param {Object} shop - shops.json의 개별 가게 데이터
 * @param {google.maps.LatLng} location - 위도/경도 객체
 * @param {Array<Object>} reviews - 해당 shop의 리뷰 목록
 */
function addGourmetMarker(shop, location, reviews) {
    
    // 구글 기본 마커 사용 (icon 속성 없음)
    const marker = new google.maps.Marker({
        position: location,
        map: null, 
        title: shop.name,
        animation: google.maps.Animation.DROP
    });

    // --- 인포윈도우 '페이지' 생성 ---
    const uniqueId = `shop_${shop.shop_id}`;
    const infoPageId = `info_${uniqueId}`;
    const reviewPageId = `review_${uniqueId}`;
    const viewBtnId = `btn_view_${uniqueId}`;
    const backBtnId = `btn_back_${uniqueId}`;

    // --- 1. 리뷰 페이지 HTML ---
    let reviewsHtml = `<p style="font-size: 14px; color: #6b7280; margin: 0;">登録されたレビューがありません。</p>`;
    if (reviews.length > 0) {
        reviewsHtml = reviews.map(r => {
            const recommendHtml = r.Recommend
                ? `<p style="font-size: 13px; color: #c45d00; background: #fffbeb; padding: 4px 8px; border-radius: 4px; margin-top: 6px; margin-bottom: 0;">
                       <strong>おすすめ:</strong> ${r.Recommend}
                  </p>` // [수정] '추천' -> 'おすすめ'
                : '';
            const scoreText = r.review_score ? `${r.review_score.toFixed(1)}` : 'N/A';
            const comment = r.review_test.replace(/\n/g, '<br>');
            return `
            <div style="border-top: 1px solid #e5e7eb; padding-top: 10px; margin-top: 10px;">
                <p style="font-weight: 600; color: #1f2937; margin: 0; display: flex; justify-content: space-between; align-items: center;">
                    <span>${r.user_id}</span>
                    <span style="font-weight: 400; color: #6b7280; font-size: 13px;">${r.update_date}</span>
                </p>
                <p style="margin: 3px 0; font-size: 14px; color: #4b5563;">
                    (評価: ${scoreText} / 5)
                </p> 
                <p style="font-size: 14px; color: #4b5563; margin-top: 5px; margin-bottom: 0; line-height: 1.5;">
                    ${comment}
                </p>
                ${recommendHtml}
            </div>
            `;
        }).join('');
    }
    
    // [수정됨] 가로폭을 450px로 늘림
    const reviewPageHtml = `
        <div id="${reviewPageId}" style="display: none; padding: 10px 15px; width: 450px; max-height: 280px; overflow-y: auto; font-family: 'Inter', sans-serif; line-height: 1.4;">
            
            <div style="display: flex; align-items: center; justify-content: flex-start; margin-bottom: 10px;">
                
                <button id="${backBtnId}" style="background: #f3f4f6; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 600; color: #374151; line-height: 1; margin-right: 10px;">
                    ◀
                </button>

                <h3 style="font-weight: 700; font-size: 1.0rem; color: #1f2937; margin: 0;">
                    ${shop.name} - レビュー
                    <span style="font-size: 0.85rem; font-weight: 500; color: #6b7280; margin-left: 4px;">(${reviews.length}件)</span>
                </h3>
            </div>

            ${reviewsHtml}
        </div>
    `;

    // --- 2. 가게 정보 페이지 HTML ---
    const imagePath = `images/${shop.shop_id}.jpg`;
    const addressHtml = shop.address.replace(/\n/g, '<br>');
    const timeHtml = shop.time.replace(/\n/g, '<br>');
    const shopScoreText = shop.review ? `${shop.review.toFixed(1)}` : 'N/A';
    const shopScoreStarsHtml = getStarRatingHtml(shop.review); // 붉은색 별점

    // [최종 수정됨] 2단 레이아웃 [왼쪽: 모든 텍스트 | 오른쪽: 사진]
    const infoPageHtml = `
        <div id="${infoPageId}" style="display: flex; padding: 15px; width: 450px; font-family: 'Inter', sans-serif; line-height: 1.4;">
            
            <div style="flex: 1; min-width: 0; padding-right: 15px;">
                
                <h2 style="font-size: 1.3rem; font-weight: 700; color: #333; margin: 0 0 4px 0;">
                    ${shop.name}
                </h2>
                
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 12px; flex-wrap: wrap;">
                    <span style="font-size: 1.1rem; font-weight: 700; color: #ef4444;">${shopScoreText}</span>
                    ${shopScoreStarsHtml}
                    <span style="color: #888; font-size: 12px; margin-left: 2px;">|</span>
                    <button id="${viewBtnId}" style="background: none; border: none; color: #007bff; font-size: 12px; text-decoration: underline; cursor: pointer; padding: 0; margin-left: 2px;">
                        レビュー ${reviews.length}件
                    </button>
                </div>

                <div style="font-size: 11px; color: #333; line-height: 1.6;">
                    <p style="margin: 4px 0;"><strong>住所:</strong> ${addressHtml}</p>
                    <p style="margin: 4px 0;"><strong>電話:</strong> <span style="color: #007749; font-weight: 600;">${shop.phone}</span></p>
                    <p style="margin: 4px 0;"><strong>カテゴリー:</strong> ${shop.category}</p>
                    <p style="margin: 4px 0;"><strong>価格帯:</strong> ${shop.price}</p>
                    <p style="margin: 4px 0;"><strong>営業時間:</strong> ${timeHtml}</p>
                </div>

            </div>

            <div style="width: 180px; flex-shrink: 0;">
                <img src="${imagePath}" 
                    alt="${shop.name}" 
                    style="width: 100%; height: 160px; object-fit: cover; border-radius: 6px;"
                    onerror="this.style.display='none';"
                >
            </div>

        </div>
    `;

    // --- 3. 최종 컨텐츠 ---
    const finalHtmlContent = infoPageHtml + reviewPageHtml;
    
    const infoWindow = new google.maps.InfoWindow({
        content: finalHtmlContent,
        disableAutoPan: true 
    });

    // domready 이벤트 (이전과 동일)
    infoWindow.addListener('domready', () => {
        const viewBtn = document.getElementById(viewBtnId);
        if (viewBtn) {
            viewBtn.addEventListener('click', () => {
                document.getElementById(infoPageId).style.display = 'block'; // 'flex' -> 'block'
                document.getElementById(reviewPageId).style.display = 'block';
                // [수정] 'block'으로 변경
                document.getElementById(infoPageId).style.display = 'none';
            });
        }
        
        const backBtn = document.getElementById(backBtnId);
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                document.getElementById(infoPageId).style.display = 'flex'; // ★★★ 여기를 'flex'로 복원
                document.getElementById(reviewPageId).style.display = 'none';
            });
        }
    });

    // 마커 클릭 시, 기존 인포윈도우 닫고 새 인포윈도우 열기 (이전과 동일)
    marker.addListener("click", () => {
        if (isLoggedIn) {
            if (currentInfoWindow) {
                currentInfoWindow.close();
            }
            infoWindow.open({
                anchor: marker,
                map,
            });
            currentInfoWindow = infoWindow;
        }
    });

    // 인포윈도우 닫힐 때 추적 변수 초기화 (이전과 동일)
    infoWindow.addListener('closeclick', () => {
        currentInfoWindow = null;
    });
    
    allMarkers.push(marker);
}

// =========================================================
// 모달 제어 함수 (원본과 동일)
// =========================================================
function openLoginModal() {
    loginModal.classList.remove('hidden');
    loginModal.style.display = 'flex';
}

function closeLoginModal() {
    loginModal.style.display = 'none';
    loginModal.classList.add('hidden');
    document.getElementById('modalUsername').value = '';
    document.getElementById('modalPassword').value = '';
}

function openSignUpModal() {
    signUpModal.classList.remove('hidden');
    signUpModal.style.display = 'flex';
}

function closeSignUpModal() {
    signUpModal.style.display = 'none';
    signUpModal.classList.add('hidden');
    document.getElementById('signUpUsername').value = '';
    document.getElementById('signUpPassword').value = '';
    document.getElementById('signUpEmail').value = '';
}

function handleOpenSignUpFromLogin(e) {
    closeLoginModal();
    openSignUpModal();
}

// =========================================================
// 회원가입 및 로그인/로그아웃 로직 (원본과 동일)
// =========================================================

function validateForm(username, password, email) {
    const usernameRegex = /^[a-zA-Z0-9]{4,16}$/;
    if (!usernameRegex.test(username)) {
        alert("ユーザー名は4～16文字の半角英数字を使用してください。");
        return false;
    }
    const passwordRegex = /^.{8,20}$/;
    if (!passwordRegex.test(password)) {
        alert("パスワードは8文字以上、20文字以下で入力してください。");
        return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert("有効なメールアドレスの形式（例：user@example.com）を入力してください。");
        return false;
    }
    return true;
}

function handleSignUp() {
    const username = document.getElementById('signUpUsername').value;
    const password = document.getElementById('signUpPassword').value;
    const email = document.getElementById('signUpEmail').value;

    if (!validateForm(username, password, email)) {
        return;
    }
    const existingUser = localStorage.getItem('user_' + username);
    if (existingUser) {
        alert("既に存在するユーザー名です。");
        return;
    }
    const userData = {
        username: username,
        password: password,
        email: email
    };
    localStorage.setItem('user_' + username, JSON.stringify(userData));
    alert(`🎉 ${username}様、新規登録が完了しました！`);
    closeSignUpModal();
    localStorage.setItem('currentUser', username);
    isLoggedIn = true;
    updateAuthUI();
    updateMapVisibility();
}

function handleLogin() {
    const username = document.getElementById('modalUsername').value;
    const password = document.getElementById('modalPassword').value;
    if (!username || !password) {
        alert("ユーザー名とパスワードを両方入力してください。");
        return;
    }
    const userString = localStorage.getItem('user_' + username);
    if (!userString) {
        alert("登録されていないユーザー名です。");
        return;
    }
    const userData = JSON.parse(userString);
    if (userData.password !== password) {
        alert("パスワードが一致しません。");
        return;
    }
    isLoggedIn = true;
    localStorage.setItem('currentUser', username);
    closeLoginModal();
    updateAuthUI();
    updateMapVisibility();
}

function handleLogout() {
    isLoggedIn = false;
    localStorage.removeItem('currentUser');
    updateAuthUI();
    updateMapVisibility();
}

function updateAuthUI() {
    const currentUsername = localStorage.getItem('currentUser');
    const infoText = document.getElementById('mapInfoText');

    if (currentUsername) {
        isLoggedIn = true;
    } else {
        isLoggedIn = false;
    }

    if (isLoggedIn && currentUsername) {
        loginForm.style.display = 'none';
        logoutInfo.style.display = 'flex';
        document.getElementById('loginStatus').textContent = `${currentUsername}님, 안녕하세요`;
        if (infoText) infoText.style.display = 'none';
    }
    else {
        loginForm.style.display = 'block';
        logoutInfo.style.display = 'none';
        if (infoText) infoText.style.display = 'block';
        localStorage.removeItem('currentUser');
    }
}

/**
 * [핵심 기능] (원본과 동일)
 * 로그인 상태에 따라 마커의 가시성을 토글합니다.
 */
function updateMapVisibility() {
    const mapContainer = isLoggedIn ? map : null;

    allMarkers.forEach(marker => {
        marker.setMap(mapContainer);
    });
}