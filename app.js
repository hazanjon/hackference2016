var restify = require('restify');
var builder = require('botbuilder');
var contentful = require('contentful')
var util = require('util')
var request = require('request')
var Promise = require('promise')

var Nexmo = require('nexmo');
var privateKey = require('fs').readFileSync(__dirname + '/nexmo.key');

var nexmo = new Nexmo({
	apiKey: '96345f76',
	apiSecret: '0e139dfe7e0e2131',
	applicationId: '74bab903-cc90-4d50-b52b-f8fd318643d0',
	privateKey: privateKey,
  },{debug:true});

// nexmo.calls.create(
//       {
//         to: [{
//           type: 'phone',
//           number: 447912138599
//         }],
//         from: {
//           type: 'phone',
//           number: 447520632064
//         },
//         answer_url: ['http://hack.hazan.me/answer']
//       },
//       function(err, res) {
//         if(err) { console.error(err); }
//         else { console.log(res); 
// }      }
// );

var sendSMS = function (msg){
	nexmo.message.sendSms('447520632064', '447912138599', msg);
}

var server = restify.createServer({
  name: 'myapp',
  version: '1.0.0'
});
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

server.get('/answer', function (req, res, next) {
	console.log('called');
	res.send([
	{
		"action": "talk",
		"text": "Hi, what would you like to do",
	},
	{
		"action": "record",
		"endOnSilence": 3,
		"eventUrl": ["http://hack.hazan.me/event"]
	},
	{
		"action": "talk",
		"text": "end of recording",
	//	"loop": 0
	}
	]);
  return next();
});

server.get('/answer_url', function (req, res, next) {
	console.log('answer_url',req);

  return next();
});

server.post('/event_url', function (req, res, next) {
	console.log('event_url',req);

  return next();
});

server.post('/event', function (req, res, next) {
	console.log('event',req.params);

  return next();
});

server.get('/inbound', function (req, res) {
  handleParams(req.query, res);
});

server.post('/inbound', function (req, res) {
	console.log('post')
  handleParams(req.body, res);
});

function directIntent (user, query){
	var url = 'https://api.projectoxford.ai/luis/v1/application?id=af51ea64-f0ba-4da8-a746-e8518df6205a&subscription-key=6ffb4f3bf92d4eeba7b012e6ae9ba800&q=';
	

	request(url+encodeURIComponent(query), function (error, response, body) {
	  if (!error && response.statusCode == 200) {
		body = JSON.parse(body);
		// console.log(body)
		console.log(body.intents)
		// console.log(body.intents[0])
		// console.log(body.intents[0].intent)
		switch(body.intents[0].intent){
			case 'Move':
				moveHandler(user, body.entities, sendSMS);
			break;
			case 'Fight':
				fightHandler(user, body.entities, sendSMS);
			break;
			case 'Take':
				takeHandler(user, body.entities, sendSMS);
			break;
			case 'Location':
				locationHandler(user, body.entities, sendSMS);
			break;
		}
	  }else{
		console.log('error',error);
	  }
	})
}

var received = {};

function handleParams(params, res) {
	console.log(params);
	if(!received[params.messageId]){
		received[params.messageId] = true;
		user = getUserPhone(params.msisdn)

		if(user){
			console.log('direct', params.text)
		  directIntent(user, params.text);

		  res.send('ok');
		}
	}
}

server.listen(8099, function () {
  console.log('%s listening at %s', server.name, server.url);
});


var client = contentful.createClient({
  // This is the space ID. A space is like a project folder in Contentful terms
  space: 'rbld2qmk6my1',
  // This is the access token for this space. Normally you get both ID and the token in the Contentful web app
  accessToken: '3462e7e4d60fb7d2e0a64ef92f6834d5221e57fd9841bc99cfd302fa9decc250'
});

var userData = {};

var getUser = function (session){
	id = session.message.user.id;
	
	return getUserGeneric(id, function(msg){
		session.send(msg);
	});
}
var getUserPhone = function (id){	
	return getUserGeneric(id, sendSMS);
}

var getUserGeneric = function (id, message){
	if(typeof userData[id] == "undefined"){
		userData[id] = {
			currentRoom: null,
			items: {},
			killed: {}
		}
		message("Welcome to Mike's Adventure Time\n\nHaving fallen down a hole, you look around your surroundings.");
		getRoom(userData[id], '76SKRPgidOyk2aGsQyiQkO').then(function (res){
			message(res);
		});
		return null;
	}

	return userData[id];
}

var doIHaveItem = function (user, item){
	console.log('Do i have', item)
	console.log(user)
	return user.items[item];
}

var haveIKilled = function (user, enemy){
	return user.killed[enemy];
}

var getRoomDescription = function(user){

		var desc = user.currentRoom.fields.description;

		if(user.currentRoom.fields.enemy){
			if(haveIKilled(user, user.currentRoom.sys.id)){
				desc += ' '+user.currentRoom.fields.enemyAfter;
			}else{
				desc += ' '+user.currentRoom.fields.enemyBefore;
			}
		}

		if(user.currentRoom.fields.item){
			if(doIHaveItem(user, user.currentRoom.fields.item)){
				desc += ' '+user.currentRoom.fields.itemAfter;
			}else{
				desc += ' '+user.currentRoom.fields.itemBefore;
			}
		}

		return desc;
}

var getRoom = function(user,id){
	console.log('get room',id)
	return client.getEntry(id)
	.then(function (entry) {
		console.log(entry)
		user.currentRoom = entry;
		return getRoomDescription(user);
	}, function (error){
		console.log('Contentful Error', error)
	});
}

var moveDirection = function (user, direction){
	console.log('move', direction);
	if(user.currentRoom.fields[direction]){
		return getRoom(user, user.currentRoom.fields[direction].sys.id);
	}else{
		console.log('cant move');
		return new Promise.resolve(false);
	}
}

var takeItem = function (user, item){
	console.log('item', item);

	if(user.currentRoom.fields.item && user.currentRoom.fields.item.toLowerCase() == item){
		user.items[user.currentRoom.fields.item] = true;
		return new Promise.resolve({success:true, message:'You pick up the '+item});
	}else{
		return new Promise.resolve({success:false, message:'There isnt a '+item+' here'});
	}
}


// Create bot and add dialogs
var connector = new builder.ChatConnector({
	appId: "c33aed11-d207-49d0-8785-bd403f553d1d",
	appPassword: "b8P83LijeM8qWFzCLDORYHZ"
});
var bot = new builder.UniversalBot(connector);  

// Setup Restify Server
var server = restify.createServer();
server.post('/api/messages', connector.listen());
server.listen(process.env.port || 3978, function () {
	console.log('%s listening to %s', server.name, server.url); 
});

var model = process.env.model || 'https://api.projectoxford.ai/luis/v1/application?id=af51ea64-f0ba-4da8-a746-e8518df6205a&subscription-key=6ffb4f3bf92d4eeba7b012e6ae9ba800';
var recognizer = new builder.LuisRecognizer(model);
var dialog = new builder.IntentDialog({ recognizers: [recognizer] });
bot.dialog('/', dialog);

dialog.onBegin(getUser);

function moveHandler(user, entities, message){
	// Resolve and store any entities passed from LUIS.
	var dir = null;

	if(builder.EntityRecognizer.findEntity(entities, 'direction::North')){
		dir = 'north';
	}
	if(builder.EntityRecognizer.findEntity(entities, 'direction::South')){
		dir = 'south';
	}
	if(builder.EntityRecognizer.findEntity(entities, 'direction::East')){
		dir = 'east';
	}
	if(builder.EntityRecognizer.findEntity(entities, 'direction::West')){
		dir = 'west';
	}

	//console.log(args)
	//console.log()
	//console.log(dir);

	if(dir){
		if(user.currentRoom.fields.enemy && user.currentRoom.fields.enemyBlocks == dir){
			message('The '+user.currentRoom.fields.enemy+' blocks you from going ' + user.currentRoom.fields.enemyBlocks);
		}else{
			moveDirection(user, dir).then(function(res){
				console.log('return', res);
				if(res){
					message(res);
				}else{
					message('You cant go that way');
				}
			});
		}
	}else{
		message('I couldnt tell where you wanted to go');
	}
}

function fightHandler(user, entities, message){
	// Resolve and store any entities passed from LUIS.
	var fight = null;

	if(builder.EntityRecognizer.findEntity(entities, 'Enemy::Werewolf')){
		fight = 'werewolf';
	}

	if(fight){
		console.log('fight', fight);

		if(user.currentRoom.fields.enemy && user.currentRoom.fields.enemy.toLowerCase() == fight){
			console.log('fight on', user.currentRoom.fields.enemyRequiredItem, user)
			if(!user.currentRoom.fields.enemyRequiredItem || doIHaveItem(user, user.currentRoom.fields.enemyRequiredItem)){
				console.log('I have the power')
				user.killed[user.currentRoom.sys.id] = true;
				message(user.currentRoom.fields.enemyFight);
			}else{
				message('You need a '+user.currentRoom.fields.enemyRequiredItem+' to fight the '+user.currentRoom.fields.enemy);
			}
		}else{
			message('There isnt a '+fight+' here');
		}
	}else{
		message('I couldnt tell who you wanted to fight');
	}
}

function takeHandler(user, entities, message){
	// Resolve and store any entities passed from LUIS.
	var item = null;

	if(builder.EntityRecognizer.findEntity(entities, 'Items::Sword')){
		item = 'sword';
	}
	console.log('item', item);

	if(item){
		takeItem(user, item).then(function(res){
			console.log('return', res);
			message(res.message);
		});
	}else{
		message('I couldnt tell what you wanted to take');
	}
}

function locationHandler(user, entities, message){
	message(getRoomDescription(user));
}
// Add intent handlers
dialog.matches('Move', [
	function (session, args, next) {
		user = getUser(session);

		if(user){
			moveHandler(user, args.entities, function(msg){session.send(msg);})
		}
	}
]);
// Add intent handlers
dialog.matches('Fight', [
	function (session, args, next) {
		user = getUser(session);

		if(user){
			fightHandler(user, args.entities, function(msg){session.send(msg);});
		}
	}
]);
// Add intent handlers
dialog.matches('Take', [
	function (session, args, next) {
		user = getUser(session);

		if(user){
			takeHandler(user, args.entities, function(msg){session.send(msg);});
		}
	}
]);
// Add intent handlers
dialog.matches('Location', [
	function (session, args, next) {
		user = getUser(session);

		if(user){
			locationHandler(user, args.entities, function(msg){session.send(msg);});
		}
	}
]);