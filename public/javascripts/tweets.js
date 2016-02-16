$(document).ready(function() {
  var username_re = /(@\w+)/g;
  var hashtag_re = /(#\w+)/g;
  var url_re = /\b((?:https?:\/\/|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/i

  var tweets = [];

  var socket = io();
  socket.on('tweet', function(data) {
    tweets.push(data.tweet);
    $(".stats__pending .data").text(tweets.length);
  });

  setInterval(function() {
    var tweet = tweets.shift();
    if(tweet != null) {

      $(".tweet__user").fadeOut();
      $(".tweet__user_profile_image").fadeOut();
      $(".tweet__time").fadeOut();
      $(".tweet__background").fadeOut();

      // Tweet data
      var text = tweet.text;
      var user = tweet.user.screen_name;
      var profile_image_url = tweet.user.profile_image_url.replace("_normal", "");
      var created_at = tweet.created_at;
      var entities = tweet.entities;
      var via;
      var background;
      
      // If this is a retweet, use the original tweet instead
      if ('retweeted_status' in tweet) {
        text = tweet.retweeted_status.text;
        via = tweet.user.screen_name;
        user = tweet.retweeted_status.user.screen_name;
        profile_image_url = tweet.retweeted_status.user.profile_image_url.replace("_normal", "");
        created_at = tweet.retweeted_status.created_at;
        entities = tweet.retweeted_status.entities;
      }

      if ('media' in entities) {
        background = entities.media[0];
      }

      var formatter = function(text) {

        var url_replacer = function(match, offset, string) {
          // Expand t.co links
          for (i in entities.urls) {
            var url = entities.urls[i];
            if (match == url.url) {
                return "<span class='url'>" + url.display_url + "</span>";
            }
          }

          // This media url is the background picture. There's no need to show the url too.
          if (background != undefined && text == background.url) {
            return "";
          }

          return "<span class='url'>" + match + "</span>";
        };

        return text
          .replace(username_re, "<span class='username'>\$1</span>")
          .replace(hashtag_re, "<span class='hashtag'>\$1</span>")
          .replace(url_re, url_replacer);
      };

      // Callback will be called between fade out and fade in
      var callback = function() {
        $(".tweet__user").text("@" + user);
        if (via !== undefined) {
            $(".tweet__user").append('<span class="via">♻' + via + '</span>');
        }
        $(".tweet__user_profile_image").html('<img height="96" width="96" src="' + profile_image_url + '" />');
        $(".tweet__time abbr").attr('title', created_at);
        $(".timeago").timeago();
        $(".tweet__user").fadeIn(500);
        $(".tweet__user_profile_image").fadeIn(500);
        $(".tweet__time").fadeIn(500);
        if (background != undefined) {
            $(".tweet__background").css('background-image', 'url(' + background.media_url + ')');
            $(".tweet__background").fadeIn(500);
        }
        else {
            $(".tweet__background").css('background-image', 'none');
        }
      };

      $(".tweet__text").fadeReplace(text, formatter, callback);

      $(".stats__pending .data").text(tweets.length);
    }
  }, 6000)
});
