const { http } = require("../utils");

const sessions = new Map();
const SESSION_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1IjoichPrS1pUOGxNM3lpTEhIMXBTRVZxZFcyeStN5aUZ5QXdvMU9KTXlNNKZkVmPgYXl6Rm1XR3JSMU1JbmI3VTdJNGU3dmV3bno1WUCyY2laeWN1R1FWNUoXTjUyuU1rwnh5Mm8zY0dNMDFXQXkt1apV3UzFveGIWcXhMKlttT2lGeUF3bzFENW9TeTZselNpR1Nla1hyT1NsT1Mta2tXU0doaXlXN3JjMkRHYXpGKTN1NDZKMUFiTjU3U0ZIRmFwWUI3ZDRsbVpveU10U2piT3BYY2xVaGFBPXM5Ni1jIiwiaXNzIjoiaHR0cHM6Ly9zZWN1cmV0b2tlbi5nb29nbGUuY29tL3BhcmFwaHJhc2VyLTQ3MmMxIiwiYXVkIjoicGFyYXBocmFzZXItNDcyYzEiLCJhdXRoX3RpbWUiOjE3NzA4Nzk3NzAsInVzZXJfaWQiOiJMS1gxbUg1cUxkVXdoczlEMGlrQTM5eFhZSjAzIiwic3ViIjoiTEtYMW1INXFMZFV3aHM5RDBpa0EzOXhYWUowMyIsImlhdCI6MTc3MDg3OTc3MCwiZXhwIjoxNzcwODgzMzcwLCJlbWFpbCI6InNldGhhYXNoZXJzYWxpbmd1aGF5QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7Imdvb2dsZS5jb20iOlsiMTA2NTIyMDA4NTIwODA3ODk3Nzk2Il0sImVtYWlsIjpbInNldGhhYXNoZXJzYWxpbmd1aGF5QGdtYWlsLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6Imdvb2dsZS5jb20ifX0.HY0SEzXRpVtOb9nT4WtA7SsnYoq6Y6K68XrUC6ovmZb7Uzl6ixjuqyelyoDs_hMfpUOlLTNbI-K2p4coTm38Qi1-eIcriiyIE2ad3wYCB1moRlRL_2on9KqamEPb6Gdb67Epf5O05FRI1MVSR8k1vSBtrlMVHS3EKnhLUOYrRf_w4bt4q3MMT2Pe26MmikZy7PqxR_d5CUneobxF0fOL6Oeeu0WJ-YhePAGDOjvkj9Z9_U6g0t3i4O0J8NPGBzJ_kq1fq50Sxdt6ln53xXGhoypFk027x8Ua2Jmj6PjHr_AwWQkJLxKvtDr23zZPwWWpckOHINKVQEtV1X8ybz28-w";

module.exports.config = {
    name: "tmailor",
    aliases: ["tm", "tmail"],
    category: "Utility",
    description: "tmailor scrape temporary mail.",
    usage: "tmailor gen | tmailor inbox"
};

module.exports.run = async ({ event, args, reply }) => {
    const id = event.sender.id;
    const action = args[0]?.toLowerCase();
    const apiUrl = "https://tmailor.com/api";
    const headers = { "Content-Type": "application/json" };

    if (action === "gen") {
        try {
            const res = await http.post(apiUrl, {
                action: "newemail",
                curentToken: SESSION_TOKEN,
                fbToken: null
            }, { headers });

            const data = res.data;
            if (!data.email) return reply("failed to generate email.");

            sessions.set(id, data.accesstoken);
            return reply(`email: ${data.email}\n\ntype 'tmailor inbox' to check messages.`);
        } catch (e) {
            return reply("service error.");
        }
    }

    if (action === "inbox") {
        const token = sessions.get(id);
        if (!token) return reply("generate an email first.");

        try {
            const res = await http.post(apiUrl, {
                action: "listinbox",
                accesstoken: token,
                curentToken: SESSION_TOKEN,
                fbToken: null
            }, { headers });

            const messages = res.data.data;
            if (!messages || messages.length === 0) return reply("inbox is empty.");

            let text = "inbox contents:\n\n";
            messages.forEach((msg, i) => {
                text += `${i + 1}. from: ${msg.sender}\nsubject: ${msg.subject}\n\n`;
            });
            return reply(text);
        } catch (e) {
            return reply("error accessing inbox.");
        }
    }

    reply("usage: tmailor gen | tmailor inbox");
};
