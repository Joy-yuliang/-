const { Notification } = require('electron');
const storage = require('./storage');

let notified = {}; // key: `${date}:${type}`

function pad(n) {
  return String(n).padStart(2, '0');
}

function dateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function notify(title, body) {
  try {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  } catch (e) {
    console.error('通知失败:', e);
  }
}

function check() {
  const data = storage.get();
  if (!data || !data.settings || !data.settings.remindersEnabled) return;
  const now = new Date();
  const hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const today = dateStr(now);

  const rules = [
    {
      key: 'summary',
      time: data.settings.summaryReminder,
      title: '晚间总结',
      body: '该写日记、总结反思和明天的计划了（SOP 第 6 步）',
    },
    {
      key: 'sleep',
      time: data.settings.sleepReminder,
      title: '该睡觉了',
      body: '硬约束：无论做完没有，该睡了（SOP 第 8 步）',
    },
  ];

  for (const r of rules) {
    const k = `${today}:${r.key}`;
    if (hm === r.time && !notified[k]) {
      notified[k] = true;
      notify(r.title, r.body);
    }
  }

  if (Object.keys(notified).length > 500) notified = {};
}

function setup() {
  setInterval(check, 20 * 1000);
}

module.exports = { setup };
