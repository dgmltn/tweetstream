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
        timeout = setTimeout(emitTweet, 10000);
    }
};

function pushTweet(data) {
    if ("text" in data && "id" in data) {
      debugTweet(data);
      data = parseTweet(data);
      buffer.push(data);
      io.sockets.emit('pending', buffer.length);
      console.log("emit: pending, " + buffer.length);
      if (timeout === undefined) emitTweet();
    }
    else {
      console.log("ignoring non-tweet: " + JSON.stringify(data));
    }
}

// Parses twitter data into the following (specific for tweetstream) data format:
// {
// url: "http://url.of.this.tweet",
// created_at: "Tue Mar 29 23:14:46 +0000 2016",
// text: "text of the tweet",
// background: "http://url.of.background.image.jpg",
// user_name: "screen_name",
// user_avatar: "http://url.of.user_profile_image.jpg",
// via_user_name: "screen_name",
// quote: "quoted tweet/text",
// quote_url: 'http://url.of.quoted_text',
// urls: { 'https://t.co/short': {expanded: 'https://expanded.com/longer/link', display: 'expanded.com/longer...'} },
// }
function parseTweet(tweet) {
    if (tweet == null) {
        return null;
    }

    var ret = {
        url: 'https://twitter.com/' + tweet.user.screen_name + '/status/' + tweet.id_str,
        created_at: tweet.created_at,
        text: tweet.text,
        background: parseBackground(tweet.entities),
        user_name: tweet.user.screen_name,
        user_avatar: tweet.user.profile_image_url.replace('_normal', ''),
        urls: parseUrls(tweet.entities),
    };

    // If this is a retweet, use the original tweet instead
    if ('retweeted_status' in tweet) {
        ret.text = tweet.retweeted_status.text;
        ret.background = parseBackground(tweet.retweeted_status.entities);
        ret.via_user_name = tweet.user.screen_name;
        ret.user_name = tweet.retweeted_status.user.screen_name;
        ret.user_avatar = tweet.retweeted_status.user.profile_image_url.replace('_normal', '');
        ret.created_at = tweet.retweeted_status.created_at;
        ret.urls = parseUrls(tweet.retweeted_status.entities);
    }

      // Add quoted tweets as a blockquote
    if ('quoted_status' in tweet) {
        ret.quote = "@" + tweet.quoted_status.user.screen_name + " - " + tweet.quoted_status.text;
        ret.quote_url = 'https://twitter.com/' + tweet.quoted_status.user.screen_name + '/status/' + tweet.quoted_status.id_str;
    }

    //TODO: expand instagram links, like:
    // https://www.instagram.com/p/BCHDRbgh9eT/media?size=l

    console.log("parsed: " + JSON.stringify(ret));
    return ret;
}

function parseUrls(entities) {
    var ret = {};
    if ('urls' in entities) {
        for (i in entities.urls) {
            var url = entities.urls[i];
            ret[url.url] = {expanded: url.expanded_url, display: url.display_url};
        }
        for (i in entities.media) {
            var media = entities.media[i];
            ret[media.url] = {expanded: media.media_url, display: media.display_url};
        }
    }
    return ret;
}

function parseBackground(entities) {
    if ('media' in entities) {
        return entities.media[0].media_url;
    }
    return undefined;
}

function debugTweet(data) {
    console.log("------------------------------------------------------------------");
    //console.log("tweet: " + data.text);
    console.log("tweet = ", JSON.stringify(data));
    //console.log("entities = ", JSON.stringify(data.entities));
    //if ('entities' in data) { 
    //  if ('urls' in data.entities && data.entities.urls.length > 0) {
    //    console.log("urls: ", data.entities.urls);
    //  }
    //  if ('media' in data.entities && data.entities.media.length > 0) {
    //    console.log("media: ", JSON.stringify(data.entities.media));
    //  }
    //`}
}
