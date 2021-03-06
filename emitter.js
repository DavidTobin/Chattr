var app = require('express')()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server)
  , sleep = require('sleep')
  , marked = require('marked');

server.listen(3003);

var online_users  = [],
    online_names  = {},
    avatars       = {},
    messages      = [],
    online_count  = 0,
    new_user      = null;

io.sockets.on('connection', function (socket) {
  online_count++;

  // Send current messages to client on connect
  if (messages.length) {
    for (var i in messages) {
      socket.emit('message', messages[i]);
    }
  }
  
  // Set default name
  online_names[socket.id] = socket.id;  

  // Check for name
  var name = null;
  var cookies = (socket.handshake.headers.cookie + "").split('; ')   
  for (var i in cookies) {
    var cookie  = cookies[i].split('='),
        cname    = cookie[0],
        value   = cookie[1];

    if (cname === '3003_nickname') {
      name = value;
      online_names[socket.id] = value;
    }       
  }

  if (typeof(name) === undefined || name === null) {
    system_message([socket.id, "has come online"].join(" "));

    new_user = socket.id;
  } else {
    system_message([name, "has come online"].join(" "));

    new_user = name;
  }    

  set_online(socket);

  socket.on('send_message', function (data) {    
    if (data.message[0] === '/') {
      process_command(data, socket);

      return true;
    }

    data.message = marked(data.message);

    socket.get('name', function(error, name) {      
      data.name = name;
    });    

    add_message({
      name: (data.name || this.id),
      message: data.message
    });    
  });

  socket.on('type', function(data) {
    io.sockets.emit('typing', {
      name: (online_names[socket.id] || socket.id)
    });
  });

  socket.on('set name', function(data) {
    if (typeof(data.name) !== 'undefined' && data.name.toLowerCase() === 'system') {
      show_error("SYSTEM is a forbidden name.", socket);

      return false;
    }

    if (typeof(data.name) === 'undefined' || data.name.length < 3) {
      show_error("Your name must be at least 3 characters.");

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
    new_user: new_user,
    avatars: avatars
  });

  new_user = null;
},

show_error = function(message, socket) {
  socket.emit('show error', {
    message: message
  });
},

system_message = function(message) {
  add_message({  
    name: 'SYSTEM', 
    message: message    
  });
},

add_message = function(settings) {  
  if (typeof(settings.client) === 'undefined' || settings.client === false) {
    // Parse smilies
    settings.message = parse_smilies(settings.message);

    // Save messages
    if (messages.length > 1500) {
      message.shift();
    }

    messages.push({
      name: settings.name,
      message: settings.message,
      date: +new Date()
    });

    io.sockets.emit('message', {
      name: settings.name,
      message: settings.message,
      date: +new Date()
    });
  } else {
    if (typeof(settings.socket) !== 'undefined') {
      socket.emit('message', {
        name: settings.name,
        message: settings.message,
        date: +new Date()
      });
    }
  }
},

parse_smilies = function(message) {
  var smilies = {
    ">:/": "angry.png",
    "?:(": "confused.png",    
    ":p": "yuck.png",
    ":P": "yuck.png",
    ":D": "laugh.png",
    ":)": "smile.png",
    ":o": "gasp.png",
    ":O": "gasp.png",
    ":(": "frown.png",    
    ":/": "slant.png",
    ":|": "disheartened.png",
    "-_-": "ambivalent.png",
    ";(": "cry.png",      
    ";)": "naughty.png",
    "8-)": "nerd.png",
  };

  for (var i in smilies) {
    var i_esc = escapeHTML(i);

    message = message.replace(i_esc, ["<img src=\"./images/", smilies[i], "\" />"].join(""));
  }

  return message;
},

process_command = function(data, socket) {
  var commandmsg = data.message.split(" "),
      command  = commandmsg[0];

  commandmsg.shift();
  commandmsg.unshift(socket);

  // Remove "/"
  command = command.substring(1);

  if (command.length > 1) {
    if (typeof(commands[command + '_command']) !== 'undefined') {
      commands[command + '_command'].apply(commandmsg);
    }    
  }

    return true;  
},

entityMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': '&quot;',
  "'": '&#39;',
  "/": '&#x2F;'
},

escapeHTML = function(string) {
  return String(string).replace(/[&<>"'\/]/g, function (s) {
    return entityMap[s];
  });
};

var commands = {};

commands.clear_command = function() {
  messages = [];

  io.sockets.emit('clear_messages');
  system_message(['Messages have been cleared by', online_names[this[0].id]].join(" "));
},

commands.beep_command = function() {  
  if (+this[1] > 2500) {
    this[1] = 2500;
  }

  io.sockets.emit('beep', {
    duration: (+this[1] || 500),
    type: 2
  });      

  system_message('Beeeeeep.....');
}

commands.avatar_command = function() {
  if (typeof(this[1]) !== 'undefined') {
    avatars[online_names[this[0].id]] = ["http://avatars.io/facebook/", this[1]].join("");

    set_online(this[0]);    
  }
}