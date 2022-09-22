const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const port = 80;
const worldName = 'map';
var fs = require('fs');
var dir = './ServerFiles';


app.use(express.static('public'));
server.listen(port, () => {
console.log(`listening on *:${port}`);
});
let ConnectedUUID = [];
class Player {
    constructor(UUID, posX, posY) {
        this.UUID = UUID;
        this.posX = posX;
        this.posY = posY;
    }
}
//serverside
let doneLoading = false;
let map = [];
const mapSizeX = 1024; // (mapSizeX > 0)
const mapSizeY = 64; // (mapSizeY > 0 && mapSizeY % 2 == 0)
const freq = 10; // 0-100, amount of noise 
GenerateNewmap();
function GenerateNewmap()
{
    let PerlinTerrain = 0;
    for (var x = 0; x < mapSizeX; x++)
    {
        map[x] = [];
        for (var y = 0; y < mapSizeY; y++)
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
        for (var y = 0; y <= PerlinTerrain + mapSizeY/2; y++)
        {
            map[x][y] = 3;
        }
        for (var y = PerlinTerrain + mapSizeY/2 - 3; y <= PerlinTerrain + mapSizeY/2; y++)
        {
            map[x][y] = 2;
        }
        map[x][PerlinTerrain + mapSizeY/2] = 1;
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
io.on('connection', (socket) => {
    if (doneLoading) {
        var UUID = 0;
        var world = {
            map1: map,
            mapX: mapSizeX,
            mapY: mapSizeY,
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
// if (!fs.existsSync(dir)) {
//     fs.mkdirSync(dir);
// }
// if (!fs.existsSync(dir + '/' + worldName + '.slomejs')) {
//     save();
// } else {
//     load();
// }
// function save () {
//     var file = fs.createWriteStream(dir + '/' + worldName + '.slomejs');
//     map.forEach(function(i) {
//         file.write(i.join(', ') + '\n'); 
//     });
//     file.end();
// }
// function load () {
//     const contents = readFileSync(dir + '/' + worldName + '.slomejs', 'utf-8');

//     map = contents.split(/\r?\n/);
// } 