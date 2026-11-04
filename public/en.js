/* English page form → same inbox as Korean form */
(function () {
  'use strict';
  var form = document.getElementById('enForm');
  if (!form) return;
  var err = document.getElementById('enError');
  var btn = document.getElementById('enSubmit');
  function show(m) { err.textContent = m; err.hidden = false; }
  form.addEventListener('input', function () { err.hidden = true; });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    err.hidden = true;
    var name = document.getElementById('enName').value.trim();
    var phone = document.getElementById('enPhone').value.replace(/[^0-9]/g, '');
    var msg = document.getElementById('enMsg').value.trim();
    if (!name) { show('Please enter your name.'); return; }
    if (phone && !/^01[016789][0-9]{7,8}$/.test(phone)) { show('Please check your Korean mobile number (010-xxxx-xxxx).'); return; }
    if (!phone && msg.length < 5) { show('No Korean number? Please write your email or messenger ID in the message.'); return; }
    if (!document.getElementById('enAgree').checked) { show('Please check the agreement box.'); return; }
    btn.disabled = true;
    btn.textContent = 'Sending…';
    fetch('/api/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name,
        phone: phone,
        noPhone: !phone,
        roomType: document.getElementById('enType').value,
        date: document.getElementById('enDate').value,
        message: '[English] ' + (phone ? '' : '(no Korean number) ') + msg,
        agree: true,
        website: document.getElementById('enWebsite').value
      })
    }).then(function (r) { return r.json(); }).then(function (r) {
      if (!r || !r.ok) throw new Error('fail');
      form.hidden = true;
      document.getElementById('enDone').hidden = false;
    }).catch(function () {
      btn.disabled = false;
      btn.textContent = 'Send';
      show('Sorry, sending failed. Please message us on KakaoTalk.');
    });
  });
})();
