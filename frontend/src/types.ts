// 记录类型
export type RecordType = 'breast_live' | 'breast_bottle' | 'bottle_formula' | 'diaper' | 'blood_sugar' | 'growth' | 'ad_probiotics' | 'temperature' | 'other_remark';

// 尿布状况
export type DiaperStatus = 'wet' | 'dirty' | 'mixed';

// 血糖时段
export type SugarPeriod = 'before_feed' | 'after_feed_1h' | 'after_feed_2h' | 'random';

// 每条记录的详细属性
export interface RecordDetail {
    breast_left_minutes?: number;   // 亲喂左乳时间（分钟）
    breast_right_minutes?: number;  // 亲喂右乳时间（分钟）
    bottle_volume_ml?: number;      // 瓶喂奶量（ml）
    sugar_value?: number;           // 血糖值
    sugar_period?: SugarPeriod;     // 测量时段
    diaper_status?: DiaperStatus;   // 尿布类型
    weight_kg?: number;             // 体重 (kg)
    height_cm?: number;             // 身高 (cm)
    medication_type?: 'ad' | 'probiotics' | 'mixed' | 'other'; // 营养品类型
    temperature?: number;           // 体温值 (℃)
}

// 完整的宝宝记录接口
export interface BabyRecord {
    id: string;
    timestamp: string; // ISO 格式时间字符
    type: RecordType;
    detail: RecordDetail;
    remark: string;
}

// 模拟 API 的日志数据结构
export interface ApiLog {
    time: string;
    method: 'GET' | 'POST' | 'DELETE' | 'SEED';
    url: string;
    status: number;
    data: any;
}

// 每日瓶喂汇总数据明细（图表用）
export interface DailyMilkData {
    date: string;
    shortDate: string;
    formulaVol: number;
    breastVol: number;
    total: number;
}

// 生长趋势点坐标
export interface GrowthPoint {
    x: number;
    yWeight: number;
    yHeight: number;
    weight: string;
    height: string;
    date: string;
}

// 血糖趋势点坐标
export interface SugarPoint {
    x: number;
    y: number;
    val: number;
}