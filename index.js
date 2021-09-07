const express = require('express');
const app = express();
app.use(express.static(__dirname));
const http = require('http');
var _ = require('underscore');
const server = http.createServer(app);
const io = require('socket.io')(server,{
  });

var clients = {};

var fields = [{
  queue:[],
  streak:0,
  king:"",
  challenger:"",
  kingWins:0,
  challengerWins:0
},{
  queue:[],
  streak:0,
  king:"",
  challenger:"",
  kingWins:0,
  challengerWins:0
},{
  queue:[],
  streak:0,
  king:"",
  challenger:"",
  kingWins:0,
  challengerWins:0
},{
  queue:[],
  streak:0,
  king:"",
  challenger:"",
  kingWins:0,
  challengerWins:0
}]

let room = 0;
let player1Rdy = 0;
let player2Rdy = 0;

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const {userConnected, connectedUsers, initializeChoices, moves, makeMove, choices} = require("./util/users");
const {createRoom, joinRoom, exitRoom, rooms} = require("./util/rooms");

createRoom("room1");
createRoom("room2");
createRoom("room3");
createRoom("room4");

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.emit("full-field", fields);
  socket.on("create-room", (roomId) =>{
    if(rooms[roomId]){
	const error = "This room already exists";
	socket.emit("display-error", error);
    }else{
	userConnected(socket.client.id);
	createRoom(roomId, socket.client.id);
	socket.roomId = roomId;
	socket.emit("room-created", roomId);
	socket.emit("player-1-connected");
	socket.join(roomId);
	room = roomId;
	console.log('room created ', roomId);
    }
  })

  socket.on("set-name", nickname => {
	  if(rooms[nickname]){
		  socket.emit('invalid-name');
	  }else{
		socket.username = nickname;
		clients[nickname] = socket;
		createRoom(socket.username);
		socket.join(socket.username);
		socket.roomId = socket.username;
		FullUpdate();
		console.log('Welcome ', socket.username);
		console.log('There are now ', _.size(clients), ' players online!');
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
	  var roomKing = fields[roomNum-1].king;
	  if(roomKing != ""){
		  io.emit("new-king-" + roomNum, roomKing);
		  console.log(roomKing, " is now the king of room " + roomNum);
	  }
  }

  var UpdateChallengers = function(roomNum){
	  io.emit('clear-challengers', roomNum);
	var roomChallenger = fields[roomNum-1].challenger;
	if (roomChallenger != "") {
		io.emit("new-challenger-" + roomNum, roomChallenger);
		console.log(roomChallenger," is now the challenger of room " + roomNum);
	}
  }

  
  socket.on('invite-player', invitedPlayer => {
    console.log(socket.username, " invited ", invitedPlayer);
    if(!rooms[socket.username]){
      createRoom(socket.username);
      socket.join(socket.username);
      socket.roomId = socket.username;
    }

    if(io.sockets.adapter.rooms[socket.username].length >= 3){
      console.log("Room is full invite not sent!")
      return;
    }
    
    console.log(io.sockets.adapter.rooms[socket.username].length);
    clients[invitedPlayer].emit('get-invited', socket.username);
  })
  
  socket.on('accept-invite', inviteSender => {
    console.log(socket.username, " accepted ", inviteSender);
    if(rooms[socket.username]){
      socket.leave(socket.username);
    }
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
    //console.log(socket.username, " wants to join ", requestedRoom);
    //var partyMembers = io.sockets.adapter.rooms[socket.username].sockets;
    //for(var member in partyMembers){
    //  var clientSocket = io.sockets.connected[member];
	socket.join(roomName);
      //socket.join(requestedRoom);
    //}
	
	if(fields[requestedRoom-1].king == ""){
		fields[requestedRoom-1].king = socket.username;
		UpdateKings(requestedRoom);
	}else if(fields[requestedRoom-1].challenger == ""){
		fields[requestedRoom-1].challenger = socket.username;
		UpdateChallengers(requestedRoom);
	}else{
		fields[requestedRoom-1].queue.push(socket.username);
		for(let i = 0; i < fields[requestedRoom-1].queue.length; i++){
			io.to(fields[requestedRoom-1].queue[i]).emit('update-queue', i);
		}
	}
	clients[socket.username].emit('join-room', roomName);
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
		  io.to(fields[matchRoom - 1].challenger).emit('leave-room');
		  var partyMembers = io.sockets.adapter.rooms[fields[matchRoom - 1].challenger].sockets;
		  for(var member in partyMembers){
			  var clientSocket = io.sockets.connected[member];
			  console.log(clientSocket);
			  clientSocket.leave(roomName);
		  }
		  if(fields[matchRoom - 1].queue.length > 0){
			  fields[matchRoom - 1].challenger = fields[matchRoom - 1].queue.shift();
			  for(let i = 0; i < fields[matchRoom - 1].queue.length; i++){
				  io.to(fields[matchRoom - 1].queue[i]).emit('update-queue', i);
			  }
		  }else{
			  fields[matchRoom - 1].challenger = "";
		  }
		  UpdateChallengers(matchRoom);
	  }else if(fields[matchRoom - 1].kingWins >= 3){
		  io.emit('king-win', roomName);
		  fields[matchRoom - 1].kingWins = 0;
		  fields[matchRoom - 1].challengerWins = 0;
		  fields[matchRoom - 1].streak++;
		  io.emit('update-'+matchRoom+'-streak', fields[matchRoom - 1].streak);
		  io.to(fields[matchRoom - 1].challenger).emit('leave-room');
		  if(io.sockets.adapter.rooms[fields[matchRoom - 1].challenger] != undefined){
			  var partyMembers = io.sockets.adapter.rooms[fields[matchRoom - 1].challenger].sockets;
			  for(var member in partyMembers){
				  var clientSocket = io.sockets.connected[member];
				  clientSocket.leave(roomName);
			  }
		  }
		  if(fields[matchRoom - 1].queue.length > 0){
			  fields[matchRoom - 1].challenger = fields[matchRoom - 1].queue.shift();
			  for(let i = 0; i < fields[0].queue.length; i++){
				  io.to(fields[0].queue[i]).emit('update-queue', i);
			  }
		  }else{
			  fields[matchRoom - 1].challenger = "";
		  }
		  UpdateChallengers(matchRoom);
	  }else if(fields[matchRoom - 1].kingWins == fields[matchRoom - 1].challengerWins){
		  io.to(fields[matchRoom - 1].king).emit('enable-buttons');
		  io.to(fields[matchRoom - 1].challenger).emit('enable-buttons');
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
		  io.to(fields[matchRoom - 1].king).emit('leave-room');
		  var partyMembers = io.sockets.adapter.rooms[fields[matchRoom - 1].king].sockets;
		  for(var member in partyMembers){
			  var clientSocket = io.sockets.connected[member];
			  clientSocket.leave(roomName);
		  }
		  fields[matchRoom - 1].king = fields[matchRoom - 1].challenger;
		  if(fields[matchRoom - 1].queue.length > 0){
			  fields[matchRoom - 1].challenger = fields[matchRoom - 1].queue.shift();
			  for(let i = 0; i < fields[matchRoom - 1].queue.length; i++){
				  io.to(fields[matchRoom - 1].queue[i]).emit('update-queue', i);
			  }
		  }else{
			  fields[matchRoom - 1].challenger = "";
		  }
		  UpdateKings(matchRoom);
		  UpdateChallengers(matchRoom);
	  }else if(fields[matchRoom - 1].challengerWins >= 3){
		  io.emit('challenger-win', 'room'+matchRoom);
		  fields[matchRoom - 1].challengerWins = 0;
		  fields[matchRoom - 1].kingWins = 0;
		  fields[matchRoom - 1].streak++;
		  io.emit('update-'+matchRoom+'-streak', fields[matchRoom - 1].streak);
		  io.to(fields[matchRoom - 1].king).emit('leave-room');
		  if(io.sockets.adapter.rooms[fields[matchRoom - 1].king] != undefined){
			  var partyMembers = io.sockets.adapter.rooms[fields[matchRoom - 1].king].sockets;
			  for(var member in partyMembers){
				  var clientSocket = io.sockets.connected[member];
				  clientSocket.leave(roomName);
			  }
		  }
		  fields[matchRoom - 1].king = fields[matchRoom - 1].challenger;
		  if(fields[matchRoom - 1].queue.length > 0){
			  fields[matchRoom - 1].challenger = fields[matchRoom - 1].queue.shift();
			  for(let i = 0; i < fields[0].queue.length; i++){
				  io.to(fields[0].queue[i]).emit('update-queue', i);
			  }
		  }else{
			  fields[matchRoom - 1].challenger = "";
		  }
		  UpdateKings(matchRoom);
		  UpdateChallengers(matchRoom);
	  }else if(fields[matchRoom - 1].kingWins == fields[matchRoom - 1].challengerWins){
		  io.to(fields[matchRoom - 1].king).emit('enable-buttons');
		  io.to(fields[matchRoom - 1].challenger).emit('enable-buttons');
	  }
	  
    
  });
  
  socket.on('disconnect', () => {
    if(fields[0].queue.includes(socket.username)){
		var index = fields[0].queue.indexOf(socket.username);
		fields[0].queue.splice(index, 1);
		for(let i = 0; i < fields[0].queue.length; i++){
				io.to(fields[0].queue[i]).emit('update-queue', i);
			}
	}else if(fields[1].queue.includes(socket.username)){
		var index = fields[1].queue.indexOf(socket.username);
		fields[1].queue.splice(index, 1);
		for(let i = 0; i < fields[1].queue.length; i++){
				io.to(fields[1].queue[i]).emit('update-queue', i);
			}
	}else if (fields[2].queue.includes(socket.username)){
		var index = fields[0].queue.indexOf(socket.username);
		fields[2].queue.splice(index, 1);
		for(let i = 0; i < fields[2].queue.length; i++){
				io.to(fields[2].queue[i]).emit('update-queue', i);
			}
	}else if(fields[3].queue.includes(socket.username)){
		var index = fields[0].queue.indexOf(socket.username);
		fields[3].queue.splice(index, 1);
		for(let i = 0; i < fields[3].queue.length; i++){
				io.to(fields[3].queue[i]).emit('update-queue', i);
			}
	}
	else if(fields[0].challenger == socket.username){
		fields[0].kingWins = 3;
		io.to(fields[0].king).emit('free-win');
	}else if(fields[0].king == socket.username){
		if(fields[0].challenger != ""){
		fields[0].challengerWins = 3;
		io.to(fields[0].challenger).emit('free-win');
		}else{
			fields[0].king = "";
			fields[0].streak = 0;
			UpdateKings(1);
		}
	}else if(fields[1].challenger == socket.username){
		fields[1].kingWins = 3;
		io.to(fields[1].king).emit('free-win');
	}else if(fields[1].king == socket.username){
		if(fields[1].challenger != ""){
		fields[1].challengerWins = 3;
		io.to(fields[1].challenger).emit('free-win');
		}else{
			fields[1].king = "";
			fields[1].streak = 0;
			UpdateKings(2);
		}
	}else if(fields[2].challenger == socket.username){
		fields[2].kingWins = 3;
		io.to(fields[2].king).emit('free-win');
	}else if(fields[2].king == socket.username){
		if(fields[2].challenger != ""){
		fields[2].challengerWins = 3;
		io.to(fields[2].challenger).emit('free-win');
		}else{
		fields[2].king = "";
		fields[2].streak = 0;
		UpdateKings(3);
		}
	}else if(fields[3].challenger == socket.username){
		fields[3].kingWins = 3;
		io.to(fields[3].king).emit('free-win');
	}else if(fields[3].king == socket.username){
		if(fields[3].challenger != ""){
			fields[3].challengerWins = 3;
			io.to(fields[3].challenger).emit('free-win');
		}else{
			fields[3].king = "";
			fields[3].streak = 0;
			UpdateKings(4);
		}
	}
	delete clients[socket.username];
	if(rooms[socket.username]){
		delete rooms[socket.username];
	}
	
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
  console.log(process.env.PORT);
});