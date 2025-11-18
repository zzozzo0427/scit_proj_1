// 푸터 코드를 비동기적으로 가져와 페이지에 삽입하는 함수
function loadFooter() {
    // 1. fetch API를 사용해 footer.html 파일의 내용을 가져옴
    // 웹사이트 루트(/)를 기준으로 경로를 지정하여 index.html과 list.html 모두에서 작동하도록 합니다.
    fetch('/html/footer.html') 
        .then(response => {
            // 응답이 성공적인지 확인
            if (!response.ok) {
                // 에러 메시지에 상태 코드를 포함하여 디버깅을 돕습니다.
                throw new Error(`Footer file not found or network error. Status: ${response.status}`);
            }
            return response.text(); // 응답 본문을 텍스트로 변환
        })
        .then(htmlContent => {
            // 2. 푸터 내용을 삽입할 placeholder 요소를 찾음
            const placeholder = document.getElementById('footer-placeholder');
            if (placeholder) {
                // 3. placeholder의 내부에 가져온 HTML 코드를 삽입
                placeholder.innerHTML = htmlContent;
            }
        })
        .catch(error => {
            // 오류 발생 시 콘솔에 출력
            console.error('Error loading footer:', error);
            // 디버깅을 위해 페이지에 에러 메시지를 표시
            document.getElementById('footer-placeholder').innerHTML = `<p style="text-align:center; color:red;">${error.message}</p>`;
        });
}

// 페이지가 완전히 로드된 후 함수 실행
document.addEventListener('DOMContentLoaded', loadFooter);