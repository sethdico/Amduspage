module.exports = {
    getSession: (userId) => {
        return global.sessions.get(userId) || { 
            chatSessionId: process.env.CHIPP_SESSION_ID 
        };
    },
    saveSession: (userId, sessionId) => {
        global.sessions.set(userId, { chatSessionId: sessionId });
    }
};
