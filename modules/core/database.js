const mongoose = require('mongoose');
const CONSTANTS = require('../../config/constants');

const uri = process.env.MONGODB_URI;

if (uri) {
    mongoose.connect(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
    }).then(() => console.log('connected to mongodb'))
      .catch(err => console.error('mongodb connection failed:', err.message));
}

const UserStatsSchema = new mongoose.Schema({
    userId: { type: String, unique: true, index: true },
    name: String,
    count: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now, index: true }
});

const BanSchema = new mongoose.Schema({
    userId: { type: String, unique: true },
    reason: String
});

const ReminderSchema = new mongoose.Schema({
    id: String,
    userId: String,
    message: String,
    fireAt: { type: Date, expires: 0 }
});

const SessionSchema = new mongoose.Schema({
    sid: { type: String, unique: true, index: true },
    history: { type: Array, default: [] },
    updatedAt: { type: Date, default: Date.now, expires: 86400 } 
});

const SettingSchema = new mongoose.Schema({ key: String, value: String });
const StatSchema = new mongoose.Schema({ command: String, count: { type: Number, default: 0 } });

const Ban = mongoose.model('Ban', BanSchema);
const Reminder = mongoose.model('Reminder', ReminderSchema);
const Session = mongoose.model('Session', SessionSchema);
const Setting = mongoose.model('Setting', SettingSchema);
const Stat = mongoose.model('Stat', StatSchema);
const UserStat = mongoose.model('UserStat', UserStatsSchema);

const userUpdateBuffer = new Map();

setInterval(async () => {
    if (userUpdateBuffer.size === 0) return;
    const operations = [];
    for (const [userId, data] of userUpdateBuffer) {
        operations.push({
            updateOne: {
                filter: { userId },
                update: { 
                    $inc: { count: data.count }, 
                    $set: { lastActive: new Date(), name: data.name } 
                },
                upsert: true
            }
        });
    }
    userUpdateBuffer.clear();
    if (operations.length > 0) {
        try { await UserStat.bulkWrite(operations); } catch (e) {}
    }
}, 30000);

module.exports = {
    addBan: (id, reason) => Ban.create({ userId: id, reason }).catch(() => {}),
    removeBan: (id) => Ban.deleteOne({ userId: id }),
    loadBansIntoMemory: async (cb) => {
        try {
            const rows = await Ban.find({});
            cb(new Set(rows.map(r => r.userId)));
        } catch (e) { cb(new Set()); }
    },
    addReminder: (r) => Reminder.create(r),
    deleteReminder: (id) => Reminder.deleteOne({ id }),
    getActiveReminders: async (cb) => {
        try { cb(await Reminder.find({ fireAt: { $gt: new Date() } })); } 
        catch { cb([]); }
    },
    getHistory: async (sid) => (await Session.findOne({ sid }))?.history || [],
    setHistory: async (sid, history) => await Session.findOneAndUpdate({ sid }, { history, updatedAt: new Date() }, { upsert: true }),
    clearHistory: async (sid) => await Session.deleteOne({ sid }),
    setSetting: (key, val) => Setting.findOneAndUpdate({ key }, { value: val }, { upsert: true }),
    getSetting: async (key) => (await Setting.findOne({ key }))?.value,
    trackCommandUsage: (name) => Stat.updateOne({ command: name }, { $inc: { count: 1 } }, { upsert: true }).exec(),
    syncUser: (userId, fbData = null) => {
        const current = userUpdateBuffer.get(userId) || { count: 0, name: 'user' };
        current.count++;
        if (fbData?.name) current.name = fbData.name;
        userUpdateBuffer.set(userId, current);
    },
    getUserData: (userId) => UserStat.findOne({ userId }),
    getAllUsers: () => UserStat.find({}).sort({ lastActive: -1 }).lean(),
    getStats: () => Stat.find({}).sort({ count: -1 }).limit(10),
    UserStat
};
