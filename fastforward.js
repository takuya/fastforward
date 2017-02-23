(function(document) {
  var shiftKeyPress = false;

  var KEYS = {
    SPACE : 32,
    SHIFT : 16,
    X:88,
    Z:90
  };

  var isDebugEnabled = true;
  var nextwords = [];
  var excludedUrls = [];
  
  chrome.extension.sendMessage({ name: "isDebugEnabled" }, 
    function(response) {
      isDebugEnabled = response.isDebugEnabled;
      
      getNextWords();
    }
  );

  function getNextWords() {
    chrome.extension.sendMessage({ name: "getNextWords" }, 
      function(response) {
        nextwords = response.nextwords.trim().split("\n");
        
        getExcludedUrls();
      }
    );
  }
  
  function getExcludedUrls() {
    chrome.extension.sendMessage({ name: "getExcludedUrls" }, 
      function(response) {
        excludedUrls = response.excludedUrls.trim().split("\n");
        
        addListeners();
      }
    );
  }
  
  function addListeners() {
    document.addEventListener("keydown", 
      function(e) {
        if (isInput()) { return; }
        
        switch (e.keyCode) {
          case KEYS.X:
            if ( e.shiftKey ){
              loadNext();
            }
            break;
          case KEYS.SPACE:
            if (!shiftKeyPress && isPageBottom()) {
              loadNext();
            }
            break;
            
          case KEYS.SHIFT:
            shiftKeyPress = true;
            break;
        }
      }
    );

    document.addEventListener("keyup", 
      function(e) {
        if (isInput()) { return; }
        
        switch (e.keyCode) {
          case KEYS.SHIFT:
            shiftKeyPress = false;
            break;
        }
      }
    );
  }
  
  function isInput() {
    if (document.activeElement.tagName == "INPUT" || 
        document.activeElement.tagName == "TEXTAREA" || 
        (document.activeElement.hasAttribute("role") && document.activeElement.getAttribute("role") == "textbox")) {
      return true;
    }
  }
  
  function isPageBottom() {
    var height = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    var scroll = Math.max(document.documentElement.scrollTop, document.body.scrollTop);
    var clientHeight = Math.min(document.documentElement.clientHeight, document.body.clientHeight);

   
    //return height <= (scroll + clientHeight) || document.documentElement.scrollHeight < document.documentElement.clientHeight;


    ret = (height - (scroll + clientHeight)) < 10 //|| Math.floor(document.documentElement.scrollHeight) < Math.floor(document.documentElement.clientHeight);
    return ret;
  }
  
  function loadNext() {
    var tags = document.getElementsByTagName("link");
    if (hasRelNext(tags)) { return; }
    
    tags = document.getElementsByTagName("a");

    debugLog("All tags on page:");
    for (var i = 0; i < tags.length; i++) {
      debugLog("  " + tags[i].textContent + " = " + tags[i].getAttribute("href"));
    }
    
    if (hasRelNext(tags)) { return; }
    if (hasNextWord(tags)) { return; }
    if (hasNextImg(tags)) { return; }
  }
  function findMatchTags(tags, words, condition) {
    var tags_array;
    tags_array = Array.from(tags);
    tags_array = tags_array.filter( function(e){ return e.textContent.trim().length > 0  } )

    words.forEach(function( word ){
      tags_array.forEach( function(tag){
        if ( condition( tag,word ) ) {
          var url = tag.getAttribute("href");
          if(!isExcludedUrl(url)) {
            debugLog("Found: " + word + " Following: " + tag.textContent + ":" + url);
            return document.location.href = url;
          }
        }
      })//tags_array.forEach
    })//words.forEach
  }

  function hasRelNext(tags) {
    return hasCondition(tags, "rel=next", function(tag, word) { return tag.hasAttribute("rel") && tag.getAttribute("rel").toLowerCase() == "next" });
  }
  
  function hasNextWord(tags) {

    // TODO:: xpath したほうが楽でしょ！

    // check for exact match
    findMatchTags(tags, nextwords, function( tag, word ){
      return tag.textContent.trim().toLowerCase() == word.trim().toLowerCase()
    })
    // check for any match
    findMatchTags(tags, nextwords, function( tag, word ){
      return tag.textContent.trim().toLowerCase().indexOf(word.trim().toLowerCase()) >= 0
    })
  }

  function hasNextImg(tags) {
    for (var i = 0; i < nextwords.length; i++) {
      if (hasCondition(tags, nextwords[i], function(tag, word) { 
        var imgs = tag.getElementsByTagName('img');
        var img = imgs.length ? imgs[0] : null;
        
        if (img != null) { 
          var alt = img.getAttribute('alt');
          
          if (alt != null) { 
            return alt.toLowerCase() === word.toLowerCase(); 
          }
        }
      })) {
        return true;
      }
    }
  }
  
  function hasCondition(tags, word, condition) {
    for (var i = 0; i < tags.length; i++) {
      if (condition(tags[i], word)) {
        var url = tags[i].getAttribute("href");
        
        if(!isExcludedUrl(url)) {
          debugLog("Found: " + word + " Following: " + tags[i].textContent + ":" + url);
          
          return document.location.href = url;
        }
      }
    }
  }
  
  function isExcludedUrl(url) {
    for (var i = 0; i < excludedUrls.length; i++) {
      if (url == excludedUrls[i]) {
        return true; 
      }
    }
  }

  function debugLog(text) {
    if (!isDebugEnabled) { return; }
    
    chrome.extension.sendMessage({ name: "debugLog", log: text }, 
      function(response) { }
    );
  }
})(document);
