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

function directIntent (query){
	var url = 'https://api.projectoxford.ai/luis/v1/application?id=af51ea64-f0ba-4da8-a746-e8518df6205a&subscription-key=6ffb4f3bf92d4eeba7b012e6ae9ba800&q=';
	

	request(url+encodeURIComponent(query), function (error, response, body) {
	  if (!error && response.statusCode == 200) {
	    console.log(body) // Show the HTML for the Google homepage.
	  }else{
	  	console.log('error',error);
	  }
	})
}

function handleParams(params, res) {
  console.log(params);

  directIntent(params.text);
  //res.status(200).end();
  res.send('ok');
  // if (!params.to || !params.msisdn) {
  //   console.log('This is not a valid inbound SMS message!');
  // } else {
  //   console.log('Success');
  //   var incomingData = {
  //     messageId: params.messageId,
  //     from: params.msisdn,
  //     text: params.text,
  //     type: params.type,
  //     timestamp: params['message-timestamp']
  //   };
  //   console.log(incomingData);
  //   //storage.setItem('id_' + params.messageId, incomingData);
  //   res.send(incomingData);
  // }
  // res.status(200).end();
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
	if(typeof userData[id] == "undefined"){
		userData[id] = {
			currentRoom: null,
			weapon: false,
			killed: []
		}
		setupUser(session);
	}

	return userData[id];
}

var getRoom = function(user,id){
	console.log('get room',id)
	return client.getEntry(id)
	.then(function (entry) {
	  console.log(entry)
	  return user.currentRoom = entry;
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

var fightEnemy = function (user, fight){
	console.log('fight', fight);

	if(user.currentRoom.fields.enemy && user.currentRoom.fields.enemy.toLowerCase() == fight){
		if(user.weapon){
			user.killed.push(currentRoom.sys.id);
			return new Promise.resolve({success:true, message:'You kill the '+fight+', step over it\'s dead body and walk through the door'});

		}else{
			return new Promise.resolve({success:false, message:'You dont have a weapon'});
		}
	}else{
		return new Promise.resolve({success:false, message:'There isnt a '+fight+' here'});
	}
}

var takeItem = function (user, item){
	console.log('item', item);

	if(user.currentRoom.fields.item && user.currentRoom.fields.item.toLowerCase() == item){
		user.weapon = true;
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

var setupUser = function (session) {
	console.log('test');
	session.send("Welcome to Mike's Adventure Time\n\nHaving fallen down a hole, you look around your surroundings.");
	user = getUser(session);
    getRoom(user, '76SKRPgidOyk2aGsQyiQkO').then(function (res){
		session.send(res.fields.description);
    });
}

dialog.onBegin(getUser);

// Add intent handlers
dialog.matches('Move', [
	function (session, args, next) {
		user = getUser(session);
		// Resolve and store any entities passed from LUIS.
		var dir = null;

		if(builder.EntityRecognizer.findEntity(args.entities, 'direction::North')){
			dir = 'north';
		}
		if(builder.EntityRecognizer.findEntity(args.entities, 'direction::South')){
			dir = 'south';
		}
		if(builder.EntityRecognizer.findEntity(args.entities, 'direction::East')){
			dir = 'east';
		}
		if(builder.EntityRecognizer.findEntity(args.entities, 'direction::West')){
			dir = 'west';
		}

		//console.log(args)
		//console.log()
		//console.log(dir);

		if(dir){
			console.log('mv');
			moveDirection(user, dir).then(function(res){
				console.log('return', res);
				if(res){
					session.send(res.fields.description);
				}else{
					session.send('You cant go that way');
				}
			});
		}else{
			session.send('I couldnt tell where you wanted to go');
		}
	}
]);
// Add intent handlers
dialog.matches('Fight', [
	function (session, args, next) {
		user = getUser(session);
		// Resolve and store any entities passed from LUIS.
		var fight = null;

		if(builder.EntityRecognizer.findEntity(args.entities, 'Enemy::Werewolf')){
			fight = 'werewolf';
		}
		console.log(args)
		//console.log(session)
		console.log(fight);

		if(fight){
			console.log('fight');
			fightEnemy(user, fight).then(function(res){
				console.log('return', res);
				session.send(res.message);
			});
		}else{
			session.send('I couldnt tell who you wanted to fight');
		}
	}
]);
// Add intent handlers
dialog.matches('Take', [
	function (session, args, next) {
		user = getUser(session);
		// Resolve and store any entities passed from LUIS.
		var item = null;

		if(builder.EntityRecognizer.findEntity(args.entities, 'Items::Sword')){
			item = 'sword';
		}
		console.log(args)
		//console.log(session)
		console.log(item);

		if(item){
			console.log('item');
			takeItem(user, item).then(function(res){
				console.log('return', res);
				session.send(res.message);
			});
		}else{
			session.send('I couldnt tell what you wanted to take');
		}
	}
]);