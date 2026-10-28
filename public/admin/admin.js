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
      setBadge(r.newCount || 0);
      loadInbox('new');
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
    $('tabInbox').hidden = name !== 'inbox';
    $('tabStatus').hidden = name !== 'status';
    if (name === 'inbox') loadInbox(currentFilter);
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

  /* ── 신청함 ── */
  var currentFilter = 'new';
  var STATUS_TEXT = { new: '새 신청', contacted: '연락함', done: '완료' };
  var filterBtns = document.querySelectorAll('.a-filter button');
  for (var f = 0; f < filterBtns.length; f++) {
    filterBtns[f].addEventListener('click', function () { loadInbox(this.getAttribute('data-filter')); });
  }
  function setBadge(n) {
    $('newBadge').textContent = n;
    $('newBadge').hidden = !n;
  }
  function fmtPhone(p) {
    return p.length === 11 ? p.slice(0, 3) + '-' + p.slice(3, 7) + '-' + p.slice(7) : p.length === 10 ? p.slice(0, 3) + '-' + p.slice(3, 6) + '-' + p.slice(6) : p;
  }
  function fmtDate(d) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || '');
    return m ? Number(m[2]) + '/' + Number(m[3]) : '';
  }
  function loadInbox(filter) {
    currentFilter = filter;
    for (var i = 0; i < filterBtns.length; i++) filterBtns[i].setAttribute('aria-pressed', filterBtns[i].getAttribute('data-filter') === filter ? 'true' : 'false');
    return api('inquiries?filter=' + filter).then(function (r) {
      if (needLogin(r)) return;
      if (!r.ok) { $('inboxError').textContent = r.error; $('inboxError').hidden = false; return; }
      $('inboxError').hidden = true;
      $('cntNew').textContent = r.counts.new;
      $('cntContacted').textContent = r.counts.contacted;
      $('cntDone').textContent = r.counts.done;
      setBadge(r.counts.new);
      var box = $('inboxList');
      box.textContent = '';
      r.items.forEach(function (it) { box.appendChild(itemCard(it, r)); });
      $('inboxEmpty').textContent = filter === 'new' ? '새 신청이 없습니다' : STATUS_TEXT[filter] + ' 신청이 없습니다';
      $('inboxEmpty').hidden = r.items.length > 0;
    });
  }
  function itemCard(it, r) {
    var card = el('article', 'a-item' + (it.status === 'new' ? ' is-new' : ''));
    var head = el('div', 'a-item-head');
    var who = el('b', '', it.name);
    if (it.was_full) who.appendChild(el('span', 'a-tag', '만실 때 대기'));
    head.appendChild(who);
    head.appendChild(el('small', '', it.created));
    card.appendChild(head);

    var tel = el('a', 'a-tel', '📞 ' + fmtPhone(it.phone));
    tel.href = 'tel:' + it.phone;
    card.appendChild(tel);

    var meta = [];
    if (it.room_type && it.room_type !== 'any') meta.push(r.roomTypes[it.room_type] || it.room_type);
    else meta.push('타입 상관없음');
    if (it.move_date) meta.push(fmtDate(it.move_date) + ' 입실 희망');
    if (it.period && r.periods[it.period]) meta.push(r.periods[it.period]);
    card.appendChild(el('p', 'a-meta', meta.join(' · ')));
    if (it.message) card.appendChild(el('p', 'a-text', it.message));

    var seg = el('div', 'a-seg');
    ['new', 'contacted', 'done'].forEach(function (st) {
      var b = el('button', '', STATUS_TEXT[st]);
      b.type = 'button';
      b.setAttribute('aria-pressed', it.status === st ? 'true' : 'false');
      b.addEventListener('click', function () {
        if (it.status === st) return;
        b.disabled = true;
        api('inquiries/update', { id: it.id, status: st }).then(function (x) {
          b.disabled = false;
          if (needLogin(x)) return;
          if (!x.ok) { $('inboxError').textContent = x.error; $('inboxError').hidden = false; return; }
          loadInbox(currentFilter);
        });
      });
      seg.appendChild(b);
    });
    card.appendChild(seg);

    var memo = el('div', 'a-memo');
    var input = el('input');
    input.maxLength = 300;
    input.placeholder = '메모 (예: 11/2 방보기 약속)';
    input.value = it.memo || '';
    var save = el('button', 'a-small', '저장');
    save.type = 'button';
    save.addEventListener('click', function () {
      save.disabled = true;
      api('inquiries/update', { id: it.id, memo: input.value }).then(function (x) {
        save.disabled = false;
        if (needLogin(x)) return;
        save.textContent = x.ok ? '저장됨' : '실패';
        setTimeout(function () { save.textContent = '저장'; }, 1500);
      });
    });
    memo.appendChild(input);
    memo.appendChild(save);
    card.appendChild(memo);

    var foot = el('div', 'a-foot');
    var info = [];
    if (it.updated_by) info.push('처리: ' + it.updated_by);
    if (it.status === 'done') info.push(Math.max(0, it.days_left) + '일 뒤 자동 삭제');
    foot.appendChild(el('span', '', info.join(' · ')));
    var del = el('button', 'a-danger', '삭제');
    del.type = 'button';
    var armed = false;
    del.addEventListener('click', function () {
      if (!armed) { armed = true; del.textContent = '한 번 더 누르면 삭제'; return; }
      del.disabled = true;
      api('inquiries/delete', { id: it.id }).then(function (x) {
        if (needLogin(x)) return;
        loadInbox(currentFilter);
      });
    });
    foot.appendChild(del);
    card.appendChild(foot);
    return card;
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
