function Chattr() {
  this.socket   = null;
  this.name     = null;
  this.messages = $('.messages > ul');
  this.ctx      = null;
  this.typing   = null;
  this.isTyping = false;

  this.init = function() {  
    var _this = this;

    this.socket = io.connect(["http://", window.location.hostname, ":3003"].join(""));

    // Create audio if we can
    if (typeof(window.audioContext) !== 'undefined' || typeof(window.webkitAudioContext) !== 'undefined') {
      _this.ctx = new(window.audioContext || window.webkitAudioContext);
    }

    // Check if we have a name
    var nickname = this.get_cookie('nickname');

    if (nickname.length) {
      _this.name = nickname;

      socket.emit('set name', {
        name: nickname,
        cookie: true
      });
    }

    $('#set-name').submit(function() {
      _this.name = $(".login-as input").val();

      $(".login-as input").val("")

      socket.emit('set name', {
        name: _this.name
      });

      if (_this.name.toLowerCase() !== 'system') {      
        _this.set_cookie({
          name: 'nickname',
          value: _this.name,
          expires: (60 * 60 * 24)
        });
      }

      return false;
    });

    $('.login-as > button').click(function() {
      $('#set-name').submit();
    });

    $('#send-message').submit(function() {
      var message = $(this).serializeArray();      
      message = message[0].value;
      
      if (message.length) {
        socket.emit('send_message', {
          message: message
        });

        $($(this).find('input')[0]).val("");
      }

      return false;
    });

    $('.message-input input').keyup(function() {
      if (_this.isTyping === false) {
       socket.emit('type', {});
      }

      _this.isTyping = true;
    });

    socket.on('message', function(data) {  
      if (data.name !== _this.name && data.name.toLowerCase() !== 'system') { 
        _this.beep(50, 2);
      }

      if (typeof(data.message) !== 'undefined') {
        _this.messages.append([
          '<li class="' + data.name.toLowerCase() + '">',
          '<strong class="time">',          
          moment(data.date).format("HH:mma"),
          '</strong> <strong>',
          data.name,          
          ':</strong> ',
          data.message,
          '</li>'
        ].join(""));

        _this.messages.animate({
          scrollTop: _this.messages[0].scrollHeight
        }, 20);
      }
    });

    socket.on('online', function(data) {      
      $('.online-users > ul').empty();
      
      for (var i in data.online) {        
        data.avatar = data.avatar !== null ? ['<img src="', data.avatar, '" class="avatar" />'].join("") : "";        

        $('.online-users > ul').append([
          '<li>',
          data.avatar,
          '<span id="' + data.online[i] + '">',
          data.online[i],
          '</span>',
          '</li>'
        ].join(""));
      }      

      $('#online-count').html(['(', data.count, ')'].join(""));

      // New user
      if (typeof(data.new_user) !== 'undefined') {
        _this.show_alert([data.new_user, 'has come online!'].join(" "));
      }
    });

    socket.on('clear_messages', function() {
      $('.messages > ul').empty();
    });

    socket.on('beep', function(data) {      
      _this.beep(data.duration, data.type);
    });

    socket.on('show error', function(data) {
      $('.alert').addClass('error');

      _this.show_alert(data.message);      
    });

    socket.on('typing', function(data) {
      // Clear any timeout
      if (typeof(_this.typing) !== 'null') {
        clearTimeout(_this.typing);

        _this.typing = null;
      }

      if (data.name !== _this.name) {
        $('.messages-info').html([data.name, "is typing..."].join(" "));
      }

      _this.typing = window.setTimeout(function() {        
        $('.messages-info').html(" ");
        _this.isTyping = false;
      }, 2000);
    });
  }

  this.set_cookie = function(settings) {
    if (typeof(settings) === 'undefined') return false;

    var expires = +new Date() + settings.expires;

    settings.name = [window.location.port, settings.name].join("_");

    document.cookie = settings.name + "=" + settings.value + ";expires=" + expires + "; path=/";
  }

  this.get_cookie = function(c_name) {
    c_name = [window.location.port, c_name].join("_");

    if (document.cookie.length > 0) {
      var c_start, c_end;

      c_start = document.cookie.indexOf(c_name + "=");

      if (c_start != -1) {
        c_start = c_start + c_name.length + 1;
        c_end = document.cookie.indexOf(";", c_start);

        if (c_end == -1) {
          c_end = document.cookie.length;
        }

        return unescape(document.cookie.substring(c_start, c_end));
      }
    }

    return "";
  },

  this.beep = function (duration, type, finishedCallback) { 
    var _this = this;

    duration = +duration;

    // Only 0-4 are valid types.
    type = (type % 5) || 0;

    if (typeof finishedCallback != "function") {
        finishedCallback = function () {};
    }

    var osc = _this.ctx.createOscillator();

    osc.type = type;

    osc.connect(_this.ctx.destination);
    osc.noteOn(0);

    setTimeout(function () {
        osc.noteOff(0);
        finishedCallback();
    }, duration);    
  }

  this.show_alert = function(alert) {
    $('.alert').html(alert);

    $('.alert').animate({
      height: '34px',
      opacity: 1
    }, 500, function() {
      window.setTimeout(function() {
        $('.alert').html("");

        $('.alert').animate({
          height: '0px',
          opacity: 0
        }, 500, function() {
          $('.alert').removeClass('error');
        });        
      }, 2500);      
    });
  }

  this.init();
}

$(document).ready(function() {
  Chattr();
});