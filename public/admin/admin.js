/* 관리자 화면 동작 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var data = null;      // 방 목록 응답
  var current = null;   // 창에 열린 방
  var chosen = null;    // 창에서 고른 상태

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
  function shortDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? Number(m[2]) + '/' + Number(m[3]) : '';
  }
  function typeLabel(key) {
    var t = (data && data.types || []).filter(function (x) { return x.key === key; })[0];
    return t ? t.label : key;
  }

  /* ── 시작 ── */
  function start() {
    api('me').then(function (r) {
      if (!r.ok) { $('loading').textContent = r.error || '잠시 후 다시 시도해 주세요'; return; }
      if (r.needSetup) { show('viewSetup'); return; }
      if (!r.admin) { show('viewLogin'); return; }
      $('whoami').textContent = r.admin.name + ' 님';
      show('viewMain');
      loadRooms();
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
    $('tabRooms').hidden = name !== 'rooms';
    $('tabSettings').hidden = name !== 'settings';
    if (name === 'settings') loadAdmins();
    window.scrollTo(0, 0);
  }
  for (var t = 0; t < tabs.length; t++) {
    tabs[t].addEventListener('click', function () { openTab(this.getAttribute('data-tab')); });
  }
  $('goAddRooms').addEventListener('click', function () { openTab('settings'); $('addText').focus(); });

  /* ── 공실 탭 ── */
  function loadRooms() {
    return api('rooms').then(function (r) {
      if (needLogin(r)) return;
      if (!r.ok) { alertBox(r.error); return; }
      data = r;
      fillTypeSelects();
      renderPreview();
      renderGrid();
    });
  }
  function alertBox(msg) { $('lastChange').textContent = msg; }

  function fillTypeSelects() {
    ['addType', 'editType'].forEach(function (id) {
      var sel = $(id);
      if (sel.options.length) return;
      data.types.forEach(function (t) {
        var o = el('option', '', t.label);
        o.value = t.key;
        sel.appendChild(o);
      });
    });
  }

  function renderPreview() {
    var p = data.preview;
    var dot = $('pvDot');
    if (!p) {
      dot.className = 'dot gray';
      $('pvHead').textContent = '보이는 방이 없습니다';
      $('pvTypes').textContent = '방을 등록하면 손님 화면에 공실이 표시됩니다';
      $('pvSoon').hidden = true;
    } else {
      dot.className = p.full ? 'dot red' : 'dot';
      $('pvHead').textContent = p.full ? '현재 만실' : '지금 입실 가능 ' + p.total + '실';
      $('pvTypes').textContent = '공실 ' + p.byType;
      $('pvSoon').textContent = p.soonText;
      $('pvSoon').hidden = !p.soonText;
    }
    var vis = data.rooms.filter(function (x) { return x.status !== 'hidden'; });
    var cnt = function (s) { return vis.filter(function (x) { return x.status === s; }).length; };
    $('cEmpty').textContent = cnt('empty');
    $('cSoon').textContent = cnt('soon');
    $('cIn').textContent = cnt('occupied');
    $('lastChange').textContent = data.last ? '마지막 수정: ' + data.last.admin_name + ' · ' + data.last.at : '아직 수정 기록이 없습니다';
  }

  function tileInfo(room) {
    if (room.status === 'empty') return { cls: 't-empty', label: '공실' };
    if (room.status === 'soon') {
      if (!room.avail_date) return { cls: 't-soon', label: '곧 입실' };
      if (room.avail_date < data.today) return { cls: 't-late', label: '확인 필요' };
      return { cls: 't-soon', label: shortDate(room.avail_date) + ' 예정' };
    }
    return { cls: '', label: '입실중' };
  }

  function renderGrid() {
    var grid = $('roomGrid');
    grid.textContent = '';
    var vis = data.rooms.filter(function (x) { return x.status !== 'hidden'; });
    var hid = data.rooms.filter(function (x) { return x.status === 'hidden'; });
    vis.forEach(function (room) {
      var info = tileInfo(room);
      var b = el('button', 'a-tile ' + info.cls);
      b.type = 'button';
      b.appendChild(el('b', '', room.no));
      b.appendChild(el('small', '', typeLabel(room.type)));
      b.appendChild(el('span', '', info.label));
      b.setAttribute('aria-label', room.no + '호 ' + typeLabel(room.type) + ' ' + info.label + ', 눌러서 바꾸기');
      b.addEventListener('click', function () { openSheet(room); });
      grid.appendChild(b);
    });
    $('noRooms').hidden = data.rooms.length > 0;
    grid.hidden = vis.length === 0;

    $('hiddenBox').hidden = hid.length === 0;
    $('hiddenCount').textContent = hid.length ? '(' + hid.length + ')' : '';
    var list = $('hiddenList');
    list.textContent = '';
    hid.forEach(function (room) {
      var row = el('div', 'a-hidden-item');
      row.appendChild(el('span', '', room.no + ' · ' + typeLabel(room.type)));
      var btn = el('button', 'a-small', '숨김 해제');
      btn.type = 'button';
      btn.addEventListener('click', function () {
        lock(btn, true);
        api('rooms/edit', { no: room.no, hidden: false }).then(function (r) {
          lock(btn, false);
          if (needLogin(r)) return;
          if (!r.ok) { alertBox(r.error); return; }
          loadRooms();
        });
      });
      row.appendChild(btn);
      list.appendChild(row);
    });
  }

  $('showLog').addEventListener('click', function () {
    var box = $('logList');
    if (!box.hidden) { box.hidden = true; return; }
    api('log').then(function (r) {
      if (needLogin(r)) return;
      box.textContent = '';
      (r.log || []).forEach(function (x) {
        box.appendChild(el('li', '', x.at + ' · ' + x.admin_name + ' · ' + x.room_no + ' ' + x.detail));
      });
      if (!box.children.length) box.appendChild(el('li', '', '기록이 없습니다'));
      box.hidden = false;
    });
  });

  /* ── 상태 바꾸기 창 ── */
  var choiceBtns = document.querySelectorAll('.a-choices button');
  function pick(status) {
    chosen = status;
    for (var i = 0; i < choiceBtns.length; i++) {
      choiceBtns[i].setAttribute('aria-pressed', choiceBtns[i].getAttribute('data-status') === status ? 'true' : 'false');
    }
    $('soonField').hidden = status !== 'soon';
  }
  for (var c = 0; c < choiceBtns.length; c++) {
    choiceBtns[c].addEventListener('click', function () { pick(this.getAttribute('data-status')); });
  }

  function openSheet(room) {
    current = room;
    $('sheetTitle').textContent = room.no + '호 · ' + typeLabel(room.type);
    pick(room.status === 'hidden' ? null : room.status);
    $('soonDate').value = room.avail_date || '';
    $('soonDate').min = data.today;
    $('editType').value = room.type;
    resetDelete();
    formMsg($('sheet'));
    $('sheet').querySelector('.a-more').open = false;
    $('sheet').hidden = false;
    document.body.classList.add('sheet-open');
  }
  function closeSheet() {
    $('sheet').hidden = true;
    document.body.classList.remove('sheet-open');
    current = null;
  }
  var closers = document.querySelectorAll('[data-close]');
  for (var k = 0; k < closers.length; k++) closers[k].addEventListener('click', closeSheet);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('sheet').hidden) closeSheet(); });

  function sheetCall(btn, path, body) {
    formMsg($('sheet'));
    lock(btn, true);
    api(path, body).then(function (r) {
      lock(btn, false);
      if (needLogin(r)) { closeSheet(); return; }
      if (!r.ok) { formMsg($('sheet'), r.error); return; }
      closeSheet();
      loadRooms();
    });
  }

  $('sheetSave').addEventListener('click', function () {
    if (!current) return;
    if (!chosen) { formMsg($('sheet'), '상태를 골라 주세요'); return; }
    sheetCall(this, 'rooms/status', { no: current.no, status: chosen, avail_date: chosen === 'soon' ? $('soonDate').value : '' });
  });
  $('editSave').addEventListener('click', function () {
    if (!current) return;
    sheetCall(this, 'rooms/edit', { no: current.no, type: $('editType').value });
  });
  $('hideBtn').addEventListener('click', function () {
    if (!current) return;
    sheetCall(this, 'rooms/edit', { no: current.no, hidden: true });
  });

  var deleteArmed = false;
  function resetDelete() { deleteArmed = false; $('deleteBtn').textContent = '이 방 삭제'; }
  $('deleteBtn').addEventListener('click', function () {
    if (!current) return;
    if (!deleteArmed) { deleteArmed = true; this.textContent = '한 번 더 누르면 ' + current.no + '호가 삭제됩니다'; return; }
    sheetCall(this, 'rooms/delete', { no: current.no });
  });

  /* ── 설정 탭 ── */
  $('addForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = this, btn = f.querySelector('button');
    formMsg(f);
    lock(btn, true);
    api('rooms/add', { text: $('addText').value, type: $('addType').value, hidden: $('addHidden').checked }).then(function (r) {
      lock(btn, false);
      if (needLogin(r)) return;
      if (!r.ok) { formMsg(f, r.error); return; }
      var msg = r.added.length + '실을 추가했습니다.';
      if (r.skipped.length) msg += ' 이미 있는 호실은 건너뜀: ' + r.skipped.join(', ');
      formMsg(f, '', msg);
      if (r.added.length) { $('addText').value = ''; $('addHidden').checked = false; }
      loadRooms();
    });
  });

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
