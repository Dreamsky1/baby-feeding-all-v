<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import packageInfo from '../package.json';
// ==================== 类型定义 (TypeScript 安全约束) ====================
export type RecordType = 'breast_live' | 'breast_bottle' | 'bottle_formula' | 'diaper' | 'blood_sugar' | 'growth' | 'ad_probiotics' | 'temperature' | 'other_remark';
export type DiaperStatus = 'wet' | 'dirty' | 'mixed';
export type SugarPeriod = 'before_feed' | 'after_feed_1h' | 'after_feed_2h' | 'random';

export interface RecordDetail {
  breast_left_minutes?: number;
  breast_right_minutes?: number;
  bottle_volume_ml?: number;
  sugar_value?: number;
  sugar_period?: SugarPeriod;
  diaper_status?: DiaperStatus;
  weight_kg?: number;
  height_cm?: number;
  medication_type?: 'ad' | 'probiotics' | 'mixed' | 'other';
  temperature?: number;
}

export interface BabyRecord {
  id: string;
  timestamp: string;
  type: RecordType;
  detail: RecordDetail;
  remark: string;
}

export interface ApiLog {
  time: string;
  method: 'GET' | 'POST' | 'DELETE' | 'SEED';
  url: string;
  status: number;
  data: any;
}

export interface DailyMilkData {
  date: string;
  shortDate: string;
  formulaVol: number;
  breastVol: number;
  total: number;
}

export interface GrowthPoint {
  x: number;
  yWeight: number;
  yHeight: number;
  weight: string;
  height: string;
  date: string;
}

export interface SugarPoint {
  x: number;
  y: number;
  val: number;
}



// ==================== 响应式状态管理 ====================
const currentTab = ref('log'); // 视图控制: 'log' | 'stats'
const version = ref(packageInfo.version);
const activeModal = ref(null); // 弹窗控制: 对应 RecordType
const showBackendLog = ref(false); // 模拟控制台显隐
// ==================== 样式辅助映射 ====================
const getRecordStyle = (type: RecordType) => {
  const map: Record<RecordType, string> = {
    breast_live: 'bg-[#FFD6D6] text-red-600',
    breast_bottle: 'bg-[#D4ECFC] text-blue-600',
    bottle_formula: 'bg-[#FFF0CA] text-amber-600',
    diaper: 'bg-[#F0E5FC] text-purple-700',
    blood_sugar: 'bg-rose-100 text-rose-600 border border-rose-200',
    growth: 'bg-[#D8ECD0] text-emerald-800',
    ad_probiotics: 'bg-[#E6F9F9] text-cyan-700 border border-cyan-150',
    temperature: 'bg-[#FFF5ED] text-orange-700 border border-orange-150',
    other_remark: 'bg-[#F1F3F5] text-slate-700 border border-slate-200'
  };
  return map[type] || 'bg-gray-100';
};
const getRecordValue = (record: BabyRecord) => {
  if (record.type === 'breast_live') {
    return `左${record.detail.breast_left_minutes}m / 右${record.detail.breast_right_minutes}m`;
  }
  if (record.type === 'breast_bottle' || record.type === 'bottle_formula') {
    return `${record.detail.bottle_volume_ml} ml`;
  }
  if (record.type === 'blood_sugar') {
    return `${record.detail.sugar_value} mmol/L`;
  }
  if (record.type === 'diaper') {
    const sMap: Record<DiaperStatus, string> = { wet: '仅尿尿 💦', dirty: '仅拉粑 💩', mixed: '拉尿混合 💩💦' };
    return sMap[record.detail.diaper_status as DiaperStatus] || '已更换';
  }
  if (record.type === 'growth') {
    return `${record.detail.weight_kg}kg / ${record.detail.height_cm}cm`;
  }
  if (record.type === 'ad_probiotics') {
    const medMap = { ad: '维生素AD ☀️', probiotics: '益生菌 🌱', mixed: 'AD+益生菌 ☀️🌱', other: '其他营养品 ✨' };
    return medMap[record.detail.medication_type as 'ad' | 'probiotics' | 'mixed' | 'other'] || '已服用';
  }
  if (record.type === 'temperature') {
    return `${record.detail.temperature}°C`;
  }
  if (record.type === 'other_remark') {
    return '随手记 📝';
  }
  return '已记录';
};
const getRecordTitle = (record: BabyRecord) => {
  const map: Record<RecordType, string> = {
    breast_live: '母乳亲喂',
    breast_bottle: '瓶喂母乳',
    bottle_formula: '瓶喂配方奶粉',
    diaper: '尿布更换',
    blood_sugar: '血糖测量',
    growth: '身高体重测量',
    ad_probiotics: 'AD / 益生菌',
    temperature: '体温记录',
    other_remark: '随手备注'
  };
  return map[record.type] || '健康记录';
};

const getModalTitle = (type: RecordType) => {
  const map: Record<RecordType, string> = {
    breast_live: '记录 🤱 亲喂母乳',
    breast_bottle: '记录 🍼 瓶喂母乳',
    bottle_formula: '记录 🥛 瓶喂配方奶',
    blood_sugar: '记录 🩸 血糖测量',
    diaper: '记录 💩 尿布状况',
    growth: '记录 ⚖️ 身高体重',
    ad_probiotics: '记录 ✨ AD / 益生菌',
    temperature: '记录 🌡️ 体温监测',
    other_remark: '记录 📝 随手备注'
  };
  return map[type] || '记录项目';
};
const getRecordIcon = (type: RecordType) => {
  const map: Record<RecordType, string> = {
    breast_live: '🤱',
    breast_bottle: '🍼',
    bottle_formula: '🥛',
    diaper: '💩',
    blood_sugar: '🩸',
    growth: '⚖️',
    ad_probiotics: '✨',
    temperature: '🌡️',
    other_remark: '📝'
  };
  return map[type] || '📝';
};

// 辅助函数：获取本地时区安全的 YYYY-MM-DD 字符串
const getLocalDateString = (offsetDays = 0) => {
  const tzoffset = (new Date()).getTimezoneOffset() * 60000;
  const localTime = new Date(Date.now() - offsetDays * 24 * 3600 * 1000 - tzoffset);
  return localTime.toISOString().slice(0, 10);
};

// 动态响应式的“今天”日期字符串
const todayStr = computed(() => getLocalDateString(0));

// 过滤与时间区间控制 (默认展示本地今天)
const timelineFilterDate = ref(getLocalDateString(0));
const milkChartStartDate = ref('');
const milkChartEndDate = ref('');
const selectedChartDay = ref(null);
const tempChartStartDate = ref('');
const tempChartEndDate = ref('');
const selectedTempPoint = ref(null);

// 数据核心集合
const records = ref([]);
const apiLogs = ref([]);

// 表单临时模型
const form = ref({
  timestamp: '',
  breast_left_minutes: 15,
  breast_right_minutes: 10,
  bottle_volume_ml: 90,
  sugar_value: 4.5,
  sugar_period: 'before_feed',
  diaper_status: 'wet',
  weight_kg: 5.20,
  height_cm: 56.5,
  medication_type: 'ad',
  temperature: 36.8,
  remark: ''
});

// ==================== 宝宝出生日期与动态中文年龄计算 ====================
// 设置宝宝的出生日期为 2026-03-28 (当系统时间为 2026-05-20 时，计算出的年龄正好是 1个月22天)
const babyBirthDate = new Date('2026-03-28T00:00:00');

const babyAgeChinese = computed(() => {
  const currentDate = new Date();

  let years = currentDate.getFullYear() - babyBirthDate.getFullYear();
  let months = currentDate.getMonth() - babyBirthDate.getMonth();
  let days = currentDate.getDate() - babyBirthDate.getDate();

  if (days < 0) {
    const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    days += prevMonth.getDate();
    months--;
  }
  if (months < 0) {
    months += 12;
    years--;
  }

  let ageStr = '';
  if (years > 0) ageStr += years + '岁';
  if (months > 0) ageStr += months + '个月';
  if (days > 0) ageStr += days + '天';

  return ageStr || '出生当天';
});

// ==================== 物理后端服务请求层 (Fetch API) ====================
const pushLog = (method, url, status, data) => {
  const now = new Date();
  const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0') + ':' + now.getSeconds().toString().padStart(2, '0');
  apiLogs.value.unshift({ time: timeStr, method, url, status, data });
  if (apiLogs.value.length > 20) apiLogs.value.pop();
};

const fetchRecords = async () => {
  try {
    const res = await fetch('/api/records');
    if (res.ok) {
      const data = await res.json();
      records.value = data;
      pushLog('GET', '/api/records', 200, data);
    } else {
      throw new Error('API server error');
    }
  } catch (err) {
    // 降级本地持久化兜底
    const local = localStorage.getItem('baby_records');
    if (local) {
      records.value = JSON.parse(local);
    } else {
      loadMockData();
    }
  }
};

const submitForm = async () => {
  if (!activeModal.value) return;

  const payload = {
    id: 'rec_' + Date.now(),
    timestamp: form.value.timestamp,
    type: activeModal.value,
    detail: {},
    remark: form.value.remark
  };

  switch (activeModal.value) {
    case 'breast_live':
      payload.detail = {
        breast_left_minutes: form.value.breast_left_minutes,
        breast_right_minutes: form.value.breast_right_minutes
      };
      break;
    case 'breast_bottle':
    case 'bottle_formula':
      payload.detail = {
        bottle_volume_ml: form.value.bottle_volume_ml
      };
      break;
    case 'blood_sugar':
      payload.detail = {
        sugar_value: form.value.sugar_value,
        sugar_period: form.value.sugar_period
      };
      break;
    case 'diaper':
      payload.detail = {
        diaper_status: form.value.diaper_status
      };
      break;
    case 'growth':
      payload.detail = {
        weight_kg: form.value.weight_kg,
        height_cm: form.value.height_cm
      };
      break;
    case 'ad_probiotics':
      payload.detail = {
        medication_type: form.value.medication_type
      };
      break;
    case 'temperature':
      payload.detail = {
        temperature: form.value.temperature
      };
      break;
    case 'other_remark':
      payload.detail = {};
      break;
  }

  try {
    const res = await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const saved = await res.json();
      records.value.unshift(saved);
      pushLog('POST', '/api/records', 201, saved);
    } else {
      throw new Error('Save failed');
    }
  } catch (err) {
    records.value.unshift(payload);
    localStorage.setItem('baby_records', JSON.stringify(records.value));
    pushLog('POST', '/api/records (Local-Fallback)', 201, payload);
  }

  closeModal();
};

const deleteRecord = async (id) => {
  try {
    const res = await fetch('/api/records?id=' + id, { method: 'DELETE' });
    if (res.ok) {
      records.value = records.value.filter(r => r.id !== id);
      pushLog('DELETE', '/api/records?id=' + id, 200, { success: true });
    } else {
      throw new Error('Delete failed');
    }
  } catch (err) {
    records.value = records.value.filter(r => r.id !== id);
    localStorage.setItem('baby_records', JSON.stringify(records.value));
    pushLog('DELETE', `/api/records (Local-Fallback)`, 200, { id });
  }
};

const loadMockData = async () => {
  try {
    const res = await fetch('/api/records/reset', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      records.value = data;
      pushLog('SEED', '/api/records/reset', 200, data);
    }
  } catch (err) {
    // 动态生成相对当前时间的演示种子数据
    const d0 = getLocalDateString(0); // 今天
    const d1 = getLocalDateString(1); // 昨天
    const d2 = getLocalDateString(2); // 前天
    const d3 = getLocalDateString(3); // 大前天
    const d4 = getLocalDateString(4);
    const d5 = getLocalDateString(5);

    const mock = [
      { id: '1', timestamp: `${d0}T09:15`, type: 'bottle_formula', detail: { bottle_volume_ml: 120 }, remark: '大口喝完' },
      { id: '2', timestamp: `${d0}T07:00`, type: 'blood_sugar', detail: { sugar_value: 4.8, sugar_period: 'before_feed' }, remark: '奶前测试' },
      { id: '3', timestamp: `${d1}T23:30`, type: 'breast_live', detail: { breast_left_minutes: 15, breast_right_minutes: 10 }, remark: '吃奶入睡' },
      { id: '4', timestamp: `${d1}T18:40`, type: 'diaper', detail: { diaper_status: 'mixed' }, remark: '大便金黄' },
      { id: '5', timestamp: `${d1}T16:00`, type: 'breast_bottle', detail: { bottle_volume_ml: 110 }, remark: '' },
      { id: '6', timestamp: `${d1}T12:00`, type: 'blood_sugar', detail: { sugar_value: 5.6, sugar_period: 'after_feed_2h' }, remark: '平稳' },
      { id: '7', timestamp: `${d1}T08:00`, type: 'growth', detail: { weight_kg: 5.35, height_cm: 57.0 }, remark: '体检顺遂' },
      { id: '8', timestamp: `${d2}T22:00`, type: 'blood_sugar', detail: { sugar_value: 4.2, sugar_period: 'before_feed' }, remark: '良好' },
      { id: '12g', timestamp: `${d3}T09:00`, type: 'growth', detail: { weight_kg: 5.10, height_cm: 55.8 }, remark: '在家自行测量' },
      { id: '17', timestamp: `${d5}T08:00`, type: 'growth', detail: { weight_kg: 4.90, height_cm: 54.5 }, remark: '满月体检' }
    ];
    records.value = mock;
    localStorage.setItem('baby_records', JSON.stringify(mock));
    pushLog('SEED', '/api/records/reset (Local-Fallback)', 200, { size: mock.length });
  }
};

// ==================== 弹窗交互控制 ====================
const openModal = (type) => {
  const tzoffset = (new Date()).getTimezoneOffset() * 60000;
  const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);

  form.value = {
    timestamp: localISOTime,
    breast_left_minutes: 15,
    breast_right_minutes: 10,
    bottle_volume_ml: 90,
    sugar_value: 4.5,
    sugar_period: 'before_feed',
    diaper_status: 'wet',
    weight_kg: 5.20,
    height_cm: 56.5,
    medication_type: 'ad',
    temperature: 36.8,
    remark: ''
  };
  activeModal.value = type;
};

const closeModal = () => { activeModal.value = null; };

// ==================== 计算属性 (图表与看板逻辑) ====================
const filteredRecords = computed(() => {
  const list = timelineFilterDate.value
    ? records.value.filter(r => r.timestamp.slice(0, 10) === timelineFilterDate.value)
    : [...records.value];
  return list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
});

const filteredDailyMilkData = computed(() => {
  if (!milkChartStartDate.value || !milkChartEndDate.value) return [];
  const start = new Date(milkChartStartDate.value + 'T00:00:00');
  const end = new Date(milkChartEndDate.value + 'T23:59:59');

  const dayList = [];
  const tempDate = new Date(start);
  while (tempDate <= end) {
    dayList.push(tempDate.toISOString().slice(0, 10));
    tempDate.setDate(tempDate.getDate() + 1);
  }

  const bottleFeeds = records.value.filter(r =>
      (r.type === 'bottle_formula' || r.type === 'breast_bottle') && r.timestamp
  );

  return dayList.map(dateStr => {
    const dayRecords = bottleFeeds.filter(r => r.timestamp.slice(0, 10) === dateStr);
    const formulaVol = dayRecords.filter(r => r.type === 'bottle_formula').reduce((sum, r) => sum + (r.detail.bottle_volume_ml || 0), 0);
    const breastVol = dayRecords.filter(r => r.type === 'breast_bottle').reduce((sum, r) => sum + (r.detail.bottle_volume_ml || 0), 0);
    const dateObj = new Date(dateStr);
    return {
      date: dateStr,
      shortDate: (dateObj.getMonth() + 1) + '/' + dateObj.getDate(),
      formulaVol,
      breastVol,
      total: formulaVol + breastVol
    };
  });
});

const todayFeedVolume = computed(() => {
  return records.value
      .filter(r => r.timestamp.slice(0, 10) === todayStr.value && (r.type === 'breast_bottle' || r.type === 'bottle_formula'))
      .reduce((acc, curr) => acc + (curr.detail.bottle_volume_ml || 0), 0);
});

const todayFormulaVol = computed(() => {
  return records.value.filter(r => r.timestamp.slice(0, 10) === todayStr.value && r.type === 'bottle_formula').reduce((acc, curr) => acc + (curr.detail.bottle_volume_ml || 0), 0);
});

const todayBreastBottleVol = computed(() => {
  return records.value.filter(r => r.timestamp.slice(0, 10) === todayStr.value && r.type === 'breast_bottle').reduce((acc, curr) => acc + (curr.detail.bottle_volume_ml || 0), 0);
});

const todayBreastLiveCount = computed(() => {
  return records.value.filter(r => r.timestamp.slice(0, 10) === todayStr.value && r.type === 'breast_live').length;
});

const todayDiaperDirty = computed(() => {
  return records.value.filter(r => r.timestamp.slice(0, 10) === todayStr.value && r.type === 'diaper' && (r.detail.diaper_status === 'dirty' || r.detail.diaper_status === 'mixed')).length;
});

const todayDiaperWet = computed(() => {
  return records.value.filter(r => r.timestamp.slice(0, 10) === todayStr.value && r.type === 'diaper' && (r.detail.diaper_status === 'wet' || r.detail.diaper_status === 'mixed')).length;
});

const timeSinceLastFeed = computed(() => {
  const feeds = records.value.filter(r => ['breast_live', 'breast_bottle', 'bottle_formula'].includes(r.type));
  if (feeds.length === 0) return '暂无记录';
  const now = new Date();
  const last = new Date(feeds[0].timestamp);
  const diffMs = now.getTime() - last.getTime();
  if (diffMs < 0) return '刚刚';
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  return hours > 0 ? hours + '小时 ' + minutes + '分钟' : minutes + '分钟';
});

const latestBloodSugar = computed(() => {
  const sugars = records.value.filter(r => r.type === 'blood_sugar');
  if (sugars.length === 0) return { value: null };
  return { value: sugars[0].detail.sugar_value || null, period: sugars[0].detail.sugar_period };
});

const growthChartPoints = computed(() => {
  const list = [...records.value].filter(r => r.type === 'growth').slice(0, 5).reverse();
  if (list.length === 0) return [];

  const weights = list.map(r => r.detail.weight_kg || 0);
  const heights = list.map(r => r.detail.height_cm || 0);
  const maxW = Math.max(...weights) + 0.5;
  const minW = Math.max(0, Math.min(...weights) - 0.5);
  const maxH = Math.max(...heights) + 2;
  const minH = Math.max(0, Math.min(...heights) - 2);

  return list.map((r, index) => {
    const x = (index / Math.max(1, list.length - 1)) * 100;
    const wVal = r.detail.weight_kg || 0;
    const hVal = r.detail.height_cm || 0;
    const dateObj = new Date(r.timestamp);
    return {
      x,
      yWeight: Math.min(95, Math.max(5, ((wVal - minW) / (maxW - minW || 1)) * 60 + 20)),
      yHeight: Math.min(95, Math.max(5, ((hVal - minH) / (maxH - minH || 1)) * 60 + 20)),
      weight: wVal.toFixed(2),
      height: hVal.toFixed(1),
      date: (dateObj.getMonth() + 1) + '/' + dateObj.getDate()
    };
  });
});

const weightChartPath = computed(() => growthChartPoints.value.reduce((path, p, idx) => path + (idx === 0 ? 'M' : 'L') + ' ' + p.x + ' ' + (100 - p.yWeight), ''));
const heightChartPath = computed(() => growthChartPoints.value.reduce((path, p, idx) => path + (idx === 0 ? 'M' : 'L') + ' ' + p.x + ' ' + (100 - p.yHeight), ''));

const sugarChartPoints = computed(() => {
  const list = [...records.value].filter(r => r.type === 'blood_sugar').slice(0, 5).reverse();
  if (list.length === 0) return [];
  return list.map((r, index) => {
    const val = r.detail.sugar_value || 0;
    const x = (index / Math.max(1, list.length - 1)) * 100;
    return { x, y: Math.min(95, Math.max(5, ((val - 2.5) / 7.5) * 80 + 10)), val };
  });
});

const sugarChartPath = computed(() => sugarChartPoints.value.reduce((path, p, idx) => path + (idx === 0 ? 'M' : 'L') + ' ' + p.x + ' ' + (100 - p.y), ''));
const sugarChartAreaPath = computed(() => {
  if (sugarChartPoints.value.length === 0) return '';
  const points = sugarChartPoints.value;
  const path = points.reduce((pStr, p, idx) => pStr + (idx === 0 ? 'M' : 'L') + ' ' + p.x + ' ' + (100 - p.y), '');
  return path + ' L ' + points[points.length - 1].x + ' 100 L ' + points[0].x + ' 100 Z';
});

const tempChartPoints = computed(() => {
  if (!tempChartStartDate.value || !tempChartEndDate.value) return [];
  const list = [...records.value]
    .filter(r => r.type === 'temperature' && r.timestamp && r.timestamp.slice(0, 10) >= tempChartStartDate.value && r.timestamp.slice(0, 10) <= tempChartEndDate.value)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  if (list.length === 0) return [];
  const temps = list.map(r => r.detail.temperature || 36.5);
  const maxT = Math.max(...temps, 37.5) + 0.5;
  const minT = Math.min(...temps, 36.0) - 0.3;
  const range = maxT - minT || 1;
  return list.map((r, index) => {
    const val = r.detail.temperature || 36.5;
    const x = list.length > 1 ? 6 + (index / (list.length - 1)) * 88 : 50;
    const y = ((val - minT) / range) * 55 + 15;
    const d = new Date(r.timestamp);
    const shortDate = (d.getMonth() + 1) + '/' + d.getDate();
    const timeStr = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    return {
      id: r.id,
      x,
      y,
      temp: val.toFixed(1),
      isHigh: val >= 37.3,
      date: shortDate,
      time: timeStr,
      fullDate: shortDate + ' ' + timeStr,
      remark: r.remark || ''
    };
  });
});

const tempLimitLineY = computed(() => {
  if (!tempChartStartDate.value || !tempChartEndDate.value) return 35;
  const list = [...records.value]
    .filter(r => r.type === 'temperature' && r.timestamp && r.timestamp.slice(0, 10) >= tempChartStartDate.value && r.timestamp.slice(0, 10) <= tempChartEndDate.value);
  if (list.length === 0) return 35;
  const temps = list.map(r => r.detail.temperature || 36.5);
  const maxT = Math.max(...temps, 37.5) + 0.5;
  const minT = Math.min(...temps, 36.0) - 0.3;
  const range = maxT - minT || 1;
  const y = ((37.3 - minT) / range) * 55 + 15;
  return 100 - y;
});


const tempChartPath = computed(() => {
  if (tempChartPoints.value.length === 0) return '';
  return tempChartPoints.value.reduce((path, p, idx) => path + (idx === 0 ? 'M' : 'L') + ' ' + p.x + ' ' + (100 - p.y), '');
});

const tempChartAreaPath = computed(() => {
  if (tempChartPoints.value.length === 0) return '';
  const points = tempChartPoints.value;
  const pathStr = points.reduce((pStr, p, idx) => pStr + (idx === 0 ? 'M' : 'L') + ' ' + p.x + ' ' + (100 - p.y), '');
  return pathStr + ' L ' + points[points.length - 1].x + ' 100 L ' + points[0].x + ' 100 Z';
});

const donutChartStyle = computed(() => {
  const total = todayFeedVolume.value;
  if (total === 0) return 'background: #F3F4F6;';
  const formulaPct = (todayFormulaVol.value / total) * 100;
  return 'background: conic-gradient(#FFF0CA 0% ' + formulaPct + '%, #D4ECFC ' + formulaPct + '% 100%);';
});

const formatTime = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
};

const getRecordBadgeStyle = (record) => {
  if (record.type === 'blood_sugar') {
    const val = record.detail.sugar_value || 0;
    if (val < 3.9) return 'bg-orange-50 text-orange-600 border border-orange-200';
    if (val > 6.1) return 'bg-red-50 text-red-600 border border-red-200';
    return 'bg-emerald-50 text-emerald-600 border border-emerald-200';
  }
  if (record.type === 'temperature') {
    const val = record.detail.temperature || 36.8;
    if (val >= 37.3) return 'bg-red-50 text-red-600 border border-red-200 font-bold';
    return 'bg-emerald-50 text-emerald-600 border border-emerald-200';
  }
  return 'bg-gray-50 text-gray-700';
};

const clearLogs = () => { apiLogs.value = []; };

// ==================== 初始化 ====================
onMounted(() => {
  fetchRecords();

  // 1. 定期自动同步 (10秒轮询)
  const timer = setInterval(() => {
    if (!activeModal.value) {
      fetchRecords();
    }
  }, 10000);

  // 2. 默认设置日期范围：过去7天至今天
  const today = new Date();
  const pastWeek = new Date(Date.now() - 6 * 24 * 3600 * 1000);
  milkChartStartDate.value = pastWeek.toISOString().slice(0, 10);
  milkChartEndDate.value = today.toISOString().slice(0, 10);
  tempChartStartDate.value = pastWeek.toISOString().slice(0, 10);
  tempChartEndDate.value = today.toISOString().slice(0, 10);

  // 组件卸载时清除
  return () => {
    clearInterval(timer);
  };
});
</script>

<template>
  <!-- 外围流式全屏容器（限制视口高度，锁死滚动条，彻底消除切换Tab时的宽度抖动） -->
  <div class="w-full h-screen bg-[#F5F3ED] flex flex-col overflow-hidden max-w-md mx-auto relative antialiased text-[#4A3D3C]">

    <!-- 顶部状态大看板 -->
    <header class="bg-gradient-to-b from-[#FFF4D4] via-[#FFF9E4] to-[#F5F3ED] px-6 pt-6 pb-4 flex-shrink-0 w-full">
      <div class="flex justify-between items-center mb-4">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-full bg-white flex justify-center items-center text-2xl shadow-md border border-orange-100/50">
            👶
          </div>
          <div>
            <h1 class="font-bold text-lg text-amber-950 flex items-center gap-1.5">
              宝宝 <span class="text-[10px] bg-amber-200/80 text-amber-950 px-2.5 py-0.5 rounded-full font-bold">{{ babyAgeChinese }}</span>
            </h1>
            <p class="text-[11px] text-amber-800/80 font-medium">今天也是元气满满的一天 ☀️</p>
          </div>
        </div>
        <button @click="showBackendLog = !showBackendLog" class="relative px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-xs text-amber-950 font-bold border border-amber-100/40 flex items-center gap-1.5 shadow-sm transition-all active:scale-95">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          API控制台
        </button>
      </div>

      <!-- 核心数据看板卡片 -->
      <div class="bg-white rounded-2xl p-4 shadow-[0_8px_30px_rgba(160,150,130,0.12)] border border-amber-100/10 flex justify-between items-center w-full">
        <div class="space-y-1">
          <div class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">距离上次喂养</div>
          <div class="text-2xl font-black text-amber-950 tracking-tight">{{ timeSinceLastFeed }}</div>
        </div>
        <div class="h-10 w-[1px] bg-amber-100/60"></div>
        <div class="space-y-1 text-center">
          <div class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">最新血糖</div>
          <div class="text-sm font-black text-rose-500 flex items-center justify-center gap-1">
            🩸 {{ latestBloodSugar.value ? latestBloodSugar.value + ' mmol/L' : '未记录' }}
          </div>
        </div>
        <div class="h-10 w-[1px] bg-amber-100/60"></div>
        <div class="space-y-1 text-right">
          <div class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">今日瓶喂奶量</div>
          <div class="text-base font-black text-sky-500">{{ todayFeedVolume }} ml</div>
        </div>
      </div>
    </header>

    <!-- 主展示滑动区域（局部独立滚动，宽度100%硬咬合抗位移） -->
    <main class="flex-grow overflow-y-auto px-6 pb-24 no-scrollbar bg-[#F5F3ED] w-full">

      <!-- ==================== Tab 1: 去记录 ==================== -->
      <div v-if="currentTab === 'log'" class="space-y-5 pt-2 w-full">

        <!-- 快捷记录项整合底座 -->
        <div class="bg-white rounded-3xl p-5 shadow-[0_10px_30px_rgba(160,150,130,0.1)] border border-gray-100/50 w-full">
          <h2 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1">✨ 快捷记录项目</h2>
          <div class="grid grid-cols-3 gap-3">
            <button @click="openModal('breast_live')" class="aspect-square bg-[#FFF1F1] hover:bg-[#FFE3E3] active:scale-95 transition-all rounded-2xl p-2.5 flex flex-col justify-between text-left">
              <span class="text-2xl">🤱</span>
              <div>
                <div class="font-bold text-xs text-red-950">亲喂母乳</div>
                <div class="text-[9px] text-red-800/80">记左右时长</div>
              </div>
            </button>
            <button @click="openModal('breast_bottle')" class="aspect-square bg-[#EDF7FF] hover:bg-[#D2EBFF] active:scale-95 transition-all rounded-2xl p-2.5 flex flex-col justify-between text-left">
              <span class="text-2xl">🍼</span>
              <div>
                <div class="font-bold text-xs text-blue-950">瓶喂母乳</div>
                <div class="text-[9px] text-blue-800/80">记毫升(ml)</div>
              </div>
            </button>
            <button @click="openModal('bottle_formula')" class="aspect-square bg-[#FFF9E6] hover:bg-[#FFF0C2] active:scale-95 transition-all rounded-2xl p-2.5 flex flex-col justify-between text-left">
              <span class="text-2xl">🥛</span>
              <div>
                <div class="font-bold text-xs text-amber-950">配方奶粉</div>
                <div class="text-[9px] text-amber-800/80">记毫升(ml)</div>
              </div>
            </button>
            <button @click="openModal('blood_sugar')" class="aspect-square bg-[#FFF1F3] hover:bg-[#FFE0E5] active:scale-95 transition-all rounded-2xl p-2.5 flex flex-col justify-between text-left border border-rose-100">
              <span class="text-2xl">🩸</span>
              <div>
                <div class="font-bold text-xs text-rose-950">血糖测量</div>
                <div class="text-[9px] text-rose-800/80">防低/高血糖</div>
              </div>
            </button>
            <button @click="openModal('diaper')" class="aspect-square bg-[#F8F2FF] hover:bg-[#EEDDFF] active:scale-95 transition-all rounded-2xl p-2.5 flex flex-col justify-between text-left">
              <span class="text-2xl">💩</span>
              <div>
                <div class="font-bold text-xs text-purple-950">尿布/拉粑</div>
                <div class="text-[9px] text-purple-800/80">健康风向标</div>
              </div>
            </button>
            <button @click="openModal('growth')" class="aspect-square bg-[#EDF9E9] hover:bg-[#DBF5D3] active:scale-95 transition-all rounded-2xl p-2.5 flex flex-col justify-between text-left">
              <span class="text-2xl">⚖️</span>
              <div>
                <div class="font-bold text-xs text-emerald-950">身高体重</div>
                <div class="text-[9px] text-emerald-800/80">发育生长指标</div>
              </div>
            </button>
            <button @click="openModal('ad_probiotics')" class="aspect-square bg-[#E6F9F9] hover:bg-[#C2F5F5] active:scale-95 transition-all rounded-2xl p-2.5 flex flex-col justify-between text-left border border-cyan-100/50">
              <span class="text-2xl">✨</span>
              <div>
                <div class="font-bold text-xs text-cyan-950">AD/益生菌</div>
                <div class="text-[9px] text-cyan-800/80">补充日常营养</div>
              </div>
            </button>
            <button @click="openModal('temperature')" class="aspect-square bg-[#FFF5ED] hover:bg-[#FFE3D1] active:scale-95 transition-all rounded-2xl p-2.5 flex flex-col justify-between text-left border border-orange-100/50">
              <span class="text-2xl">🌡️</span>
              <div>
                <div class="font-bold text-xs text-orange-950">体温记录</div>
                <div class="text-[9px] text-orange-800/80">监测身体状况</div>
              </div>
            </button>
            <button @click="openModal('other_remark')" class="aspect-square bg-[#F1F3F5] hover:bg-[#E2E6EA] active:scale-95 transition-all rounded-2xl p-2.5 flex flex-col justify-between text-left border border-slate-200/50">
              <span class="text-2xl">📝</span>
              <div>
                <div class="font-bold text-xs text-slate-950">其他备注</div>
                <div class="text-[9px] text-slate-800/80">随手记录点滴</div>
              </div>
            </button>
          </div>
        </div>

        <!-- 记录时间流大底座 -->
        <div class="bg-white rounded-3xl p-5 shadow-[0_10px_30px_rgba(160,150,130,0.1)] border border-gray-100/50 space-y-4 w-full">
          <div class="flex justify-between items-center border-b border-gray-50 pb-3">
            <div class="flex flex-col gap-1">
              <h2 class="text-xs font-bold text-gray-400 uppercase tracking-wider">记录时间线</h2>
              <div class="flex items-center gap-2 mt-1.5 bg-gray-50 px-2.5 py-1.5 rounded-xl border border-gray-100 shadow-inner">
                <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <input type="date" v-model="timelineFilterDate" class="bg-transparent text-[16px] font-bold text-gray-700 focus:outline-none cursor-pointer">
              </div>
            </div>
            <button v-show="false" @click="loadMockData" class="text-xs text-[#FF9E9E] hover:underline font-bold self-end pb-1">导入演示数据</button>
          </div>

          <div v-if="filteredRecords.length === 0" class="bg-[#FBFBFA] rounded-2xl p-8 text-center text-xs text-gray-400 border border-dashed border-gray-100">
            🛋️ 该日期没有记录数据，开始记录今日生活吧~
          </div>

          <div v-else class="space-y-2.5">
            <div v-for="record in filteredRecords" :key="record.id" class="bg-[#FBFBFA] hover:bg-gray-50/80 transition-colors rounded-2xl p-3 border border-gray-100/50 flex items-center justify-between overflow-hidden">
              <div class="flex items-center gap-3 min-w-0 flex-1 mr-2">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-sm flex-shrink-0" :class="getRecordStyle(record.type)">
                  {{ getRecordIcon(record.type) }}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="font-bold text-xs text-gray-800 break-all">{{ getRecordTitle(record) }}</div>
                  <div class="text-[10px] text-gray-400 flex flex-wrap items-center gap-1.5 mt-0.5 font-medium">
                    <span class="flex items-center gap-1 flex-shrink-0">
                      <svg class="w-2.5 h-2.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      {{ formatTime(record.timestamp) }}
                    </span>
                    <span v-if="record.remark" class="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[8px] font-bold break-all whitespace-pre-wrap max-w-full inline-block">备注: {{ record.remark }}</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-[11px] font-black px-2.5 py-0.5 rounded-full" :class="getRecordBadgeStyle(record)">
                  {{ getRecordValue(record) }}
                </span>
                <button @click="deleteRecord(record.id)" class="text-gray-300 hover:text-red-400 p-1.5 transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- ==================== Tab 2: 看数据 ==================== -->
      <div v-if="currentTab === 'stats'" class="space-y-5 pt-2 w-full">

        <!-- 今日喂养能量占比 -->
        <div class="bg-white rounded-3xl p-5 shadow-[0_10px_30px_rgba(160,150,130,0.1)] border border-gray-100/50 w-full">
          <h3 class="font-bold text-sm text-gray-800 mb-4 flex items-center gap-1">🍼 今日喂养能量占比</h3>
          <div class="flex items-center gap-6">
            <div class="w-24 h-24 rounded-full flex items-center justify-center relative shadow-sm" :style="donutChartStyle">
              <div class="w-16 h-16 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                <span class="text-[9px] text-gray-400 font-bold">瓶喂总计</span>
                <span class="text-sm font-black">{{ todayFeedVolume }}ml</span>
              </div>
            </div>
            <div class="flex-grow space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="flex items-center gap-1.5 text-gray-600 font-semibold">
                  <span class="w-3 h-3 rounded-full bg-[#FFF0CA] border border-amber-300/40"></span> 瓶喂配方奶粉
                </span>
                <span class="font-black text-amber-950">{{ todayFormulaVol }} ml</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="flex items-center gap-1.5 text-gray-600 font-semibold">
                  <span class="w-3 h-3 rounded-full bg-[#D4ECFC] border border-sky-300/40"></span> 瓶喂母乳
                </span>
                <span class="font-black text-sky-950">{{ todayBreastBottleVol }} ml</span>
              </div>
              <div class="flex items-center justify-between text-xs border-t border-gray-50 pt-2">
                <span class="flex items-center gap-1.5 text-gray-600 font-semibold">
                  <span class="w-3 h-3 rounded-full bg-[#FFD6D6] border border-pink-300/40"></span> 今日亲喂次数
                </span>
                <span class="font-black text-pink-950">{{ todayBreastLiveCount }} 次</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 每日柱状图分析 -->
        <div class="bg-white rounded-3xl p-5 shadow-[0_10px_30px_rgba(160,150,130,0.1)] border border-gray-100/50 space-y-4 w-full">
          <div class="flex justify-between items-center">
            <h3 class="font-bold text-sm text-gray-800">📊 每日瓶喂奶量分析</h3>
            <span class="text-[10px] bg-amber-50 text-amber-800 px-2 py-1 rounded-md font-bold">堆叠图分析</span>
          </div>

          <div class="bg-amber-50/30 p-3 rounded-2xl border border-amber-100/50 space-y-2">
            <div class="text-[11px] text-amber-800/80 font-bold flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              自定义日期范围查看
            </div>
            <div class="flex items-center justify-between gap-2">
              <input type="date" v-model="milkChartStartDate" class="flex-1 min-w-0 bg-white border border-gray-100 text-[16px] text-center rounded-xl py-1.5 px-1.5 font-bold text-gray-600 focus:outline-none">
              <span class="text-xs text-gray-400 font-bold shrink-0">至</span>
              <input type="date" v-model="milkChartEndDate" class="flex-1 min-w-0 bg-white border border-gray-100 text-[16px] text-center rounded-xl py-1.5 px-1.5 font-bold text-gray-600 focus:outline-none">
            </div>
          </div>

          <div v-if="filteredDailyMilkData.length > 0" class="space-y-4">
            <div class="h-48 flex items-end justify-between px-2 pt-8 relative border-b border-gray-100">
              <div class="absolute inset-x-0 top-8 border-t border-dashed border-gray-200/50 text-[9px] text-gray-300 pt-0.5 font-bold">800 ml (目标量)</div>
              <div class="absolute inset-x-0 top-24 border-t border-dashed border-gray-200/50 text-[9px] text-gray-300 pt-0.5 font-bold">400 ml</div>

              <div v-for="day in filteredDailyMilkData" :key="day.date" @click="selectedChartDay = day" class="flex-1 flex flex-col items-center group cursor-pointer relative" :class="{'opacity-60': selectedChartDay && selectedChartDay.date !== day.date}">
                <!-- 顶部显示奶量 -->
                <span class="absolute -top-5 text-[9px] font-black text-gray-700 whitespace-nowrap scale-90">
                  {{ day.total > 0 ? day.total + 'ml' : '0' }}
                </span>

                <div class="w-6 bg-gray-50 rounded-t-md overflow-hidden flex flex-col justify-end relative shadow-inner" style="height: 120px;">
                  <div class="w-full bg-sky-300/80 hover:bg-sky-300 transition-all" :style="{ height: (day.breastVol / 800) * 120 + 'px' }"></div>
                  <div class="w-full bg-[#FFE39F] hover:bg-amber-300 transition-all" :style="{ height: (day.formulaVol / 800) * 120 + 'px' }"></div>
                </div>
                <span class="text-[9px] text-gray-400 mt-2 font-bold scale-90">{{ day.shortDate }}</span>
              </div>
            </div>

            <div class="flex justify-center gap-4 text-[10px] text-gray-400 font-bold">
              <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-amber-200"></span>配方奶</span>
              <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-sky-300"></span>瓶喂母乳</span>
            </div>

            <!-- 明细面板 -->
            <div v-if="selectedChartDay" class="bg-gray-50 rounded-2xl p-3 border border-gray-100 space-y-2 animate-slide-up">
              <div class="flex justify-between items-center text-xs border-b border-gray-200/50 pb-1.5">
                <span class="font-bold text-gray-700">📅 {{ selectedChartDay.date }} 数据明细</span>
                <button @click="selectedChartDay = null" class="text-[10px] text-gray-400 hover:text-gray-600">关闭</button>
              </div>
              <div class="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div class="bg-white p-2 rounded-xl border border-gray-100">
                  <div class="text-gray-400">瓶喂配方奶</div>
                  <div class="font-black text-amber-600 mt-0.5">{{ selectedChartDay.formulaVol }} ml</div>
                </div>
                <div class="bg-white p-2 rounded-xl border border-gray-100">
                  <div class="text-gray-400">瓶喂母乳</div>
                  <div class="font-black text-sky-600 mt-0.5">{{ selectedChartDay.breastVol }} ml</div>
                </div>
                <div class="bg-white p-2 rounded-xl border border-gray-100">
                  <div class="text-gray-400">瓶喂总量</div>
                  <div class="font-black text-emerald-600 mt-0.5">{{ selectedChartDay.total }} ml</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 今日排便速报 -->
        <div class="bg-white rounded-3xl p-5 shadow-[0_10px_30px_rgba(160,150,130,0.1)] border border-gray-100/50 w-full">
          <h3 class="font-bold text-sm text-gray-800 mb-3 flex items-center gap-1">💩 今日排便情况</h3>
          <div class="grid grid-cols-2 gap-3 text-center">
            <div class="bg-[#FFFDF6] rounded-2xl p-3 border border-amber-100/50">
              <div class="text-2xl mb-1">💩</div>
              <div class="text-xs text-amber-800/80 font-bold">拉粑次数</div>
              <div class="text-lg font-black text-amber-900 mt-0.5">{{ todayDiaperDirty }} 次</div>
            </div>
            <div class="bg-[#F6FAFE] rounded-2xl p-3 border border-sky-100/50">
              <div class="text-2xl mb-1">💦</div>
              <div class="text-xs text-sky-800/80 font-bold">尿尿次数</div>
              <div class="text-lg font-black text-sky-900 mt-0.5">{{ todayDiaperWet }} 次</div>
            </div>
          </div>
        </div>

        <!-- 📐 婴儿发育生长折线图 -->
        <div class="bg-white rounded-3xl p-5 shadow-[0_10px_30px_rgba(160,150,130,0.1)] border border-gray-100/50 space-y-5 w-full">
          <div class="flex justify-between items-center">
            <h3 class="font-bold text-sm text-gray-800 flex items-center gap-1.5">
              <span class="text-emerald-500">📐</span> 宝宝生长曲线
            </h3>
            <span class="text-[10px] bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-md font-bold">发育历史趋势</span>
          </div>

          <div class="flex flex-col gap-6">
            <!-- 体重曲线 -->
            <div class="bg-[#F8F9F6] rounded-2xl p-4 border border-emerald-100/30 flex flex-col justify-between">
              <div class="text-xs text-emerald-800 font-bold mb-4 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 体重趋势 (kg)
              </div>
              <div class="h-28 relative">
                <svg class="w-full h-full absolute inset-0" viewBox="0 0 100 100" preserveAspectRatio="none" v-if="growthChartPoints.length > 1">
                  <path :d="weightChartPath" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
                <div v-if="growthChartPoints.length > 1" class="absolute inset-0">
                  <div v-for="(p, idx) in growthChartPoints" :key="idx" class="absolute flex flex-col items-center" :style="{ left: p.x + '%', bottom: p.yWeight + '%', transform: 'translateX(-50%)' }">
                    <span class="bg-white text-[9px] font-black text-emerald-700 px-1.5 py-0.5 rounded shadow-md border border-emerald-100 transform -translate-y-4 whitespace-nowrap">
                      {{ p.weight }} kg
                    </span>
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white shadow-sm"></span>
                  </div>
                </div>
                <div v-else class="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                  📐 至少需要 2 条身高体重记录来生成趋势图
                </div>
              </div>
              <div class="h-4 relative w-full mt-2" v-if="growthChartPoints.length > 1">
                <div v-for="(p, idx) in growthChartPoints" :key="idx" class="absolute text-[9px] text-gray-400 font-bold transform -translate-x-1/2 whitespace-nowrap" :style="{ left: p.x + '%' }">
                  {{ p.date }}
                </div>
              </div>
            </div>

            <!-- 身高曲线 -->
            <div class="bg-[#F8F9F6] rounded-2xl p-4 border border-emerald-100/30 flex flex-col justify-between">
              <div class="text-xs text-emerald-800 font-bold mb-4 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> 身高趋势 (cm)
              </div>
              <div class="h-28 relative">
                <svg class="w-full h-full absolute inset-0" viewBox="0 0 100 100" preserveAspectRatio="none" v-if="growthChartPoints.length > 1">
                  <path :d="heightChartPath" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
                <div v-if="growthChartPoints.length > 1" class="absolute inset-0">
                  <div v-for="(p, idx) in growthChartPoints" :key="idx" class="absolute flex flex-col items-center" :style="{ left: p.x + '%', bottom: p.yHeight + '%', transform: 'translateX(-50%)' }">
                    <span class="bg-white text-[9px] font-black text-emerald-800 px-1.5 py-0.5 rounded shadow-md border border-emerald-200 transform -translate-y-4 whitespace-nowrap">
                      {{ p.height }} cm
                    </span>
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-600 border-white border shadow-sm"></span>
                  </div>
                </div>
                <div v-else class="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                  📐 至少需要 2 条身高体重记录来生成趋势图
                </div>
              </div>
              <div class="h-4 relative w-full mt-2" v-if="growthChartPoints.length > 1">
                <div v-for="(p, idx) in growthChartPoints" :key="idx" class="absolute text-[9px] text-gray-400 font-bold transform -translate-x-1/2 whitespace-nowrap" :style="{ left: p.x + '%' }">
                  {{ p.date }}
                </div>
              </div>
            </div>
          </div>
        </div>



        <!-- 🌡️ 宝宝体温曲线 (新增) -->
        <div class="bg-white rounded-3xl p-5 shadow-[0_10px_30px_rgba(160,150,130,0.1)] border border-gray-100/50 space-y-4 w-full">
          <div class="flex justify-between items-center">
            <h3 class="font-bold text-sm text-gray-800 flex items-center gap-1.5">
              <span class="text-rose-400">🌡️</span> 宝宝体温曲线
            </h3>
            <span class="text-[10px] bg-rose-50 text-rose-800 px-2.5 py-1 rounded-md font-bold">体温历史趋势</span>
          </div>

          <!-- 自定义长日期范围查询 -->
          <div class="bg-rose-50/30 p-3 rounded-2xl border border-rose-100/50 space-y-2">
            <div class="text-[11px] text-rose-800/80 font-bold flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              自定义长日期区间查看
            </div>
            <div class="flex items-center justify-between gap-2">
              <input type="date" v-model="tempChartStartDate" class="flex-1 min-w-0 bg-white border border-gray-100 text-[16px] text-center rounded-xl py-1.5 px-1.5 font-bold text-gray-600 focus:outline-none">
              <span class="text-xs text-gray-400 font-bold shrink-0">至</span>
              <input type="date" v-model="tempChartEndDate" class="flex-1 min-w-0 bg-white border border-gray-100 text-[16px] text-center rounded-xl py-1.5 px-1.5 font-bold text-gray-600 focus:outline-none">
            </div>
          </div>

          <!-- SVG 折线图本体 -->
          <div class="relative w-full h-40 bg-rose-50/15 rounded-2xl border border-rose-100/20 overflow-hidden flex items-end px-2 pt-6">
            <svg class="w-full h-full absolute inset-0" viewBox="0 0 100 100" preserveAspectRatio="none" v-if="tempChartPoints.length > 0">
              <!-- 定义温度渐变 -->
              <defs>
                <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#FCA5A5" stop-opacity="0.35" />
                  <stop offset="100%" stop-color="#FCA5A5" stop-opacity="0.0" />
                </linearGradient>
              </defs>
              <!-- 辅助参考虚线 (37.3°C 发热线) -->
              <line x1="0" :y1="tempLimitLineY" x2="100" :y2="tempLimitLineY" stroke="#F87171" stroke-width="0.5" stroke-dasharray="3,3" />
              <!-- 填充阴影区域 -->
              <path :d="tempChartAreaPath" fill="url(#tempGrad)"></path>
              <!-- 描边折线 -->
              <path :d="tempChartPath" fill="none" stroke="#F87171" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>

            <!-- 数据圆点浮层 -->
            <div v-if="tempChartPoints.length > 0" class="absolute inset-0">
              <div v-for="(p, idx) in tempChartPoints" :key="p.id" @click="selectedTempPoint = p" class="absolute flex flex-col items-center cursor-pointer transition-all hover:scale-110" :style="{ left: p.x + '%', bottom: p.y + '%', transform: 'translateX(-50%)' }">
                <!-- 顶部显示温度数字，如果是发热显示警示橙红 -->
                <span class="bg-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm border transform -translate-y-4 whitespace-nowrap" :class="p.isHigh ? 'text-red-600 border-red-200' : 'text-gray-600 border-gray-100'">
                  {{ p.temp }}°C
                </span>
                <!-- 圆点本身，发热点有额外的扩散环 -->
                <span class="w-3 h-3 rounded-full border-2 border-white shadow-md transition-all" :class="[
                  p.isHigh ? 'bg-red-500 animate-pulse scale-110' : 'bg-rose-400',
                  selectedTempPoint && selectedTempPoint.id === p.id ? 'ring-4 ring-rose-400/30' : ''
                ]"></span>
              </div>
            </div>

            <!-- 空状态 -->
            <div v-else class="absolute inset-0 flex flex-col items-center justify-center text-xs text-gray-400 space-y-2">
              <span class="text-3xl">🌡️</span>
              <p class="font-bold">该日期范围内暂无体温记录</p>
              <p class="scale-90 opacity-75">可在首页通过“体温”按钮快捷新增</p>
            </div>
          </div>

          <!-- X 轴日期标注 -->
          <div class="h-4 relative w-full mt-1 px-4" v-if="tempChartPoints.length > 0">
            <div v-for="(p, idx) in tempChartPoints" :key="'lbl-' + p.id" class="absolute text-[8px] text-gray-400 font-bold transform -translate-x-1/2 whitespace-nowrap scale-95" :style="{ left: p.x + '%' }">
              {{ p.date }}
            </div>
          </div>

          <!-- 测温点明细面板 -->
          <div v-if="selectedTempPoint" class="bg-rose-50/20 rounded-2xl p-3.5 border border-rose-100/40 space-y-2.5 animate-slide-up">
            <div class="flex justify-between items-center text-xs border-b border-rose-100/40 pb-2">
              <span class="font-bold text-gray-700 flex items-center gap-1">
                <span class="text-rose-500">🌡️</span> 测温数据明细
              </span>
              <button @click="selectedTempPoint = null" class="text-[10px] text-gray-400 hover:text-gray-600 font-black">关闭</button>
            </div>
            <div class="grid grid-cols-2 gap-3 text-center text-xs">
              <div class="bg-white p-2 rounded-xl border border-gray-50 flex flex-col justify-center">
                <div class="text-[10px] text-gray-400 font-bold">测量时间</div>
                <div class="font-black text-gray-800 mt-0.5">{{ selectedTempPoint.fullDate }}</div>
              </div>
              <div class="bg-white p-2 rounded-xl border border-gray-50 flex flex-col justify-center">
                <div class="text-[10px] text-gray-400 font-bold">体温数值</div>
                <div class="font-black mt-0.5" :class="selectedTempPoint.isHigh ? 'text-red-600' : 'text-emerald-600'">
                  {{ selectedTempPoint.temp }} °C {{ selectedTempPoint.isHigh ? '(发热)' : '(正常)' }}
                </div>
              </div>
            </div>
            <div v-if="selectedTempPoint.remark" class="bg-white/80 p-2.5 rounded-xl border border-gray-50 text-[11px] text-gray-600 font-bold leading-relaxed">
              <span class="text-gray-400 text-[10px] block mb-0.5">测量备注：</span>
              {{ selectedTempPoint.remark }}
            </div>
          </div>
        </div>

        <!-- 血糖波动 (置底) -->
        <div class="bg-white rounded-3xl p-5 shadow-[0_10px_30px_rgba(160,150,130,0.1)] border border-gray-100/50 w-full">
          <div class="flex justify-between items-center mb-4">
            <div>
              <h3 class="font-bold text-sm text-gray-800 flex items-center gap-1.5">
                <span class="text-rose-500">🩸</span> 血糖波动监控
              </h3>
              <p class="text-[11px] text-gray-400">近 5 次测量记录趋势</p>
            </div>
            <span class="text-[10px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
              正常区间: 3.9 - 6.1
            </span>
          </div>

          <div class="w-full h-40 bg-rose-50/20 rounded-2xl relative overflow-hidden flex items-end px-4 pt-4">
            <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" v-if="sugarChartPoints.length > 1">
              <defs>
                <linearGradient id="sugarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#FECDD3" stop-opacity="0.6"/>
                  <stop offset="100%" stop-color="#FFF5F5" stop-opacity="0.1"/>
                </linearGradient>
              </defs>
              <rect x="0" y="39" width="100" height="22" fill="#E8F5E9" fill-opacity="0.6" />
              <line x1="0" y1="39" x2="100" y2="39" stroke="#A5D6A7" stroke-width="0.5" stroke-dasharray="2,2" />
              <line x1="0" y1="61" x2="100" y2="61" stroke="#A5D6A7" stroke-width="0.5" stroke-dasharray="2,2" />
              <path :d="sugarChartAreaPath" fill="url(#sugarGrad)"></path>
              <path :d="sugarChartPath" fill="none" stroke="#F43F5E" stroke-width="2" stroke-linecap="round"></path>
            </svg>

            <div v-else class="absolute inset-0 flex flex-col justify-center items-center text-xs text-gray-400">
              📊 至少记录 2 次血糖数据以生成走势图
            </div>

            <!-- 数据点和值对齐 -->
            <div v-if="sugarChartPoints.length > 1" class="absolute inset-0 flex justify-between items-end px-4 pb-2">
              <div v-for="(p, idx) in sugarChartPoints" :key="idx" class="flex flex-col items-center z-10" :style="{ left: p.x + '%', bottom: p.y + '%', position: 'absolute', transform: 'translateX(-50%)' }">
                <span class="bg-white text-[10px] font-bold text-rose-600 px-1.5 py-0.5 rounded shadow-sm border border-rose-100 transform -translate-y-1">
                  {{ p.val }}
                </span>
                <span class="w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white shadow-sm"></span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- 页脚版权与版本显示 -->
      <div class="py-6 flex flex-col items-center justify-center gap-1.5 opacity-80 select-none pb-8">
        <div class="flex items-center gap-2">
          <span class="text-[10px] text-gray-400 font-bold">🍼 宝宝喂养助手</span>
          <span class="text-[9px] bg-amber-100/80 text-amber-800 px-1.5 py-0.5 rounded-full font-black scale-90">v{{ version }}</span>
        </div>
        <p class="text-[8px] text-gray-300 font-bold">© 2026 Dreamsky · 记录爱与成长</p>
      </div>

    </main>

    <!-- 模拟控制台 -->
    <div v-if="showBackendLog" class="absolute inset-x-0 bottom-16 bg-zinc-950 text-emerald-400 font-mono text-[11px] p-4 h-72 overflow-y-auto rounded-t-3xl border-t-2 border-emerald-500/30 shadow-2xl z-40 transition-all duration-300">
      <div class="flex justify-between items-center border-b border-zinc-800 pb-2 mb-2">
        <span class="font-bold text-emerald-500 flex items-center gap-1">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-ping"></span>
          SERVER API LOGS (后端服务总线)
        </span>
        <div class="flex gap-3">
          <button @click="clearLogs" class="text-zinc-400 hover:text-white transition-colors">清除</button>
          <button @click="showBackendLog = false" class="text-rose-400 hover:text-white transition-colors">关闭</button>
        </div>
      </div>
      <div class="space-y-1.5">
        <div v-for="(log, idx) in apiLogs" :key="idx" class="leading-relaxed">
          <span class="text-zinc-500">[{{ log.time }}]</span>
          <span class="text-blue-400 ml-1">[{{ log.method }}]</span>
          <span class="text-yellow-400 ml-1">{{ log.url }}</span>
          <span class="text-emerald-500 ml-1">-> Status {{ log.status }}</span>
          <pre class="text-zinc-400 text-[10px] pl-4 mt-0.5 overflow-x-auto bg-zinc-900/50 p-1.5 rounded border border-zinc-900">{{ JSON.stringify(log.data, null, 2) }}</pre>
        </div>
        <div v-if="apiLogs.length === 0" class="text-zinc-600 text-center py-10">
          等待前端发起请求... 操作上方表单会实时捕获 API 数据流。
        </div>
      </div>
    </div>

    <!-- 底部 Tab 固定栏 -->
    <nav class="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 flex justify-around items-center z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] max-w-md mx-auto">
      <button @click="currentTab = 'log'" class="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors" :class="currentTab === 'log' ? 'text-[#FF9E9E]' : 'text-gray-400'">
        <svg class="w-6 h-6 mx-auto" :class="currentTab === 'log' ? 'text-[#FF9E9E]' : 'text-gray-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
        </svg>
        <span class="text-[10px] font-black">去记录</span>
      </button>
      <button @click="currentTab = 'stats'" class="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors" :class="currentTab === 'stats' ? 'text-[#FF9E9E]' : 'text-gray-400'">
        <svg class="w-5 h-5 mx-auto" :class="currentTab === 'stats' ? 'text-[#FF9E9E]' : 'text-gray-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M11 3.055A9.003 9.003 0 1020.945 13H11V3.055z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path>
        </svg>
        <span class="text-[10px] font-black">看数据</span>
      </button>
    </nav>

    <!-- 统一模态模组 -->
    <div v-if="activeModal" class="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex flex-col justify-end">
      <div class="flex-grow" @click="closeModal"></div>

      <div class="bg-white rounded-t-[32px] p-6 space-y-5 animate-slide-up shadow-2xl w-full max-w-md mx-auto">
        <div class="flex justify-between items-center border-b border-gray-50 pb-3">
          <h3 class="font-black text-lg text-gray-800 flex items-center gap-2">
            <span class="text-xl">{{ getRecordIcon(activeModal) }}</span> {{ getModalTitle(activeModal) }}
          </h3>
          <button @click="closeModal" class="w-8 h-8 rounded-full bg-gray-100 flex justify-center items-center text-gray-500 hover:bg-gray-200">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <form @submit.prevent="submitForm" class="space-y-5">
          <!-- 亲喂母乳 -->
          <div v-if="activeModal === 'breast_live'" class="space-y-4">
            <div class="bg-pink-50/50 p-4 rounded-2xl border border-pink-100/30 flex justify-around">
              <div class="text-center space-y-2">
                <div class="text-xs text-gray-500 font-bold">👈 左侧乳房 (分钟)</div>
                <div class="flex items-center justify-center gap-2">
                  <button type="button" @click="form.breast_left_minutes = Math.max(0, form.breast_left_minutes - 5)" class="w-8 h-8 rounded-full bg-white border border-pink-200 flex items-center justify-center font-bold text-pink-700">-</button>
                  <input type="number" v-model.number="form.breast_left_minutes" class="w-16 text-center text-lg font-bold bg-transparent focus:outline-none">
                  <button type="button" @click="form.breast_left_minutes = form.breast_left_minutes + 5" class="w-8 h-8 rounded-full bg-white border border-pink-200 flex items-center justify-center font-bold text-pink-700">+</button>
                </div>
              </div>
              <div class="text-center space-y-2 border-l border-pink-100 pl-8">
                <div class="text-xs text-gray-500 font-bold">👉 右侧乳房 (分钟)</div>
                <div class="flex items-center justify-center gap-2">
                  <button type="button" @click="form.breast_right_minutes = Math.max(0, form.breast_right_minutes - 5)" class="w-8 h-8 rounded-full bg-white border border-pink-200 flex items-center justify-center font-bold text-pink-700">-</button>
                  <input type="number" v-model.number="form.breast_right_minutes" class="w-16 text-center text-lg font-bold bg-transparent focus:outline-none">
                  <button type="button" @click="form.breast_right_minutes = form.breast_right_minutes + 5" class="w-8 h-8 rounded-full bg-white border border-pink-200 flex items-center justify-center font-bold text-pink-700">+</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 瓶喂容量 -->
          <div v-if="activeModal === 'breast_bottle' || activeModal === 'bottle_formula'" class="space-y-3">
            <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider">喂奶容量 (毫升 - ml)</label>
            <div class="flex items-center justify-between bg-blue-50/30 p-4 rounded-2xl border border-blue-100/30">
              <button type="button" @click="form.bottle_volume_ml = Math.max(0, form.bottle_volume_ml - 10)" class="w-12 h-12 rounded-2xl bg-white border border-blue-100 flex items-center justify-center font-bold text-xl text-blue-800 shadow-sm">-</button>
              <div class="text-center">
                <input type="number" v-model.number="form.bottle_volume_ml" class="w-24 text-center text-3xl font-black bg-transparent text-blue-950 focus:outline-none">
                <span class="text-xs text-gray-400 font-semibold block mt-1">ml</span>
              </div>
              <button type="button" @click="form.bottle_volume_ml = form.bottle_volume_ml + 10" class="w-12 h-12 rounded-2xl bg-white border border-blue-100 flex items-center justify-center font-bold text-xl text-blue-800 shadow-sm">+</button>
            </div>
            <div class="flex gap-2">
              <button type="button" v-for="vol in [60, 90, 120, 150]" :key="vol" @click="form.bottle_volume_ml = vol" class="flex-1 py-2 rounded-xl text-xs font-semibold border" :class="form.bottle_volume_ml === vol ? 'bg-blue-500 text-white border-blue-500' : 'bg-gray-50 text-gray-500 border-gray-100'">
                {{ vol }} ml
              </button>
            </div>
          </div>

          <!-- 血糖测量 -->
          <div v-if="activeModal === 'blood_sugar'" class="space-y-4">
            <div class="space-y-2">
              <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider">血糖浓度 (mmol/L)</label>
              <div class="flex items-center justify-between bg-rose-50/30 p-4 rounded-2xl border border-rose-100/30">
                <button type="button" @click="form.sugar_value = Math.max(0.1, +(form.sugar_value - 0.1).toFixed(1))" class="w-12 h-12 rounded-2xl bg-white border border-rose-100 flex items-center justify-center font-bold text-xl text-rose-800 shadow-sm">-</button>
                <div class="text-center">
                  <input type="number" step="0.1" v-model.number="form.sugar_value" class="w-24 text-center text-3xl font-black bg-transparent text-rose-950 focus:outline-none">
                  <span class="text-[10px] text-gray-400 font-bold block mt-1">mmol/L</span>
                </div>
                <button type="button" @click="form.sugar_value = +(form.sugar_value + 0.1).toFixed(1)" class="w-12 h-12 rounded-2xl bg-white border border-rose-100 flex items-center justify-center font-bold text-xl text-rose-800 shadow-sm">+</button>
              </div>
            </div>
            <div class="space-y-2">
              <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider">测量时段分类</label>
              <div class="grid grid-cols-2 gap-2">
                <button type="button" @click="form.sugar_period = 'before_feed'" class="py-2.5 rounded-xl text-xs font-bold border transition-colors" :class="form.sugar_period === 'before_feed' ? 'bg-rose-500 text-white border-rose-500' : 'bg-gray-50 text-gray-500 border-gray-100'">空腹 / 喂奶前</button>
                <button type="button" @click="form.sugar_period = 'after_feed_1h'" class="py-2.5 rounded-xl text-xs font-bold border transition-colors" :class="form.sugar_period === 'after_feed_1h' ? 'bg-rose-500 text-white border-rose-500' : 'bg-gray-50 text-gray-500 border-gray-100'">喂奶后 1 小时</button>
                <button type="button" @click="form.sugar_period = 'after_feed_2h'" class="py-2.5 rounded-xl text-xs font-bold border transition-colors" :class="form.sugar_period === 'after_feed_2h' ? 'bg-rose-500 text-white border-rose-500' : 'bg-gray-50 text-gray-500 border-gray-100'">喂奶后 2 小时</button>
                <button type="button" @click="form.sugar_period = 'random'" class="py-2.5 rounded-xl text-xs font-bold border transition-colors" :class="form.sugar_period === 'random' ? 'bg-rose-500 text-white border-rose-500' : 'bg-gray-50 text-gray-500 border-gray-100'">随机测量</button>
              </div>
            </div>
          </div>

          <!-- 尿布拉粑 -->
          <div v-if="activeModal === 'diaper'" class="space-y-3">
            <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider">尿布状态分类</label>
            <div class="grid grid-cols-3 gap-3">
              <button type="button" @click="form.diaper_status = 'wet'" class="py-4 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5" :class="form.diaper_status === 'wet' ? 'bg-sky-500 text-white border-sky-500 scale-95 shadow-sm' : 'bg-gray-50 text-gray-600 border-gray-100'">
                <span class="text-xl">💦</span><span class="text-xs font-bold">只有尿尿</span>
              </button>
              <button type="button" @click="form.diaper_status = 'dirty'" class="py-4 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5" :class="form.diaper_status === 'dirty' ? 'bg-amber-700 text-white border-amber-700 scale-95 shadow-sm' : 'bg-gray-50 text-gray-600 border-gray-100'">
                <span class="text-xl">💩</span><span class="text-xs font-bold">只有拉屎</span>
              </button>
              <button type="button" @click="form.diaper_status = 'mixed'" class="py-4 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5" :class="form.diaper_status === 'mixed' ? 'bg-emerald-600 text-white border-emerald-600 scale-95 shadow-sm' : 'bg-gray-50 text-gray-600 border-gray-100'">
                <span class="text-xl">🌟</span><span class="text-xs font-bold">混合粑粑</span>
              </button>
            </div>
          </div>

          <!-- 身高体重成长 -->
          <div v-if="activeModal === 'growth'" class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider">体重 (kg)</label>
              <div class="flex items-center justify-between bg-emerald-50/30 p-3 rounded-2xl border border-emerald-100/30">
                <button type="button" @click="form.weight_kg = Math.max(0.01, +(form.weight_kg - 0.1).toFixed(2))" class="w-8 h-8 rounded-lg bg-white border flex items-center justify-center font-bold text-emerald-800 shadow-sm">-</button>
                <input type="number" step="0.01" v-model.number="form.weight_kg" class="w-16 text-center text-[16px] font-bold bg-transparent text-emerald-950 focus:outline-none">
                <button type="button" @click="form.weight_kg = +(form.weight_kg + 0.1).toFixed(2)" class="w-8 h-8 rounded-lg bg-white border flex items-center justify-center font-bold text-emerald-800 shadow-sm">+</button>
              </div>
            </div>
            <div class="space-y-2">
              <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider">身高 (cm)</label>
              <div class="flex items-center justify-between bg-emerald-50/30 p-3 rounded-2xl border border-emerald-100/30">
                <button type="button" @click="form.height_cm = Math.max(0.1, +(form.height_cm - 0.5).toFixed(1))" class="w-8 h-8 rounded-lg bg-white border flex items-center justify-center font-bold text-emerald-800 shadow-sm">-</button>
                <input type="number" step="0.1" v-model.number="form.height_cm" class="w-16 text-center text-[16px] font-bold bg-transparent text-emerald-950 focus:outline-none">
                <button type="button" @click="form.height_cm = +(form.height_cm + 0.5).toFixed(1)" class="w-8 h-8 rounded-lg bg-white border flex items-center justify-center font-bold text-emerald-800 shadow-sm">+</button>
              </div>
            </div>
          </div>

          <!-- AD / 益生菌 -->
          <div v-if="activeModal === 'ad_probiotics'" class="space-y-3">
            <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider">营养补充品类</label>
            <div class="grid grid-cols-2 gap-2">
              <button type="button" @click="form.medication_type = 'ad'" class="py-2.5 rounded-xl text-xs font-bold border transition-colors" :class="form.medication_type === 'ad' ? 'bg-cyan-500 text-white border-cyan-500' : 'bg-gray-50 text-gray-500 border-gray-100'">维生素AD ☀️</button>
              <button type="button" @click="form.medication_type = 'probiotics'" class="py-2.5 rounded-xl text-xs font-bold border transition-colors" :class="form.medication_type === 'probiotics' ? 'bg-cyan-500 text-white border-cyan-500' : 'bg-gray-50 text-gray-500 border-gray-100'">益生菌 🌱</button>
              <button type="button" @click="form.medication_type = 'mixed'" class="py-2.5 rounded-xl text-xs font-bold border transition-colors" :class="form.medication_type === 'mixed' ? 'bg-cyan-500 text-white border-cyan-500' : 'bg-gray-50 text-gray-500 border-gray-100'">AD + 益生菌 ☀️🌱</button>
              <button type="button" @click="form.medication_type = 'other'" class="py-2.5 rounded-xl text-xs font-bold border transition-colors" :class="form.medication_type === 'other' ? 'bg-cyan-500 text-white border-cyan-500' : 'bg-gray-50 text-gray-500 border-gray-100'">其他营养品 ✨</button>
            </div>
          </div>

          <!-- 体温监测 -->
          <div v-if="activeModal === 'temperature'" class="space-y-3">
            <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider">宝宝体温 (°C)</label>
            <div class="flex items-center justify-between p-4 rounded-2xl border transition-colors" :class="form.temperature >= 37.3 ? 'bg-red-50/50 border-red-200' : 'bg-orange-50/30 border-orange-100/30'">
              <button type="button" @click="form.temperature = Math.max(34.0, +(form.temperature - 0.1).toFixed(1))" class="w-12 h-12 rounded-2xl bg-white border flex items-center justify-center font-bold text-xl shadow-sm" :class="form.temperature >= 37.3 ? 'text-red-800 border-red-200' : 'text-orange-800 border-orange-100'">-</button>
              <div class="text-center">
                <input type="number" step="0.1" v-model.number="form.temperature" class="w-24 text-center text-3xl font-black bg-transparent focus:outline-none" :class="form.temperature >= 37.3 ? 'text-red-700' : 'text-orange-950'">
                <span class="text-xs font-semibold block mt-1" :class="form.temperature >= 37.3 ? 'text-red-400' : 'text-gray-400'">°C</span>
              </div>
              <button type="button" @click="form.temperature = Math.min(42.0, +(form.temperature + 0.1).toFixed(1))" class="w-12 h-12 rounded-2xl bg-white border flex items-center justify-center font-bold text-xl shadow-sm" :class="form.temperature >= 37.3 ? 'text-red-800 border-red-200' : 'text-orange-800 border-orange-100'">+</button>
            </div>
            <div v-if="form.temperature >= 37.3" class="text-center text-xs font-bold text-red-500 animate-pulse mt-1">
              ⚠️ 体温偏高，请注意宝宝身体状况！
            </div>
          </div>

          <!-- 随手备注 -->
          <div v-if="activeModal === 'other_remark'" class="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 text-center text-xs text-slate-500">
            ✍️ 请在下方“备忘录”中直接输入您想要记录的事项（例如：洗澡、睡眠、散步等）
          </div>

          <!-- 公用补充字段 -->
          <div class="space-y-3 pt-3 border-t border-gray-50">
            <div class="flex gap-4">
              <div class="flex-grow space-y-1">
                <label class="block text-[11px] font-bold text-gray-400">时间选择 (默认当前时间)</label>
                <input type="datetime-local" v-model="form.timestamp" class="w-full bg-gray-50 border border-gray-100 text-[16px] rounded-xl p-2.5 font-semibold text-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-200">
              </div>
            </div>
            <div class="space-y-1">
              <label class="block text-[11px] font-bold text-gray-400">备忘录</label>
              <input type="text" v-model="form.remark" placeholder="如: 吃得很慢 / 精神状态佳" class="w-full bg-gray-50 border border-gray-100 text-[16px] rounded-xl p-2.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-200">
            </div>
          </div>

          <!-- 保存提交 -->
          <button type="submit" class="w-full py-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white font-bold rounded-2xl shadow-lg shadow-amber-200/50 flex justify-center items-center gap-2 active:scale-95 transition-all">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
            <span>保存记录 (发送至API)</span>
          </button>
        </form>
      </div>
    </div>

  </div>
</template>

<style scoped>
@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.animate-slide-up {
  animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
/* 彻底隐藏滚动条，保障滚动顺畅且两Tab宽度一致 */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>