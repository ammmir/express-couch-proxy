/**
 * CouchDB Proxy middleware for Express
 *
 * @author Amir Malik
 */

var express = require('express'),
      https = require('https'),
       http = require('http'),
    mod_url = require('url');

var utils = require('./utils');

module.exports = function(options, cb) {
  var app = express();
  
  // parse credentials from Authorization header into req.remote_*
  app.use(function(req, res, next) {
    var creds = utils.authorization(req.headers['authorization']);
    
    if(!creds)
      return utils.unauthorized(res, options.realm);
    
    req.remote_user = creds[0];
    req.remote_pass = creds[1];
    
    next();
  });
  
  // CouchDB replication base endpoint
  app.all('/:db/*', function(req, res) {
    req.pause();
    
    cb(req.params.db, req.remote_user, req.remote_pass, function(err, url) {
      if(err)
        return utils.unauthorized(res, options.realm, err.message);
      
      var remoteHeaders = {};
      for(var header in req.headers) {
        if(req.headers.hasOwnProperty(header)) {
          remoteHeaders[header] = req.headers[header];
        }
      }
      
      delete remoteHeaders['authorization'];
      delete remoteHeaders['host'];
      
      var remoteURL = mod_url.parse(url);
      remoteURL.path += req.url.slice(req.params.db.length + 1);
      
      var request = 'https:' == remoteURL.protocol ? https.request : http.request;
      
      var remoteReq = request({
        method: req.method,
        hostname: remoteURL.hostname,
        port: remoteURL.port || ('https:' == remoteURL.protocol ? 443 : 80),
        path: remoteURL.path,
        headers: remoteHeaders,
        auth: remoteURL.auth,
      }, function(remoteRes) {
        // node's HTTP parser has already parsed any chunked encoding
        delete remoteRes.headers['transfer-encoding'];
        
        remoteRes.headers['content-type'] ? null : (remoteRes.headers['content-type'] = 'application/json');    
        // CouchDB replication fails unless we use a properly-cased header
        remoteRes.headers['Content-Type'] = remoteRes.headers['content-type'];
        delete remoteRes.headers['content-type'];
        
        res.writeHead(remoteRes.statusCode, remoteRes.headers);
        remoteRes.pipe(res);
      });
      
      remoteReq.on('error', function(err) {
        res.json(503, {error: 'db_unavailable', reason: err.syscall + ' ' + err.errno});
      });
      
      req.setEncoding('utf8');
      req.resume();
      req.pipe(remoteReq);
    });
  });
  
  return app;
};
