const express = require('express');
const app = express();
const { Server } = require("socket.io");
var fs = require('fs');
const isHttps = false; // if using an SSL key
let st = fs.readFileSync('settings.json');
let io = null;
st = JSON.parse(st);
if (!isHttps) {
    const http = require('http');
    app.use(express.static('public'));
    const server = http.createServer(app);
    server.listen(st.port, () => {
        console.log(`listening on *:${st.port}`);
    });
    io = new Server(server);
    serverStart();
} else {
    const https = require("https");
    app.use(express.static('public'));
    const options = {
        key: fs.readFileSync("KEYLOCATION"),
        cert: fs.readFileSync("CERTLOCATION")
    };
    const server = https.createServer(options, app); // for https
    server.listen(st.port, () => {
        console.log(`listening on *:${st.port}`);
    });
    io = new Server(server);
    serverStart();
}

var dir = './serverFiles';
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}

if (st.adminKey.toLowerCase() == "random") {
    st.adminKey = Math.random()*1000000000 | 0;
}
if (st.adminKey == 'none') {
    console.log('There is no admin key');
} else {
    console.log("The admin key is: '" + st.adminKey + "'");
}

let ConnectedUUID = [];
class Player {
    constructor(UUID, posX, posY) {
        this.UUID = UUID;
        this.posX = posX;
        this.posY = posY;
    }
}


//serverside
function serverStart () {
    io.on('connection', (socket) => {
        if (doneLoading) {
            var UUID = 0;
            var name = "/guest/";
            var world = {
                map1: map,
                map2: map2,
                mapX: st.mapSizeX,
                mapY: st.mapSizeY,
                playerList: ConnectedUUID
            };
            let TimeSinceLastmessage = 0;
            let messageLog = 0;
            setInterval(() => {
                TimeSinceLastmessage++;
                if (TimeSinceLastmessage > 3) {
                    messageLog = 0;
                }
            }, 1000);
            socket.emit('SendWorld', world);
            socket.emit('getMessage', st.MOTD[Math.random()*st.MOTD.length | 0], 'rgba(255, 255, 0, 1)');
            socket.on('ChangeBlock', (data) => {
                if (data.isLayer1) {
                    map[data.posX][data.posY] = data.blockID;
                } else {
                    map2[data.posX][data.posY] = data.blockID;
                }
                var changeVal = {
                    x: data.posX,
                    y: data.posY,
                    ID: data.blockID,
                    isLayer1: data.isLayer1
                };
                socket.broadcast.emit('change', changeVal);
            });
            socket.on('setName', (data) => {
                if (data != "" && onlyLettersAndNumbers(data) && data != null) {
                    name = data;
                    socket.emit('getMessage', 'Changed name too: "' + name + '"');
                } else {
                    socket.emit('getMessage', "Your submitted name is invalid!");
                }
            });
            socket.on('sendMessage', (data) => {
                messageLog++;
                TimeSinceLastmessage = 0;
                if (!getIfSpam(messageLog, socket)) {
                    if (name != "/guest/") {
                        let message = "<" + name + "> " + data;
                        const d = new Date();
                        console.log("(" + d.getMonth() + "/" + d.getDay() + " " + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds() + ") " + message);
                        io.emit('getMessage', message);
                    } else {
                        socket.emit('getMessage', "You need to register a name first with '/name <your_name_here>'");
                    }
                }
            });
            socket.emit('requestPlayer', ConnectedUUID);
            socket.on('player', (data) => {
                UUID = data.UUID;
                ConnectedUUID.push(data);
            });
            socket.on('UpdatePlayer', (data) => {
                for (let x = 0; x < ConnectedUUID.length; x++)
                {
                    if (data.UUID == ConnectedUUID[x].UUID)
                    {
                        ConnectedUUID[x].posX = data.posX;
                        ConnectedUUID[x].posY = data.posY;
                        break;
                    }
                }
            });
            socket.on('disconnect', () => {
                for (let x = 0; x < ConnectedUUID.length; x++) {
                    if (ConnectedUUID[x].UUID == UUID) {
                        ConnectedUUID.splice(x, 1);
                        return;
                    }
                }
                return;
            });
        }
    });
    setInterval(() => {
        io.emit('getPlayer', ConnectedUUID);
    }, 1000/60);
}
let doneLoading = false;
function getIfSpam(log, socket) {
    if (log > st.spamlimit && st.checkspam) {
        switch (st.spampunishment) {
            case 'warn':
                socket.emit('getMessage', 'Slow down! (stop spamming)', 'rgba(255,0,0,1)');
                return true;
            case 'kick':
                socket.emit('kickPlayer', "Kicked (spamming)");
                return true;
        }
    }
    return false;
}
let map = [];
let map2 = [];
const freq = 10; // 0-100, amount of noise 
GenerateNewmap();
function GenerateNewmap()
{
    let PerlinTerrain = 0;
    for (var x = 0; x < st.mapSizeX; x++)
    {
        map[x] = [];
        for (var y = 0; y < st.mapSizeY; y++)
        {
            map[x][y] = 0;
        }
        if (RandomChance(freq))
        {
            if (RandomChance(50))
            {
                PerlinTerrain++;
            }
            else
            {
                PerlinTerrain--;
            }
        }
        for (var y = 0; y <= PerlinTerrain + st.mapSizeY/2; y++)
        {
            map[x][y] = 3;
        }
        for (var y = PerlinTerrain + st.mapSizeY/2 - 3; y <= PerlinTerrain + st.mapSizeY/2; y++)
        {
            map[x][y] = 2;
        }
        map[x][PerlinTerrain + st.mapSizeY/2] = 1;
    }
    map2 = map;
    doneLoading = true;
}
function RandomChance(chance)
{
    if (chance/100 > Math.random())
    {
        return true;
    }
    return false;
}
setInterval(function() {
    if (ConnectedUUID.length > 0) {
        save(1);
    }
},1000*st.autoSave)

if (!fs.existsSync(dir + '/' + st.worldName + '.slomejs')) {
    save();
} else {
    load();
}
function save (code = -1) {
    var file = fs.createWriteStream(dir + '/' + st.worldName + '.slomejs');
    const save = {
        map: map,
        map2: map2
    };
    file.write(JSON.stringify(save));
    file.end();
    const d = new Date();
    let dateToday = d.getMonth() + "/" + d.getDay() + " " + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
    switch (code) {
        case -1:
            console.log("Game Saved by: (unknown source)");
            break;
        case 0:
            console.log("Game Saved by: (manual save)");
            break;
        case 1:
            console.log("Game Saved by: (auto save)");
            break;
        case 2:
            console.log("Game Saved by: (forced save)");
            break;
    };
    console.log("(time: " + dateToday + ") (code: " + code + ")");
}
async function saveQuit (code = -1, callBack = () => {console.log('No callback given!')}) {
    var file = fs.createWriteStream(dir + '/' + st.worldName + '.slomejs');
    const save = {
        map: map,
        map2: map2
    };
    file.write(JSON.stringify(save));
    file.end();
    const d = new Date();
    let dateToday = d.getMonth() + "/" + d.getDay() + " " + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
    switch (code) {
        case -1:
            console.log("Game Saved by: (unknown source)");
            break;
        case 0:
            console.log("Game Saved by: (manual save)");
            break;
        case 1:
            console.log("Game Saved by: (auto save)");
            break;
        case 2:
            console.log("Game Saved by: (forced save)");
            break;
    };
    console.log("(time: " + dateToday + ") (code: " + code + ")");
    callBack();
}
function load () {
    const contents = fs.readFileSync(dir + '/' + st.worldName + '.slomejs', 'utf-8');
    const data = JSON.parse(contents);
    map = data.map;
    map2 = data.map2;
}
function onlyLettersAndNumbers(str) {
    return /^[A-Za-z0-9]*$/.test(str);
}
//console commands
process.stdin.on('data', (data) => {
    let message = data.toString().replace(/(\r\n|\n|\r)/gm, "").replace("/", "");
    switch (message.split(" ")[0]) {
        case '':
            break;
        case 'help':
            showAllCommands();
            break;
        case 'stop':
            stopServerSafe(0);
            break;
        case 'save':
            save(0);
            break;
        case 'stopnosave':
            stopServerSafe(2);
            break;
        case 'say':
            io.emit('getMessage', "[SERVER] " + message.substring(4), 'rgba(255, 0, 255, 1)');
            console.log("[SERVER] " + message.substring(4));
            break;
        case 'eval':
            eval(message.substring(5));
            break;
        default:
            console.log("Unknown command: '" + message +"' type '/help' for help!");
            break;
    }
});

//commandsfunc

function showAllCommands () {
    console.log("List of commands:");
    console.log("/help -- shows this list");
    console.log("/stop -- stops the server (and saves the level)");
    console.log("/stopnosave -- stops the server (and does not the level)");
    console.log("/save -- saves game");
    console.log("/say <message> -- broadcasts message to chat");
    console.log("/eval <code> -- Excecutes code on the server");
}
function stopServerSafe (code = -1) {
    io.emit('kickPlayer', "Server closed!");
    switch (code) {
        case -1:
            saveQuit(2, () => {
                process.exit(code);
            });
            console.log("Closed server from unknown source (code:" + code + ")");
            break;
        case 0:
            saveQuit(2, () => {
                process.exit(code);
            });
            console.log("Closed server safely! (code:" + code + ")");
            break;
        case 1:
            saveQuit(2, () => {
                process.exit(code);
            });
            console.log("Closed server with error! (code:" + code + ")");
            break;
        case 2:
            console.log("Closed server without saving! (code:" + code + ")");
            process.exit(code);
    }
}