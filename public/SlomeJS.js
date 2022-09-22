//For setup, modify with caution
const con = document.getElementById("Main").getContext("2d"); // create canvas with the tag "Main" for it to work, make the width/height 1080p
const WindowScale = 2;
const hboxX = 0.4; 
const hboxY = 0.37;
const UnitSize = 160; 
const OffsetX1 = 6;
const OffsetX2 = 3;

let UUID = 0;
var socket = io();
let mapSizeX = 0;
let mapSizeY = 0;
let players = [];
let selBlock = 1;
class Player {
    constructor(UUID, posX, posY) {
        this.UUID = UUID;
        this.posX = posX;
        this.posY = posY;
    }
}
socket.on('SendWorld', (data) => {
    map = data.map1;
    mapSizeX = data.mapX;
    mapSizeY = data.mapY;
    doneLoading = true;
});
socket.on('change', (data) => {
    if (checkInbounds(data.x, data.y)) {
        map[data.x][data.y] = data.ID;
    } else {
        console.log('error, change out of bounds at: ' + data.x + ", " + data.y);
    }
});
socket.on('requestPlayer', (data) => {
    UUID = Math.round(Math.random()*1000000);
    players = data;
    let tryUUID = false;
    if (players.length == 0) {
        tryUUID = true;
    }
    while (!tryUUID)
    {
        for (let x = 0; x < players.length; x++)
        {
            if (players[x].UUID != UUID && UUID > 0)
            {
                tryUUID = true;
                break;
            }
            UUID = Math.round(Math.random()*1000000);
        }
    }
    socket.emit('player', new Player(UUID, positionX, positionY));
});
setInterval(function SendPlayerPos() {
    socket.emit('UpdatePlayer', new Player(UUID, positionX, positionY));
}, 1000/60);
socket.on('getPlayer', (data) => {
    players = data;
});
//Import Images
const Skybox =  new Image();
Skybox.src = "./Assets/Env/SkyBox.png";
const Skybox2 =  new Image();
Skybox2.src = "./Assets/Env/SkyBoxMountains.png";
const Playerimg = new Image();
Playerimg.src = "./Assets/player/char.png";
const img0 = new Image();
img0.src = "./Assets/Blocks/air.png";
const img1 = new Image();
img1.src = "./Assets/Blocks/grass.png";
const img2 = new Image();
img2.src = "./Assets/Blocks/dirt.png";
const img3 = new Image();
img3.src = "./Assets/Blocks/stone.png";
const img4 = new Image();
img4.src = "./Assets/Blocks/oak_plank.png";
const img5 = new Image();
img5.src = "./Assets/Blocks/oak_log.png";
const img6 = new Image();
img6.src = "./Assets/Blocks/glass.png";
const img7 = new Image();
img7.src = "./Assets/Blocks/cobblestone.png";
const img8 = new Image();
img8.src = "./Assets/Blocks/workbench.png";
const img9 = new Image();
img9.src = "./Assets/Blocks/spruce_plank.png";
const img10 = new Image();
img10.src = "./Assets/Blocks/spruce_log.png";
const mapcolours = [img0, img1, img2, img3, img4, img5, img6, img7, img8, img9, img10];

//Constants, modify for different settings! Experiment!
const Gravity = 9.81*2;
const JumpStrength = 12;
const Accelaration = 0.09;
const MaxSpeed = 4;

//vars for game
let doneLoading = false;
let map = [];
let positionX = mapSizeX/2;
let positionY = mapSizeY/2;
let CurrentFPS = 0;
let IsGrounded = false;
let VelocityX = 0;
let VelocityY = 0;
let mouseX = 0;
let mouseY = 0;
let Keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    space: false
};
let selectedTile = {
    x: 0,
    y: 0
};
//const myTimeOut = setTimeout(GetServerSettingsAndWorld(), 100);
document.addEventListener('keydown', function(event) {
    if(event.keyCode == 65) {
        Keys.a = true;
    }
    if(event.keyCode == 68) {
        Keys.d = true;
    }
    if(event.keyCode == 87) {
        Keys.w = true;
    }
    if(event.keyCode == 83) {
        Keys.s = true;
    }
    if(event.keyCode == 32) {
        Keys.space = true;
    }
});
function changeSelblock() {
    if (selBlock == mapcolours.length - 1) {
        selBlock = 1;
        return;
    }
    selBlock++;
}
document.addEventListener('keyup', function(event) {
    if(event.keyCode == 65) {
        Keys.a = false;
    }
    if(event.keyCode == 66) {
        changeSelblock();
    }
    if(event.keyCode == 68) {
        Keys.d = false;
    }
    if(event.keyCode == 87) {
        Keys.w = false;
    }
    if(event.keyCode == 83) {
        Keys.s = false;
    }
    if(event.keyCode == 32) {
        Keys.space = false;
    }
});


setInterval(function() {
    if (doneLoading)
    {
        con.canvas.width  = WindowScale*1920;
        con.canvas.height = WindowScale*1080;
        draw();
        Move();
        Physics();
    }
}, 1000/60);
function placeBlockOnMouse () {
    changeBlockSend (selectedTile.x, selectedTile.y, selBlock, false);
}
function breakBlockOnMouse () {
    changeBlockSend (selectedTile.x, selectedTile.y, 0, true);
}
function changeBlockSend (x, y, ID, replace) {
    if (doneLoading)
    {
        if ((replace || (!replace && map[x + 6][mapSizeY - y - 2] == 0)) && checkInbounds(x + 6, mapSizeY - y - 2)) {
            var dataSend = {
                posX: x + 6,
                posY: mapSizeY - y - 2,
                blockID: ID
            };
            socket.emit('ChangeBlock', dataSend)
            map[x + 6][mapSizeY - y - 2] = ID;
        }
    }
}
function checkInbounds (x, y) {
    if (x >= 0 && x < mapSizeX && y >= 0 && y < mapSizeY)
    {
        return true;
    }
    return false;
}
function GetMousePosition (evt) {
    var rect = con.canvas.getBoundingClientRect();
    var scaleX = con.canvas.width / rect.width;
    var scaleY = con.canvas.height / rect.height;
    mouseX = ((((evt.clientX - rect.left) * scaleX)-rect.right/2*scaleX)/UnitSize*2)/2;
    mouseY = ((((evt.clientY - rect.top) * scaleY)-rect.bottom/2*scaleY)/UnitSize*2)/2;
}
function Move ()
{
    if (Keys.d) {
        VelocityX += Accelaration;
        if (VelocityX < 0) {
            VelocityX += Accelaration*2;
        }
        if (VelocityX > MaxSpeed)
        {
            VelocityX = MaxSpeed;
        }
    }
    else if (Keys.a) {
        VelocityX -= Accelaration;
        if (VelocityX > 0) {
            VelocityX -= Accelaration*2;
        }
        if (VelocityX < -MaxSpeed)
        {
            VelocityX = -MaxSpeed;
        }
    }
    else if (VelocityX > 0.1) {
        VelocityX -= 0.1;
    }
    else if (VelocityX < -0.1) {
        VelocityX += 0.1;
    }
    else {
        VelocityX = 0;
    }
    if (map[Math.round(positionX + hboxX + OffsetX1)][mapSizeY - Math.round(positionY + hboxY + 2.06)] != 0 || map[Math.round(positionX - hboxX + OffsetX1)][mapSizeY - Math.round(positionY + hboxY + 2.06)] != 0) {
        IsGrounded = true;
    }
    else {
        IsGrounded = false;
    }
    if (Keys.space && IsGrounded) {
        VelocityY = -JumpStrength;
    }
    VelocityY += Gravity/60;
}
function Physics ()
{
    let TryPositionX = positionX + VelocityX/60;
    let TryPositionY = positionY + VelocityY/60;
    let passX = true;
    let passY = true;
    if (TryPositionX > -hboxX && TryPositionY > -hboxY && Math.round(TryPositionX - hboxX) < mapSizeX && Math.round(TryPositionY - hboxY) < mapSizeY)
    {
        if (map[Math.round(TryPositionX -hboxX + OffsetX1)][mapSizeY - Math.round(positionY-hboxY + OffsetX2) + 1] != 0 && passX)
        {
            passX = false;
            VelocityX = 0;
            positionX = Math.round(positionX) - (0.499 - hboxX);
        }
        if (map[Math.round(positionX-hboxX + OffsetX1)][mapSizeY - Math.round(TryPositionY - hboxY + OffsetX2) + 1] != 0 && passY)
        {
            passY = false;
            VelocityY = 0;
            positionY = Math.round(positionY) - (0.499 - hboxY);
        }
    }
    if (TryPositionX > -hboxX && TryPositionY > -hboxY && Math.round(TryPositionX - hboxX) < mapSizeX && Math.round(TryPositionY + hboxY) < mapSizeY)
    {
        if (map[Math.round(TryPositionX -hboxX + OffsetX1)][mapSizeY - Math.round(positionY+hboxY + OffsetX2) + 1] != 0 && passX)
        {
            passX = false;
            VelocityX = 0;
            positionX = Math.round(positionX) - (0.499 - hboxX);
        }
        if (map[Math.round(positionX-hboxX + OffsetX1)][mapSizeY - Math.round(TryPositionY + hboxY + OffsetX2) + 1] != 0 && passY)
        {
            passY = false;
            VelocityY = 0;
            positionY = Math.round(positionY) + (0.499 - hboxY);
        }
    }
    if (TryPositionX > -hboxX && TryPositionY > -hboxY && Math.round(TryPositionX + hboxX) < mapSizeX && Math.round(TryPositionY + hboxY) < mapSizeY)
    {
        if (map[Math.round(TryPositionX +hboxX + OffsetX1)][mapSizeY - Math.round(positionY+hboxY + OffsetX2) + 1] != 0 && passX)
        {
            passX = false;
            VelocityX = 0;
            positionX = Math.round(positionX) + (0.499 - hboxX);
        }
        if (map[Math.round(positionX+hboxX + OffsetX1)][mapSizeY - Math.round(TryPositionY + hboxY + OffsetX2) + 1] != 0 && passY)
        {
            passY = false;
            VelocityY = 0;
            positionY = Math.round(positionY) + (0.499 - hboxY);
        }
    }
    if (TryPositionX > -hboxX && TryPositionY > -hboxY && Math.round(TryPositionX + hboxX) < mapSizeX && Math.round(TryPositionY - hboxY) < mapSizeY)
    {
        if (map[Math.round(TryPositionX +hboxX + OffsetX1)][mapSizeY - Math.round(positionY-hboxY + OffsetX2) + 1] != 0 && passX)
        {
            passX = false;
            VelocityX = 0;
            positionX = Math.round(positionX) + (0.499 - hboxX);
        }
        if (map[Math.round(positionX+hboxX + OffsetX1)][mapSizeY - Math.round(TryPositionY - hboxY + OffsetX2) + 1] != 0 && passY)
        {
            passY = false;
            VelocityY = 0;
            positionY = Math.round(positionY) - (0.499 - hboxY);
        }
    }
    if (passX)
    {
        positionX += VelocityX/60;
    }
    if (passY)
    {
        positionY += VelocityY/60;
    }
}
fpsMeter();
function fpsMeter() {
    let prevTime = Date.now(),
    frames = 0;

    requestAnimationFrame(function loop() {
        const time = Date.now();
        frames++;
        if (time > prevTime + 1000) {
            let fps = Math.round((frames*1000)/(time-prevTime));
            prevTime = time;
            frames = 0;
            CurrentFPS = fps;
        }
        requestAnimationFrame(loop);
    });
}
function draw ()
{
    con.drawImage(Skybox,0,0,con.canvas.width,con.canvas.height);
    con.drawImage(Skybox2,0,800,con.canvas.width,con.canvas.height/1.2);
    selectedTile.x = Math.round(positionX + mouseX + 2);
    selectedTile.y = Math.round(positionY + mouseY + 0.8);
    let hasFill = false;
    let needFillX = 0;
    let needFillY = 0;
    for (var x = -6; x <= 18; x++)
    {
        for (var y = -9; y <= 9; y++)
        {
            if (x+Math.round(positionX) >= 0 && x+Math.round(positionX) < mapSizeX && y+Math.round(positionY) >= 0 && y+Math.round(positionY) < mapSizeY)
            {
                if (map[x+Math.round(positionX)][mapSizeY-(y+Math.round(positionY))] < mapcolours.length && map[x+Math.round(positionX)][mapSizeY-(y+Math.round(positionY))] > 0)
                {
                    con.drawImage(mapcolours[map[x+Math.round(positionX)][mapSizeY-(y+Math.round(positionY))]],(x-(positionX-Math.round(positionX)) + 5.5)*UnitSize,(y-(positionY-Math.round(positionY)) + 4.37)*UnitSize,UnitSize*1.01,UnitSize*1.01);
                }
                if (x - 6 +Math.round(positionX) == selectedTile.x && y+Math.round(positionY) == selectedTile.y && !hasFill)
                {
                    hasFill = true;
                    needFillX = (x-(positionX-Math.round(positionX)) + 5.5)*UnitSize;
                    needFillY = (y-(positionY-Math.round(positionY)) + 6.37)*UnitSize;
                }
            }   
        }
    }
    if (hasFill)
    {
        con.fillStyle = "rgba(255, 255, 255, 0.5)";
        con.fillRect(needFillX,needFillY,UnitSize*1.01,UnitSize*1.01);
    }
    con.fillStyle = "rgba(255, 255, 255, 1)";
    for (let x = 0; x < players.length; x++) {
        if (players[x].UUID != UUID && players[x].UUID > 0) {
            con.drawImage(Playerimg,(players[x].posX-positionX + 11.6)*UnitSize,(players[x].posY-positionY + 6.47)*UnitSize,UnitSize*(hboxX*2),UnitSize*(hboxX*2));
        }
    }
    con.drawImage(Playerimg,con.canvas.width/2 - UnitSize/2 +18,con.canvas.height/2 - UnitSize/2 + 32,UnitSize*(hboxX*2),UnitSize*(hboxX*2));
    con.font = "70px Georgia";
    con.fillText("SlomeJs a0.0.9", 10, 60);
    con.fillText("FPS=" + CurrentFPS + ", mouseX=" + Math.round((positionX + mouseX)*1000)/1000 + ", mouseY=" + Math.round((positionY + mouseY)*1000)/1000, 10, 130);
    con.fillText("X=" + Math.round(positionX*1000)/1000, 10, 200);
    con.fillText("Y=" + Math.round(positionY*1000)/1000, 10, 270);
    con.drawImage(mapcolours[selBlock],10 ,340,240,240);
}
function RandomChance(chance)
{
    if (chance/100 > Math.random())
    {
        return true;
    }
    return false;
}