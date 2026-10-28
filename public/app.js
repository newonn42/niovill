/* 니오빌 원룸텔 – 화면 동작 (공실 표시는 서버 functions/index.js 가 채움) */
(function () {
  'use strict';

  var params = new URLSearchParams(location.search);

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

  var TEXT = {
    move: {
      help: '입실 희망일을 알려주시면 가능한 방을 확인해 연락드립니다.',
      date: '입실 희망일', submit: '입실 신청하기',
      doneTitle: '입실 신청이 접수되었습니다',
      doneBody: '24시간 안에 남겨주신 번호로 연락드리겠습니다.'
    },
    view: {
      help: '방을 보고 싶은 날짜를 남겨주시면 시간을 맞춰 연락드립니다.',
      date: '방보기 희망일', submit: '방보기 신청하기',
      doneTitle: '방보기 신청이 접수되었습니다',
      doneBody: '가능한 방보기 시간을 확인해 24시간 안에 연락드리겠습니다.'
    },
    wait: {
      help: '공실이 생기면 접수 순서대로 먼저 연락드립니다.',
      date: '입실 희망 시기', submit: '대기 신청하기',
      doneTitle: '대기 신청이 접수되었습니다',
      doneBody: '공실이 생기면 가장 먼저 연락드리겠습니다. 따로 전화하지 않으셔도 됩니다.'
    }
  };

  var kindInputs = form.querySelectorAll('input[name="kind"]');
  var help = document.getElementById('kindHelp');
  var dateLabel = document.getElementById('dateLabel');
  var submitBtn = document.getElementById('submitBtn');
  var errorBox = document.getElementById('formError');

  function currentKind() {
    var checked = form.querySelector('input[name="kind"]:checked');
    return checked ? checked.value : 'move';
  }
  function applyKind() {
    var t = TEXT[currentKind()];
    help.textContent = t.help;
    dateLabel.textContent = t.date;
    submitBtn.textContent = t.submit;
  }

  // 주소에 ?kind=wait 처럼 들어오면 미리 선택
  var preset = params.get('kind');
  if (preset && TEXT[preset]) {
    var target = form.querySelector('input[name="kind"][value="' + preset + '"]');
    if (target) target.checked = true;
  }
  for (var k = 0; k < kindInputs.length; k++) {
    kindInputs[k].addEventListener('change', applyKind);
  }
  applyKind();

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

    // 1단계: 아직 저장하지 않습니다. 4단계에서 서버 저장 후에만 완료 화면을 보여주도록 바뀝니다.
    submitBtn.disabled = true;
    var t = TEXT[currentKind()];
    document.getElementById('doneTitle').textContent = t.doneTitle;
    document.getElementById('doneBody').textContent = t.doneBody;
    form.hidden = true;
    document.getElementById('done').hidden = false;
    window.scrollTo(0, 0);
  });
})();
