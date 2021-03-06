var APP_ID = "amzn1.echo-sdk-ams.app.a9c540f7-aa63-4142-834c-65ca13e146e7"; //replace this with your app ID to make use of APP_ID verification

var AlexaSkill = require("./AlexaSkill");
var serverinfo = require("./serverinfo");
var https = require("https");
var http = require("http");

if (serverinfo.host == "127.0.0.1") {
    throw "Default hostname found, edit your serverinfo.js file to include your server's external IP address";
}

var AlexaRoku = function () {
    AlexaSkill.call(this, APP_ID);
};

AlexaRoku.prototype = Object.create(AlexaSkill.prototype);
AlexaRoku.prototype.constructor = AlexaRoku;

function sendCommand(path,body,callback) {
	console.log(serverinfo.host);
    var opt = {
        host:serverinfo.host,
		port:serverinfo.port,
        path: path,
        method: 'POST',
    };

    var req = http.request(opt, function(res) {
		callback();
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
			
            console.log('Response: ' + chunk);
        });
    });

	if (body) req.write(body);
    req.end();
}

function checkTwitchStream(path,isStreamCall,isNotStreamCall)
{
https.get(path, function(res){
    var data = '';
 
    res.on('data', function (chunk){
    //console.log("CHUNK IS PROC");
        data += chunk;
    });
 
    res.on('end',function(){
        var obj = JSON.parse(data);
        if(obj.stream!=null)
    {
        isStreamCall();
    }
    else
    {
        isNotStreamCall();
    }
    })
 
});
}

AlexaRoku.prototype.intentHandlers = {
    PlayLast: function (intent, session, response) {
		sendCommand("/roku/playlast",null,function() {
			response.tellWithCard("Playing the last Netflix show you searched");
		});
    },
	 RickAndMorty: function (intent, session, response) {
		sendCommand("/roku/RickAndMorty",null,function() {
			response.tellWithCard("Playing Rick and Morty");
		});
    },
	 IcePoseidon: function (intent, session, response) {
		checkTwitchStream(
			"https://api.twitch.tv/kraken/streams/ice_poseidon",
			function () {
				sendCommand("/roku/IcePoseidon",null,function() {
				response.tellWithCard("Okay broooo. yahooooooooooooooooooo");
				});
			},
			function() {
				response.tellWithCard("There is no god");
			});
		},
	NextEpisode: function (intent, session, response) {
		sendCommand("/roku/nextepisode",null,function() {
			response.tellWithCard("Playing next episode");
		});
    },
	LastEpisode: function (intent, session, response) {
		sendCommand("/roku/lastepisode",null,function() {
			response.tellWithCard("Playing previous episode");
		});
    },
	ToggleTV: function (intent, session, response) {
		sendCommand("/toggletv",null,function() {
			response.tell("Affirmative");
		});	
	},
	selectButton: function (intent, session, response) {
		sendCommand("/roku/selectButton",null,function() {
			response.tell("Affirmative");
		});	
	},
	left: function (intent, session, response) {
	   sendCommand("/roku/left",intent.slots.Amt.value,function() {
			response.tell("Affirmative"); 
			});
	},
	right: function (intent, session, response) {
            sendCommand("/roku/right",intent.slots.Amt.value,function() {
			response.tell("Affirmative"); 
			});
    },
	up: function (intent, session, response) {
		 sendCommand("/roku/up",intent.slots.Amt.value,function() {
			response.tell("Affirmative"); 
			});
	},
	down: function (intent, session, response) {
		 sendCommand("/roku/down",intent.slots.Amt.value,function() {
			response.tell("Affirmative"); 
			});
	},
    Type: function (intent, session, response) {
		sendCommand("/roku/type",intent.slots.Text.value,function() {
			response.tellWithCard("Typing text: "+intent.slots.Text.value,"Roku","Typing text: "+intent.slots.Text.value);
		});
    },
	PlayPause: function (intent, session, response) {
		sendCommand("/roku/playpause",null,function() {
			response.tell("Affirmative");
		});
    },
	SearchPlay: function (intent, session, response) {
		sendCommand("/roku/searchplay",intent.slots.Text.value,function() {
			response.tellWithCard("Playing: "+intent.slots.Text.value,"Roku","Playing: "+intent.slots.Text.value);
		});
    },
    HelpIntent: function (intent, session, response) {
        response.tell("JOHN MADDEN JOHN MADDEN JOHN MADDEN JOHN MADDEN");
    },
	MuteVol: function (intent, session, response) {
        	sendCommand("/roku/mute",null,function() {
			response.tell("Shhhhhhh");
		});
    },
	VolumeDown: function (intent, session, response) {
             sendCommand("/roku/voldown",intent.slots.Amt.value,function() {
			response.tell("Bazooper"); 
			});
    },
	VolumeUp: function (intent, session, response) {
        sendCommand("/roku/volup",intent.slots.Amt.value,function() {
			response.tell("I love television"); 
			});
    }
};

exports.handler = function (event, context) {
    var roku = new AlexaRoku();
    roku.execute(event, context);
};
