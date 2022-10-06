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
                mapX: st.mapSizeX,
                mapY: st.mapSizeY,
                playerList: ConnectedUUID
            };
            socket.emit('SendWorld', world);
            socket.on('ChangeBlock', (data) => {
                map[data.posX][data.posY] = data.blockID;
                var changeVal = {
                    x: data.posX,
                    y: data.posY,
                    ID: data.blockID
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
                if (name != "/guest/") {
                    let message = "<" + name + "> " + data;
                    const d = new Date();
                    console.log("(" + d.getMonth() + "/" + d.getDay() + " " + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds() + ") " + message);
                    io.emit('getMessage', message);
                } else {
                    socket.emit('getMessage', "You need to register a name first with '/name <your_name_here>'");
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
            socket.on('disconnect', function(){
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
    setInterval(function() {
        io.emit('getPlayer', ConnectedUUID);
    }, 1000/60);
}
let doneLoading = false;
let map = [];
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
        save();
    }
},1000*st.autoSave)

if (!fs.existsSync(dir + '/' + st.worldName + '.slomejs')) {
    save();
} else {
    load();
}
function save (code = -1) {
    var file = fs.createWriteStream(dir + '/' + st.worldName + '.slomejs');
    file.write(JSON.stringify(map));
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
function load () {
    const contents = fs.readFileSync(dir + '/' + st.worldName + '.slomejs', 'utf-8');
    map = JSON.parse(contents);
}
function onlyLettersAndNumbers(str) {
    return /^[A-Za-z0-9]*$/.test(str);
}

//console commands
process.stdin.on('data', (data) => {
    let message = data.toString().replace(/(\r\n|\n|\r)/gm, "").replace("/", "");
    switch (message) {
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
        case 'helloworld':
            io.emit('getMessage', "Hello World " + Math.random());
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
    console.log("/save -- saves game");
    console.log("/stopnosave -- stops the server (and does not the level)");
}
function stopServerSafe (code = -1) {
    switch (code) {
        case -1:
            save(2);
            console.log("Closed server from unknown source (code:" + code + ")");
            break;
        case 0:
            save(2);
            console.log("Closed server safely! (code:" + code + ")");
            break;
        case 1:
            save(2);
            console.log("Closed server with error! (code:" + code + ")");
            break;
        case 2:
            console.log("Closed server without saving! (code:" + code + ")");
            break;
    }
    process.exit(code);
}