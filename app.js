var restify = require('restify');
var builder = require('botbuilder');
var contentful = require('contentful')
var util = require('util')
var Promise = require('promise')

var client = contentful.createClient({
  // This is the space ID. A space is like a project folder in Contentful terms
  space: 'rbld2qmk6my1',
  // This is the access token for this space. Normally you get both ID and the token in the Contentful web app
  accessToken: '3462e7e4d60fb7d2e0a64ef92f6834d5221e57fd9841bc99cfd302fa9decc250'
});

var currentRoom = null;

var getRoom = function(id){
	console.log('get room',id)
	return client.getEntry(id)
	.then(function (entry) {
	  console.log(entry)
	  return currentRoom = entry;
	}, function (error){
		console.log('Contentful Error', error)
	});
}

var moveDirection = function (direction){
	console.log('move', direction);
	if(currentRoom.fields[direction]){
		return getRoom(currentRoom.fields[direction].sys.id);
	}else{
		console.log('cant move');
		return new Promise.resolve(false);
	}
}

getRoom('76SKRPgidOyk2aGsQyiQkO');

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

// Add intent handlers
dialog.matches('Move', [
	function (session, args, next) {
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
		console.log(args)
		//console.log(session)
		console.log(dir);

		if(dir){
			console.log('mv');
			moveDirection(dir).then(function(res){
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
		console.log('here');
	}
]);
// Add intent handlers
dialog.matches('Fight', [
	function (session, args, next) {
		// Resolve and store any entities passed from LUIS.
		var title = builder.EntityRecognizer.findEntity(args.entities, 'monster');
		console.log(args)
		//console.log(session)
		console.log(title);
		
		session.send('Ok... no problem.');
	}
]);