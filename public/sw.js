self.addEventListener("push", (event) => {
  let data = { title: "HirAIya Mood", body: "How are you feeling today?" };
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      // keep defaults on malformed payload
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/favicon.ico",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ("focus" in client) return client.focus();
        }
        return clients.openWindow("/");
      })
  );
});
