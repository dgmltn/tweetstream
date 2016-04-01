$(document).ready(function() {
  var username_re = /(@\w+)/g;
  var hashtag_re = /(#\w+)/g;
  var url_re = /\b((?:https?:\/\/|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/i
  $('.timeago').attr('datetime', new Date());
  $('.timeago').timeago();


  var updatePendingTweets = function(data) {
    $(".stats__pending .data").text(data);
    if (data == 0) {
      $(".stats__pending").fadeOut();
    }
    else {
      $(".stats__pending").fadeIn();
    }
  };

  var render = function(data) {
    var tweet = data.tweet;
    if (tweet != null) {

      $(".user_and_time_container").fadeOut();
      $(".user_profile_image").fadeOut();
      $(".tweet__background").fadeOut();

      // Tweet data
      var text = tweet.text;
      
      // Add quoted tweets as a blockquote
      if ('quote' in tweet) {
        text += "<blockquote>" + tweet.quote + "</blockquote>";
      }

      var hide = {};
      for (i in tweet.urls) {
          var shortUrl = i;
          var expandedUrl = tweet.urls[i].expanded;
          var displayUrl = tweet.urls[i].display;
          if (expandedUrl == tweet.quote_url 
              || expandedUrl == tweet.background) {
              hide[shortUrl] = 1;
          }
      }

      var url_replacer = function(match, offset, string) {
        // This url is otherwise represented. No need to show it.
        if (match in hide) {
          return "";
        }

        var display = match;

        // Expand t.co links
        for (i in tweet.urls) {
          var shortUrl = i;
          var expandedUrl = tweet.urls[i].expanded;
          var displayUrl = tweet.urls[i].display;
          if (match == shortUrl) {
            display = displayUrl;
            break;
          }
        }

        // Turn all links into 🔗  because they're not clickable anyway
        //TODO for now comment out display = '🔗';

        return "<span class='url'>" + display + " </span>";
      };

      var formatter = function(text) {
        return text
          .replace(username_re, "<span class='username'>\$1</span>")
          .replace(hashtag_re, "<span class='hashtag'>\$1</span>")
          .replace(url_re, url_replacer);
      };

      // Callback will be called between fade out and fade in
      var callback = function() {
        $(".tweet__username").text("@" + tweet.user_name);
        if (tweet.via_user_name) {
            $(".tweet__username").append('<span class="via">♻' + tweet.via_user_name + '</span>');
        }
        $(".user_profile_image").html('<img height="96" width="96" src="' + tweet.user_avatar + '" />');
        $(".timeago").timeago("update", tweet.created_at);
        $(".user_and_time_container").fadeIn(500);
        $(".user_profile_image").fadeIn(500);
        if (tweet.background) {
            $(".background").css('background-image', 'url(' + tweet.background + ')');
            $(".background").fadeIn(500);
        }
        else {
            $(".background").css('background-image', 'none');
        }
        updatePendingTweets(data.pending);
      };

      $(".tweet__text").fadeReplace(text, formatter, callback);
    }
  };

  var tweets = [];

  // Download the latest tweet immediately
  $.getJSON("/latest", render);

  // Download future tweets as they're streamed
  var socket = io();
  socket.on('pending', updatePendingTweets);
  socket.on('tweet', render);
});
