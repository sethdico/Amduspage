const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI;

if (uri) {
    mongoose.connect(uri, { maxPoolSize: 10 }).catch(e => console.error(e.message));
}

const UserStatsSchema = new mongoose.Schema({
    userId: { type: String, unique: true, index: true },
    name: { type: String, default: "Messenger User" },
    count: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now }
});

const Ban = mongoose.model('Ban', new mongoose.Schema({ userId: String, reason: String }));
const Stat = mongoose.model('Stat', new mongoose.Schema({ command: String, count: { type: Number, default: 0 } }));
const UserStat = mongoose.model('UserStat', UserStatsSchema);

const buffer = new Map();
setInterval(async () => {
    if (buffer.size === 0) return;
    const ops = [];
    for (const [userId, data] of buffer) {
        ops.push({
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
    buffer.clear();
    try { await UserStat.bulkWrite(ops); } catch (e) {}
}, 30000);

module.exports = {
    addBan: (id, reason) => {
        if (global.ADMINS.has(id)) return Promise.resolve();
        return Ban.create({ userId: id, reason });
    },
    removeBan: (id) => Ban.deleteOne({ userId: id }),
    loadBansIntoMemory: async (cb) => {
        try {
            const rows = await Ban.find({});
            cb(new Set(rows.map(r => r.userId)));
        } catch (e) { cb(new Set()); }
    },
    syncUser: (userId, fb = null) => {
        const current = buffer.get(userId) || { count: 0, name: 'Messenger User' };
        current.count++;
        if (fb?.name) current.name = fb.name;
        buffer.set(userId, current);
    },
    getUserData: (userId) => UserStat.findOne({ userId }),
    getAllUsers: () => UserStat.find({}).sort({ lastActive: -1 }).lean(),
    trackCommandUsage: (name) => Stat.updateOne({ command: name }, { $inc: { count: 1 } }, { upsert: true }).exec(),
    UserStat
};
