exports.authorization = function(authorization) {
  if(!authorization)
    return null;

  var parts = authorization.split(' ');

  if(parts.length != 2 || parts[0] != 'Basic')
    return null;

  var creds = new Buffer(parts[1], 'base64').toString(),
          i = creds.indexOf(':');

  if(i == -1)
    return null;

  var username = creds.slice(0, i);
      password = creds.slice(i + 1);

  return [username, password];
};

exports.unauthorized = function(res, realm, reason) {
  reason = reason || 'authentication required';
  
  res.statusCode = 401;
  res.setHeader('WWW-Authenticate', 'Basic realm="' + realm + '"');
  res.json({error: 'unauthorized', reason: reason});
}

exports.rawRequest = function(url, headers, req, data) {
  var s = req.method + ' ' + url + ' HTTP/1.1\r\n';
  
  for(var header in headers) {
    s += header + ': ' + headers[header] + '\r\n';
  }

  s += '\r\n';

  if(data)
    s += data.toString();

  return s;
}
