# CouchDB Reverse Proxy Middleware for Express

express-couch-proxy is an Express middleware that can be used to allow external clients to replicate or otherwise access a CouchDB server and you don't want to expose CouchDB directly to the Internet or want to add some custom authentication or routing logic in front of it.

The author is using this middleware to allow mobile clients running [TouchDB](https://github.com/couchbaselabs/TouchDB-iOS) (compatible with CouchDB) to replicate with a backend CouchDB for syncing purposes. Each user is assigned their own database, and with this middleware, authenticated users are redirected to the proper backend database.

## Example

This snippet from an Express application intercepts `/sync/<db name>` URLs to have interceptor proxy the replication to an internal CouchDB instance:

    var couchProxy = require('express-couch-proxy');
    couchProxy = couchProxy({realm: 'CouchDB Replication'}, function(database, username, password, next) {
      if('test' == username)
        return next(null, "http://jimmy:secrets@localhost:5984/" + database);

      return next(new Error('unauthorized'));
    });

The proxy should be included as one of the first middleware in your stack, since certain middleware that process HTTP request streams interfere with its operation. Using a request body limit is recommended to prevent abuse; tune to taste:

    app.use(express.limit('1mb'));
    
    app.use('/sync', couchProxy);
    
    // other middleware
    app.use(express.bodyParser());
    app.use(express.query());
    ...

In this example, an authenticated GET request to `http://myapp/sync/furniture` would be proxied as a GET to `http://localhost:5984/furniture` with the provided credentials.
