const { app } = require('electron');
const path = require('path');
const fs = require('fs');

let data = null;
let dataFile = null;

const DEFAULT_DATA = {
  settings: {
    remindersEnabled: true,
    summaryReminder: '23:00',
    sleepReminder: '00:00',
  },
  columns: [
    { id: 'arrange', name: '安排', type: 'checklist', sort: 0 },
    { id: 'reading', name: '读书', type: 'reading', sort: 1 },
    { id: 'spur', name: '临时起意', type: 'checklist', sort: 2 },
    { id: 'summary', name: '总结', type: 'text', sort: 3 },
  ],
  routines: [
    { id: 'r1', name: '唤醒：起床、穿裤子、打开窗帘、喝一口水或上厕所', sort: 0 },
    { id: 'r2', name: '看安排：不看手机，打开软件看今天的安排', sort: 1 },
    { id: 'r3', name: '洗漱护肤：涂该涂的，需要时涂防晒', sort: 2 },
    { id: 'r4', name: '按当天安排开始活动', sort: 3 },
    { id: 'r5', name: '固定读书：不少于 1 小时（书 / 微信文章等）', sort: 4 },
    { id: 'r6', name: '晚间总结：日记、感悟、总结反思；检验完成情况；做次日计划', sort: 5 },
    { id: 'r7', name: '睡前：刷牙洗脸，涂该涂的', sort: 6 },
    { id: 'r8', name: '睡觉：12 点左右必须睡', sort: 7 },
  ],
  systems: [],
  events: {},
  days: {},
  logs: [],
};

function init() {
  const dir = path.join(app.getPath('userData'), 'data');
  fs.mkdirSync(dir, { recursive: true });
  dataFile = path.join(dir, 'tixi-data.json');
  try {
    data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    // 向前兼容：合并默认结构
    data = { ...structuredClone(DEFAULT_DATA), ...data };
    data.settings = { ...DEFAULT_DATA.settings, ...(data.settings || {}) };
    data.columns = Array.isArray(data.columns) && data.columns.length ? data.columns : DEFAULT_DATA.columns;
    data.routines = Array.isArray(data.routines) && data.routines.length ? data.routines : DEFAULT_DATA.routines;
    data.systems = Array.isArray(data.systems) ? data.systems : [];
    data.events = data.events || {};
    data.days = data.days || {};
    data.logs = Array.isArray(data.logs) ? data.logs : [];
  } catch {
    data = structuredClone(DEFAULT_DATA);
    save();
  }
}

function get() {
  return data;
}

function set(next) {
  data = next;
  save();
}

function save() {
  try {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('保存数据失败:', e);
  }
}

module.exports = { init, get, set, dataFile };
