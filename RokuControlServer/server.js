var http = require('http');
var fs = require('fs');
var urllib = require("url");
var dgram = require('dgram'); 

//null will cause the server to discover the Roku on startup, hard coding a value will allow for faster startups
var rokuAddress = "http://192.168.0.21:8060/";
var PORT=12345; 



//a simple wrapper to post to a url with no payload (to send roku commands)
function post(url,callback,data) {
	var info = urllib.parse(url);
	console.log("Posting: ",url);
    var opt = {
        host:info.hostname,
		port:info.port,
        path: info.path,
		headers: {
          'Content-Type': 'application/json'},
        method: 'POST'
    };

	try{
		var req = http.request(opt, callback);
		req.on("error",function(){console.log("error Posting");});
		
		if(data)
		{
			console.log(data);
			req.write(JSON.stringify(data));
		}
		req.end();
	}
	catch(e)
	{
		console.log("UHOG");
	}
}

//Performing an operation on the roku normally takes a handful of button presses
//This function will perform the list of commands in order and if a numerical value is included in the sequence it will be inserted as a delay
function postSequence(sequence,callback) {
	function handler() {
		if (sequence.length == 0) {
			if (callback) callback();
			return;
		}
		var next = sequence.shift();
		if (typeof next === "number") {
			setTimeout(handler,next);
		} else if (typeof next === "string") {
			post(next,function(res,req) {
				try{
                res.on("data",function() {}); //required for the request to go through without error
				
                handler();
				}
				catch(e){console.log("seqerr");}
			});
		}
	}
	handler();
}

//In order to send keyboard input to the roku, we use the keyress/Lit_* endpoint which can be any alphanumeric character
//This function turns a string into a series of these commands with delays of 100ms built in
//NOTE: this currently ignores anything that isn't lowercase alpha
function createTypeSequence(text) {
	var sequence = [];
	for (var i=0; i<text.length; i++) {
		var c = text.charCodeAt(i);
		if (c >= 97 && c <=122) { //alpha only
			sequence.push(rokuAddress+"keypress/Lit_"+text.charAt(i));
			sequence.push(100);
		}
	}
	return sequence;
}

//simple helper function to pull the data out of a post request. This could be avoided by using a more capable library such
function getRequestData(request,callback) {
	var body = "";
	request.on("data",function(data) {
		body += String(data);
	});
	request.on("end",function() {
		callback(body);
	});
}


function rokuL(phrase) {
    var charCount = phrase.length;

    var outArray = [];

    for (var i=0;i < charCount;i++)
    {
        var letter = phrase.charAt(i)
        if (i==0)
        {
            outArray.push(rokuAddress+"keypress/Lit_"+letter);	//pass letter
        }
        else{   
            outArray.push(700);	//wait 700
            outArray.push(rokuAddress + "keypress/Lit_" + letter);	//pass letter
        }

    }
    return outArray;
}
//depending on the URL endpoint accessed, we use a different handler.
//This is almost certainly not the optimal way to build a TCP server, but for our simple example, it is more than sufficient
var handlers = {
	"/toggletv":function(request,response) {
		post(rokuAddress+"keypress/power");
		response.end("OK");	
	},
	"/roku/selectButton":function(request,response) {
		post(rokuAddress+"keypress/Select");
		response.end("OK");	
	},	
	"/roku/RickAndMorty":function(request,response) {
		postSequence([
			rokuAddress+"keypress/home",    //wake the roku up, if its not already
			rokuAddress+"keypress/home",    //go back to the home screen (even if we're in netflix, we need to reset the interface)
			3000,
			rokuAddress+"launch/13535",	//Open up Plex
			7000,
			rokuAddress+"keypress/down",	//Move down one		
			700,
			rokuAddress+"keypress/down",	//Move down one		
			700,
			rokuAddress+"keypress/Select",    //Select TV Shows
			700,
			rokuAddress+"keypress/down",	//Move down one		
			700,
			rokuAddress+"keypress/down",	//Move down one		
			700,
			rokuAddress+"keypress/Select",    //Select Library
			700,
			rokuAddress+"keypress/Select",    //Select AARick and Morty
			700,
			rokuAddress+"keypress/left",    //move left
			700,
			rokuAddress+"keypress/down",    //move down to random
			700,
			rokuAddress+"keypress/select"	//play random episode
		]);
			response.end("OK"); //we provide an OK response before the operation finishes so that our AWS Lambda service doesn't wait around through our delays	
	},
	"/roku/IcePoseidon":function(request,response) {
	    postSequence([
			rokuAddress + "keypress/home",    //wake the roku up, if its not already
			rokuAddress + "keypress/home",    //go back to the home screen (even if we're in netflix, we need to reset the interface)
			3000,
			rokuAddress + "launch/50539",	//Open up Twitch
			7000,
			rokuAddress + "keypress/Info",	//Open Search	
			1000,
			rokuAddress + "keypress/Select",	//Move down one		
			700
	    ].concat(rokuL("Ice_Poseidon")).concat([700,rokuAddress + "keypress/right",700,rokuAddress + "keypress/right",700,rokuAddress + "keypress/right",700,rokuAddress + "keypress/right",700,rokuAddress + "keypress/right",700,rokuAddress + "keypress/right",700,rokuAddress + "keypress/Select"])
        );
			response.end("OK"); //we provide an OK response before the operation finishes so that our AWS Lambda service doesn't wait around through our delays	
	},
	"/roku/right":function(request,response) {
		
		getRequestData(request,function(data){
			var sequence = [];
			for(var i=0; i<data; i++)
			{
				if(i>0)
				{
					sequence.push(150);
				}
				sequence.push(rokuAddress+"keypress/right");
			}
			postSequence(sequence);
			tryOkResponse(response);
		});
	},
	"/roku/left":function(request,response) {
		post(rokuAddress+"keypress/left");
		response.end("OK");	
	},
	"/roku/up":function(request,response) {
		post(rokuAddress+"keypress/up");
		response.end("OK");	
	},
	"/roku/down":function(request,response) {
		post(rokuAddress+"keypress/down");
		response.end("OK");	
	},
    //This will play the last searched movie or show, we use it because it consistently resides to the right of the search box
	"/roku/playlast":function(request,response) {
		postSequence([
			rokuAddress+"keypress/home",    //wake the roku up, if its not already
			rokuAddress+"keypress/home",    //go back to the home screen (even if we're in netflix, we need to reset the interface)
			3000,                           //loading the home screen takes a few seconds
			rokuAddress+"launch/12",        //launch the netflix channel (presumably this is always id 12..)
			7000,							//loading netflix also takes some time
			rokuAddress+"keypress/Select",	//Select user profile		
			1000,
			rokuAddress+"keypress/down",    //the last searched item is 6 clicks down
			1000,
			rokuAddress+"keypress/down",
			1000,				
			rokuAddress+"keypress/down",
			1000,
			rokuAddress+"keypress/down",
			1000,
			rokuAddress+"keypress/down",
			1000,
			rokuAddress+"keypress/down",  
			1000,                           //more delays, experimentally tweaked.. can probably be significantly reduced by more tweaking
			rokuAddress+"keypress/Select",  //select the show from the main menu
			3000,                           //give the show splash screen time to load up
			rokuAddress+"keypress/Play"     //play the current/next episode (whichever one comes up by default)
		]);
		response.end("OK"); //we provide an OK response before the operation finishes so that our AWS Lambda service doesn't wait around through our delays
	},
    //This endpoint doenst perform any operations, but it allows an easy way for you to dictate typed text without having to use the on screen keyboard
	"/roku/type":function(request,response) {
		getRequestData(request,function(data) {
			var text = data.replace(/^\s+|\s+$/g,'').toLowerCase(); //trim whitespace and lowercase
			var sequence = createTypeSequence(text);
			postSequence(sequence,function() {

			});
			response.end("OK");	
		});
	},
    //Takes the POST data and uses it to search for a show and then immediate plays that show
	"/roku/searchplay":function(request,response) {
		getRequestData(request,function(data) {
			var text = data.replace(/^\s+|\s+$/g,'').toLowerCase(); //trim whitespace and lowercase
			var sequence = [].concat([
				rokuAddress+"keypress/home",    //wake roku
				rokuAddress+"keypress/home",    //reset to home screen
				3000,
				rokuAddress+"launch/12",        //launch netflix app
				7000,
				rokuAddress+"keypress/down",    //navigate to search
				1000,
				rokuAddress+"keypress/Select",  //select search
				2000,
			],createTypeSequence(text),[        //enter the text
				1000,
				rokuAddress+"keypress/right",   //go to search selections (which show up to the right of they keyboard.. we need to tap through them)
				100,
				rokuAddress+"keypress/right",
				100,
				rokuAddress+"keypress/right",
				100,
				rokuAddress+"keypress/right",
				100,
				rokuAddress+"keypress/right",
				100,
				rokuAddress+"keypress/right",
				500,
				rokuAddress+"keypress/Select", //selected the top result and returns to the main screen
				3000,                          //wait for main menu
				rokuAddress+"keypress/right",  //goto searched item
				rokuAddress+"keypress/Select", //drill into show
				3000,
				rokuAddress+"keypress/Play",   //play when loaded
			]);
			postSequence(sequence);			
			tryOkResponse(response);
		});
	},
    //the play and pause buttons are the same and is called "Play"
	"/roku/playpause":function(request,response) {
		post(rokuAddress+"keypress/Play");
		tryOkResponse(response);
	},
	"/roku/volup":function(request,response) {
		getRequestData(request,function(data){
			var sequence = [];
			for(var i=0; i<data; i++)
			{
				if(i>0)
				{
					sequence.push(300);
				}
				sequence.push(rokuAddress+"keypress/VolumeUp");
			}
			postSequence(sequence);
			tryOkResponse(response);
		});	
	},
	"/roku/voldown":function(request,response) {
		getRequestData(request,function(data){
			var sequence = [];
			for(var i=0; i<data; i++)
			{
				if(i>0)
				{
					sequence.push(300);
				}
				sequence.push(rokuAddress+"keypress/VolumeDown");
			}
			postSequence(sequence);
			tryOkResponse(response);
		});
	},
	"/roku/mute":function(request,response) {
		post(rokuAddress+"keypress/VolumeMute");
		tryOkResponse(response);	
	},
	"/roku/nextepisode":function(request,response) {
		postSequence([
			rokuAddress+"keypress/back",
			1000,
			rokuAddress+"keypress/down",
			100,
			rokuAddress+"keypress/down",
			100,
			rokuAddress+"keypress/select",
			2000,
			rokuAddress+"keypress/right",
			100,
			rokuAddress+"keypress/select",
			1000,
			rokuAddress+"keypress/Play",
		],function() {

		});
		tryOkResponse(response);
	},
	"/roku/lastepisode":function(request,response) {
		postSequence([
			rokuAddress+"keypress/back",
			1000,
			rokuAddress+"keypress/down",
			100,
			rokuAddress+"keypress/down",
			100,
			rokuAddress+"keypress/select",
			2000,
			rokuAddress+"keypress/left",
			100,
			rokuAddress+"keypress/select",
			1000,
			rokuAddress+"keypress/Play",
		],function() {

		});
		tryOkResponse(response);
	},
	"/entranceSong":function(request,response){
		getRequestData(request,function(data){
			console.log(data);
			var payload = {value1:data};
			if(data)
			{
				setTimeout(function(){
					post("https://maker.ifttt.com/trigger/entranceSong/with/key/ndyOYxe0Y7qJWwcMdzGSBONc1ywSNgohmlsmZCZ6yuF",null,payload);
					tryOkResponse(response);
				},40000);
			}
		});
	}
}
function tryOkResponse(response){
	try{
	response.end("OK");
	}
	catch(e)
	{
		console.log("error responding");
	}
}
//handles and incoming request by calling the appropriate handler based on the URL
function handleRequest(request, response){
	request.on("ETIMEDOUT", function(e){console.log("Snake the police")});
	response.on("ETIMEDOUT", function(e){console.log("2Snake the police")});
	try{
		if (handlers[request.url]) {
				handlers[request.url](request,response);
		} else {
			console.log("Unknown request URL: ",request.url);
			response.end();
		}
	}catch(e){console.log("FOG");}
}
//start the MSEARCH background task to try every second (run it immediately too)
//setInterval(searchForRoku,1000);
//searchForRoku();

//start the tcp server
http.createServer(handleRequest).listen(PORT,function(){
    console.log("Server listening on: http://localhost:%s", PORT);
});
