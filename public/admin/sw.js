/* 관리자 휴대폰 알림 받기 */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (event) {
  var data = { title: '🏠 새 상담 신청', body: '신청함을 확인해 주세요', url: '/admin/' };
  try { if (event.data) data = Object.assign(data, event.data.json()); } catch (e) { /* 기본 문구 */ }
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/admin/icon-192.png',
    badge: '/admin/badge-96.png',
    tag: 'niovill-inquiry',
    renotify: true,
    data: { url: data.url || '/admin/' }
  }));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/admin/';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].url.indexOf('/admin') !== -1 && 'focus' in list[i]) {
        list[i].navigate(url).catch(function () {});
        return list[i].focus();
      }
    }
    return self.clients.openWindow(url);
  }));
});
