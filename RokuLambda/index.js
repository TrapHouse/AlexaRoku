var APP_ID = "amzn1.echo-sdk-ams.app.a9c540f7-aa63-4142-834c-65ca13e146e7"; //replace this with your app ID to make use of APP_ID verification

var AlexaSkill = require("./AlexaSkill");
var serverinfo = require("./serverinfo");
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

AlexaRoku.prototype.intentHandlers = {
    PlayLast: function (intent, session, response) {
		sendCommand("/roku/playlast",null,function() {
			response.tellWithCard("Playing the last Netflix show you searched");
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
             sendCommand("/roku/voldown",null,function() {
			response.tell("Bazooper"); 
			});
    },
	VolumeUp: function (intent, session, response) {
        sendCommand("/roku/volup",null,function() {
			response.tell("I love television"); 
			});
    }
};

exports.handler = function (event, context) {
    var roku = new AlexaRoku();
    roku.execute(event, context);
};
