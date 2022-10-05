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
    const options = {
        key: fs.readFileSync("KEYLOCATION"),
        cert: fs.readFileSync("CERTLOCATION")
    };
    console.log(options);
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
            save();
            var UUID = 0;
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
                io.emit('getPlayer', ConnectedUUID);
            });
            socket.on('disconnect', function(){
                save();
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
function save () {
    var file = fs.createWriteStream(dir + '/' + st.worldName + '.slomejs');
    file.write(JSON.stringify(map));
    file.end();
}
function load () {
    const contents = fs.readFileSync(dir + '/' + st.worldName + '.slomejs', 'utf-8');
    map = JSON.parse(contents);
}