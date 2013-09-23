
/*
 * GET home page.
 */

var url = require('url');

exports.index = function(req, res){
  var host = "http://" + req.headers.host.replace(/\:([0-9]*)/g, "");

  res.render('index', { 
    title: 'Chattr',
    host: host
  });
};