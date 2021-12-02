//The channel to be focused on
let nomChaine = "icecoptered";
//Quality can be 1.0, 2.0 or 3.0 for best quality
let quality = "2.0";
//The height of all emotes in px
let sizeEmote = 80;
//The delay between two image updates in ms
let delayUpdate = 10;
//The delay between each image produce with !produce
let delayProduce = 200;

function randomValue(a,b){
    return Math.floor(Math.random()*(b-a))+a;
}

function checkIfImageExists(obj, url,_callback) {
	const img = new Image();
	img.src = url;

	img.onerror = function() {
		_callback(obj, 0,0);
	};

	img.onload = function() {
		_callback(obj, this.width,this.height);
	};
}

class Emote {
    constructor(url,x=null,y=null) {
        let emoteWallDiv = document.getElementsByClassName("emoteWall")[0];
        let element = document.createElement("img");
        this.id = Math.floor(Math.random() * 100)*Date.now();
        element.classList.add("emote");
        element.height = sizeEmote;
        element.id = this.id;
        element.src = url;
	    this.ready = false;
	    this.opacity = 1;
	    this.posX = x;
	    this.posY = y;
	    checkIfImageExists(this, url, function(obj, sizeX,sizeY) {
		    if(sizeX !== 0){
    			emoteWallDiv.appendChild(element);
    		        obj.timeToSpend= randomValue(200,700);
    		        obj.vx = randomValue(100,300)/300;
    			if(randomValue(1,3)===1){
    				obj.vx *= -1;
    			}
    			obj.vy = randomValue(100,300)/300;
    			if(randomValue(1,3)===1){
    				obj.vy *= -1;
    			}
    			obj.width = sizeX;
    			obj.height = sizeY;
    			if(obj.posX == null){
    			        obj.posX = randomValue(sizeEmote+10,window.innerWidth-sizeEmote-2);
    			}
    			if(obj.posY == null){
    		        	obj.posY = randomValue(obj.height*sizeEmote/obj.width+10,window.innerHeight-obj.height*sizeEmote/obj.width-2);
    			}
    			obj.ready = true;
		    }
	    });
    }
    move(){
        if(this.posX + sizeEmote> window.innerWidth || this.posX <0){
            this.vx *= -1;
        }
        if(this.posY + (this.height*sizeEmote/this.width)> window.innerHeight || this.posY <0){
            this.vy *= -1;
        }
        this.timeToSpend -= 1;
	    if(this.timeToSpend <100){
    	    this.opacity -= 0.01;
    	}
    	this.posX += this.vx;
	    this.posY += this.vy;
    }
    update(){
        let element = document.getElementById(this.id);
        element.style.top = this.posY.toString()+"px";
        element.style.left = this.posX.toString()+"px";
        element.style.opacity = this.opacity;
    }
    selfDestruct(){
        let element = document.getElementById(this.id);
        element.remove();
    }
}

function updateAllEmote(liste){
    for(let i=0; i<liste.length; i++){
	if(liste[i].ready){
        liste[i].move();
        liste[i].update();
	}
        if(liste[i].timeToSpend <= 0){
            const index = liste.indexOf(liste[i]);
            if (index > -1) {
                liste[i].selfDestruct();
                liste.splice(index, 1);
            }
        }
    }
}

const params = new URLSearchParams(window.location.search);
const channel = params.get('channel') || nomChaine.toLowerCase();
const client = new tmi.Client({
    connection: {
        secure: true,
        reconnect: true,
    },
    channels: [channel],
});

client.connect();

let listeEmote = [];
let listeEmoteProduce = [];
let timeIntervalVar;
let channelId;
let dictBTTV = {};
let produceInterval;

function httpGet(theUrl)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", theUrl, false ); // false for synchronous request
    xmlHttp.send( null );
    return xmlHttp.responseText;
}

function setupTimeInterval(){
    if(timeIntervalVar == null){
        timeIntervalVar = setInterval(
            function test(){
                if(listeEmote.length >0){
                    updateAllEmote(listeEmote);
                }
                if(listeEmoteProduce.length >0){
                    updateAllEmote(listeEmoteProduce);
                }
                if(listeEmoteProduce.length == 0 && listeEmote.length == 0){
                    clearInterval(timeIntervalVar);
                    timeIntervalVar = null
                }
            },delayUpdate);
    }
}

client.on('message', (wat, tags, message, self) => {
    if(channelId == null){
	    channelId = tags['user-id'];
	    let globalEmotes = "https://api.betterttv.net/3/cached/emotes/global";
	    let rep = JSON.parse(httpGet(globalEmotes));
	    for(let i=0; i<rep.length; i++){
    		dictBTTV[rep[i]['code']] = rep[i]['id'];
    	}
    	let allChannelEmotes = "https://api.betterttv.net/3/cached/users/twitch/"+channelId;
    	rep = JSON.parse(httpGet(allChannelEmotes));
    	for(let i=0; i<rep["channelEmotes"].length;i++){
    		dictBTTV[rep["channelEmotes"][i]['code'].toString()] = rep["channelEmotes"][i]['id'];
    	}
    	for(let i=0; i<rep["sharedEmotes"].length;i++){
    		dictBTTV[rep["sharedEmotes"][i]['code'].toString()] = rep["sharedEmotes"][i]['id'];
    	}
    }
    if(dictBTTV !== {}){
	let url = "https://cdn.betterttv.net/emote/";
	listeEmotesBTTV = [];
	message.split(" ").forEach((i)=>{
		if(i in dictBTTV){
			listeEmote.push(new Emote(url+dictBTTV[i]+"/2x"));
            listeEmotesBTTV.push(url+dictBTTV[i]+"/2x");
			setupTimeInterval();
		}
	});
    }
    emotes = tags["emotes"];
    let keys;
    if(emotes != null){
        keys = Object.keys(emotes);
        url = "https://static-cdn.jtvnw.net/emoticons/v2/";
        for(let i=0; i<keys.length; i++){
            for(let j=0; j<emotes[keys[i]].length; j++){
                listeEmote.push(new Emote(url+keys[i]+"/default/dark/"+quality));
                setupTimeInterval();
            }
        }
    }
    let {username}= tags;
    if(message[0] === "!"){
        if(nomChaine === username.toLowerCase() ) {
            let listeCmd = message.slice(1, message.length).split(" ")
            let command = listeCmd[0];
            let param = listeCmd.slice(1, listeCmd.length);
            let url = "https://static-cdn.jtvnw.net/emoticons/v2/";
            if (command === "emote") {
                listeEmote.push(new Emote(url + param[0] + "/default/dark/" + quality));
                setupTimeInterval();
            } else if (command === "bomb") {
                let randVal = randomValue(1, 10000);
                let randPosX = randomValue(100, window.innerWidth - 100);
                let randPosY = randomValue(100, window.innerHeight - 100);
                for (let i = 0; i < 100; i++) {
                    if (param[0] == null) {
                        listeEmote.push(new Emote(url + (randVal + i).toString() + "/default/dark/" + quality, randPosX, randPosY));
                    } else {
                        listeEmote.push(new Emote(url + param[0] + "/default/dark/" + quality, randPosX, randPosY));
                    }
                }
                setupTimeInterval();
            } else if (command === "produce") {
                if (produceInterval != null) {
                    clearInterval(produceInterval);
                }
                let listeEmotesBTTVProduce = listeEmotesBTTV.slice();
                let keysProduce;
                if(keys != null) {
                    keysProduce = keys.slice();
                }
                if (emotes != null || listeEmotesBTTVProduce.length >0) {
                    produceInterval = setInterval(
                        function test() {
                            if(listeEmotesBTTVProduce.length>0){
                                listeEmoteProduce.push(new Emote(listeEmotesBTTVProduce[randomValue(0, listeEmotesBTTVProduce.length)] ));
                                setupTimeInterval();
                            }
                            if(keysProduce != null){
                                listeEmoteProduce.push(new Emote(url + keysProduce[randomValue(0, keysProduce.length)] + "/default/dark/" + quality));
                                setupTimeInterval();
                            }
                        }, delayProduce);
                }
                else{
                    produceInterval = setInterval(
                        function test() {
                            listeEmoteProduce.push(new Emote(url + randomValue(1, 10000) + "/default/dark/" + quality));
                            setupTimeInterval();
                        }, delayProduce);
                }
            } else if (command === "stop2") {
                if (produceInterval != null) {
                    clearInterval(produceInterval);
                }
            }
        }
    }
});