/* 관리자 화면 동작 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  /* ── 서버와 주고받기 ── */
  function api(path, body) {
    var opt = { method: body ? 'POST' : 'GET', credentials: 'same-origin', headers: {} };
    if (body) {
      opt.headers['Content-Type'] = 'application/json';
      opt.body = JSON.stringify(body);
    }
    return fetch('/api/admin/' + path, opt).then(function (res) {
      return res.json().catch(function () { return { ok: false, error: '잠시 후 다시 시도해 주세요' }; })
        .then(function (j) { j.status = res.status; return j; });
    }, function () {
      return { ok: false, error: '인터넷 연결을 확인해 주세요', status: 0 };
    });
  }
  function needLogin(r) {
    if (r.status === 401 && r.error === '다시 로그인해 주세요') { show('viewLogin'); return true; }
    return false;
  }

  /* ── 화면 전환 ── */
  function show(id) {
    ['loading', 'viewSetup', 'viewLogin', 'viewMain'].forEach(function (v) { $(v).hidden = v !== id; });
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function formMsg(form, err, ok) {
    var e = form.querySelector('.error');
    var o = form.querySelector('.a-ok');
    if (e) { e.textContent = err || ''; e.hidden = !err; }
    if (o) { o.textContent = ok || ''; o.hidden = !ok; }
  }
  function lock(btn, on) { if (btn) btn.disabled = on; }
  /* ── 시작 ── */
  function start() {
    api('me').then(function (r) {
      if (!r.ok) { $('loading').textContent = r.error || '잠시 후 다시 시도해 주세요'; return; }
      if (r.needSetup) { show('viewSetup'); return; }
      if (!r.admin) { show('viewLogin'); return; }
      $('whoami').textContent = r.admin.name + ' 님';
      show('viewMain');
      loadStatus();
    });
  }

  $('setupForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = this, btn = f.querySelector('button');
    formMsg(f);
    lock(btn, true);
    api('setup', { name: $('sName').value, username: $('sUser').value, password: $('sPass').value }).then(function (r) {
      lock(btn, false);
      if (!r.ok) { formMsg(f, r.error); if (r.status === 409) show('viewLogin'); return; }
      start();
    });
  });

  $('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = this, btn = f.querySelector('button');
    formMsg(f);
    lock(btn, true);
    api('login', { username: $('lUser').value, password: $('lPass').value }).then(function (r) {
      lock(btn, false);
      if (!r.ok) { formMsg(f, r.error); return; }
      $('lPass').value = '';
      start();
    });
  });

  /* ── 탭 ── */
  var tabs = document.querySelectorAll('.a-tabs button');
  function openTab(name) {
    for (var i = 0; i < tabs.length; i++) tabs[i].setAttribute('aria-selected', tabs[i].getAttribute('data-tab') === name ? 'true' : 'false');
    $('tabStatus').hidden = name !== 'status';
    $('tabSettings').hidden = name !== 'settings';
    if (name === 'settings') loadAdmins();
    window.scrollTo(0, 0);
  }
  for (var t = 0; t < tabs.length; t++) {
    tabs[t].addEventListener('click', function () { openTab(this.getAttribute('data-tab')); });
  }

  /* ── 모집 상태 ── */
  var switchBtns = document.querySelectorAll('.a-switch button');
  function paintSwitch(full) {
    for (var i = 0; i < switchBtns.length; i++) {
      switchBtns[i].setAttribute('aria-pressed', switchBtns[i].getAttribute('data-full') === (full ? '1' : '0') ? 'true' : 'false');
    }
  }
  function loadStatus() {
    return api('status').then(function (r) {
      if (needLogin(r)) return;
      if (!r.ok) { $('statusError').textContent = r.error; $('statusError').hidden = false; return; }
      $('statusError').hidden = true;
      paintSwitch(r.full);
      $('lastChange').textContent = r.last ? '마지막 변경: ' + r.last.updated_by + ' · ' + r.last.at : '';
    });
  }
  for (var w = 0; w < switchBtns.length; w++) {
    switchBtns[w].addEventListener('click', function () {
      var full = this.getAttribute('data-full') === '1';
      if (this.getAttribute('aria-pressed') === 'true') return;
      for (var i = 0; i < switchBtns.length; i++) switchBtns[i].disabled = true;
      api('status', { full: full }).then(function (r) {
        for (var i = 0; i < switchBtns.length; i++) switchBtns[i].disabled = false;
        if (needLogin(r)) return;
        if (!r.ok) { $('statusError').textContent = r.error; $('statusError').hidden = false; return; }
        loadStatus();
      });
    });
  }

  /* ── 계정 탭 ── */
  function loadAdmins() {
    api('admins').then(function (r) {
      if (needLogin(r)) return;
      var ul = $('adminList');
      ul.textContent = '';
      (r.admins || []).forEach(function (a) {
        var li = el('li');
        var who = el('span', '', a.name + ' ');
        who.appendChild(el('small', '', '(' + a.username + ')' + (a.id === r.me ? ' · 나' : '')));
        li.appendChild(who);
        if (a.id !== r.me) {
          var del = el('button', 'a-small', '삭제');
          del.type = 'button';
          var armed = false;
          del.addEventListener('click', function () {
            if (!armed) { armed = true; del.textContent = '한 번 더 누르면 삭제'; return; }
            lock(del, true);
            api('admins/delete', { id: a.id }).then(function (x) {
              if (needLogin(x)) return;
              loadAdmins();
            });
          });
          li.appendChild(del);
        }
        ul.appendChild(li);
      });
    });
  }

  $('adminForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = this, btn = f.querySelector('button');
    formMsg(f);
    lock(btn, true);
    api('admins/add', { name: $('aName').value, username: $('aUser').value, password: $('aPass').value }).then(function (r) {
      lock(btn, false);
      if (needLogin(r)) return;
      if (!r.ok) { formMsg(f, r.error); return; }
      formMsg(f, '', '추가했습니다. 아이디와 처음 비밀번호를 전달해 주세요.');
      $('aName').value = ''; $('aUser').value = ''; $('aPass').value = '';
      loadAdmins();
    });
  });

  $('pwForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = this, btn = f.querySelector('button');
    formMsg(f);
    lock(btn, true);
    api('password', { current: $('pCur').value, next: $('pNew').value }).then(function (r) {
      lock(btn, false);
      if (needLogin(r)) return;
      if (!r.ok) { formMsg(f, r.error); return; }
      formMsg(f, '', '변경했습니다. 다른 기기에서는 다시 로그인해야 합니다.');
      $('pCur').value = ''; $('pNew').value = '';
    });
  });

  $('logoutBtn').addEventListener('click', function () {
    api('logout', {}).then(function () { show('viewLogin'); });
  });

  start();
})();
