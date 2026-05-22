const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3001; // 后端运行在 3001 端口
const DATA_FILE = path.join(__dirname, 'data', 'records.json');

app.use(cors());
app.use(express.json());

// 确保存储目录和文件存在
async function initStorage() {
    const dir = path.dirname(DATA_FILE);
    try {
        await fs.mkdir(dir, { recursive: true });
        await fs.access(DATA_FILE);
    } catch (err) {
        // 文件不存在则初始化为空数组
        await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2));
    }
}

// 读取数据
async function readRecords() {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
}

// 写入数据
async function writeRecords(records) {
    await fs.writeFile(DATA_FILE, JSON.stringify(records, null, 2));
}

// API 1: 获取所有记录
app.get('/api/records', async (req, res) => {
    try {
        const records = await readRecords();
        res.json(records);
    } catch (error) {
        res.status(500).json({ error: '读取数据失败' });
    }
});

// API 2: 新增记录
app.post('/api/records', async (req, res) => {
    try {
        const newRecord = req.body;
        if (!newRecord.id || !newRecord.type || !newRecord.timestamp) {
            return res.status(400).json({ error: '无效的数据格式' });
        }
        const records = await readRecords();
        records.unshift(newRecord); // 最新数据放在最前
        await writeRecords(records);
        res.status(201).json(newRecord);
    } catch (error) {
        res.status(500).json({ error: '保存数据失败' });
    }
});

// API 3: 删除记录
app.delete('/api/records', async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ error: '缺少 id 参数' });
        }
        let records = await readRecords();
        records = records.filter(r => r.id !== id);
        await writeRecords(records);
        res.json({ success: true, message: '删除成功' });
    } catch (error) {
        res.status(500).json({ error: '删除失败' });
    }
});

// API 4: 导入初始化演示数据
app.post('/api/records/reset', async (req, res) => {
    try {
        const mock = [
            { id: '1', timestamp: '2026-05-20T09:15', type: 'bottle_formula', detail: { bottle_volume_ml: 120 }, remark: '大口喝完' },
            { id: 'mock_ad_1', timestamp: '2026-05-20T08:30', type: 'ad_probiotics', detail: { medication_type: 'ad' }, remark: '每天一滴，促进钙吸收' },
            { id: 'mock_temp_1', timestamp: '2026-05-20T16:30', type: 'temperature', detail: { temperature: 37.5 }, remark: '有点微热，物理降温，多喝温水' },
            { id: '2', timestamp: '2026-05-20T07:00', type: 'blood_sugar', detail: { sugar_value: 4.8, sugar_period: 'before_feed' }, remark: '奶前测试' },
            { id: 'mock_ad_2', timestamp: '2026-05-20T10:15', type: 'ad_probiotics', detail: { medication_type: 'probiotics' }, remark: '常温保存，改善肠胃' },
            { id: '3', timestamp: '2026-05-19T23:30', type: 'breast_live', detail: { breast_left_minutes: 15, breast_right_minutes: 10 }, remark: '吃奶入睡' },
            { id: 'mock_temp_2', timestamp: '2026-05-19T20:00', type: 'temperature', detail: { temperature: 36.5 }, remark: '体温正常' },
            { id: '4', timestamp: '2026-05-19T18:40', type: 'diaper', detail: { diaper_status: 'mixed' }, remark: '大便金黄' },
            { id: 'mock_remark_1', timestamp: '2026-05-19T17:00', type: 'other_remark', detail: {}, remark: '带宝宝去小区花园晒太阳，睡得很好' },
            { id: '5', timestamp: '2026-05-19T16:00', type: 'breast_bottle', detail: { bottle_volume_ml: 110 }, remark: '' },
            { id: '6', timestamp: '2026-05-19T12:00', type: 'blood_sugar', detail: { sugar_value: 5.6, sugar_period: 'after_feed_2h' }, remark: '平稳' },
            { id: '7', timestamp: '2026-05-19T08:00', type: 'growth', detail: { weight_kg: 5.35, height_cm: 57.0 }, remark: '体检顺遂' },
            { id: '8', timestamp: '2026-05-18T22:00', type: 'blood_sugar', detail: { sugar_value: 4.2, sugar_period: 'before_feed' }, remark: '良好' },
            { id: '9', timestamp: '2026-05-18T14:30', type: 'bottle_formula', detail: { bottle_volume_ml: 150 }, remark: '奶量稳健上升' },
            { id: '10', timestamp: '2026-05-18T08:00', type: 'breast_bottle', detail: { bottle_volume_ml: 90 }, remark: '' },
            { id: '11', timestamp: '2026-05-17T21:00', type: 'bottle_formula', detail: { bottle_volume_ml: 100 }, remark: '' },
            { id: '12', timestamp: '2026-05-17T13:00', type: 'breast_bottle', detail: { bottle_volume_ml: 120 }, remark: '' },
            { id: '12g', timestamp: '2026-05-17T09:00', type: 'growth', detail: { weight_kg: 5.10, height_cm: 55.8 }, remark: '在家自行测量' },
            { id: '13', timestamp: '2026-05-16T19:00', type: 'bottle_formula', detail: { bottle_volume_ml: 110 }, remark: '' },
            { id: '14', timestamp: '2026-05-16T10:00', type: 'breast_bottle', detail: { bottle_volume_ml: 100 }, remark: '' },
            { id: '15', timestamp: '2026-05-15T18:00', type: 'bottle_formula', detail: { bottle_volume_ml: 90 }, remark: '' },
            { id: '16', timestamp: '2026-05-15T09:00', type: 'breast_bottle', detail: { bottle_volume_ml: 100 }, remark: '' },
            { id: '17', timestamp: '2026-05-15T08:00', type: 'growth', detail: { weight_kg: 4.90, height_cm: 54.5 }, remark: '满月体检' }
        ];
        await writeRecords(mock);
        res.json(mock);
    } catch (error) {
        res.status(500).json({ error: '重置演示数据失败' });
    }
});

// 启动服务
initStorage().then(() => {
    app.listen(PORT, () => {
        console.log(`✅ 后端 API 服务已在端口 ${PORT} 启动！`);
        console.log(`📂 本地数据存储路径: ${DATA_FILE}`);
    });
});