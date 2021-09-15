const express = require('express');
const app = express();
app.use(express.static(__dirname));
const http = require('http');
var _ = require('underscore');
const server = http.createServer(app);
const io = require('socket.io')(server,{
  });

var clients = {};
var usernameList = [];

var newField = function() {
	return {
	  queue:[],
	  streak:0,
	  kings:[],
	  challengers:[],
	  kingWins:0,
	  challengerWins:0
	};
}

var fields = [];
for (var i = 0; i < 8; i++) {
  fields.push(newField());
}
//console.log(fields);

let room = 0;
let player1Rdy = 0;
let player2Rdy = 0;



app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const {userConnected, connectedUsers, initializeChoices, moves, makeMove, choices} = require("./util/users");
//const {createRoom, joinRoom, exitRoom, rooms} = require("./util/rooms");

/* createRoom("room1");
createRoom("room2");
createRoom("room3");
createRoom("room4");
createRoom("room5");
createRoom("room6");
createRoom("room7");
createRoom("room8"); */


io.on('connection', (socket) => {
  console.log('a user connected');
  socket.emit("full-field", fields);
  
  socket.on("create-room", (roomId) =>{
    /* if(rooms[roomId]){
	const error = "This room already exists";
	socket.emit("display-error", error);
    }else{
	userConnected(socket.client.id);
	createRoom(roomId, socket.client.id);
	socket.roomId = roomId;
	socket.emit("room-created", roomId);
	socket.emit("player-1-connected");
	socket.join(roomId);
	room = roomId; */
	//console.log('room created ', roomId);
    //}
  })

  socket.on("set-name", nickname => {
	  if(usernameList.includes(nickname)){
		  socket.emit('invalid-name');
	  }else{
		socket.username = nickname;
		clients[nickname] = socket;
		usernameList.push(nickname);
		console.log(usernameList);
		//createRoom(socket.username);
		socket.join(socket.username);
		socket.roomId = socket.username;
		FullUpdate();
		console.log('Welcome ', socket.username);
		console.log('There are now ', _.size(clients), ' players online!');
		console.log(socket.rooms, " Room Info");
	  }
  });

  var SendLobbyList = function(){
    io.emit("lobby-list", []);
    console.log(_.keys(clients));
  }
  
  var FullUpdate = function(){
	  socket.emit("full-field", fields);
  }

  var UpdateKings = function(roomNum){
	  io.emit('clear-kings', roomNum);
	  console.log(fields[roomNum - 1].kings);
		  for(var j in fields[roomNum - 1].kings){
			  var newKing = fields[roomNum - 1].kings[j];
			io.emit("new-king-" + roomNum, newKing);
			console.log(newKing, " is now the king of room " + roomNum);
		  }
  }

  var UpdateChallengers = function(roomNum){
	  io.emit('clear-challengers', roomNum);
	  console.log(fields[roomNum - 1].challengers);
		for(var j in fields[roomNum - 1].challengers){
			  var newChallenger = fields[roomNum - 1].challengers[j];
			io.emit("new-challenger-" + roomNum, newChallenger);
			console.log(newChallenger, " is now the challenger of room " + roomNum);
		  }
  }
  
  var JoinRoomUpdate = function(roomNum){
	  if(fields[roomNum-1].kings != null){
		  for(var j in fields[roomNum - 1].kings){
			  var newKing = fields[roomNum - 1].kings[j];
			io.in("room"+roomNum).emit("room-info-kings", newKing);
			console.log(newKing, " is now the king of room " + roomNum);
		  }
	  }
	  if(fields[roomNum-1].challengers != null){
		  for(var j in fields[roomNum - 1].challengers){
			  var newChallenger = fields[roomNum - 1].challengers[j];
			  io.in("room"+roomNum).emit("room-info-challengers", newChallenger);
			  console.log(newChallenger, " info being shared");
		  }
	  }
  }

  
  socket.on('invite-player', invitedPlayer => {
	  if(socket.roomId != socket.username){
		  console.log("You are not the leader");
		  return;
	  }
    console.log(socket.username, " invited ", invitedPlayer);
   /*  if(!rooms[socket.username]){
      createRoom(socket.username);
      socket.join(socket.username);
      socket.roomId = socket.username;
    } */

    if(io.sockets.adapter.rooms[socket.username].length >= 3){
      console.log("Room is full invite not sent!")
      return;
    }
    
    console.log(io.sockets.adapter.rooms[socket.username].length);
	if(clients[invitedPlayer] != undefined){
		clients[invitedPlayer].emit('get-invited', socket.username);
	}
  })
  
  socket.on('accept-invite', inviteSender => {
    console.log(socket.username, " accepted ", inviteSender);
    socket.leave(socket.username);
    if(io.sockets.adapter.rooms[inviteSender].length >= 3){
      console.log("Could not join room. Room Full.");
      return;
    }
    var partyMembers = io.sockets.adapter.rooms[inviteSender].sockets;
    for(var member in partyMembers){
      var clientSocket = io.sockets.connected[member];
      console.log(socket.username, " + ",clientSocket.username); 
      clients[clientSocket.username].emit( 'join-party', socket.username);
      clients[socket.username].emit( 'join-party',  clientSocket.username);
    }
    socket.join(inviteSender);
    socket.roomId = inviteSender; 
  })

  socket.on('request-room', requestedRoom => {
	  console.log(socket.username, " wants to join room " + requestedRoom);
	  var roomName = "room"+requestedRoom;
      var partyMembers = io.sockets.adapter.rooms[socket.username].sockets;
      for(var member in partyMembers){
        var clientSocket = io.sockets.connected[member];
		clientSocket.join(roomName);
		io.to(clientSocket.username).emit('reveal-table');
      //socket.join(requestedRoom);
	  }
	if(fields[requestedRoom - 1].kings.length === 0){
		for(var j in partyMembers){
			const clientSocket = io.sockets.connected[j];
			fields[requestedRoom - 1].kings.push(clientSocket.username);
		}
		console.log(fields[requestedRoom - 1].kings, " List of Kings"); 
		UpdateKings(requestedRoom);
	}else if(fields[requestedRoom - 1].challengers.length === 0){
		for(var j in partyMembers){
			const clientSocket = io.sockets.connected[j];
			fields[requestedRoom - 1].challengers.push(clientSocket.username);
		}
		console.log(fields[requestedRoom - 1].challengers, " List of challengers"); 
		UpdateChallengers(requestedRoom);
	}else{
		fields[requestedRoom - 1].queue.push(socket.username);
		for(let i = 0; i < fields[requestedRoom - 1].queue.length; i++){
			io.to(fields[requestedRoom - 1].queue[i]).emit('update-queue', i);
		}
	}
	//io.in(socket.username).emit('room-info', fields[requestedRoom - 1]);
	clients[socket.username].emit('join-room', roomName);
	JoinRoomUpdate(requestedRoom);
  })

  socket.on('king-win', matchRoom => {
	  console.log("King Win happened");
	  var roomName = "room"+matchRoom;
	  fields[matchRoom - 1].kingWins++;
	  if(fields[matchRoom - 1].kingWins == 2 && fields[matchRoom - 1].challengerWins == 0){
		  io.emit('kingWin', roomName);
		  fields[matchRoom - 1].kingWins = 0;
		  fields[matchRoom - 1].streak++;
		  io.emit('update-'+matchRoom+'-streak', fields[matchRoom - 1].streak);
		  console.log(fields[matchRoom - 1].challengers, " This is the list before we grab the first index");
			var challenger = fields[matchRoom - 1].challengers[0];
			io.to(challenger).emit('leave-room');
		  if(fields[matchRoom - 1].queue.length > 0){
			  var nextChallenger = fields[matchRoom - 1].queue.shift();
			  var partyMembers = io.sockets.adapter.rooms[nextChallenger].sockets;
			  fields[matchRoom - 1].challengers = [];
			  for(var j in partyMembers){
				const clientSocket = io.sockets.connected[j];
				fields[matchRoom - 1].challengers.push(clientSocket.username);
			}
			console.log(fields[matchRoom - 1].challengers, " List of challengers"); 
			UpdateChallengers(matchRoom);
			  /* fields[matchRoom - 1].challengers.push(fields[matchRoom - 1].queue.shift());
			  for(let i = 0; i < fields[matchRoom - 1].queue.length; i++){
				  io.to(fields[matchRoom - 1].queue[i]).emit('update-queue', i);
			  } */
		  }else{
			  fields[matchRoom - 1].challengers = [];
		  }
		  UpdateChallengers(matchRoom);
	  }else if(fields[matchRoom - 1].kingWins >= 3){
		  io.emit('king-win', roomName);
		  fields[matchRoom - 1].kingWins = 0;
		  fields[matchRoom - 1].challengerWins = 0;
		  fields[matchRoom - 1].streak++;
		  io.emit('update-'+matchRoom+'-streak', fields[matchRoom - 1].streak);
			var challenger = fields[matchRoom - 1].challengers[0];
			io.to(challenger).emit('leave-room');
		  if(fields[matchRoom - 1].queue.length > 0){
			  var nextChallenger = fields[matchRoom - 1].queue.shift();
			  var partyMembers = io.sockets.adapter.rooms[nextChallenger].sockets;
			  fields[matchRoom - 1].challengers = [];
			  for(var j in partyMembers){
				const clientSocket = io.sockets.connected[j];
				fields[matchRoom - 1].challengers.push(clientSocket.username);
			}
			console.log(fields[matchRoom - 1].challengers, " List of challengers"); 
			UpdateChallengers(matchRoom);
		  }else{
			  fields[matchRoom - 1].challengers = [];
		  }
		  UpdateChallengers(matchRoom);
	  }else if(fields[matchRoom - 1].kingWins == fields[matchRoom - 1].challengerWins){
		  io.in("room"+matchRoom).emit('enable-buttons');
	  }
    
  });
  
  socket.on('challenger-win', matchRoom => {
	  console.log("Challenger Win happened");
	  var roomName = "room"+matchRoom;
	  fields[matchRoom - 1].challengerWins++;
	  if(fields[matchRoom - 1].challengerWins == 2 && fields[matchRoom - 1].kingWins == 0){
		  io.emit('challengerWin', roomName);
		  fields[matchRoom - 1].challengerWins = 0;
		  fields[matchRoom - 1].streak = 1;
		  io.emit('update-'+matchRoom+'-streak', fields[matchRoom - 1].streak);
			var king = fields[matchRoom - 1].kings[0];
			io.to(king).emit('leave-room');
		  fields[matchRoom - 1].kings = fields[matchRoom - 1].challengers;
		  if(fields[matchRoom - 1].queue.length > 0){
			  var nextChallenger = fields[matchRoom - 1].queue.shift();
			  var partyMembers = io.sockets.adapter.rooms[nextChallenger].sockets;
			  fields[matchRoom - 1].challengers = [];
			  for(var j in partyMembers){
				const clientSocket = io.sockets.connected[j];
				fields[matchRoom - 1].challengers.push(clientSocket.username);
			}
			console.log(fields[matchRoom - 1].challengers, " List of challengers"); 
			UpdateChallengers(matchRoom);
		  }else{
			  fields[matchRoom - 1].challengers = [];
		  }
		  UpdateKings(matchRoom);
		  UpdateChallengers(matchRoom);
	  }else if(fields[matchRoom - 1].challengerWins >= 3){
		  io.emit('challenger-win', 'room'+matchRoom);
		  fields[matchRoom - 1].challengerWins = 0;
		  fields[matchRoom - 1].kingWins = 0;
		  fields[matchRoom - 1].streak++;
		  io.emit('update-'+matchRoom+'-streak', fields[matchRoom - 1].streak);
			var king = fields[matchRoom - 1].kings[0];
			io.to(king).emit('leave-room');
		  fields[matchRoom - 1].kings = fields[matchRoom - 1].challengers;
		  if(fields[matchRoom - 1].queue.length > 0){
			  var nextChallenger = fields[matchRoom - 1].queue.shift();
			  var partyMembers = io.sockets.adapter.rooms[nextChallenger].sockets;
			  fields[matchRoom - 1].challengers = [];
			  for(var j in partyMembers){
				const clientSocket = io.sockets.connected[j];
				fields[matchRoom - 1].challengers.push(clientSocket.username);
			}
			console.log(fields[matchRoom - 1].challengers, " List of challengers"); 
			UpdateChallengers(matchRoom);
		  }else{
			  fields[matchRoom - 1].challengers = [];
		  }
		  UpdateKings(matchRoom);
		  UpdateChallengers(matchRoom);
	  }else if(fields[matchRoom - 1].kingWins == fields[matchRoom - 1].challengerWins){
		  io.in("room"+matchRoom).emit('enable-buttons');
	  }
	  
    
  });
  
  socket.on('disconnect', () => {
	  //return; 
	  for(var j in fields){
		  var field = fields[j];
		if(field.queue.indexOf(socket.username) !== -1){
			var index = field.queue.indexOf(socket.username);
			field.queue.splice(index, 1);
			for(let i = 0; i < field.queue.length; i++){
				io.to(field.queue[i]).emit('update-queue', i);
			}
		}else if(field.challengers.indexOf(socket.username) !== -1){
			field.kingWins = 3;
			io.to(field.kings[0]).emit('free-win');
		}else if(field.kings.indexOf(socket.username) !==-1){
			if(field.challengers.length > 0){
				field.challengerWins = 3;
				io.to(field.challengers[0]).emit('free-win');
			}else{
				field.kings = [];
				field.streak = 0;
				UpdateKings(j + 1);
			}
		}
	  }
	delete clients[socket.username];
	var namePos = usernameList.indexOf(socket.username);
	usernameList.splice(namePos, 1);
	//delete usernameList[socket.username];
	
    console.log(socket.username, ' disconnected');
  });
  socket.on('party chat message', (msg) => {
    console.log("Chat started");
    var finalMessage = "";
    finalMessage = (socket.username + ': '+ msg);
    io.to(socket.roomId).emit('chat message', finalMessage);
  });
  socket.on('room1 chat message', (msg) => {
    console.log("Chat started");
    var finalMessage = "";
    finalMessage = (socket.username + ': '+ msg);
    io.to('room1').emit('chat message', finalMessage);
  });
  socket.on('room2 chat message', (msg) => {
    console.log("Chat started");
    var finalMessage = "";
    finalMessage = (socket.username + ': '+ msg);
    io.to('room2').emit('chat message', finalMessage);
  });
  socket.on('room3 chat message', (msg) => {
    console.log("Chat started");
    var finalMessage = "";
    finalMessage = (socket.username + ': '+ msg);
    io.to('room3').emit('chat message', finalMessage);
  });
  socket.on('room4 chat message', (msg) => {
    console.log("Chat started");
    var finalMessage = "";
    finalMessage = (socket.username + ': '+ msg);
    io.to('room4').emit('chat message', finalMessage);
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log('listening on *:80');
  //console.log(process.env.PORT);
});