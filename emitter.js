var app = require('express')()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server);

server.listen(3002);

var online_users  = [],
    online_names  = {},
    messages      = [],
    online_count  = 0;

io.sockets.on('connection', function (socket) {
  online_count++;

  if (messages.length) {
    for (var i in messages) {
      socket.emit('message', messages[i]);
    }
  }

  var online = false;
  for (var i in online_users) {
    if (online_users[i] === socket.id) {
      online = true;
    }        
  }  

  if (online === false) {
    online_users.push(socket.id);
    online_names[socket.id] = socket.id;

    set_online(socket);

    // Check for name
    var name = null;
    var cookies = (socket.handshake.headers.cookie + "").split('; ')   
    for (var i in cookies) {
      var cookie  = cookies[i].split('='),
          cname    = cookie[0],
          value   = cookie[1];

      if (cname === 'nickname') {
        name = value;
        online_names[socket.id] = value;
      }       
    }

    if (typeof(name) === undefined || name === null) {
      system_message([socket.id, "has come online"].join(" "));
    } else {
      system_message([name, "has come online"].join(" "));
    }    
  }

  socket.on('send_message', function (data) { 
    if (data.message === '/clear') {
      messages = [];

      io.sockets.emit('clear_messages');
      system_message(['Messages have been cleared by', online_names[socket.id]].join(" "));

      return true;
    }

    socket.get('name', function(error, name) {      
      data.name = name;
    });

    if (messages.length > 1500) {
      message.shift();
    }

    messages.push({
      name: (data.name || this.id),
      message: data.message,
      date: +new Date()
    });

    io.sockets.emit('message', {
      name: (data.name || this.id),
      message: data.message,
      date: +new Date()
    });    
  });

  socket.on('set name', function(data) {
    if (typeof(data.name) !== 'undefined' && data.name.toLowerCase() === 'system') {
      return false;
    }

    socket.set('name', data.name);
    var old_name = online_names[socket.id] || socket.id;
    online_names[socket.id] = data.name;

    if (typeof(data.cookie) === 'undefined') {
      system_message([old_name, "is now", data.name].join(" "));
    }

    set_online(socket);
  });

  socket.on('disconnect', function() {
    online_count--;

    var name = online_names[socket.id] || socket.id;

    delete online_names[socket.id];    

    set_online(socket);
    system_message([socket.id, 'disconnected'].join(" "));
  });
});

var set_online = function(socket) {
  io.sockets.emit('online', {
    online: online_names,
    count: online_count,
    new_user: online_names[socket.id]
  });
},

system_message = function(message) {
  if (messages.length > 1500) {
    message.shift();
  }

  messages.push({
    name: 'SYSTEM',
    message: message,
    date: +new Date()
  });

  io.sockets.emit('message', {
    name: 'SYSTEM', 
    message: message,
    date: +new Date()
  });
}