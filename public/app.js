/* 니오빌 원룸텔 – 화면 동작 (모집 중 / 만실 문구는 서버 src/home.js 가 정함) */
(function () {
  'use strict';

  /* ── 자주 묻는 질문 펼치기 ── */
  var faqButtons = document.querySelectorAll('.faq button');
  for (var i = 0; i < faqButtons.length; i++) {
    faqButtons[i].addEventListener('click', function () {
      var open = this.getAttribute('aria-expanded') === 'true';
      var panel = document.getElementById(this.getAttribute('aria-controls'));
      this.setAttribute('aria-expanded', open ? 'false' : 'true');
      if (panel) panel.hidden = open;
    });
  }

  /* ── 신청서 ── */
  var form = document.getElementById('applyForm');
  if (!form) return;

  var submitBtn = document.getElementById('submitBtn');
  var errorBox = document.getElementById('formError');

  form.addEventListener('input', function () { errorBox.hidden = true; });
  form.addEventListener('change', function () { errorBox.hidden = true; });

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.hidden = false;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorBox.hidden = true;

    var nameEl = document.getElementById('name');
    var phoneEl = document.getElementById('phone');
    var agreeEl = document.getElementById('agree');
    var name = nameEl.value.trim();
    var phone = phoneEl.value.replace(/[^0-9]/g, '');

    if (!name) { showError('이름을 입력해 주세요.'); nameEl.focus(); return; }
    if (!/^01[016789][0-9]{7,8}$/.test(phone)) {
      showError('연락처를 확인해 주세요. (예: 010-1234-5678)'); phoneEl.focus(); return;
    }
    if (!agreeEl.checked) { showError('개인정보 수집·이용에 동의해 주세요.'); agreeEl.focus(); return; }

    // 아직 저장하지 않습니다. 4단계에서 서버 저장 후에만 완료 화면을 보여주도록 바뀝니다.
    submitBtn.disabled = true;
    form.hidden = true;
    document.getElementById('done').hidden = false;
    window.scrollTo(0, 0);
  });
})();
