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
      return res.json().catch(function () { return { ok: false, error: '잠시 후 다시 시도해 주세요', raw: true }; })
        .then(function (j) {
          j.status = res.status;
          // 서버 오류는 원인 확인용 코드를 붙여 보여 줍니다 (A: 서버 처리 오류, B: 응답 형식 오류)
          if (!j.ok && res.status >= 500) j.error = (j.error || '잠시 후 다시 시도해 주세요') + ' (오류 ' + (j.raw ? 'B' : 'A') + res.status + ')';
          return j;
        });
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
    $('tabContent').hidden = name !== 'content';
    if (name === 'content') loadContent();
    if (name === 'inbox') loadInbox(currentFilter);
    $('tabSettings').hidden = name !== 'settings';
    if (name === 'settings') { loadAdmins(); loadTg(); loadPush(); }
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

  /* ── 내용 · 사진 ── */
  var contentFields = [];   // [{key, type, get()}]
  function contentMsg(err, ok) {
    $('contentError').textContent = err || ''; $('contentError').hidden = !err;
    $('contentOk').textContent = ok || ''; $('contentOk').hidden = !ok;
  }
  function loadContent() {
    contentMsg();
    return api('content').then(function (r) {
      if (needLogin(r)) return;
      if (!r.ok) { contentMsg(r.error); return; }
      buildContent(r);
      $('contentLast').textContent = r.last ? '마지막 저장: ' + r.last.updated_by + ' · ' + r.last.at : '';
    });
  }
  function fieldInput(f, value) {
    var wrap = el('div', 'field');
    var id = 'c_' + f.key;
    var lab = el('label', '', f.label);
    lab.htmlFor = id;
    wrap.appendChild(lab);
    var input;
    if (f.type === 'lines') {
      input = el('textarea');
      input.rows = 4;
    } else {
      input = el('input');
      input.type = f.type === 'url' ? 'url' : f.type === 'tel' ? 'tel' : 'text';
      input.maxLength = f.max || 100;
    }
    input.id = id;
    input.value = value == null ? '' : value;
    if (f.def && typeof f.def === 'string') input.placeholder = f.def.split('\n')[0];
    wrap.appendChild(input);
    if (f.help) wrap.appendChild(el('p', 'help', f.help));
    contentFields.push({ key: f.key, get: function () { return input.value; } });
    return wrap;
  }
  function faqEditor(f, items) {
    var box = el('div', 'field');
    box.appendChild(el('label', '', f.label));
    var list = el('div');
    list.style.display = 'flex'; list.style.flexDirection = 'column'; list.style.gap = '8px';
    box.appendChild(list);
    function addRow(q, a) {
      var row = el('div', 'a-faq');
      var qi = el('input'); qi.maxLength = 60; qi.placeholder = '질문'; qi.value = q || '';
      var ai = el('textarea'); ai.maxLength = 300; ai.placeholder = '답'; ai.value = a || '';
      var del = el('button', 'a-danger', '이 질문 빼기'); del.type = 'button';
      del.addEventListener('click', function () { row.remove(); addBtn.hidden = list.children.length >= f.maxItems; });
      row.appendChild(qi); row.appendChild(ai); row.appendChild(del);
      row._get = function () { return { q: qi.value, a: ai.value }; };
      list.appendChild(row);
      addBtn.hidden = list.children.length >= f.maxItems;
    }
    var addBtn = el('button', 'a-small', '+ 질문 추가'); addBtn.type = 'button';
    addBtn.addEventListener('click', function () { addRow('', ''); });
    (items || []).forEach(function (it) { addRow(it.q, it.a); });
    box.appendChild(addBtn);
    contentFields.push({ key: f.key, get: function () { return Array.prototype.map.call(list.children, function (r) { return r._get(); }); } });
    return box;
  }
  function photoSlot(f, ver) {
    var box = el('div', 'a-photo');
    box.appendChild(el('span', 'label', f.label));
    var pic = el('div', 'a-photo-box');
    function show(v) {
      pic.textContent = '';
      if (v) { var img = el('img'); img.src = '/media/' + f.key + '?v=' + v; img.alt = f.label; pic.appendChild(img); }
      else pic.textContent = '사진 없음 (' + (f.alt || '') + ')';
      delBtn.hidden = !v;
    }
    var btns = el('div', 'a-photo-btns');
    var up = el('label', 'a-small', '사진 올리기');
    var file = el('input'); file.type = 'file'; file.accept = 'image/*';
    up.appendChild(file);
    var delBtn = el('button', 'a-small', '사진 삭제'); delBtn.type = 'button';
    var note = el('small', 'help', '');
    btns.appendChild(up); btns.appendChild(delBtn); btns.appendChild(note);
    box.appendChild(pic); box.appendChild(btns);
    file.addEventListener('change', function () {
      var fl = file.files && file.files[0];
      file.value = '';
      if (!fl) return;
      note.textContent = '줄이는 중…';
      shrinkImage(fl).then(function (img) {
        note.textContent = '올리는 중…';
        return api('photo', { key: f.key, mime: img.mime, data: img.data });
      }).then(function (r) {
        if (needLogin(r)) return;
        if (!r.ok) { note.textContent = r.error; return; }
        note.textContent = '반영됨';
        show(String(Date.now()));
      }).catch(function () { note.textContent = '이 사진은 열 수 없습니다. 다른 사진으로 해 주세요'; });
    });
    var armed = false;
    delBtn.addEventListener('click', function () {
      if (!armed) { armed = true; delBtn.textContent = '한 번 더 누르면 삭제'; return; }
      armed = false; delBtn.textContent = '사진 삭제';
      api('photo/delete', { key: f.key }).then(function (r) { if (needLogin(r)) return; if (r.ok) { show(''); note.textContent = '삭제됨'; } });
    });
    show(ver);
    return box;
  }
  function buildContent(r) {
    var form = $('contentForm');
    form.textContent = '';
    contentFields = [];
    r.groups.forEach(function (g) {
      var card = el('section', 'a-card');
      card.appendChild(el('h2', '', g.title));
      g.fields.forEach(function (f) {
        if (f.type === 'photo') card.appendChild(photoSlot(f, r.photos[f.key]));
        else if (f.type === 'faq') card.appendChild(faqEditor(f, r.values[f.key]));
        else card.appendChild(fieldInput(f, r.values[f.key]));
      });
      form.appendChild(card);
    });
  }
  // 휴대폰 사진을 긴 쪽 1600px JPEG로 줄임 (약 0.2~0.6MB)
  function shrinkImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var tries = [[1600, 0.82], [1280, 0.75], [1024, 0.7]];
        (function attempt(i) {
          var max = tries[i][0], q = tries[i][1];
          var scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
          var c = document.createElement('canvas');
          c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
          var ctx = c.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          var dataUrl = c.toDataURL('image/jpeg', q);
          var b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
          if (b64.length * 0.75 > 1400000 && i < tries.length - 1) return attempt(i + 1);
          URL.revokeObjectURL(url);
          resolve({ mime: 'image/jpeg', data: b64 });
        })(0);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }
  $('contentSave').addEventListener('click', function () {
    var btn = this;
    var values = {};
    contentFields.forEach(function (f) { values[f.key] = f.get(); });
    contentMsg();
    lock(btn, true);
    api('content', { values: values }).then(function (r) {
      lock(btn, false);
      if (needLogin(r)) return;
      if (!r.ok) { contentMsg(r.error); return; }
      contentMsg('', '저장했습니다. 홈페이지에 바로 반영됩니다.');
      loadContent().then(function () { contentMsg('', '저장했습니다. 홈페이지에 바로 반영됩니다.'); });
    });
  });

  /* ── 휴대폰 알림 ── */
  var ua = navigator.userAgent || '';
  var isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  var pushSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  var pushKey = '';
  function deviceName() {
    if (isIOS) return '아이폰';
    if (/SM-|Samsung/i.test(ua)) return '갤럭시';
    if (/Android/i.test(ua)) return '안드로이드폰';
    return 'PC';
  }
  function pushMsg(err, ok) {
    $('pushError').textContent = err || ''; $('pushError').hidden = !err;
    $('pushOk').textContent = ok || ''; $('pushOk').hidden = !ok;
  }
  function keyBytes(b64) {
    var s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64.length + 3) % 4));
    var a = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
    return a;
  }
  function currentSub() {
    if (!pushSupported) return Promise.resolve(null);
    return navigator.serviceWorker.getRegistration('/admin/').then(function (reg) {
      return reg ? reg.pushManager.getSubscription() : null;
    }).catch(function () { return null; });
  }
  function loadPush() {
    $('pushIos').hidden = !(isIOS && !isStandalone);
    var usable = pushSupported && !(isIOS && !isStandalone);
    $('pushNoSupport').hidden = pushSupported || isIOS;
    $('pushDenied').hidden = !(usable && Notification.permission === 'denied');
    $('pushControls').hidden = !usable;
    return Promise.all([api('push'), currentSub()]).then(function (res) {
      var r = res[0], sub = res[1];
      if (needLogin(r)) return;
      if (!r.ok) { pushMsg(r.error); return; }
      pushKey = r.publicKey;
      var mine = sub && r.devices.some(function (d) { return d.endpoint === sub.endpoint; });
      $('pushOn').hidden = !!mine;
      $('pushOnRow').hidden = !mine;
      $('pushState').textContent = mine ? '이 휴대폰 켜짐' : '이 휴대폰 꺼짐';
      $('pushState').className = 'a-state ' + (mine ? 'on' : 'off');
      var ul = $('pushDevices');
      ul.textContent = '';
      r.devices.forEach(function (d) {
        var li = el('li');
        var label = el('span', '', '🔔 ' + d.owner + ' · ' + d.device + ' ');
        label.appendChild(el('small', '', (sub && d.endpoint === sub.endpoint ? '(이 휴대폰) ' : '') + d.since + '부터'));
        li.appendChild(label);
        var x = el('button', 'a-small', '빼기');
        x.type = 'button';
        x.addEventListener('click', function () {
          x.disabled = true;
          api('push/unsubscribe', { endpoint: d.endpoint }).then(function (y) { if (needLogin(y)) return; loadPush(); });
        });
        li.appendChild(x);
        ul.appendChild(li);
      });
      if (!r.devices.length) ul.appendChild(el('li', '', '아직 알림을 켠 휴대폰이 없습니다'));
    });
  }
  $('pushOn').addEventListener('click', function () {
    var btn = this;
    pushMsg();
    if (!pushKey) { pushMsg('잠시 후 다시 눌러 주세요'); return; }
    lock(btn, true);
    Notification.requestPermission().then(function (perm) {
      if (perm !== 'granted') throw new Error('denied');
      return navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin/' });
    }).then(function () {
      return navigator.serviceWorker.ready;
    }).then(function (reg) {
      return reg.pushManager.getSubscription().then(function (old) {
        return old || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(pushKey) });
      });
    }).then(function (sub) {
      var j = sub.toJSON();
      return api('push/subscribe', { endpoint: j.endpoint, keys: j.keys, device: deviceName() });
    }).then(function (r) {
      lock(btn, false);
      if (needLogin(r)) return;
      if (!r.ok) { pushMsg(r.error); return; }
      pushMsg('', '알림을 켰습니다. [테스트 알림]으로 확인해 보세요.');
      loadPush();
    }).catch(function (e) {
      lock(btn, false);
      if (e && e.message === 'denied') { $('pushDenied').hidden = false; pushMsg('알림 허용을 눌러야 받을 수 있습니다'); return; }
      pushMsg('알림을 켜지 못했습니다. 브라우저를 최신으로 업데이트한 뒤 다시 시도해 주세요');
    });
  });
  $('pushTest').addEventListener('click', function () {
    var btn = this;
    pushMsg();
    lock(btn, true);
    api('push/test', {}).then(function (r) {
      lock(btn, false);
      if (needLogin(r)) return;
      if (!r.ok) { pushMsg(r.error); return; }
      pushMsg('', '보냈습니다. 몇 초 안에 휴대폰 알림창을 확인해 주세요.');
    });
  });
  $('pushOff').addEventListener('click', function () {
    var btn = this;
    pushMsg();
    lock(btn, true);
    currentSub().then(function (sub) {
      if (!sub) return null;
      var ep = sub.endpoint;
      return sub.unsubscribe().catch(function () {}).then(function () { return api('push/unsubscribe', { endpoint: ep }); });
    }).then(function () { lock(btn, false); pushMsg('', '이 휴대폰 알림을 껐습니다'); loadPush(); });
  });

  /* ── 텔레그램 알림 ── */
  function tgMsg(err, ok) {
    $('tgError').textContent = err || ''; $('tgError').hidden = !err;
    $('tgOk').textContent = ok || ''; $('tgOk').hidden = !ok;
  }
  function paintTg(r) {
    var ready = r.connected && r.chats && r.chats.length;
    $('tgState').textContent = ready ? '켜짐' : '꺼짐';
    $('tgState').className = 'a-state ' + (ready ? 'on' : 'off');
    $('tgSetup').hidden = !!r.connected;
    $('tgReady').hidden = !r.connected;
    $('tgBot').textContent = '@' + (r.bot || '');
    $('tgBot2').textContent = '@' + (r.bot || '');
    var ul = $('tgChats');
    ul.textContent = '';
    (r.chats || []).forEach(function (c) {
      var li = el('li');
      li.appendChild(el('span', '', '🔔 ' + c.name));
      var x = el('button', 'a-small', '빼기');
      x.type = 'button';
      x.addEventListener('click', function () {
        x.disabled = true;
        api('telegram/remove', { id: c.id }).then(function (y) { if (needLogin(y)) return; loadTg(); });
      });
      li.appendChild(x);
      ul.appendChild(li);
    });
    if (r.connected && !(r.chats || []).length) ul.appendChild(el('li', '', '아직 받는 사람이 없습니다'));
  }
  function loadTg() {
    return api('telegram').then(function (r) {
      if (needLogin(r)) return;
      if (r.ok) paintTg(r);
    });
  }
  $('tgTokenForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = this, btn = f.querySelector('button');
    formMsg(f);
    lock(btn, true);
    api('telegram/token', { token: $('tgToken').value }).then(function (r) {
      lock(btn, false);
      if (needLogin(r)) return;
      if (!r.ok) { formMsg(f, r.error); return; }
      $('tgToken').value = '';
      tgMsg('', '토큰을 저장했습니다. 이제 받을 사람이 봇에게 시작(/start)을 누른 뒤 "받는 사람 찾기"를 눌러 주세요.');
      loadTg();
    });
  });
  $('tgFind').addEventListener('click', function () {
    var btn = this;
    tgMsg();
    lock(btn, true);
    api('telegram/find', {}).then(function (r) {
      lock(btn, false);
      if (needLogin(r)) return;
      if (!r.ok) { tgMsg(r.error); return; }
      tgMsg('', r.chats.length ? '받는 사람 ' + r.chats.length + '명을 찾았습니다. 테스트 알림으로 확인해 보세요.' : '아직 찾지 못했습니다. 봇에게 시작(/start)을 누른 뒤 다시 눌러 주세요.');
      loadTg();
    });
  });
  $('tgTest').addEventListener('click', function () {
    var btn = this;
    tgMsg();
    lock(btn, true);
    api('telegram/test', {}).then(function (r) {
      lock(btn, false);
      if (needLogin(r)) return;
      if (!r.ok) { tgMsg(r.error); return; }
      tgMsg('', r.sent + '명에게 보냈습니다' + (r.failed ? ' (' + r.failed + '명 실패)' : '') + '. 텔레그램을 확인해 주세요.');
    });
  });
  var offArmed = false;
  $('tgOff').addEventListener('click', function () {
    var btn = this;
    if (!offArmed) { offArmed = true; btn.textContent = '한 번 더 누르면 알림이 꺼집니다'; return; }
    offArmed = false;
    btn.textContent = '알림 끄기 (토큰 삭제)';
    api('telegram/off', {}).then(function (r) { if (needLogin(r)) return; tgMsg(); loadTg(); });
  });

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
