const express = require('express');
const app = express();
app.use(express.static(__dirname));
const http = require('http');
var _ = require('underscore');
const server = http.createServer(app);
const io = require('socket.io')(server,{
    //path: "/socket.io",
    //pingInterval: 10 * 1000,
    //pingTimeout: 5000,
    //transports: ["websocket"],
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
    socket.username = nickname;
    clients[nickname] = socket;
	createRoom(socket.username);
	socket.join(socket.username);
	socket.roomId = socket.username;
	FullUpdate();
    console.log('Welcome ', socket.username);
    console.log('There are now ', _.size(clients), ' players online!');
  })

  var SendLobbyList = function(){
    io.emit("lobby-list", []);
    console.log(_.keys(clients));
  }
  
  var FullUpdate = function(){
	  socket.emit("full-field", fields);
	  /*
	  UpdateChallengers(1);
	  UpdateChallengers(2);
	  UpdateChallengers(3);
	  UpdateChallengers(4);
	  UpdateKings(1);
	  UpdateKings(2);
	  UpdateKings(3);
	  UpdateKings(4);
	  clients[socket.username].emit('update-1-streak',  fields[0].streak);
	  clients[socket.username].emit('update-2-streak',  fields[1].streak);
	  clients[socket.username].emit('update-3-streak',  fields[2].streak);
	  clients[socket.username].emit('update-4-streak',  fields[3].streak);
	  */
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
    console.log(socket.username, " wants to join ", requestedRoom);
    //var partyMembers = io.sockets.adapter.rooms[socket.username].sockets;
    //for(var member in partyMembers){
    //  var clientSocket = io.sockets.connected[member];
      socket.join(requestedRoom);
    //}
    if(requestedRoom == "room1"){
      if(fields[0].king == ""){
	fields[0].king = socket.username;
	UpdateKings(1);
      }else if(fields[0].challenger == ""){
	fields[0].challenger = socket.username;
	UpdateChallengers(1);
      }else{
      fields[0].queue.push(socket.username);
      console.log(fields[0].queue);
      }
    }else if(requestedRoom == "room2"){
      if(fields[1].king == ""){
	fields[1].king = socket.username;
	UpdateKings(2);
      }else if(fields[1].challenger == ""){
	fields[1].challenger = socket.username;
	UpdateChallengers(2);
      }else{
      fields[1].queue.push(socket.username);
      console.log(fields[1].queue);
      }
    }else if (requestedRoom == "room3"){
      if(fields[2].king == ""){
	fields[2].king = socket.username;
	UpdateKings(3);
      }else if(fields[2].challenger == ""){
	fields[2].challenger = socket.username;
	UpdateChallengers(3);
      }else{
      fields[2].queue.push(socket.username);
      console.log(fields[2].queue);
      }
    }else{
      if(fields[3].king == ""){
	fields[3].king = socket.username;
	UpdateKings(4);
      }else if(fields[3].challenger == ""){
	fields[3].challenger = socket.username;
	UpdateChallengers(4);
      }else{
      fields[3].queue.push(socket.username);
      console.log(fields[3].queue);
      }
    }
	clients[socket.username].emit('join-room', requestedRoom);
    //io.to(socket.username).emit( 'join-room',  requestedRoom);
  })

  socket.on('king-win', matchRoom => {
	  console.log("King Win happened");
    if(matchRoom == "room1"){
      fields[0].kingWins++;
      if(fields[0].kingWins == 2 && fields[0].challengerWins == 0){
		io.emit('king-win',  matchRoom);
		fields[0].kingWins = 0;
		fields[0].streak++;
		io.emit('update-1-streak',  fields[0].streak);
		//clients[fields[0].challenger].emit('leave-room');
		//var clientSocket = io.sockets.connected[fields[0].challenger];
		//clientSocket.leave(matchRoom);
		io.to(fields[0].challenger).emit( 'leave-room');
		var partyMembers = io.sockets.adapter.rooms[fields[0].challenger].sockets;
		for(var member in partyMembers){
			var clientSocket = io.sockets.connected[member];
		
		}
		if(fields[0].queue.length > 0){
			fields[0].challenger = fields[0].queue.shift();
		}else{
			fields[0].challenger = "";
		}
		UpdateChallengers(1);
      }else if(fields[0].kingWins >= 3){
		io.emit('king-win',  matchRoom);
		fields[0].kingWins = 0;
		fields[0].challengerWins = 0;
		fields[0].streak++;
		io.emit('update-1-streak',  fields[0].streak);
		
		io.to(fields[0].challenger).emit( 'leave-room');
		console.log(io.sockets.adapter.rooms[fields[0].challenger]);
		if(io.sockets.adapter.rooms[fields[0].challenger] != undefined){
			var partyMembers = io.sockets.adapter.rooms[fields[0].challenger].sockets;
			for(var member in partyMembers){
				var clientSocket = io.sockets.connected[member];
				clientSocket.leave(matchRoom);
			}
		}
		if(fields[0].queue.length > 0){
			fields[0].challenger = fields[0].queue.shift();
		}else{
			fields[0].challenger = "";
		}
		UpdateChallengers(1);
	  }else if(fields[0].kingWins == fields[0].challengerWins){
		  io.to("room1").emit( 'enable-buttons');
	  }
    }else if(matchRoom == "room2"){
		fields[1].kingWins++;
		if(fields[1].kingWins == 2 && fields[1].challengerWins == 0){
			io.emit('king-win',  matchRoom);
			fields[1].kingWins = 0;
			fields[1].streak++;
			io.emit('update-2-streak',  fields[1].streak);
			
			io.to(fields[1].challenger).emit( 'leave-room');
		var partyMembers = io.sockets.adapter.rooms[fields[1].challenger].sockets;
		for(var member in partyMembers){
			var clientSocket = io.sockets.connected[member];
			clientSocket.leave(matchRoom);
		}
		if(fields[1].queue.length > 0){
			fields[1].challenger = fields[1].queue.shift();
		}else{
			fields[1].challenger = "";
		}
			UpdateChallengers(2);
		}else if(fields[1].kingWins >= 3){
			io.emit('king-win',  matchRoom);
			fields[1].kingWins = 0;
			fields[1].challengerWins = 0;
			fields[1].streak++;
			io.emit('update-2-streak',  fields[1].streak);
			
			io.to(fields[1].challenger).emit( 'leave-room');
			if(io.sockets.adapter.rooms[fields[2].challenger] != undefined){
		var partyMembers = io.sockets.adapter.rooms[fields[1].challenger].sockets;
		for(var member in partyMembers){
			var clientSocket = io.sockets.connected[member];
			clientSocket.leave(matchRoom);
		}
			}
		if(fields[1].queue.length > 0){
			fields[1].challenger = fields[1].queue.shift();
		}else{
			fields[1].challenger = "";
		}
			UpdateChallengers(2);
		}else if(fields[1].kingWins == fields[1].challengerWins){
		  io.to("room2").emit( 'enable-buttons');
	  }
	}else if (matchRoom == "room3"){
		fields[2].kingWins++;
		if(fields[2].kingWins == 2 && fields[2].challengerWins == 0){
			io.emit('king-win',  matchRoom);
			fields[2].kingWins = 0;
			fields[2].streak++;
			io.emit('update-3-streak',  fields[2].streak);
			
			io.to(fields[2].challenger).emit( 'leave-room');
			if(io.sockets.adapter.rooms[fields[2].challenger] != undefined){
		var partyMembers = io.sockets.adapter.rooms[fields[2].challenger].sockets;
		for(var member in partyMembers){
			var clientSocket = io.sockets.connected[member];
			clientSocket.leave(matchRoom);
		}
			}
		if(fields[2].queue.length > 0){
			fields[2].challenger = fields[2].queue.shift();
		}else{
			fields[2].challenger = "";
		}
			UpdateChallengers(3);
		}else if(fields[2].kingWins >= 3){
			io.emit('king-win',  matchRoom);
			fields[2].kingWins = 0;
			fields[2].challengerWins = 0;
			fields[2].streak++;
			io.emit('update-3-streak',  fields[2].streak);
			
			io.to(fields[2].challenger).emit( 'leave-room');
			if(io.sockets.adapter.rooms[fields[2].challenger] != undefined){
		var partyMembers = io.sockets.adapter.rooms[fields[2].challenger].sockets;
		for(var member in partyMembers){
			var clientSocket = io.sockets.connected[member];
			clientSocket.leave(matchRoom);
		}
			}
		if(fields[2].queue.length > 0){
			fields[2].challenger = fields[2].queue.shift();
		}else{
			fields[2].challenger = "";
		}
			UpdateChallengers(3);
		}else if(fields[2].kingWins == fields[2].challengerWins){
		  io.to("room3").emit( 'enable-buttons');
	  }
	}else{
		fields[3].kingWins++;
		if(fields[3].kingWins == 2 && fields[3].challengerWins == 0){
			io.emit('king-win',  matchRoom);
			fields[3].kingWins = 0;
			fields[3].streak++;
			io.emit('update-4-streak',  fields[3].streak);
			
			io.to(fields[3].challenger).emit( 'leave-room');
			if(io.sockets.adapter.rooms[fields[3].challenger] != undefined){
		var partyMembers = io.sockets.adapter.rooms[fields[3].challenger].sockets;
		for(var member in partyMembers){
			var clientSocket = io.sockets.connected[member];
			clientSocket.leave(matchRoom);
		}
			}
		if(fields[3].queue.length > 0){
			fields[3].challenger = fields[3].queue.shift();
		}else{
			fields[3].challenger = "";
		}
			UpdateChallengers(4);
		}else if(fields[3].kingWins >= 3){
			io.emit('king-win',  matchRoom);
			fields[3].kingWins = 0;
			fields[3].challengerWins = 0;
			fields[3].streak++;
			io.emit('update-4-streak',  fields[3].streak);
			
			io.to(fields[3].challenger).emit( 'leave-room');
			if(io.sockets.adapter.rooms[fields[3].challenger] != undefined){
		var partyMembers = io.sockets.adapter.rooms[fields[3].challenger].sockets;
		for(var member in partyMembers){
			var clientSocket = io.sockets.connected[member];
			clientSocket.leave(matchRoom);
		}
			}
		if(fields[3].queue.length > 0){
			fields[3].challenger = fields[3].queue.shift();
		}else{
			fields[3].challenger = "";
		}
			UpdateChallengers(4);
		}else if(fields[3].kingWins == fields[3].challengerWins){
		  io.to("room4").emit( 'enable-buttons');
	  }
	}
  });
  
  socket.on('challenger-win', matchRoom => {
	  console.log("Challenger Win happened");
    if(matchRoom == "room1"){
      fields[0].challengerWins++;
	  console.log(fields[0].challenger);
      if(fields[0].challengerWins == 2 && fields[0].kingWins == 0){
		io.emit('challenger-win',  matchRoom);
		fields[0].challengerWins = 0;
		fields[0].streak = 1;
		io.emit('update-1-streak',  fields[0].streak);
		//clients[fields[0].king].emit('leave-room');
		io.to(fields[0].king).emit( 'leave-room');
		var partyMembers = io.sockets.adapter.rooms[fields[0].king].sockets;
		for(var member in partyMembers){
			var clientSocket = io.sockets.connected[member];
			clientSocket.leave(matchRoom);
		}
		fields[0].king = fields[0].challenger;
		if(fields[0].queue.length > 0){
			fields[0].challenger = fields[0].queue.shift();
		}else{
			fields[0].challenger = "";
			console.log("No Challenger available");
		}
		UpdateChallengers(1);
		UpdateKings(1);
      }else if(fields[0].challengerWins >= 3){
		io.emit('challenger-win',  matchRoom);
		fields[0].challengerWins = 0;
		fields[0].kingWins = 0;
		fields[0].streak = 1;
		io.emit('update-1-streak',  fields[0].streak);
		
		io.to(fields[0].king).emit( 'leave-room');
		if(io.sockets.adapter.rooms[fields[0].king] != undefined){
			var partyMembers = io.sockets.adapter.rooms[fields[0].king].sockets;
			for(var member in partyMembers){
				var clientSocket = io.sockets.connected[member];
				clientSocket.leave(matchRoom);
			}
		}
		fields[0].king = fields[0].challenger;
		if(fields[0].queue.length > 0){
			fields[0].challenger = fields[0].queue.shift();
		}else{
			fields[0].challenger = "";
			console.log("No Challenger available");
		}
		UpdateChallengers(1);
		UpdateKings(1);
	  }
    }else if(matchRoom == "room2"){
		fields[1].challengerWins++;
      if(fields[1].challengerWins == 2 && fields[1].kingWins == 0){
		io.emit('challenger-win',  matchRoom);
		fields[1].challengerWins = 0;
		fields[1].streak = 1;
		io.emit('update-2-streak',  fields[1].streak);
		
		io.to(fields[1].king).emit( 'leave-room');
		var partyMembers = io.sockets.adapter.rooms[fields[1].king].sockets;
		for(var member in partyMembers){
			var clientSocket = io.sockets.connected[member];
			clientSocket.leave(matchRoom);
		}
		fields[1].king = fields[1].challenger;
		if(fields[1].queue.length > 0){
			fields[1].challenger = fields[1].queue.shift();
		}else{
			fields[1].challenger = "";
			console.log("No Challenger available");
		}
		UpdateChallengers(2);
		UpdateKings(2);
      }else if(fields[1].challengerWins >= 3){
		io.emit('challenger-win',  matchRoom);
		fields[1].challengerWins = 0;
		fields[1].kingWins = 0;
		fields[1].streak = 1;
		io.emit('update-2-streak',  fields[1].streak);
		
		io.to(fields[1].king).emit( 'leave-room');
		if(io.sockets.adapter.rooms[fields[1].king] != undefined){
		var partyMembers = io.sockets.adapter.rooms[fields[1].king].sockets;
		for(var member in partyMembers){
			var clientSocket = io.sockets.connected[member];
			clientSocket.leave(matchRoom);
		}
		}
		fields[1].king = fields[1].challenger;
		if(fields[1].queue.length > 0){
			fields[1].challenger = fields[1].queue.shift();
		}else{
			fields[1].challenger = "";
			console.log("No Challenger available");
		}
		UpdateChallengers(2);
		UpdateKings(2);
	  }
	}else if(matchRoom == "room3"){
		fields[2].challengerWins++;
      if(fields[2].challengerWins == 2 && fields[2].kingWins == 0){
		io.emit('challenger-win',  matchRoom);
		fields[2].challengerWins = 0;
		fields[2].streak = 1;
		io.emit('update-3-streak',  fields[2].streak);
		
		io.to(fields[2].king).emit( 'leave-room');
		if(io.sockets.adapter.rooms[fields[2].king] != undefined){
		var partyMembers = io.sockets.adapter.rooms[fields[2].king].sockets;
		for(var member in partyMembers){
			var clientSocket = io.sockets.connected[member];
			clientSocket.leave(matchRoom);
		}
		}
		fields[2].king = fields[2].challenger;
		if(fields[2].queue.length > 0){
			fields[2].challenger = fields[2].queue.shift();
		}else{
			fields[2].challenger = "";
			console.log("No Challenger available");
		}
		UpdateChallengers(3);
		UpdateKings(3);
      }else if(fields[2].challengerWins >= 3){
		io.emit('challenger-win',  matchRoom);
		fields[2].challengerWins = 0;
		fields[2].kingWins = 0;
		fields[2].streak = 1;
		io.emit('update-3-streak',  fields[2].streak);
		
		io.to(fields[2].king).emit( 'leave-room');
		if(io.sockets.adapter.rooms[fields[2].king] != undefined){
		var partyMembers = io.sockets.adapter.rooms[fields[2].king].sockets;
		for(var member in partyMembers){
			var clientSocket = io.sockets.connected[member];
			clientSocket.leave(matchRoom);
		}
		}
		fields[2].king = fields[2].challenger;
		if(fields[2].queue.length > 0){
			fields[2].challenger = fields[2].queue.shift();
		}else{
			fields[2].challenger = "";
			console.log("No Challenger available");
		}
		UpdateChallengers(3);
		UpdateKings(3);
	  }
	}else{
		fields[3].challengerWins++;
      if(fields[3].challengerWins == 2 && fields[3].kingWins == 0){
		io.emit('challenger-win',  matchRoom);
		fields[3].challengerWins = 0;
		fields[3].streak = 1;
		io.emit('update-4-streak',  fields[3].streak);
		
		io.to(fields[3].king).emit( 'leave-room');
		if(io.sockets.adapter.rooms[fields[3].king] != undefined){
		var partyMembers = io.sockets.adapter.rooms[fields[3].king].sockets;
		for(var member in partyMembers){
			var clientSocket = io.sockets.connected[member];
			clientSocket.leave(matchRoom);
		}
		}
		fields[3].king = fields[3].challenger;
		if(fields[3].queue.length > 0){
			fields[3].challenger = fields[3].queue.shift();
		}else{
			fields[3].challenger = "";
			console.log("No Challenger available");
		}
		UpdateChallengers(4);
		UpdateKings(4);
      }else if(fields[3].challengerWins >= 3){
		io.emit('challenger-win',  matchRoom);
		fields[3].challengerWins = 0;
		fields[3].kingWins = 0;
		fields[3].streak = 1;
		io.emit('update-4-streak',  fields[3].streak);
		
		io.to(fields[3].king).emit( 'leave-room');
		if(io.sockets.adapter.rooms[fields[3].king] != undefined){
		var partyMembers = io.sockets.adapter.rooms[fields[3].king].sockets;
		for(var member in partyMembers){
			var clientSocket = io.sockets.connected[member];
			clientSocket.leave(matchRoom);
		}
		}
		fields[3].king = fields[3].challenger;
		if(fields[3].queue.length > 0){
			fields[3].challenger = fields[3].queue.shift();
		}else{
			fields[3].challenger = "";
			console.log("No Challenger available");
		}
		UpdateChallengers(4);
		UpdateKings(4);
	  }
	}
  });
  
  socket.on('disconnect', () => {
	  console.log(fields[0].queue.includes(socket.username));
	  console.log(fields[0].queue[0], " + ", socket.username);
	  //console.log(fields[0].queue[socket.username]);
    if(fields[0].queue.includes(socket.username)){
		delete fields[0].queue[socket.username];
	}else if(fields[1].queue[socket.username]){
		delete fields[1].queue[socket.username];
	}else if (fields[2].queue[socket.username]){
		delete fields[2].queue[socket.username];
	}else if(fields[3].queue[socket.username]){
		delete fields[3].queue[socket.username];
	}
	else if(fields[0].challenger == socket.username){
		fields[0].kingWins = 3;
		io.to(fields[0].king).emit('free-win');
		//clients[fields[0].king].emit('free-win');
	}else if(fields[0].king == socket.username){
		if(fields[0].challenger != ""){
		fields[0].challengerWins = 3;
		io.to(fields[0].challenger).emit('free-win');
		//clients[fields[0].challenger].emit('free-win');
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