// list-logic.js

// 전역 변수 설정
let gourmetData = null; 
const SHOPS_JSON_PATH = '../data/shops.json'; // 파일 구조 주의

const ITEMS_PER_PAGE = 9;       // 한 페이지에 표시할 카드 개수
let currentPage = 1;            // 현재 페이지 번호
let currentFilteredData = [];   // 현재 선택된 지역의 필터링된 데이터
let displayMode = 'card';       // 현재 표시 모드 ('card' 또는 'table')


// UI 요소 참조 (전역에서 선언만 하고, 할당은 DOMContentLoaded 내부에서 수행)
let areaSelect;
let searchListButton;
let tableContainer;
let cardContainer;
let paginationContainer;
let sortButton; 
let toggleViewButton; // NEW

let isSortedByRating = false;


// =========================================================
// 1. 페이지 로드 시 로그인 상태 체크 및 초기화
// =========================================================

function checkLoginStatus() {
    const currentUsername = localStorage.getItem('currentUser'); 
    
    if (!currentUsername) {
        alert("🔒 このページはログインされたユーザーのみアクセス可能です。ログインページに移動します。");
        window.location.href = '../index.html'; 
        return false;
    }
    
    const loginStatusElement = document.getElementById('loginStatus');
    if (loginStatusElement) {
        loginStatusElement.textContent = `${currentUsername}様、ようこそ`; 
    }

    document.getElementById('formLogoutButton').addEventListener('click', handleLogout);
    
    return true;
}

function handleLogout() {
    localStorage.removeItem('currentUser');
    alert("ログアウトしました。");
    window.location.href = '../index.html'; 
}


// =========================================================
// 2. 데이터 로딩 및 전처리 함수
// =========================================================

async function loadAndProcessData() {
    try {
        cardContainer.innerHTML = '<p class="text-center text-gray-500 py-10">データを読み込み中です...</p>'; 
        
        const response = await fetch(SHOPS_JSON_PATH);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const rawShopsData = await response.json();

        // 데이터 전처리: 지역별로 분류하고 originalIndex 추가
        const processedData = rawShopsData.reduce((acc, shop) => {
            const areaKey = shop.area;
            if (!acc[areaKey]) {
                acc[areaKey] = [];
            }
            shop.originalIndex = acc[areaKey].length; 
            acc[areaKey].push(shop);
            return acc;
        }, {});
        
        gourmetData = processedData; 
        cardContainer.innerHTML = '<p id="initialMessage" class="text-center text-gray-500 py-10">地域を選択し、「検索」ボタンを押してください。</p>';
        
        return true;

    } catch (error) {
        console.error("Failed to load or process data:", error);
        cardContainer.innerHTML = `<p class="text-center text-red-600 py-10 font-bold">データの読み込みに失敗しました。(エラー: ${error.message})</p>`;
        searchListButton.disabled = true;
        sortButton.disabled = true;
        toggleViewButton.disabled = true;
        return false;
    }
}


// =========================================================
// 3. 카드뷰/페이지네이션/테이블뷰 핵심 함수
// =========================================================

/**
 * 데이터를 받아 테이블 HTML 문자열을 생성합니다. (CSS 수정 반영)
 */
function generateTableHTML(data, isSorted) {
    if (!data || data.length === 0) {
        return `<p class="text-center text-gray-500 py-10">該当するデータがありません。</p>`;
    }

    // 평점순 정렬 시 컬럼 색상 변경
    const ratingHeaderClass = isSorted 
        ? 'bg-yellow-100 text-yellow-800' 
        : 'text-gray-600'; 

    let tableHTML = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-red-50">
                <tr class="text-center"> 
                    <th class="px-6 py-3 text-base font-medium text-black-700 uppercase tracking-wider w-1/12">NO.</th>
                    <th class="px-6 py-3 text-base font-medium text-black-700 uppercase tracking-wider w-3/12">店名</th>
                    <th class="px-6 py-3 text-base font-medium text-black-700 uppercase tracking-wider w-3/12">カテゴリー</th>
                    <th class="px-6 py-3 text-base font-medium text-black-700 uppercase tracking-wider w-3/12">営業時間</th>
                    <th class="px-6 py-3 text-base font-medium uppercase tracking-wider w-2/12 ${ratingHeaderClass} bg-yellow-50">評価 (/5.0)</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
    `;

    data.forEach((item, index) => {
        const displayNo = index + 1; 
        const formattedTime = item.time ? item.time.replace(/\n/g, '<br>') : 'N/A';
        const reviewDisplay = item.review ? `${item.review.toFixed(1)}` : 'N/A';

        tableHTML += `
            <tr class="hover:bg-gray-50 text-center">
                <td class="px-6 py-4 whitespace-nowrap text-base font-medium text-gray-700">${displayNo}</td>
                <td class="px-6 py-4 whitespace-nowrap text-base font-medium text-gray-700">${item.name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-base text-gray-500">${item.category || 'N/A'}</td>
                <td class="px-6 py-4 text-base text-gray-500">${formattedTime}</td>
                <td class="px-6 py-4 whitespace-nowrap text-base font-bold text-red-600">${reviewDisplay}</td>
            </tr>
        `;
    });

    tableHTML += `
            </tbody>
        </table>
    `;
    return tableHTML;
}

/**
 * 데이터를 받아 카드뉴스 HTML 문자열을 생성합니다. (1줄 3개씩)
 */
function generateCardHTML(data) {
    if (!data || data.length === 0) {
        return `<p class="text-center text-gray-500 py-10">該当するデータがありません。</p>`;
    }

    // 현재 페이지에 해당하는 9개 데이터만 슬라이스
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageData = data.slice(startIndex, endIndex);

    let cardsHtml = pageData.map((shop, pageIndex) => {
        
        const globalIndex = startIndex + pageIndex;
        let medalIconHTML = ''; // HTML이 담길 변수명으로 변경
        
        // 가게명 앞에 삽입할 메달 아이콘 결정
        if (isSortedByRating && globalIndex < 3) {
            let medalEmoji = '';
            if (globalIndex === 0) {
                medalEmoji = '🥇'; // 1위
            } else if (globalIndex === 1) {
                medalEmoji = '🥈'; // 2위
            } else if (globalIndex === 2) {
                medalEmoji = '🥉'; // 3위
            }
            
            // <span> 태그로 감싸 text-3xl로 크기를 강제하고, 오른쪽에 여백(mr-2)을 추가합니다.
            medalIconHTML = `<span class="text-3xl mr-2">${medalEmoji}</span>`;
        }
        
        const imagePath = `../images/${shop.shop_id}.jpg`; 
        const reviewDisplay = shop.review ? `${shop.review.toFixed(1)} / 5.0` : 'N/A';
        // 이전에 <br>로 변환되던 부분이 shop.time 그대로 출력되도록 되어있어 다시 수정합니다.
        const formattedTime = shop.time ? shop.time : 'N/A'; 

        return `
            <div class="w-full lg:w-1/3 p-3">
                <div class="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden h-full flex flex-col"> 
                    <div class="h-48 overflow-hidden bg-gray-200">
                        <img src="${imagePath}" alt="${shop.name}" class="w-full h-full object-cover" 
                            onerror="this.onerror=null; this.src='../images/default.jpg';" />
                    </div>
                    
                    <div class="p-4 flex-grow">
                        <h3 class="text-xl font-bold text-red-900 mb-3">${medalIconHTML}${shop.name}</h3>             
                        <p class="text-base text-gray-800 mb-2"><strong>カテゴリ: </strong> ${shop.category || 'N/A'}</p>
                        <p class="text-base text-gray-800 mb-3"><strong>評価: </strong> <span>${reviewDisplay}</span></p>
                        <p class="text-sm text-gray-800 mt-2"><strong>営業時間: </strong>${formattedTime}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    return `<div class="flex flex-wrap -mx-3">${cardsHtml}</div>`;
}

/**
 * 페이지 네비게이션 버튼을 생성합니다.
 */
function renderPagination(data) {
    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let pageHtml = '<div class="flex justify-center space-x-2 mt-6">';

    for (let i = 1; i <= totalPages; i++) {
        const activeClass = i === currentPage ? 'bg-red-600 text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-red-100';
        pageHtml += `
            <button data-page="${i}" class="page-btn px-4 py-2 rounded-lg font-medium transition duration-150 ${activeClass}">
                ${i}
            </button>
        `;
    }

    pageHtml += '</div>';
    paginationContainer.innerHTML = pageHtml;

    // 이벤트 리스너 연결
    paginationContainer.querySelectorAll('.page-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            // 버튼 클릭 시 현재 페이지를 업데이트하고 카드뷰 다시 렌더링
            const page = parseInt(e.target.dataset.page);
            if (page !== currentPage) {
                currentPage = page;
                renderCardView(currentFilteredData); 
                window.scrollTo({ top: 0, behavior: 'smooth' }); // 페이지 상단으로 스크롤
            }
        });
    });
}

/**
 * 카드뷰를 렌더링하고 페이지네이션을 업데이트합니다.
 */
function renderCardView(data) {
    currentFilteredData = data;
    cardContainer.innerHTML = generateCardHTML(data);
    renderPagination(data);
}


/**
 * '검색' 버튼 클릭 시 지역별 데이터를 표시합니다.
 */
function handleListSearch() {
    const selectedArea = areaSelect.value;
    
    // UI 초기화
    cardContainer.innerHTML = '';
    paginationContainer.innerHTML = '';
    sortButton.disabled = true;
    toggleViewButton.disabled = true;


    if (!gourmetData || !selectedArea) {
        cardContainer.innerHTML = `<p class="text-center text-red-500 py-10 font-medium">検索する地域を選択してください。</p>`;
        return;
    }

    const data = gourmetData[selectedArea];
    
    // 1. 상태 초기화
    isSortedByRating = false;
    currentPage = 1; // 페이지 초기화
    sortButton.textContent = '平点順 並び替え';
    sortButton.classList.remove('bg-yellow-500', 'hover:bg-yellow-600');
    sortButton.classList.add('bg-gray-500', 'hover:bg-gray-600');

    // 2. 카드뷰 렌더링
    currentFilteredData = data;
    renderCardView(currentFilteredData); 
    
    // 3. 컨테이너 표시 (카드뷰만 보이도록)
    tableContainer.style.display = 'none';
    cardContainer.style.display = 'block';
    paginationContainer.style.display = 'block';
    displayMode = 'card';
    toggleViewButton.textContent = '📜 リスト表示';

    if (data && data.length > 0) {
        sortButton.disabled = false;
        toggleViewButton.disabled = false;
    }
}

/**
 * '평점 순 정렬' 버튼 클릭 시 데이터를 정렬하고 다시 표시합니다.
 */
function handleSortByRating() {
    const selectedArea = areaSelect.value;
    if (!selectedArea || !gourmetData || currentFilteredData.length === 0) return;

    let data = [...currentFilteredData]; // 현재 표시 중인 데이터 사용 

    if (!isSortedByRating) {
        // review (평점) 순으로 정렬 (내림차순)
        data.sort((a, b) => (b.review || 0) - (a.review || 0)); 
        isSortedByRating = true;
        sortButton.textContent = '基本順に戻す';
        
        sortButton.classList.remove('bg-gray-500', 'hover:bg-gray-600');
        sortButton.classList.add('bg-yellow-500', 'hover:bg-yellow-600');

    } else {
        // 기본 순서로 돌아가기 (originalIndex를 사용)
        data.sort((a, b) => a.originalIndex - b.originalIndex);
        isSortedByRating = false;
        sortButton.textContent = '⭐️ 平点順 並び替え';
        
        sortButton.classList.remove('bg-yellow-500', 'hover:bg-yellow-600');
        sortButton.classList.add('bg-gray-500', 'hover:bg-gray-600');
    }
    
    currentPage = 1; 
    currentFilteredData = data; 
    
    if (displayMode === 'card') {
        renderCardView(currentFilteredData);
    } else {
        // 테이블 뷰인 경우 테이블을 다시 렌더링 (헤더 색상 변경을 위해)
        tableContainer.innerHTML = generateTableHTML(currentFilteredData, isSortedByRating);
    }
}


/**
 * 카드뷰와 테이블뷰 표시를 전환합니다.
 */
function toggleDisplayMode(e) {
    const button = e.target;
    
    if (displayMode === 'card') {
        // 테이블 뷰로 전환
        displayMode = 'table';
        
        // 테이블은 정렬/필터링된 전체 데이터를 보여줘야 하므로 다시 렌더링
        tableContainer.innerHTML = generateTableHTML(currentFilteredData, isSortedByRating);
        
        tableContainer.style.display = 'block';
        cardContainer.style.display = 'none';
        paginationContainer.style.display = 'none';
        
        button.textContent = '🏠 カード表示';
        
    } else {
        // 카드 뷰로 전환
        displayMode = 'card';
        tableContainer.style.display = 'none';
        cardContainer.style.display = 'block';
        paginationContainer.style.display = 'block';
        
        button.textContent = '📜 リスト表示';
    }
}


// =========================================================
// 4. 이벤트 리스너 연결 및 초기 로드
// =========================================================

document.addEventListener('DOMContentLoaded', async () => {
    // DOM이 로드된 후 UI 요소 참조를 수행합니다. 
    areaSelect = document.getElementById('areaSelect');
    searchListButton = document.getElementById('searchListButton');
    tableContainer = document.getElementById('tableContainer'); // ID 변경됨
    cardContainer = document.getElementById('cardContainer');
    paginationContainer = document.getElementById('paginationContainer');
    sortButton = document.getElementById('sortButton');
    toggleViewButton = document.getElementById('toggleViewButton'); // NEW

    // 1. 페이지 로드 시, 로그인 상태를 확인하고 UI를 업데이트합니다.
    if (checkLoginStatus()) { 
        // 2. 데이터 비동기 로드 시작
        const dataLoaded = await loadAndProcessData(); 

        if (dataLoaded) {
            // 3. 데이터 로드 성공 후, 이벤트 리스너 연결
            searchListButton.addEventListener('click', handleListSearch);
            sortButton.addEventListener('click', handleSortByRating); 
            toggleViewButton.addEventListener('click', toggleDisplayMode); // NEW
        }
    }
});