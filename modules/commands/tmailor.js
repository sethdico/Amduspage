const { http } = require("../utils");

const sessions = new Map();

const SESSION_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoiU2V0aCBBc2hlciBTYWxpbmd1aGF5IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FMbTV3dTBmcW9kOWtXbVZDeEt0TmdEdjZhWDJvOHd2U2piT3BYY2xVaGFBPXM5Ni1jIiwiaXNzIjoiaHR0cHM6Ly9zZWN1cmV0b2tlbi5nb29nbGUuY29tL3BhcmFwaHJhc2VyLTQ3MmMxIiwiYXVkIjoicGFyYXBocmFzZXItNDcyYzEiLCJhdXRoX3RpbWUiOjE3NzA5OTYyNDAsInVzZXJfaWQiOiJMS1gxbUg1cUxkVXdoczlEMGlrQTM5eFhZSjAzIiwic3ViIjoiTEtYMW1INXFMZFV3aHM5RDBpa0EzOXhYWUowMyIsImlhdCI6MTc3MDk5NjI0MCwiZXhwIjoxNzcwOTk5ODQwLCJlbWFpbCI6InNldGhhYXNoZXJzYWxpbmd1aGF5QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7Imdvb2dsZS5jb20iOlsiMTA2NTIyMDA4NTIwODA3ODk3Nzk2Il0sImVtYWlsIjpbInNldGhhYXNoZXJzYWxpbmd1aGF5QGdtYWlsLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6Imdvb2dsZS5jb20ifX0.eIPOBBJxcDD0_2JUAozPhFlreO98CjNmkVvcS__1iIs";
const LIST_ID = "dee95ec7-853e-4197-a276-21e6191cd2ec";

module.exports.config = {
    name: "tmailor",
    aliases: ["tm"],
    category: "Utility",
    description: "tmailor webscrape tempmail.",
    usage: "tm gen | tm inbox"
};

module.exports.run = async ({ event, args, reply }) => {
    const id = event.sender.id;
    const action = args[0]?.toLowerCase();
    const apiUrl = "https://tmailor.com/api";
    const headers = { 
        "Content-Type": "application/json", 
        "Listid": LIST_ID,
        "Cookie": "setlanguage=en; wk=1"
    };

    const pulse = async () => {
        try {
            await http.post(apiUrl, { 
                action: "checktokenlive", 
                fbToken: null, 
                curentToken: SESSION_TOKEN 
            }, { headers });
        } catch (e) {}
    };

    if (action === "gen") {
        try {
            await pulse();
            const { data } = await http.post(apiUrl, { 
                action: "newemail", 
                fbToken: null, 
                curentToken: SESSION_TOKEN 
            }, { headers });

            if (data.msg === "ok") {
                sessions.set(id, data.accesstoken);
                return reply(`email: ${data.email}\ntype 'tm inbox' to read messages.`);
            }
            return reply(`error: ${data.msg}`);
        } catch (e) { return reply("tmailor service error."); }
    }

    if (action === "inbox") {
        const token = sessions.get(id);
        if (!token) return reply("type 'tm gen' first.");

        try {
            await pulse();
            const { data } = await http.post(apiUrl, { 
                action: "listinbox", 
                fbToken: null, 
                curentToken: SESSION_TOKEN, 
                accesstoken: token 
            }, { headers });

            if (data.msg !== "ok") return reply(`session error: ${data.msg}`);

            const emails = data.data;
            if (!emails || emails.length === 0) return reply("inbox is empty.");

            let res = "messages:\n\n";
            emails.forEach((m, i) => {
                res += `${i + 1}. from: ${m.sender}\nsub: ${m.subject}\n\n`;
            });
            return reply(res.toLowerCase());
        } catch (e) { return reply("access failed."); }
    }

    return reply("usage: tm gen | tm inbox");
};
