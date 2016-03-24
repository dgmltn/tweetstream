var express = require('express');
var http = require('http');
var twitter = require('twitter');

var config = require('./config.json');

var twit = new twitter({
  consumer_key: config.consumer_key,
  consumer_secret: config.consumer_secret,
  access_token_key: config.access_token_key,
  access_token_secret: config.access_token_secret
});

var app = express();

app.set('view engine', 'html');
//app.enable('view cache');
app.engine('html', require('hogan-express'));

app.use(express.static(__dirname + '/public'));
var server = http.createServer(app);
server.listen(config.port || 7080);

var io = require('socket.io').listen(server);

app.get('/', function (req, res) {
  res.render('index', { enable_cast: true } );
});

app.get('/receiver', function(req, res) {
  res.render('index', { enable_music: false } );
});

app.get('/latest', function(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(getLatest()));
});

for (i in config.streams) {
    var stream_config = config.streams[i];
    if (stream_config.type == 'user') {
      twit.stream('user', { }, function(stream) {
        stream.on('data', pushTweet);
        stream.on('error', function(error) {
          console.log(error);
        });
      });
    }
    else if (stream_config.type == 'keyword') {
      var bannedWords = stream_config.bannedWords.join('|');
      twit.stream('statuses/filter', { track: stream_config.keyword }, function(stream) {
        stream.on('data', function(data) {
          var containsBannedWord = new RegExp(bannedWords, 'i').test(data.text) === true;
          if (!containsBannedWord) {
            pushTweet(data);
          }
        });
        stream.on('error', function(error) {
          console.log(error);
        });
      });
    }
    else {
      console.log("Unknown stream type, ignoring: " + JSON.stringify(stream_config));
    }
}

var buffer = [];
var latest;
var timeout;

var getLatest = function() {
    return { tweet: latest, pending: buffer.length };
};

var emitTweet = function() {
    timeout = undefined;
    if (buffer.length > 0) {
        latest = buffer.shift();
        io.sockets.emit('tweet', getLatest());
        console.log("emit: tweet, " + latest.text);
        debugTweet(latest);
        timeout = setTimeout(emitTweet, 10000);
    }
};

function pushTweet(data) {
    if ("text" in data && "id" in data) {
      buffer.push(data);
      io.sockets.emit('pending', buffer.length);
      console.log("emit: pending, " + buffer.length);
      if (timeout === undefined) emitTweet();
    }
    else {
      console.log("ignoring non-tweet: " + JSON.stringify(data));
    }
}

function debugTweet(data) {
//    console.log("------------------------------------------------------------------");
//    console.log("tweet: " + data.text);
//    console.log("tweet = ", JSON.stringify(data));
//    console.log("entities = ", JSON.stringify(data.entities));
    if ('entities' in data) { 
      if ('urls' in data.entities && data.entities.urls.length > 0) {
//        console.log("urls: ", data.entities.urls);
      }
      if ('media' in data.entities && data.entities.media.length > 0) {
//        console.log("media: ", JSON.stringify(data.entities.media));
      }
    }
}
