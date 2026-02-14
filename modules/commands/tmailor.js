const { http } = require("../utils");

const sessions = new Map();
const SESSION_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoiU2V0aCBBc2hlciBTYWxpbmd1aGF5IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FMbTV3dTBmcW9kOWtXbVZDeEt0TmdEdjZhWDJvOHd2U2piT3BYY2xVaGFBPXM5Ni1jIiwiaXNzIjoiaHR0cHM6Ly9zZWN1cmV0b2tlbi5nb29nbGUuY29tL3BhcmFwaHJhc2VyLTQ3MmMxIiwiYXVkIjoicGFyYXBocmFzZXItNDcyYzEiLCJhdXRoX3RpbWUiOjE3NzA4Nzk3NzAsInVzZXJfaWQiOiJMS1gxbUg1cUxkVXdoczlEMGlrQTM5eFhZSjAzIiwic3ViIjoiTEtYMW1INXFMZFV3aHM5RDBpa0EzOXhYWUowMyIsImlhdCI6MTc3MDg3OTc3MCwiZXhwIjoxNzcwODgzMzcwLCJlbWFpbCI6InNldGhhYXNoZXJzYWxpbmd1aGF5QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7Imdvb2dsZS5jb20iOlsiMTA2NTIyMDA4NTIwODA3ODk3Nzk2Il0sImVtYWlsIjpbInNldGhhYXNoZXJzYWxpbmd1aGF5QGdtYWlsLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6Imdvb2dsZS5jb20ifX0.HY0SEzXRpVtOb9nT4WtA7SsnYoq6Y6K68XrUC6ovmZb7Uzl6ixjuqyelyoDs_hMfpUOlLTNbI-K2p4coTm38Qi1-eIcriiyIE2ad3wYCB1moRlRL_2on9KqamEPb6Gdb67Epf5O05FRI1MVSR8k1vSBtrlMVHS3EKnhLUOYrRf_w4bt4q3MMT2Pe26MmikZy7PqxR_d5CUneobxF0fOL6Oeeu0WJ-YhePAGDOjvkj9Z9_U6g0t3i4O0J8NPGBzJ_kq1fq50Sxdt6ln53xXGhoypFk027x8Ua2Jmj6PjHr_AwWQkJLxKvtDr23zZPwWWpckOHINKVQEtV1X8ybz28-w";

module.exports.config = {
    name: "tmailor",
    aliases: ["tm"],
    category: "Utility",
    description: "tmailor.com scrape temporary mail",
    usage: "tmailor gen | tmailor inbox"
};

module.exports.run = async ({ event, args, reply }) => {
    const id = event.sender.id;
    const action = args[0]?.toLowerCase();
    const apiUrl = "https://tmailor.com/api";
    
    const headers = { 
        "Content-Type": "application/json",
        "Cookie": "setlanguage=en; wk=1",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };

    try {
        await http.post(apiUrl, {
            action: "checktokenlive",
            fbToken: null,
            curentToken: SESSION_TOKEN
        }, { headers });
    } catch (e) {
        return reply("handshake failed.");
    }

    if (action === "gen") {
        try {
            const { data } = await http.post(apiUrl, {
                action: "newemail",
                curentToken: SESSION_TOKEN,
                fbToken: null
            }, { headers });

            if (data.msg === "ok") {
                sessions.set(id, data.accesstoken);
                return reply(`email: ${data.email}\n\ntype 'tmailor inbox' to check messages.`);
            }
            return reply("error: " + data.msg);
        } catch (e) {
            return reply("connection failed.");
        }
    }

    if (action === "inbox") {
        const userToken = sessions.get(id);
        if (!userToken) return reply("type 'tmailor gen' first.");

        try {
            const { data } = await http.post(apiUrl, {
                action: "listinbox",
                accesstoken: userToken,
                fbToken: null,
                curentToken: SESSION_TOKEN
            }, { headers });

            if (data.msg !== "ok") return reply("server error: " + data.msg);

            const emails = data.data;
            if (!emails || emails.length === 0) return reply("inbox is empty.");

            let response = "inbox contents:\n\n";
            emails.forEach((mail, index) => {
                response += `${index + 1}. from: ${mail.sender}\nsubject: ${mail.subject}\n\n`;
            });
            return reply(response);
        } catch (e) {
            return reply("inbox access failed.");
        }
    }

    return reply("usage: tmailor gen | tmailor inbox");
};
