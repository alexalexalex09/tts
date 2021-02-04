//All DOM manipulation
var createSession = function () {};
var joinSession = function () {};
if (localStorage.getItem("darkMode") == "true") {
  enableDarkMode();
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("sw.js")
    .then((serviceWorker) => {
      console.log("Service Worker registered: ", serviceWorker);
    })
    .catch((error) => {
      console.error("Error registering the Service Worker: ", error);
    });
} else {
  console.log("No serviceworker");
}

window.addEventListener("load", function () {
  /*****************************/
  /*      Socket.io logic      */
  /*****************************/
  var socket = io();
  document.onkeyup = function (e) {
    if (e.key == "Escape") {
      if ($("#contextShadow:visible").length > 0) {
        $("#contextShadow:visible").click();
      } else {
        if ($(".closeButton:visible").length > 0) {
          $(".closeButton:visible").click();
        }
      }
    }
  };
  createSession = function (res) {
    var crown = Math.floor(Math.random() * 5) + 1;
    crown = "crown" + crown;
    $(".menuHomeIcon").each(function (i, e) {
      $(this).addClass(crown);
    }); //Set owner
    if (res.session.limit) {
      recheckLimit(res.session.limit);
    }
    socket.on(res.session.code + "owner", (data) => {
      if (data.selectEvent /*&& res.session.lock != "#postPostSelectView"*/) {
        //Rewrite #postSelectContainer in real time for owner if this is an owner initated event
        if ($("#gameUnlock").length == 0) {
          showSelect(data.select, true);
        }
        if (data.curGames) {
          data.curGames.sort(lowerCaseSort());
          updateCurrentGames(data.curGames);
        }
      }
      if (data.startVoting) {
        //Parse the voting data and output
        fillVotes(data.games);
      }
      if (data.voteSubmit) {
        //Rewrite the voting status screen in real time
        fillPostVote(data.users);
      }
      if (data.play) {
        //Fill the final list of games to play
        fillGames(data.games);
      }
      if (data.limit) {
        recheckLimit(data.limit);
      }
    });
    $("#backArrow").removeClass("off");
    setCode(res.session.code);
    ttsFetch("/user_nonce", {}, (res) => {
      socket.emit("id", { id: res.userNonce, code: $("#code").text() });
    });
    setTimeout(function () {
      $("#joinButton").css({
        opacity: "0%",
        transform: "translateX(100vw)",
      });
      $("#codeInputGroup").css({
        opacity: "100%",
        transform: "translateX(0px)",
      });
      $("#createButton").css({
        transform: "translateY(calc(var(--vh) * 10))",
      });
      $("#joinButton").addClass("off");
      $("#codeInputGroup").removeClass("off");
    }, 500);
    if (typeof res.session.phrase == "undefined") {
      setPhrase(
        `<div class="phraseText"></div><div class="owner">👑<div class="tooltip">Owner</div></div><ion-icon name="settings-outline"></ion-icon>`
      );
    } else {
      setPhrase(
        `<div class="phraseText">Phrase: ` +
          res.session.phrase +
          `</div><div class="owner">👑<div class="tooltip">Owner</div></div><ion-icon name="settings-outline"></ion-icon>`
      );
    }

    $(".phraseDisplay>ion-icon").on("click", function () {
      showSessionSettings();
    });

    $(".phraseText").on("click", function () {
      createAndShowAlert($(".phraseText").first().text().substr(8));
    });

    $("#postSelectContainer").html("");

    var index = res.session.users.findIndex((obj) => obj.user == res.user);
    var dest = res.session.lock;
    //console.log(res.session.users[index].done);
    if (res.session.users[index].done == false && dest == "#postSelectView") {
      dest = "#selectView";
    }
    var toLock = false;
    if (dest == "#postPostSelectView") {
      dest = "#postSelectView";
      toLock = true;
    }
    if (dest == "#postSelectView") {
      goForwardFrom("#homeView", "#postSelectView");
      window.hist = ["#homeView", "#selectView"];
      setBackHome();
    }
    if (dest == "#selectView" && res.session.users[index].done) {
      window.hist = ["#homeView", "#codeView", "#selectView"];
      dest = "#postSelectView";
    }
    var startedSelecting = false;
    res.session.games.forEach(function (e) {
      if (!startedSelecting) {
        if (e.addedBy.findIndex((obj) => obj == res.session.owner) > -1) {
          startedSelecting = true;
        }
      }
    });

    if (dest == "#selectView" && !startedSelecting) {
      dest = "#codeView";
    }

    if (dest == "#selectView" && startedSelecting) {
      window.hist = ["#homeView", "#codeView"];
    }

    if (dest == "#voteView" && res.session.users[index].doneVoting) {
      dest = "#postVoteView";
    }
    if (dest == "#voteView") {
      var games = [];
      var votes = res.session.users[index].votes;
      for (var i = 0; i < res.session.votes.length; i++) {
        if (res.session.votes[i].active) {
          var theVote =
            votes[
              votes.findIndex((obj) => obj.id == res.session.votes[i].game)
            ];
          if (typeof theVote == "undefined") {
            console.log(
              "Error voting for ",
              res.session.votes[i].name,
              ", vote reset to 500"
            );
            theVote = 500;
          } else {
            theVote = theVote.vote;
          }
          games.push({
            game: res.session.votes[i].game,
            name: res.session.votes[i].name,
            votes: theVote,
          });
        }
      }
      fillVotes(games);
    }
    if (dest == "#postVoteView") {
      var users = [];
      for (var i = 0; i < res.session.users.length; i++) {
        users.push({
          doneVoting: res.session.users[i].doneVoting,
          name: res.session.users[i].name,
        });
      }
      fillPostVote(users);
    }
    if (dest == "#playView") {
      var games = [];
      for (var i = 0; i < res.session.votes.length; i++) {
        games[i] = {
          name: res.session.votes[i].name,
          votes: 0,
        };
        for (var j = 0; j < res.session.votes[i].voters.length; j++) {
          games[i].votes += res.session.votes[i].voters[j].vote;
        }
      }
      if (games.length > 0) {
        games.sort(function (a, b) {
          var x = a.votes;
          var y = b.votes;
          return x < y ? 1 : x > y ? -1 : 0;
        });
        fillGames(games);
      }
    }
    goForwardFrom("#homeView", dest);
    if (toLock) {
      lockGames(res.session.code);
    }
    var sessionGames = "<session>";
    if (res.games) {
      for (var i = 0; i < res.games.length; i++) {
        sessionGames +=
          '<sessionGame id="' + res.games[i].game + '"></sessionGame>';
      }
    }
    document.getElementById("sessionContainer").innerHTML = sessionGames;
    initGreenLists();
    recheckGreenLists();
  };

  joinSession = function (res) {
    $("#backArrow").removeClass("off"); //Show the back arrow
    $(".menuHomeIcon").each(function (i, e) {
      $(this).removeClass("crown1");
      $(this).removeClass("crown2");
      $(this).removeClass("crown3");
      $(this).removeClass("crown4");
      $(this).removeClass("crown5");
    }); //not the owner
    setCode(res.code);
    ttsFetch("/user_nonce", {}, (result) => {
      socket.emit("id", { id: result.userNonce, code: $("#code").text() });
    });
    setPhrase(
      `<div class="phraseText">Session: ` +
        res.phrase +
        `</div><ion-icon name="settings-outline"></ion-icon>`
    );
    $(".phraseDisplay>ion-icon").on("click", function () {
      showSessionSettings();
    });

    var sessionGames = "<session>";
    for (var i = 0; i < res.games.length; i++) {
      sessionGames +=
        '<sessionGame id="' + res.games[i].game + '"></sessionGame>';
    }
    $("#sessionContainer").html(sessionGames);
    initGreenLists();
    if (res.limit) {
      recheckLimit(res.limit);
    }

    switch (res.lock) {
      case "#postSelectView":
        goForwardFrom("#homeView", "#postSelectView");
        window.hist = ["#homeView", "#selectView", "#postSelectView"];
        setBackNormal();
        break;
      case "#postPostSelectView":
        goForwardFrom("#homeView", "#postSelectView");
        //lockback();
        break;
      case "#voteView":
        ttsFetch("/get_votes", { code: $("#code").text() }, (res) => {
          fillVotes(res.games);
          goForwardFrom("#homeView", "#voteView");
        });
        break;
      case "#playView":
        ttsFetch("/get_games", { code: $("#code").text() }, (res) => {
          fillGames(res.games);
          goForwardFrom("#homeView", "#playView");
        });
        break;
      case "#codeView":
      case "#selectView":
        if ($(".userName").length > 0) {
          goForwardFrom("#homeView", "#selectView");
        } else {
          firstSessionMsg();
          goForwardFrom("#homeView", "#postSelectView");
        }
        break;
      default:
        goForwardFrom("#homeView", res.lock);
        //lockBack()
        break;
    }
    /*******************************************/
    /* Subscribe to the code+"client" event, where if lockBack==true and unlock is set,*/
    /* it will lock the back arrow to home and move the client ahead to the session lock.*/
    /* The owner can also unlock by passing unlockBack==true and setting unlock to either*/
    /* a string or an array of history states which the client will have access to.*/
    /*******************************************/
    socket.on(res.code + "client", (data) => {
      if (data.lockBack && data.lock) {
        goForwardFrom(window.hist[window.hist.length - 1], data.lock);
        lockBack();
      }
      if (data.selectEvent) {
        //Rewrite #postSelectContainer in real time for owner
        showSelect(data.select, false);
        data.curGames.sort(lowerCaseSort());
        updateCurrentGames(data.curGames);
      }
      if (data.unlockBack && data.unlock) {
        if (data.unlock == "selectView") {
          window.hist = ["#homeView", "#selectView", "#postSelectView"];
          setBackNormal();
        }
        /*goBackFrom(
          window.hist[window.hist.length - 1],
          window.hist[window.hist.length - 2]
        );*/
      }
      if (data.startVoting) {
        //parse the voting data and output
        fillVotes(data.games);
        goForwardFrom(window.hist[window.hist.length - 1], "#voteView");
        window.hist = ["#homeView", "#voteView"];
        setBackHome();
      }
      if (data.play) {
        fillGames(data.games);
        goForwardFrom(window.hist[window.hist.length - 1], "#playView");
        window.hist = ["#homeView", "#playView"];
        setBackHome();
      }
      if (data.limit) {
        recheckLimit(data.limit);
      }
    });
    catchDisplay();
    triggerPostSelectEvent();
  };

  /**********************************/
  /* Handle Session Settings Button */
  /**********************************/
  function showSessionSettings() {
    var el = `<div class="subContextContainer"><div class="subContextSessionSettings subContext">`;
    el += `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>
      <div class="subContextTitle">Session Settings</div><hr/><div id="sessionSettings">
        <li id="sessionSettingsShareLink">Share Link</li>
        <li id="sessionSettingsShareQR">Share QR Code</li>`;
    if ($(".phraseDisplay .owner").length > 0) {
      el += `<li id="sessionSettingsRename">Rename</li>
        <li id="sessionSettingsLimit">Set Game Limit</li>`;
    }
    el += `</div></div></div>`;
    $("body").append(el);

    $("#sessionSettingsRename").on("click", function () {
      $(".subContextContainer").each(function () {
        $(this).remove();
      });
      showRenameSession({
        name: $(".phraseDisplay")
          .first()
          .children(".phraseText")
          .first()
          .text()
          .substr(8),
        id: "0000" + $("#code").text(),
      });
    });
    $("#sessionSettingsShareLink").on("click", function () {
      $(".subContextContainer").each(function () {
        $(this).remove();
      });
      copyText(
        window.location.origin + "/" + $("#code").html(),
        "Link copied to clipboard"
      );
    });
    $("#sessionSettingsShareQR").on("click", function () {
      $(".subContextContainer").each(function () {
        $(this).remove();
      });
      showQR();
    });
    $("#sessionSettingsLimit").on("click", function () {
      $(".subContextContainer").each(function () {
        $(this).remove();
      });
      showSessionLimit();
    });
  }

  function showQR() {
    ttsFetch("/qr", { link: $("#code").text() }, (res) => {
      $("body").append(
        `<div id="qrDisplayContainer">
          <div id="qrDisplay" style="background-image: url('data:image/png;base64,` +
          res.img +
          `');">
            </div>
            <div id="qrText">Scan this QR code to join this session!</div>
          </div>`
      );
      setTimeout(function () {
        onClickOutside(
          "#qrDisplayContainer",
          "#qrDisplayContainer",
          ".subContextContainer"
        );
        $("#contextShadow").removeClass("off");
      }, 10);
    });
  }

  /*****************************/
  /*     Set History State     */
  /*****************************/
  //Set an extra history state to prevent back button from closing the page
  /*window.history.pushState({ page: "home", noBackExitsApp: true }, "");
  window.addEventListener("popstate", function (event) {
    if (event.state && event.state.noBackExitsApp) {
      window.history.pushState({ noBackExitsApp: true }, "");
    }
  });*/

  /*****************************/
  /*      Set Window Height    */
  /*****************************/

  //window.addEventListener("resize", getvh);

  /*****************************/
  /*      Set font sizes       */
  /*****************************/

  /*$(window).on(
    "resize",
    {
      el: ".pageTitle",
      mHeight: "10",
      mWidth: "10",
      fHeight: "8",
      fWidth: "10",
    },
    cFont
  );
  cFont({
    data: {
      el: ".pageTitle",
      mHeight: "10",
      mWidth: "10",
      fHeight: "8",
      fWidth: "10",
    },
  });*/
  /*$(window).on(
    "resize",
    { el: ".login", mHeight: "10", mWidth: "10", fHeight: "4", fWidth: "6" },
    cFont
  );
  cFont({
    data: {
      el: ".login",
      mHeight: "10",
      mWidth: "10",
      fHeight: "4",
      fWidth: "6",
    },
  });*/
  /* $(window).on(
    "resize",
    {
      el: "#addGamesTitle",
      mHeight: "10",
      mWidth: "10",
      fHeight: "4",
      fWidth: "6",
    },
    cFont
  );
  cFont({
    data: {
      el: "#addGamesTitle",
      mHeight: "10",
      mWidth: "10",
      fHeight: "4",
      fWidth: "6",
    },
  });
  cFont({
    data: {
      el: "#addListTitle",
      mHeight: "10",
      mWidth: "10",
      fHeight: "4",
      fWidth: "6",
    },
  });*/

  /*****************************/
  /*      Home Icon Click      */
  /*****************************/
  /*goBackfrom*/
  $(".menuHomeIcon").on("click", function () {
    closeMenu();
    $("#listIcon").addClass("off");
    var from = "";
    $(".main .view").each(function (i, e) {
      if (!$(e).hasClass("off")) {
        from = "#" + $(e).attr("id");
      }
      return $(e).hasClass("off");
    });
    if (from != "#homeView" && from != "") {
      window.hist = ["#homeView"];
      setBackNormal();
      history.pushState({}, "SelectAGame", window.location.origin + "/");
      $("#homeView").css({ transform: "translateX(-200vw)" });
      $("#homeView").removeClass("off");
      $("#backArrow").addClass("off");
      window.setTimeout(function () {
        $("#homeView").css({ transform: "translateX(0vw)" });
        $(from).css({ transform: "translateX(200vw)" });
      }, 100);
      window.setTimeout(function () {
        $(from).addClass("off");
        catchDisplay();
      }, 1000);
    }
  });

  /*****************************/
  /*         Menu toggle       */
  /*****************************/
  //Close menu

  $("#menuClose").on("click", closeMenu);
  $("#menuCatch").on("click", closeMenu);
  //Open menu
  $("#menuIcon").click(this, function (el) {
    $("#menu").removeClass("off");
    $("#menuCatch").removeClass("off");
    window.setTimeout(function () {
      $("#menu").removeClass("left");
    }, 10);
  });

  /*****************************/
  /*      Close Menu Items     */
  /*****************************/

  function closeAllMenus(open) {
    $(".pop").each(function (i, e) {
      if ("#" + $(e).attr("id") != open) {
        //console.log("Closing ", "#" + $(e).attr("id"));
        closeMenuItem("#" + $(e).attr("id"));
      }
    });
  }

  /*****************************/
  /*    My Sessions Handler    */
  /*****************************/

  $("#sessionsItem").click(this, function (el) {
    if ($("#sessionsView").hasClass("off")) {
      closeMenu();
      closeAllMenus("#sessionsView");
      window.setTimeout(showMenuItem("#sessionsView"), 600);
      ttsFetch("/get_sessions", {}, (res) => {
        writeSessions(res);
      });
    } else {
      closeMenuItem("#sessionsView");
    }
  });

  $("#sessionsClose").click(this, function (el) {
    closeMenuItem("#sessionsView");
  });

  /*****************************/
  /*      My Games Handler     */
  /*****************************/
  //Populate all games on the first run through
  $("#gamesItem").click(this, function (el) {
    if ($("#gamesView").hasClass("off")) {
      gulp();
      closeAllMenus("#gamesView");
      closeMenu();
      window.setTimeout(showMenuItem("#gamesView"), 600);
    } else {
      closeMenuItem("#gamesView");
    }
  });

  $("#gamesClose").click(this, function (el) {
    closeMenuItem("#gamesView");
  });

  /*****************************/
  /*  Account Handler Handler  */
  /*****************************/
  $("#accountItem").click(this, function (el) {
    if ($("#accountView").hasClass("off")) {
      closeAllMenus("#accountView");
      closeMenu();
      window.setTimeout(showMenuItem("#accountView"), 600);
    } else {
      closeMenuItem("#accountView");
    }
  });

  $("#accountClose").click(this, function (el) {
    closeMenuItem("#accountView");
  });

  $("#accountUsernameField ion-icon").click(this, function (el) {
    showEditMenu("Change Username", "changeUsername");
  });

  /*$("#accountEmailField ion-icon").click(this, function (el) {
    showEditMenu("Change Email", "changeEmail");
  });*/

  $("#accountPwdResetField button").click(this, function () {
    pwdReset();
  });

  $("#accountImportCSVButton").click(this, function () {
    accountImportCSV();
  });

  $("#bggConnectButton").click(this, function () {
    showEditMenu("Enter your BGG username", "connectBGG");
  });

  $("#darkModeButton").click(this, function () {
    toggleDarkMode();
  });

  /*****************************/
  /*    FAQ Handler Handler    */
  /*****************************/
  $("#faqItem").click(this, function (el) {
    /*if ($("#faqView").hasClass("off")) {
      closeAllMenus("#faqView");
      closeMenu();
      window.setTimeout(showMenuItem("#faqView"), 600);
    } else {
      closeMenuItem("#faqView");
    }*/
    //window.open("http://help.selectagame.net", "_blank");
  });

  $("#faqClose").click(this, function (el) {
    closeMenuItem("#faqView");
  });

  /*****************************/
  /*    About Handler Handler  */
  /*****************************/
  $("#aboutItem").click(this, function (el) {
    if ($("#aboutView").hasClass("off")) {
      closeAllMenus("#aboutView");
      closeMenu();
      window.setTimeout(showMenuItem("#aboutView"), 600);
    } else {
      closeMenuItem("#aboutView");
    }
  });

  $("#aboutClose").click(this, function (el) {
    closeMenuItem("#aboutView");
  });

  /*****************************/
  /*  Premium Handler Handler  */
  /*****************************/

  $("#premiumItem").click(this, function (el) {
    if ($("#premiumView").hasClass("off")) {
      closeAllMenus("#premiumView");
      closeMenu();
      window.setTimeout(showMenuItem("#premiumView"), 600);
    } else {
      closeMenuItem("#premiumView");
    }
  });

  $("#premiumClose").click(this, function (el) {
    closeMenuItem("#premiumView");
  });

  /*****************************/
  /* Join button click handler */
  /*****************************/
  $("#joinButton").click(this, function () {
    joinClick();
  });
  function joinClick() {
    var oldCode = $("#code").html();
    if (oldCode != false) {
      socket.off(oldCode + "select");
    }
    $("#code").html("");
    if ($("#postSelectIntro").length > 0) {
      $("#postSelectContainer").html($("#postSelectIntro")[0].outerHTML);
    } else {
      $("#postSelectContainer").html("");
    }
    $("#codeInputGroup").removeClass("off");
    window.setTimeout(function () {
      $("#joinButton").css({
        opacity: "0%",
        transform: "translateX(100vw)",
      });
      $("#codeInputGroup").css({
        opacity: "100%",
        transform: "translateX(0px)",
      });
      $("#createButton").css({
        transform: "translateY(calc(var(--vh) * 10))",
      });
      window.setTimeout(function () {
        $("#joinButton").addClass("off");
      }, 600);
    }, 10);
  }
  /*****************************/
  /*  Text input clear button  */
  /*****************************/
  $(".textClear").click(this, function (el) {
    if ($(this).parent().children("input").first().val() == "") {
      $("#joinButton").removeClass("off");
      window.setTimeout(function () {
        $("#joinButton").css({
          opacity: "100%",
          transform: "translateX(0vw)",
        });
        $("#codeInputGroup").css({
          opacity: "0%",
          transform: "translateX(-100vw)",
        });
        $("#createButton").css({
          transform: "translateY(0vh)",
        });
        window.setTimeout(function () {
          $("#codeInputGroup").addClass("off");
          $(".errorText").addClass("off");
        }, 600);
      }, 10);
    } else {
      $(this).parent().children("input").first().val("");
    }
  });

  /*****************************/
  /*     Back arrow handler    */
  /*****************************/
  $("#backArrow").click(this, function (el) {
    //Going to have to notify the server so that the owner of a session
    //can know that someone went back to a previous step

    var dest = $("#backArrow").attr("data-gobackto");

    ttsFetch(
      "/going_back",
      {
        to: window.hist[window.hist.length - 2],
        from: window.hist[window.hist.length - 1],
        code: $("#code").text(),
      },
      () => {}
    );

    goBackFrom(
      window.hist[window.hist.length - 1],
      window.hist[window.hist.length - 2]
    );
  });

  /*****************************/
  /*   Create Button Handler   */
  /*****************************/
  $("#createButton").click(this, function () {
    window.hist = ["#homeView"];
    setBackHome();
    clearLists();
    ttsFetch("/create_session", {}, (res) => {
      createSession(res.status);
    });
    $("#codeInput .textInput").first().val(window.location.pathname.substr(1));
  });

  /***********************************/
  /*   Copy the code to clipboard    */
  /***********************************/
  $("#copyButton").on("click", function () {
    copyText(
      window.location.origin + "/" + $("#code").html(),
      "Link copied to clipboard"
    );
  });
  $("#codeGroup").on("click", function () {
    copyText($("#code").html(), "Code copied to clipboard.");
  });

  /***********************************/
  /*         Share the code          */
  /*  This won't work without HTTPS  */
  /***********************************/

  document.getElementById("shareButton").addEventListener("click", async () => {
    if (navigator.share) {
      navigator
        .share({
          title: "SelectAGame",
          text: "Join my SelectAGame session! ",
          url:
            "https://selectagame.net/" +
            document.getElementById("code").innerHTML,
        })
        .then(() => console.log("Successful share"))
        .catch((error) => console.log("Error sharing", error));
    } else {
      window.open(
        "mailto:?Subject=Import%20my%20list%20on%20SelectAGame&body=Click this link to join my session on SelectAGame%0D%0A%0D%0A https://selectagame.net/" +
          document.getElementById("code").innerHTML +
          ' %0D%0A%0D%0AIf the above link doesn%27t work, click "Join Game" on the home page and enter this code: ' +
          document.getElementById("code").innerHTML
      );
    }
  });

  /*****************************/
  /* Select button transition  */
  /*****************************/

  //On the first run through, get user lists populated and add them to #selectLists
  gulp();
  $("#selectButton").click(this, function () {
    //$("#backArrow").attr("data-gobackto", "code");

    recheckGreenLists();
    goForwardFrom("#codeView", "#selectView");
  });

  /*****************************/
  /*    Unsorted Game Adder    */
  /*****************************/
  //Add a game to the unsorted list
  //Used in the select view
  //Possible because #addGamesInput is defined in pug file
  //$("#addGamesInput").on("keyup", addGame(event));

  /*****************************/
  /*        List Adder         */
  /*****************************/
  //Add a list
  //Used in #gamesview.pop
  //#addListInput is also defined in pug file
  //setTimeout(function () {
  //  $("#addListInput").on("keyup", console.log(event));
  //}, 2000);
  /*****************************/
  /*Game submit button handler */
  /*****************************/

  $("#gameSubmit").click(function () {
    ttsFetch(
      "/submit_games",
      {
        code: document.getElementById("code").innerHTML,
      },
      () => {
        goForwardFrom("#selectView", "#postSelectView");
        if ($("#postSelectImg").length == 0 && $("#gameUnlock").length == 0) {
          $("#postSelectView").append('<div id="postSelectImg"></div>');
          $("#postSelectContainer").css("grid-area", "9/2/15/10");
        }
      }
    );
  });

  /*******************************************/
  /* Check if url matches a code and execute */
  /*******************************************/
  if (
    /^([A-Z0-9]{5})$/.test(window.location.pathname.substr(1)) &&
    !/^([A-Z0-9]{6})$/.test(window.location.pathname.substr(1))
  ) {
    joinClick(); //calls joinSession
    submitCode(window.location.pathname.substr(1)); //calls submitCode and therefore join_session
  }

  if (/^([A-Z0-9]{6})$/.test(window.location.pathname.substr(1))) {
    history.pushState(
      {},
      "SelectAGame: " + window.location.pathname.substr(1),
      window.location.origin + "/" + window.location.pathname.substr(1)
    );
    runListImport(window.location.pathname.substr(1));
  }

  /* Set up autocomplete */
  localforage.getItem("topList").then((topList) => {
    if (
      typeof topList != "undefined" &&
      topList != null &&
      topList.length > 0
    ) {
      setAutoComplete(topList);
    } else {
      getNewTopList().then((topList) => {
        setAutoComplete(topList);
      });
    }
  });

  /* Set up BGG account */
  checkBGG();

  /*
   *
   *
   * End of window functions
   * The rest of the content and click handlers are added programmatically
   *
   */
});
//End all DOM manipulation
//Have to end DOM manipulation here because functions must be defined globally to
//be accessed by HTML onclick
//TODO: convert all insertion of HTML elements by strings into insertion by
//nodes so that they can be given event listeners

/***************************************************/
/***************************************************/
/***************************************************/
/***************************************************/
/*                                                 */
/*               Universal Functions               */
/*                                                 */
/***************************************************/
/***************************************************/
/***************************************************/
/***************************************************/

function cFont(e) {
  var iH = window.innerHeight;
  var iW = window.innerWidth;
  var fS =
    iW / (100 / e.data.fWidth) > iH / (100 / e.data.fHeight)
      ? "calc(var(--vh, 1vh) * " + e.data.fHeight + ")"
      : e.data.fWidth + "vw";
  $(e.data.el).css("font-size", fS);
  /*console.log(
    "width: " +
      iW / (100 / e.data.fWidth) +
      ", height: " +
      iH / (100 / e.data.fHeight) +
      ", result: " +
      fS
  );*/
}

function closeMenu() {
  $("#menu").addClass("left");
  $("#menuCatch").addClass("off");
  window.setTimeout(function () {
    $("#menu").addClass("off");
  }, 550);
}

/*****************************/
/*         lockBack()        */
/*****************************/
function lockBack() {
  window.hist = [window.hist[0], window.hist[window.hist.length - 1]];
  setBackHome();
  $("#backArrow").attr("data-gobackto", window.hist[0]);
}

/*****************************/
/*         ttsFetch()        */
/*****************************/
/**
 *
 *
 * @param {String} req Address of POST request beginning with slash
 * @param {Object} body Object to be JSON.stringify'd
 * @param {Function} handler format is (res) => {function body}
 * @param {Function} errorHandler (optional) Error handler
 */
function ttsFetch(req, body, handler, errorHandler) {
  if (body === "") {
    body = {};
  }
  const tts_options = {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  };
  startLoader();
  fetch(req, tts_options).then(function (response) {
    finishLoader();
    return response.json().then((res) => {
      if (res.err) {
        if (errorHandler) {
          errorHandler(res);
        } else {
          createAndShowAlert(res.err);
        }
      } else {
        handler(res);
      }
    });
  });
  return;
  //Return here? So that it's non-blocking?
}

/*****************************/
/*  goForwardFrom(from, to)  */
/*****************************/
//
/**
 * {move forwards from one view to another arbitrary view}
 *
 * @param {String} from
 * @param {String} to
 */
function goForwardFrom(from, to) {
  if (from != to) {
    if (to == "#selectView" || to == "#postSelectView") {
      window.setTimeout(function () {
        $("#listIcon").removeClass("off"), 1000;
      });
    }
    if (to != "#postSelectView" && to != "#selectView") {
      window.setTimeout(function () {
        $("#listIcon").addClass("off"), 1000;
      });
    }
    if (to == "#postSelectView") {
      triggerPostSelectEvent();
    }
    if (typeof window.hist == "undefined") {
      window.hist = [from];
    }
    if (from == "#postSelectView" && to == "#voteView") {
      window.hist = ["#homeView"];
    }
    window.hist.push(to);
    $("#backArrow").attr("data-gobackto", window.hist[window.hist.length - 2]);
    if (window.hist.length == 2) {
      setBackHome();
    } else {
      setBackNormal();
    }
    $(to).css({ transform: "translateX(200vw)" });
    $(to).removeClass("off");

    window.setTimeout(function () {
      $(to).css({ transform: "translateX(0vw)" });
      $(from).css({ transform: "translateX(-200vw)" });
    }, 100);
    window.setTimeout(function () {
      $(from).addClass("off");
      catchDisplay();
    }, 1000);
  }
}

/*****************************/
/*    goBackFrom(from, to)   */
/*****************************/
/**
 * {move backwards from one view to another arbitrary view}
 *
 * @param {String} from
 * @param {String} to
 */
function goBackFrom(from, to) {
  if (from == to) {
    if (
      window.hist[window.hist.length - 1] == window.hist[window.hist.length - 2]
    ) {
      window.hist.pop();
    }
  } else {
    if (to == "#selectView" || to == "#postSelectView") {
      window.setTimeout(function () {
        $("#listIcon").removeClass("off"), 1000;
      });
    }
    if (
      (from == "#selectView" && to != "#postSelectView") ||
      (from == "#postSelectView" && to != "#selectView")
    ) {
      console.log(
        "turning off listIcon because to is ",
        to,
        " and from is ",
        from
      );
      window.setTimeout(function () {
        $("#listIcon").addClass("off"), 1000;
      });
    }
    if (to == "#postSelectView") {
      triggerPostSelectEvent();
    }
    if (typeof from != "undefined" && typeof to != "undefined") {
      if (from == "#postSelectView" && to == "#selectView") {
        ttsFetch(
          "/going_back",
          {
            code: document.getElementById("code").innerHTML,
            from: from,
            to: to,
          },
          (res) => {
            goBack(from, to);
          }
        );
      } else {
        goBack(from, to);
        catchDisplay();
      }
    }
  }
}

function goBack(from, to) {
  window.hist.pop();
  $("#backArrow").attr("data-gobackto", window.hist[window.hist.length - 2]);
  $(to).css({ transform: "translateX(-200vw)" });
  $(to).removeClass("off");
  if (to == "#homeView") {
    $("#backArrow").addClass("off");
    history.pushState({}, "SelectAGame", window.location.origin + "/");
  }
  if (window.hist.length == 2) {
    setBackHome();
  } else {
    setBackNormal();
  }
  window.setTimeout(function () {
    $(to).css({ transform: "translateX(0vw)" });
    $(from).css({ transform: "translateX(200vw)" });
  }, 100);
  window.setTimeout(function () {
    $(from).addClass("off");
    catchDisplay();
  }, 1000);
}

function triggerPostSelectEvent() {
  ttsFetch(
    "/get_session_post_select",
    { code: $("#code").text() },
    (res) => {}
  );
}

function setBackHome() {
  $("#backArrow>ion-icon").first().addClass("off");
  $("#backHome").removeClass("off");
}

function setBackNormal() {
  $("#backArrow>ion-icon").first().removeClass("off");
  $("#backHome").addClass("off");
}

/*****************************/
/*       lockGames(code)     */
/*****************************/
/**
 * {lock a user's game}
 *
 * @param {String} code
 */
function lockGames(code) {
  ttsFetch("/lock_games", { code: code }, (res) => {
    $("#backArrow").addClass("off");
    $("#postSelectView").css({
      transform: "translateX(-200vw)",
    });
    window.setTimeout(function () {
      $("#postSelectTitle").html(
        "Edit Games List <div class='menuHomeIcon'></div>"
      );
      $("#postSelectContainer").css("grid-area", "4/2/18/10");
      $("#postSelectContainer").html(res.htmlString);
      sortEditGames();
      $("#postSelectImg").remove();
      registerEGS();
      $("#postSelectView").css({ transition: "transform 0s" });
      $("#postSelectView").css({
        transform: "translateX(200vw)",
      });
      window.setTimeout(function () {
        $("#postSelectView").css({ transition: "transform 1s" });
        $("#postSelectView").css({
          transform: "translateX(-0vw)",
        });
        //$("#backArrow").removeClass("off");
        /*$("#addGroupGamesInput").on("keyup", function (event) {
          // Number 13 is the "Enter" key on the keyboard
          if (event.keyCode === 13) {
            event.preventDefault();
            addGroupGame();
          }
          return false;
        });*/
        $("#gameUnlock").click(this, function () {
          ttsFetch(
            "/unlock_games",
            {
              code: $("#code").text(),
              unlock: "#selectView",
              unlockBack: true,
            },
            (res) => {
              $("#backArrow").removeClass("off");
              goBackFrom("#postSelectView", "#selectView");
              setTimeout(function () {
                $("#postSelectContainer").html("");
              }, 1000);
            }
          );
        });
      }, 10);
    }, 300);
  });
}

//Called by adding a game on the Edit Games List screen by #addGroupGamesInputCont
function addGroupGame() {
  var game = addGroupGamesInput.value
    .replace(/&/, "&amp;")
    .replace(/[^%0-9a-zA-Z' ]/g, "");
  ttsFetch(
    "/group_game_add",
    { game: game, code: $("#code").text() },
    (res) => {
      $("#editGameList").append(res.status);
      sortEditGames();
      registerEGS();
      ttsFetch(
        "/get_session_post_select",
        { code: $("#code").text() },
        (res) => {}
      );
    },
    (res) => {
      if ((res.err = "added")) {
        $("#addGroupGamesInput").css("color", "var(--main-red)");
        $('input[game_id="' + res.game + '"]').each(function () {
          $(this).parent().parent().parent().css("color", "var(--main-red)");
        });
        $("#addGroupGamesInput").addClass("shake");
        window.setTimeout(function () {
          $("#addGroupGamesInput").css("color", "var(--main-black)");
          $("#addGroupGamesInput").removeClass("shake");
          $('input[game_id="' + res.game + '"]').each(function () {
            $(this)
              .parent()
              .parent()
              .parent()
              .css("color", "var(--main-black)");
          });
        }, 600);
      } else {
        createAndShowAlert(res.err, true);
      }
    }
  );
  return false;
}

function sortEditGames() {
  $("#editGameList")
    .children()
    .sort(lowerCaseDivSort(".editGame"))
    .appendTo("#editGameList");
}

/********************************/
/*       addListDisplay()       */
/*    Add initial list names    */
/*       to #selectgames        */
/********************************/
/**
 *
 *
 * @param {String} theId
 * @param {String} name
 */
function addListDisplay(
  theId,
  name,
  dest,
  toggle,
  titleFunc,
  iconFunc,
  ionicon
) {
  var listString = `<li id="` + theId + `">`;
  if (dest == "#gamesContainer") {
    listString +=
      `<div class="menuGamesContainer">` +
      `<div class="listName" onclick="` +
      titleFunc +
      `">` +
      name.replace(/\\/g, "") +
      `
    </div></div>`;
  } else {
    //console.log(dest, name.replace(/\\/g, ""));
    listString +=
      `<div class="listName" onclick="` +
      titleFunc +
      `">` +
      name.replace(/\\/g, "") +
      `
    </div>`;
  }
  if (iconFunc && ionicon) {
    listString +=
      `<div class="listExpand" onclick="` +
      iconFunc +
      `">
          <ion-icon name="` +
      ionicon +
      `"></ion-icon>
      </div>`;
  }
  if (toggle) {
    listString += `<div class='toggle' >
          <label class="switch">
              <input type="checkbox" onclick="toggleFont(this)">
              <span class="slider round"></span>
          </label>
      </div>`;
  }
  listString += `<div class="listGames off"></div>
    </li>`;
  $(dest).append(listString);
}

/**********************************/
/*  Get a User's Populated Lists  */
/**********************************/

function gulp(showAllGames = false) {
  ttsFetch(
    "/get_user_lists_populated",
    {},
    (res) => {
      if (res.darkMode == true) {
        var darkMode = true;
      } else {
        var darkMode = false;
      }
      setDarkMode(darkMode);
      $("#gamesContainer").html(" ");
      $("#gamesContextContainer").html(" ");
      $("#listContextContainer").html(" ");
      $("#selectLists").html(" ");
      addListDisplay(
        0,
        "All Games",
        "#selectLists",
        true,
        "listToggle(this.nextElementSibling)",
        "listToggle(this)",
        "chevron-down-outline"
      );
      addListDisplay(
        "games0",
        "All Games",
        "#gamesContainer",
        false,
        "openList($(this).parent().parent().attr('id'))",
        false,
        false
      );
      res.lists.allGames.sort(lowerCaseNameSort());
      for (var i = 0; i < res.lists.allGames.length; i++) {
        var curSession = document.getElementsByTagName("session")[0];
        var checked = "";
        var greenText = "";
        $(curSession)
          .children()
          .each(function (ind, el) {
            if ($(el).attr("id") == res.lists.allGames[i]._id.toString()) {
              checked = " checked";
              greenText = " greenText";
            }
          });
        var htmlString =
          `
            <li>
                <div rating="` +
          res.lists.allGames[i].rating +
          `" owned="` +
          res.lists.allGames[i].owned +
          `" class="gameName` +
          greenText +
          `" game_id="` +
          res.lists.allGames[i]._id +
          `">` +
          res.lists.allGames[i].name.replace(/\\/g, "") +
          `
                </div>
                <div class='toggle'>
                    <label class="switch">
                        <input type="checkbox"` +
          checked +
          ` onclick="toggleFont(this)" game_id="` +
          res.lists.allGames[i]._id +
          `">
                        <span class="slider round"></span>
                    </label>
                </div>
            </li>`;
        var gameString =
          `<li id="` +
          res.lists.allGames[i]._id +
          `" onclick="showGameContext({id:'` +
          res.lists.allGames[i]._id +
          `', name: '` +
          res.lists.allGames[i].name +
          `', list: '0'})">` +
          res.lists.allGames[i].name.replace(/\\/g, "") +
          `</li>`;
        //Append the "All Games" list to the first <li>
        $("li#0").children(".listGames").first().append(htmlString);
        if (showAllGames) {
          listToggle($("#0").children(".listExpand")[0]);
        }
        $("li#games0").children(".listGames").first().append(gameString);
        $("#gamesContextContainer").append(
          `<div class="contextActions off" list="games0" id="context_stage_` +
            res.lists.allGames[i]._id +
            `">` +
            `<div class="contextTitle">` +
            res.lists.allGames[i].name.replace(/\\/g, "") +
            `</div>` +
            `<li class="bggLink">BoardGameAtlas Link</li>` +
            `<li onclick="contextCopy([{id: '` +
            res.lists.allGames[i]._id +
            `', name:'` +
            res.lists.allGames[i].name +
            `'}])">Copy</li>` +
            `<li onclick="contextRename({id: '` +
            res.lists.allGames[i]._id +
            `', name:'` +
            res.lists.allGames[i].name +
            `'}, this)">Rename</li>` +
            `<li class="red" onclick="showDeleteGame([{id: '` +
            res.lists.allGames[i]._id +
            `', name:'` +
            res.lists.allGames[i].name +
            `'}], '&quot;` +
            res.lists.allGames[i].name +
            `&quot;')">Delete</li>` +
            `</div>`
        );
      }
      $("#listContextContainer").append(
        writeListContext({
          id: "list0",
          name: "All Games",
        })
      );
      for (var i = 0; i < res.lists.custom.length; i++) {
        var curId = i + 1;
        var curName = res.lists.custom[i].name
          .replace(/&/g, "&amp;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "\\'");
        addListDisplay(
          curId,
          curName,
          "#selectLists",
          true,
          "listToggle(this.nextElementSibling)",
          "listToggle(this)",
          "chevron-down-outline"
        );
        addListDisplay(
          "games" + curId,
          curName,
          "#gamesContainer",
          false,
          "openList($(this).parent().parent().attr('id'))",
          "showGameContext({id: 'list'+$(this).parent().attr('id').substr(5)})",
          "ellipsis-vertical"
        );
        res.lists.custom[i].games.sort(lowerCaseNameSort());
        for (var j = 0; j < res.lists.custom[i].games.length; j++) {
          var htmlString =
            `
            <li>
              <div rating="` +
            res.lists.custom[i].games[j].rating +
            `" owned="` +
            res.lists.custom[i].games[j].owned +
            `" class="gameName` +
            greenText +
            `" game_id="` +
            res.lists.custom[i].games[j]._id +
            `">` +
            res.lists.custom[i].games[j].name.replace(/\\/g, "") +
            `
              </div>
              <div class='toggle'>
                  <label class="switch">
                      <input type="checkbox"` +
            checked +
            ` onclick="toggleFont(this)" game_id="` +
            res.lists.custom[i].games[j]._id +
            `">
                      <span class="slider round"></span>
                  </label>
              </div>
            </li>`;
          var listNum = i + 1;
          var gameString =
            `<li id="` +
            res.lists.custom[i].games[j]._id +
            `" onclick="showGameContext({id: '` +
            res.lists.custom[i].games[j]._id +
            `', name: '` +
            res.lists.custom[i].games[j].name +
            `', list: '` +
            listNum +
            `'})">` +
            res.lists.custom[i].games[j].name.replace(/\\/g, "") +
            `</li>`;

          //Append each custom list the the corresponding li
          $("li#" + curId)
            .children(".listGames")
            .first()
            .append(htmlString);

          $("li#games" + curId)
            .children(".listGames")
            .first()
            .append(gameString);
          $("#gamesContextContainer").append(
            writeGameContext({
              id: res.lists.custom[i].games[j]._id,
              name: res.lists.custom[i].games[j].name,
              list: curId,
            })
          );
        }
        $("#listContextContainer").append(
          writeListContext({
            id: "list" + curId,
            name: curName,
            listCode: res.lists.custom[i].listCode,
          })
        );
      }

      $("#listsContainer").html(htmlString);
      writeSessions(res);
      initGreenLists();
    },
    (res) => {}
  );
  /* const gulp_options = {
    method: "POST",
    body: "",
    headers: {
      "Content-Type": "application/json",
    },
  };
  startLoader();
  fetch("/get_user_lists_populated", gulp_options).then(function (response) {
    finishLoader();
    //Gets the populated list, which is an object with two arrays,
    //"allGames", which is supposed to have every game, and "custom",
    //which has the user's custom lists. Array elements in allGames
    //are objects which have the properties "rating", "name", and "owned".
    //Array elements in custom are objects which have the properties "games"
    //and "name". "Games" is an array of objects that each have the properties "rating",
    //"name", and "owned".
    return response.json().then((res) => {
      if (!res.err) {
        
      } else {
        if (res.err != ERR_LOGIN_SOFT) createAndShowAlert(res.err, true);
      }
    });
  }); */
}

/**
 * Hide or show the add game and add list buttons in the menu
 *
 */
/*
function toggleGamesAdder() {
  showAdderMenu();
}
*/
/*
function hideGamesAdderButtons() {
  $(".gamesAdder").addClass("slideDown");
  setTimeout(function () {
    $(".gamesAdder").addClass("off");
  }, 501);
}
*/
/**
 * Shows the add Game menu in My Games and Lists
 *
 */
/*function showMenuAddGame() {
  hideGamesAdderButtons();
  $("#menuAddGamesContainer").removeClass("off");
  setTimeout(function () {
    $("#menuAddGamesContainer").removeClass("slideDown");
  }, 5);
}

function showMenuAddList() {
  hideGamesAdderButtons();
  $("#menuAddListContainer").removeClass("off");
  setTimeout(function () {
    $("#menuAddListContainer").removeClass("slideDown");
  }, 5);
}*/

function openList(list) {
  var games = getListGames(list);
  var htmlString =
    `<div class="listTitle"><ion-icon name="arrow-back-outline" onclick="hideSubList('.listContents')"></ion-icon><div class="listTitleText">` +
    $("#" + list)
      .children(".menuGamesContainer")
      .first()
      .children(".listName")
      .first()
      .html() +
    `</div></div>` +
    createNode("listContents", "", "displayGameContainer", games);
  htmlString +=
    `<div class="bulkSelect off" list="` +
    list +
    `"><ion-icon name="square-outline" onclick="selectAllBulk()"></ion-icon><ion-icon name="checkbox-outline" onclick="closeBulk()" class="off"></ion-icon><div class="blank"></div>`;
  if (list != "games0") {
    htmlString += `<ion-icon name="trash-outline" onclick="deleteRemoveBulk()"></ion-icon><ion-icon name="cut-sharp" onclick="moveBulk()"></ion-icon>`;
  } else {
    htmlString += `<div></div><ion-icon name="trash-outline" onclick="deleteRemoveBulk()"></ion-icon>`;
  }
  htmlString += `<ion-icon name="copy-outline" onclick="copyBulk()"></ion-icon><ion-icon name="close-outline" onclick="closeBulk()"></ion-icon></div>`;
  $("#" + list).after(htmlString);
  showSubList(".listContents");
}

function getListGames(list) {
  var arr = [];
  $("#" + list)
    .children(".listGames")
    .first()
    .children()
    .each(function (ind, el) {
      //console.log("gLg: ", $(el)[0].outerHTML);
      arr.push(
        hashToColor($(el).attr("id").substr(10)) +
          $(el)[0].outerHTML.replace(`id="`, `id="display_`) +
          `<ion-icon name="ellipsis-vertical" onclick="` +
          $(el).attr("onclick") +
          `"></ion-icon>`
      );
    });
  return arr;
}

function bulkSelectGame(el) {
  $(el).toggleClass("flipped");
  $(el).children(".spriteChecked").toggleClass("spriteUnchecked");
  if ($(el).parent().parent().children().children(".flipped").length > 0) {
    $("#gamesContainer .bulkSelect").removeClass("off");
    $(".listContents.slideUp").addClass("bulkShowing");
    if (
      $(el).parent().parent().children().children(".flipped").length ==
      $(el).parent().parent().children().children(".sprite").length
    ) {
      $('#gamesContainer .bulkSelect ion-icon[name="square-outline"]').addClass(
        "off"
      );
      $(
        '#gamesContainer .bulkSelect ion-icon[name="checkbox-outline"]'
      ).removeClass("off");
    } else {
      $(
        '#gamesContainer .bulkSelect ion-icon[name="square-outline"]'
      ).removeClass("off");
      $(
        '#gamesContainer .bulkSelect ion-icon[name="checkbox-outline"]'
      ).addClass("off");
    }
  } else {
    $("#gamesContainer .bulkSelect").addClass("off");
    $(".listContents.slideUp").removeClass("bulkShowing");
    $(
      '#gamesContainer .bulkSelect ion-icon[name="square-outline"]'
    ).removeClass("off");
    $('#gamesContainer .bulkSelect ion-icon[name="checkbox-outline"]').addClass(
      "off"
    );
  }
}

function closeBulk() {
  $(".bulkShowing")
    .children()
    .children(".flipped")
    .each(function () {
      $(this).removeClass("flipped");
      $(this).children(".spriteChecked").first().addClass("spriteUnchecked");
    });
  $("#gamesContainer .bulkSelect").addClass("off");
  $(".listContents.slideUp").removeClass("bulkShowing");
  $('#gamesContainer .bulkSelect ion-icon[name="square-outline"]').removeClass(
    "off"
  );
  $('#gamesContainer .bulkSelect ion-icon[name="checkbox-outline"]').addClass(
    "off"
  );
}

function selectAllBulk() {
  $('#gamesContainer .bulkSelect ion-icon[name="square-outline"]').addClass(
    "off"
  );
  $(
    '#gamesContainer .bulkSelect ion-icon[name="checkbox-outline"]'
  ).removeClass("off");
  $(".bulkShowing")
    .children()
    .children(".sprite")
    .each(function () {
      $(this).addClass("flipped");
      $(this).children(".spriteChecked").first().removeClass("spriteUnchecked");
    });
}

function deleteRemoveBulk(el) {
  if ($("#gamesContainer .bulkSelect").first().attr("list") == "games0") {
    showDeleteBulk();
  } else {
    showRemoveBulk();
  }
}

function showDeleteBulk() {
  var toDelete = getBulkChecked();
  var text = "games";
  if (toDelete.count == 1) {
    text = "game";
  }
  showDeleteGame(toDelete.games, toDelete.count + " " + text);
}

function getBulkChecked() {
  var games = [];
  var count = 0;
  $("#gamesContainer .bulkSelect")
    .parent()
    .children(".listContents")
    .first()
    .children()
    .children(".sprite.flipped")
    .each(function () {
      games.push({
        id: $(this).parent().children("li").first().attr("id").substr(8),
        name: $(this).parent().children("li").first().text(),
      });
      count++;
    });
  return { games: games, count: count };
}

function showRemoveBulk() {
  var toRemove = "";
  var toRemove = getBulkChecked();
  var list = $("#gamesContainer .bulkSelect").attr("list");

  toRemove.games.forEach(function (e, i) {
    toRemove.games[i].list = list;
  });

  var text = "games";
  if (toRemove.count == 1) {
    text = "game";
  }
  contextRemove(toRemove.games, toRemove.count + " " + text);
}

function copyBulk() {
  var lists = getMenuLists(
    $("#gamesContainer .bulkSelect").first().attr("list")
  );
  var bc = getBulkChecked();
  var games = bc.games;
  games.forEach(function (e) {
    e.list = $("#gamesContainer .bulkSelect").first().attr("list");
  });
  displaySubContext(
    "Copying",
    games,
    lists,
    "copyToList",
    $("#gamesContainer .bulkSelect").first().attr("list")
  );
}

function moveBulk() {
  var lists = getMenuLists(
    $("#gamesContainer .bulkSelect").first().attr("list")
  );
  var bc = getBulkChecked();
  var games = bc.games;
  games.forEach(function (e) {
    e.list = $("#gamesContainer .bulkSelect").first().attr("list");
  });
  displaySubContext(
    "Moving",
    games,
    lists,
    "moveToList",
    $("#gamesContainer .bulkSelect").first().attr("list")
  );
}

/**
 *
 *
 * @param {String} name
 * @param {String} func
 * @param {Array} classes
 * @returns
 */
function prepareAction(name, func, classes) {
  var htmlString = `<li class="action`;
  if (typeof classes == "object") {
    if (Array.isArray(classes)) {
      for (var i = 0; i < classes.length; i++) {
        htmlString += " " + classes[i];
      }
    }
  }
  htmlString += `" onclick="` + func + `">` + name + `</li>`;
  return htmlString;
}

function createNode(nodeClass, nodeId, subNodeClass, arr) {
  var htmlString = `<div class="` + nodeClass + `" id="` + nodeId + `">`;
  for (var i = 0; i < arr.length; i++) {
    htmlString += `<div class="` + subNodeClass + `">` + arr[i] + `</div>`;
  }
  htmlString += "</div>";
  return htmlString;
}

function showSubList(subList) {
  $(subList).removeClass("off");
  $(".listTitle").removeClass("off");
  setTimeout(function () {
    $(subList).addClass("slideUp");
    $(".listTitle").addClass("slideUp");
  }, 10);
}

function hideSubList(subList) {
  closeBulk();
  $("#gamesContainer .bulkSelect").each(function () {
    this.remove();
  });
  $(subList).removeClass("slideUp");
  $(".listTitle").removeClass("slideUp");
  setTimeout(function () {
    $(subList).remove();
    $(".listTitle").remove();
  }, 510);
}

//This is called from an onclick handler set in index.pug
//Gets the list browser with data from the backend for security purposes
function openListBrowser() {
  if ($("#listBrowserList").html() == "") {
    ttsFetch("/get_list_browser", {}, (res) => {
      if (res.error == "unauthorized") {
        createAndShowAlert(
          "Sorry, this feature is available to premium users only",
          true
        );
      } else {
        var htmlString = `<div class="listBrowserNameTitle">
        <h2>Available Lists</h2>
      </div><div class="listBrowserCodeTitle">
        <h2>Code</h2>
      </div>`;
        res.lists.forEach(function (e) {
          htmlString +=
            `<div class="listBrowserItem"><div class="listBrowserArrow" onclick="expandListBrowser(this)"><ion-icon name="chevron-down-outline"></ion-icon></div><div class="listBrowserName" onclick="expandListBrowser(this)">` +
            e.name +
            `</div>` +
            `<div class="listBrowserGames off">`;
          e.games.forEach(function (game) {
            var index = res.gameKey.findIndex((obj) => {
              return obj.id == game;
            });
            htmlString +=
              `<div class="listBrowserGame">` +
              res.gameKey[index].name +
              `</div>`;
          });
          htmlString +=
            `</div></div><div class="listBrowserCode" onclick="copyText('https://selectagame.net/` +
            e.code +
            `', 'Code Copied')">` +
            e.code +
            `</div>`;
        });
        $("#listBrowserList").html(htmlString);
        $("#listBrowser").removeClass("off");
        window.setTimeout(function () {
          $("#listBrowser").css("transform", "translateY(0%)");
        }, 10);
      }
    });
  } else {
    $("#listBrowser").removeClass("off");
    window.setTimeout(function () {
      $("#listBrowser").css("transform", "translateY(0%)");
    }, 10);
  }
}

function expandListBrowser(el) {
  $(el).parent().children(".listBrowserGames").toggleClass("off");
  var deg = $(el).parent().children(".listBrowserArrow").css("transform");
  if (deg == "matrix(-1, 0, 0, -1, 0, 0)") {
    deg = "matrix(1, 0, 0, 1, 0, 0)";
  } else {
    deg = "matrix(-1, 0, 0, -1, 0, 0)";
  }
  $(el).parent().children(".listBrowserArrow").css("transform", deg);
}

function closeListBrowser() {
  $("#listBrowser").css("transform", "translateY(100%)");
  window.setTimeout(function () {
    $("#listBrowser").addClass("off");
  }, 500);
}

/**
 * {Desc} Shows a menu view
 *
 * @param {*} view
 */
function showMenuItem(view) {
  $(view).removeClass("off");
  window.setTimeout(function () {
    $(view).addClass("showMenuItem");
  }, 10);
}

/**
 * {Desc} Closes a menu view
 *
 * @param {*} view
 */
function closeMenuItem(view) {
  $(view).removeClass("showMenuItem");
  window.setTimeout(function () {
    $(view).addClass("off");
  }, 600);
}

function premium() {
  if ($("#premiumView").hasClass("off")) {
    $(".pop").each(function (i, e) {
      if ("#" + $(e).attr("id") != "#premiumView") {
        //console.log("Closing ", "#" + $(e).attr("id"));
        closeMenuItem("#" + $(e).attr("id"));
      }
    });
    closeMenu();
    window.setTimeout(showMenuItem("#premiumView"), 600);
  } else {
    closeMenuItem("#premiumView");
  }
}

function showAdderMenu() {
  $("body").append(writeAdder("Add a list or game"));
  setTimeout(function () {
    onClickOutside("#menuAdder", "#menuAdder", ".subContextContainer");
    $("#contextShadow").removeClass("off");
  }, 10);
  $("#menuAdder").removeClass("off");
  $("#menuAdder").addClass("slideUp");
}

function showAdder(item, theId, func, funcArg, prompt) {
  if (funcArg) {
    funcArg = `'` + funcArg + `'`;
  }
  if (item == "game") {
    var listSelector = `<input type="checkbox" name="addGameListCheckbox" id="addGameListCheckbox"></input>
                        <label for="addGameListCheckbox"> Also add to this list: </label>
                        <select name="addGameList" id="addGameList" disabled>`;
    $("#gamesContainer .listName").each(function (i, e) {
      if (i > 0) {
        listSelector =
          listSelector +
          `<option value="` +
          $(e).text().trim() +
          `">` +
          $(e).text().trim() +
          `</option>`;
      }
    });
    listSelector += `</select>`;
  } else {
    listSelector = "";
  }
  var el =
    `<div class="subContextContainer"><div class="subContextRename" id="subContext_` +
    item +
    `" >`;
  el +=
    `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
    `<div class="subContextTitle">` +
    prompt +
    `</div><hr/><div id="renameGameInputCont" class="textInputCont">
  <form onsubmit="return ` +
    func.substr(0, func.length - 1) +
    funcArg +
    `)` +
    `">
    <input class="textInput" type="text" autocomplete="off" id="` +
    theId +
    `">` +
    listSelector +
    `<input class="textSubmit" type="submit" value="">
  </form>`;
  $("body").append(el);
  focusFirstInput(".subContextContainer");
  $("#addGameListCheckbox").on("click", function () {
    $(this).parent().children("select").first().prop("disabled", !this.checked);
  });
}

function showGameContext(game) {
  if ($("#context_" + game.id).length == 0) {
    if (game.list) {
      $("#context_stage_" + game.id + "[list=games" + game.list + "]")
        .clone(true)
        .prop("id", "context_" + game.id)
        .appendTo($("body"));
    } else {
      $("#context_stage_" + game.id)
        .clone(true)
        .prop("id", "context_" + game.id)
        .appendTo($("body"));
    }
    setTimeout(function () {
      onClickOutside(
        "#context_" + game.id,
        "#context_" + game.id,
        ".subContextContainer"
      );
      $("#contextShadow").removeClass("off");
    }, 10);
    $("#context_" + game.id).removeClass("off");
    $("#context_" + game.id).addClass("slideUp");
    var gamesToPush = [];
    if (game.list) {
      gamesToPush.push({
        element: $(".contextActions.slideUp li.bggLink"),
        game: $(
          "#context_stage_" +
            game.id +
            "[list=games" +
            game.list +
            "] .contextTitle"
        )
          .first()
          .text(),
      });
    }
    wrapGameUrls(gamesToPush);
  }
}

function contextMove(games) {
  var lists = getMenuLists($(".contextActions.slideUp").first().attr("list"));
  displaySubContext(
    "Moving",
    games,
    lists,
    "moveToList",
    $(".contextActions.slideUp").attr("list")
  );
}

function getMenuLists(fromList) {
  var lists = [];
  $("#gamesContainer")
    .children()
    .children()
    .children(".listName")
    .each(function () {
      lists.push({
        name: $(this).text().trim(),
        id: $(this).parent().parent().attr("id"),
      });
    });
  var index = lists.findIndex((obj) => obj.id == fromList);

  //Remove the origin list and All Games

  if (index > 0) {
    lists.splice(index, 1);
  }
  lists.splice(0, 1);
  return lists;
}

function closeSubContext(view) {
  closeMenuItem(view);
  $(view).remove();
}

/**
 *
 *
 * @param {String} text The action
 * @param {Object} game game.name [The subject], game.id [The subject id]
 * @param {Array} items items[i].id [toList], items[i].name [item name]
 * @param {*} fname
 */
function displaySubContext(text, games, items, fname, fromList) {
  var el = `<div class="subContextContainer"><div class="subContext">`;
  el +=
    `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
    `<div class="subContextTitle">` +
    text +
    `</div><hr/>`;
  for (var i = 0; i < items.length; i++) {
    el += `<li onclick="` + fname + `({toList: '` + items[i].id + `', games:[`;
    games.forEach(function (e) {
      el += `'` + e.id + `',`;
    });
    el = el.substr(0, el.length - 1);
    el +=
      `], fromList: '` +
      fromList +
      `'})">` +
      items[i].name.replace(/\\/g, "") +
      `</li>`;
  }
  el += `</div></div>`;
  $("body").append(el);
}

function moveToList(options) {
  ttsFetch(
    "/move_to_list",
    {
      code: document.getElementById("code").innerHTML,
      games: options.games,
      toList: options.toList,
      fromList: options.fromList,
    },
    (res) => {
      $(".subContextContainer").each(function () {
        $(this).remove();
      });
      gulp();
    }
  );
}

function contextCopy(games) {
  var lists = getMenuLists($(".contextActions.slideUp").first().attr("list"));
  displaySubContext(
    "Copying",
    games,
    lists,
    "copyToList",
    $(".contextActions.slideUp").attr("list")
  );
}

function copyToList(options) {
  ttsFetch(
    "/copy_to_list",
    {
      code: document.getElementById("code").innerHTML,
      games: options.games,
      toList: options.toList,
      fromList: options.fromList,
    },
    (res) => {
      $($("#" + options.games))
        .first()
        .clone(true)
        .appendTo("#" + options.toList + " .listGames");
      $(".subContextContainer").each(function () {
        $(this).remove();
      });
      gulp();
    }
  );
}

function contextRename(game) {
  var el =
    `<div class="subContextContainer"><div class="subContextRename" id="subContext_` +
    game.id +
    `" >`;
  el +=
    `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
    `<div class="subContextTitle">Renaming "` +
    game.name.replace(/\\/g, "") +
    `"</div><hr/><div id="renameGameInputCont" class="textInputCont">
    <form onsubmit="return renameGame(event, this, '` +
    game.id.substr(5 + game.length) +
    `', '` +
    game.name +
    `')" id="renameGameInput"></input>` +
    `<input class="textSubmit" type="submit" value="">` +
    `<input class="textInput" type="text" autocomplete="off" value="` +
    game.name.replace(/\\/g, "") +
    `"></input>` +
    `</form>`;
  $("body").append(el);
  focusFirstInput(".subContextContainer");
}

function renameGame(event, caller, game, oldGame) {
  ttsFetch(
    "/rename_game",
    {
      game: game,
      newName: $(caller).children(".textInput").val(),
    },
    (res) => {
      //$("#" + game).text(res.status.newName);
      $("#gamesContainer")
        .children()
        .children(".listGames")
        .children("li")
        .each(function () {
          if ($(this).text() == oldGame) {
            $(this).text($(caller).val());
          }
        });
      $(".subContextContainer").each(function () {
        $(this).remove();
      });
      gulp();
    }
  );
  return false;
}

function showRenameList(list) {
  var el =
    `<div class="subContextContainer"><div class="subContextRename" id="subContext_` +
    list.id +
    `" >`;
  el +=
    `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
    `<div class="subContextTitle">Renaming list "` +
    list.name.replace(/\\/g, "") +
    `"</div><hr/><div id="renameGameInputCont" class="textInputCont">
    <form onsubmit="return renameList(event, this, '` +
    list.id.substr(4) +
    `')" id="renameGameInput"></input>
    <input class="textInput" type="text" autocomplete="off" value="` +
    list.name.replace(/\\/g, "") +
    `"></input>
    <input class="textSubmit" type="submit" value="">`;
  $("body").append(el);
  focusFirstInput(".subContextContainer");
}

function renameList(event, caller, list) {
  ttsFetch(
    "/rename_list",
    {
      list: list,
      newName: $(caller).children('input[type="text"]').first().val(),
    },
    (res) => {
      //$("#" + game).text(res.status.newName);
      $("#gamesContainer")
        .children("#games" + list)
        .children(".menuGamesContainer")
        .children(".listName")
        .text($(caller).val());
      $(".subContextContainer").each(function () {
        $(this).remove();
      });
      gulp();
    }
  );
  return false;
}

function showDeleteList(list) {
  var el =
    `<div class="subContextContainer"><div class="subContextDelete" id="subContext_` +
    list.id +
    `" >`;
  el +=
    `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
    `<div class="subContextTitle">Really delete list "` +
    list.name.replace(/\\/g, "") +
    `"?</div><hr/>
  <div class="button greenBtn" id="deleteCancel" onclick="$(this).parent().parent().remove()">Cancel</div>
  <div class="button redBtn" id="deleteConfirm" onclick="deleteList('` +
    list.id +
    `')">Delete</div>`;
  $("body").append(el);
}

function deleteList(list) {
  ttsFetch(
    "/delete_list",
    {
      list: list,
    },
    (res) => {
      $("#gamesContainer")
        .children("#games" + list.substr(4))
        .remove();
      gulp();
      $(".subContextContainer").each(function () {
        $(this).remove();
      });
    }
  );
}

function showShareList(list) {
  var el =
    `<div class="subContextContainer"><div class="subContextDelete" id="subContext_` +
    list.id +
    `" >`;
  el +=
    `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
    `<div class="subContextTitle">Share this code: ` +
    list.listCode +
    `</div><hr/>
    <div id="listButtonContainer">
    <div id="shareListButton" class="button greenBtn">Share <ion-icon name="share-outline"></ion-icon></div>
    <div id="copyListButton" class="button greenBtn">Copy <ion-icon name="copy-outline"></ion-icon></div></div>`;
  $("body").append(el);
  document
    .getElementById("shareListButton")
    .addEventListener("click", async () => {
      if (navigator.share) {
        navigator
          .share({
            title: list.name,
            text:
              'Link for game list "' +
              list.name.replace(/\\/g, "") +
              '"on selectagame: ',
            url: "https://selectagame.net/" + list.listCode,
          })
          .then(() => console.log("Successful share"))
          .catch((error) => console.log("Error sharing", error));
      } else {
        window.open(
          'mailto:?Subject=Import%20my%20list%20on%20SelectAGame&body=Click this link to import my the list "' +
            list.name.replace(/\\/g, "") +
            '" on SelectAGame.%0D%0A%0D%0A https://selectagame.net/' +
            list.listCode +
            ' %0D%0A%0D%0AIf the above link doesn%27t work, go the Games and Lists menu and click the "Plus" button to Import a list, and use this code: ' +
            list.listCode
        );
      }
    });
  $("#copyListButton").on("click", function () {
    copyText(
      window.location.origin + "/" + list.listCode,
      "Link copied to clipboard"
    );
  });
}

function showDeleteGame(arr, string) {
  var el = `<div class="subContextContainer"><div class="subContextDelete">`;
  el +=
    `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
    `<div class="subContextTitle">Really delete ` +
    string +
    `?</div><hr/>
  <div class="button greenBtn" id="deleteCancel" onclick="$(this).parent().parent().remove()">Cancel</div>
  <div class="button redBtn" id="deleteConfirm" onclick="deleteGame([`;
  arr.forEach(function (e, i) {
    el += "{id: '" + e.id + "', name: '" + e.name + "'},";
  });
  el = el.substr(0, el.length - 1);
  el += `])">Delete</div>`;
  $("body").append(el);
}

function deleteGame(arr) {
  ttsFetch(
    "/delete_game",
    {
      games: arr,
    },
    (res) => {
      res.arr.forEach(function (e, i) {
        $("#gamesContainer")
          .children()
          .children(".listGames")
          .children("li")
          .each(function () {
            if ($(this).text() == e) {
              $(this).remove();
            }
          });
        $("#gamesContainer")
          .children(".listContents")
          .children(".displayGameContainer")
          .children("li")
          .each(function () {
            if ($(this).text() == e) {
              $(this).parent().remove();
            }
          });
      });
      $(".subContextContainer").each(function () {
        $(this).remove();
      });
      gulp();
    }
  );
}

function contextRemove(games, text) {
  var el = `<div class="subContextContainer"><div class="subContextRemove">`;
  el +=
    `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
    `<div class="subContextTitle">Remove ` +
    text +
    ` from this list?</div><hr/>
  <div class="button greenBtn" id="removeCancel" onclick="$(this).parent().parent().remove()">Cancel</div>
  <div class="button redBtn" id="removeConfirm" onclick="removeGame([`;

  games.forEach(function (e, i) {
    el +=
      "{game: '" +
      e.id +
      `', name: '` +
      e.name +
      `', list: '` +
      e.list.substr(e.list.length - 1) +
      "'},";
  });
  el = el.substr(0, el.length - 1);
  el += `])">Remove</div>`;
  $("body").append(el);
}

function removeGame(arr) {
  ttsFetch(
    "/remove_game",
    {
      games: arr,
    },
    (res) => {
      res.arr.forEach(function (e) {
        $("#gamesContainer")
          .children()
          .children(".listGames")
          .children("li")
          .each(function () {
            if ($(this).text() == e) {
              $(this).remove();
            }
          });
      });
      $(".subContextContainer").each(function () {
        $(this).remove();
      });
      gulp();
    }
  );
}

function parseBGGThing(id, field) {
  console.log("Searching for |" + id + "|" + field + "|");
  return new Promise(function (resolve, reject) {
    var index = -1;
    localforage.getItem("topList").then((topList) => {
      if (typeof topList == "undefined") {
        console.log("no toplist");
        topList = [];
      } else {
        index = topList.findIndex((obj) => {
          return obj.bgaID == id;
        });
        if (index > -1) {
          var game = topList[index];
          console.log("resolving game: ", game.name, field);
          resolve(game.metadata[field]);
        } else {
          //No ID
          index = topList.findIndex((obj) => {
            return obj.name == id;
          });
          if (index > -1) {
            var game = topList[index];
            console.log("resolving game: ", game.name, field);
            var ret = game.metadata[field];
            game = "";
            resolve(ret);
            ret = "";
          }
        }
      }
      if (index == -1) {
        console.log("didn't find it");
        ttsFetch(
          "/bga_find_id",
          { id: id },
          (res) => {
            console.log(
              "An ID of a pre-cached game had to be searched for. This shouldn't have happened!"
            );
            var log = { id: id, field: field };
            console.log({ log });
            resolve(res[field]);
          },
          (err) => {
            resolve("");
          }
        );
      }
    });
  });
}

function getTopListIndex(game, topList /*, fuse*/) {
  if (topList) {
    var index = topList.findIndex((obj) => {
      var ret =
        obj.name == game.replace(/[^%0-9a-zA-Z' ]/g, "") ||
        obj.actualName == game.replace(/[^%0-9a-zA-Z' ]/g, "");
      return ret;
    });
    if (index == -1) {
      console.log("Couldn't find " + game + " in " + topList.length + " games");
      /*var searchres = fuse.search(game);
      if (searchres.length > 0) {
        if (searchres[0].score < 0.3) {
          index = searchres[0].refIndex;
        } else {
          return -1;
        }
      }
      searchres = [];*/
    }
    return index;
  } else {
    return -1;
  }
}

/**
 *
 *
 * @param {Array} games
 * @returns {Array} [{game: game, url: url}]
 */
function getGameUrl(games) {
  //Takes an array of games and returns associated urls for those games
  //Would this do better to return associated topList indeces?
  //Probably not, because this way the url is guaranteed to be correct.
  //Ordinarily this should be called and chained to .then((res)=>{
  //  els.forEach((el) => {
  //    var html = $(el).html();
  //    var index = res.findIndex((obj) => {return obj.game == theGameInQuestion});
  //    $(el).html(`<a href="` + res[index].url + `" target="_blank">` + html + `</a>`);
  //   });
  //});
  return new Promise((resolve, reject) => {
    //Convert games to an array if it isn't an array
    if (!Array.isArray(games)) {
      var temp = [];
      temp.push(games);
      games = temp;
    }

    //Get the topList from localforage
    localforage.getItem("topList").then((res) => {
      //if there is no topList, get one before continuing
      var topList = [];
      var anyNewTopList = [];
      if (res == null || typeof res[0] == "undefined" || res[0].length == 0) {
        anyNewTopList.push(getNewTopList());
        console.log("Added a promise: " + typeof anyNewTopList[0]);
      } else {
        var topList = res;
        anyNewTopList.push(
          new Promise((resolveTopList, reject) => {
            resolveTopList(topList);
          })
        );
      }
      Promise.all(anyNewTopList).then((topList) => {
        //Promise.all returns an array, get the first result
        topList = topList[0];

        //create a Fuse for fuzzy searching in getTopListIndex
        /*if (
          typeof topList != "undefined" &&
          topList != null &&
          topList.length > 0
        ) {
          var theDate = Date.now();
          var fuse = new Fuse(topList, { keys: ["name"], includeScore: true });
          console.log("Created fuse: " + theDate);
        } else {
          console.log(topList);
        }*/

        //Initialize the promise arrays
        var promises = [];
        var index = -1;
        var fetches = [];
        //For each game, create a promise and push it to the array
        games.forEach((game) => {
          const promise = new Promise((resolveInner, rejectInner) => {
            //If the topList is empty, shortcut
            if (
              typeof topList == "undefined" ||
              topList == null ||
              topList.length == 0
            ) {
              console.log("Couldn't find topList!");
              index = -1;
            } else {
              /* if (typeof fuse == "undefined") {
                console.log("no fuse yet");
              } else {
                //Otherwise, find the index of the game in question*/
              index = getTopListIndex(game, topList);
              /* }*/
            }

            if (index > -1) {
              //If the game in question is in the topList, return its value
              var theURL = topList[index].metadata.url;
              //Fall back on search if the topList is corrupted, and reset it
              if (theURL == "" || typeof theURL == "undefined") {
                localforage.setItem("topList", topList).then((res) => {
                  var ret =
                    `https://www.boardgamegeek.com/geeksearch.php?action=search&q=` +
                    game;
                  resolveInner({ game: game, url: ret });
                });
              } else {
                //If topList is not corrupted, resolve the current promise
                resolveInner({ game: game, url: topList[index].metadata.url });
              }
            } else {
              //If the game in question isn't in the topList, search for it on BGA
              fetches.push(
                game
                  .replace("&amp;", "and")
                  .replace(/[^%0-9a-zA-Z' ]/g, "")
                  .replace(/\\/g, "")
              );
              resolveInner({ game: game, toResolve: true });
            }
          });
          //Collect all the promises for all the submitted games
          promises.push(promise);
        });
        //wait for them all to resolve, then resolve the outer promise
        Promise.all(promises).then((games) => {
          if (fetches.length > 0) {
            ttsFetch("/bga_find_game", { game: fetches }, (res) => {
              //If a game is found, get the new topList from the server
              games.forEach((game, curIndex) => {
                if (game.toResolve) {
                  /*var index = res.findIndex((obj) => {
                    return (
                      obj.name
                        .replace("&amp;", "and")
                        .replace("&", "and")
                        .replace(":", "")
                        .replace(/\\/g, "") == game.game
                    );
                  });*/
                  var index = -1;
                  if (index == -1) {
                    console.log(game.game + " not found");
                    var url =
                      `https://www.boardgamegeek.com/geeksearch.php?action=search&q=` +
                      game.game.replace(/[^0-9a-zA-Z' ]/g, "");
                    games[curIndex].url = url;
                  } else {
                    games[curIndex].url = res[index].url;
                  }
                }
              });
              getNewTopList().then(resolve(games));
            });
          } else {
            resolve(games);
          }
        });
      });
    });
  });
}

function getNewTopList() {
  return new Promise((resolve, reject) => {
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    };
    //await the promises. This will set the topList variable and won't need to be repeated on subsequent requests (hopefully)
    fetch("/get_top_list", options).then((response) => {
      response.json().then((res) => {
        localforage.setItem("topList", res.games).then(() => {
          resolve(res.games);
        });
      });
    });
  });
}

function wrapGameUrls(games) {
  //Format: [{game: "Gamename", element: $(el)}]
  //Doesn't have a return value, instead it changes the state of the passed element
  //Get an array of game names and urls from getGameUrl,
  //Then wrap each element in a url by matching res.game with the games.game and using the corresponding res[index].url
  //Will not wrap anything that already has an anchor tag
  console.log({ games });
  //Create an array of game names
  var gameNames = [];
  games.forEach((game, index) => {
    var safeName = game.game
      .replace("&amp;", "and")
      .replace(/[^%0-9a-zA-Z' ]/g, "");
    gameNames.push(safeName);
    games[index].game = safeName;
  });

  //Get urls for those game names
  getGameUrl(gameNames).then((res) => {
    //Loop through the original game/element object, matching urls with games
    //to wrap the element in a link to that url
    games.forEach((e, i) => {
      //If the element doesn't already have a link within it
      if ($(e.element).children("a").length == 0) {
        //Find the game in the returned object from getGameUrl
        var index = res.findIndex((obj) => {
          return obj.game == e.game;
        });
        if (index == -1) {
          console.log({ res });
          var couldntfind = games[i];
          console.log({ couldntfind });
          console.trace();
        }
        //Get the url to wrap
        var url = res[index].url;
        var html = $(e.element).html();
        $(e.element).html(
          '<a href="' + url + `" target="_blank">` + html + `</a>`
        );
      }
    });
  });
}

function connectBGG() {
  ttsFetch(
    "/connect_bgg",
    {
      username: $("#accountInputCont form .textInput").val(),
    },
    (res) => {
      checkBGG();
      $(".subContextContainer").remove();
    }
  );
  return false;
}

function onClickOutside(selector, toHide, extraSelector, hideInstead, hideFn) {
  const outsideClickListener = (event) => {
    const $target = $(event.target);

    /*console.log("clicked outside: ", $target);
    console.log((!$target.closest(selector).length && $(selector).is(":visible")));*/
    if (
      (!$target.closest(selector).length && $(selector).is(":visible")) ||
      (extraSelector &&
        !$target.closest(extraSelector).length &&
        $(extraSelector).is(":visible")) ||
      (extraSelector && !$(extraSelector).is(":hidden"))
    ) {
      removeClickListener();
      $("#contextShadow").addClass("off");
      if (hideInstead) {
        hideFn($(selector));
      } else {
        $(toHide).remove();
      }
    }
  };

  const removeClickListener = () => {
    document.removeEventListener("click", outsideClickListener);
  };

  document.addEventListener("click", outsideClickListener);
}

function writeAdder(title) {
  //TODO: This whole workflow is ugly.
  var escapeStr = "$(\\&#39;#subContext_import input.textInput\\&#39;).val()";
  var htmlString =
    `<div class="contextActions off" list="menuAdder" id="menuAdder">` +
    `<div class="contextTitle">` +
    title +
    `</div>` +
    `<li onclick="showAdder('import', 'showImportMenu', 'runListImport($(\\&#39;#subContext_import input.textInput\\&#39;).val())', '', 'Import a list')">Import List</li>` +
    `<li onclick="showAdder('list', 'menuAddListInput', 'addList()', '', 'Add new list')">Add List</li>` +
    `<li onclick="showAdder('game', 'menuAddGamesInput', 'textSubmit()', '#menuAddGamesInput', 'Add new game')">Add Game</li>` +
    `</div>`;
  return htmlString;
}

function writeGameContext(contextObj) {
  var co = createContextObjectString(
    contextObj.id,
    contextObj.name,
    contextObj.list
  );
  //console.log("contextObj ", contextObj);
  var htmlString =
    `<div class="contextActions off" list="games` +
    contextObj.list +
    `" id="context_stage_` +
    contextObj.id +
    `">` +
    `<div class="contextTitle">` +
    contextObj.name.replace(/\\/g, "") +
    `</div>` +
    `<li class="bggLink">BoardGameAtlas Link</li>` +
    `<li onclick="contextMove([` +
    co +
    `])">Move</li>` +
    `<li onclick="contextCopy([` +
    co +
    `])">Copy</li>` +
    `<li onclick="contextRename(` +
    co +
    `, this)">Rename</li>` +
    `<li onclick="contextRemove([` +
    co +
    `], '` +
    contextObj.name +
    `')">Remove</li>` +
    `</div>`;
  return htmlString;
}

function createContextObjectString(id, name, list) {
  return `{id: '` + id + `', name:'` + name + `', list:'` + list + `'}`;
}

/**
 *
 *
 * @param {Object} contextObj id, name
 * @returns
 */
function writeListContext(contextObj) {
  //console.log("wLC: ", contextObj);
  if (contextObj.listCode) {
    var shareable =
      `<li onclick="showShareList({id: '` +
      contextObj.id +
      `', name: '` +
      contextObj.name +
      `', listCode: '` +
      contextObj.listCode +
      `'})">Share</li>`;
  } else {
    var shareable = "";
  }
  var htmlString =
    `<div class="contextActions off" list="` +
    contextObj.id +
    `"id="context_stage_` +
    contextObj.id +
    `">` +
    `<div class="contextTitle">` +
    contextObj.name.replace(/\\/g, "") +
    `</div>` +
    shareable +
    `<li onclick="showRenameList({id: '` +
    contextObj.id +
    `', name: '` +
    contextObj.name +
    `'})">Rename</li>` +
    `<li onclick="showDeleteList({id: '` +
    contextObj.id +
    `', name: '` +
    contextObj.name +
    `'})">Delete</li>` +
    `</div>`;
  return htmlString;
}

function writeSessionContext(code, name, owned) {
  if (typeof name == "undefined") {
    name = code;
  }
  var htmlString =
    `<div class="contextActions off" class="sessionContext ` +
    code +
    `" id="context_stage_` +
    code +
    `">` +
    `<div class="contextTitle">` +
    name +
    `</div>` +
    `<li onclick="menuSubmitCode('` +
    code +
    `')">Open</li>` +
    `<li onclick="` +
    `copyText(window.location.origin + '/' + $('#code').html(),'Link copied to clipboard')` +
    `">Share</li>` +
    `<li `;
  if ($("#" + code + " .owner").length > 0 || owned == true) {
    htmlString +=
      `onclick="showRenameSession({name: '` +
      name +
      `', id:'0000` +
      code +
      `'})">Rename</li>` +
      `<li onclick="showDeleteSession({id: '` +
      code +
      `', name: '` +
      name +
      `'})">Delete</li>` +
      `</div>`;
  } else {
    htmlString +=
      `class="grey">Rename</li>` +
      `<li onclick="showDeleteSession({id: '` +
      code +
      `', name: '` +
      name +
      `'})">Remove From Session</li>` +
      `</div>`;
  }
  return htmlString;
}

/**
 * {Desc} Takes the sessions object from /get_sessions and fills #sessionsContainer
 *
 * @param {Object} res
 */
function writeSessions(res) {
  var htmlString = "";
  if (res.sessions) {
    for (var i = 0; i < res.sessions.length; i++) {
      var usersplural = setPlural(res.sessions[i].users, " user, ", " users, ");
      var gamesplural = setPlural(res.sessions[i].games, " game", " games");
      /*if (typeof res.sessions[i].note == "undefined") {
      res.sessions[i].note = "";
    }*/
      htmlString += `<li><div class="sessionsCheck"><input type="checkbox"></div>`;
      if (typeof res.sessions[i].phrase != "undefined") {
        htmlString +=
          `<div class="sessionTitle ` +
          res.sessions[i].code +
          `" onclick="menuSubmitCode('` +
          res.sessions[i].code +
          `')">` +
          res.sessions[i].phrase +
          `</div>`;
      }
      htmlString +=
        `<div id="` +
        res.sessions[i].code +
        `" class="sessionCode ` +
        res.sessions[i].code +
        `" onclick="menuSubmitCode('` +
        res.sessions[i].code +
        `')">Code: ` +
        res.sessions[i].code;
      if (res.sessions[i].owned) {
        htmlString += `👑`;
      }
      htmlString +=
        `</div><div class="sessionDetails ` +
        res.sessions[i].code +
        `" onclick="menuSubmitCode('` +
        res.sessions[i].code +
        `')">` +
        res.sessions[i].users +
        usersplural +
        res.sessions[i].games +
        gamesplural +
        `</div><div class="sessionEdit ` +
        res.sessions[i].code +
        `"><ion-icon name="ellipsis-vertical" onclick="showGameContext({id: '` +
        res.sessions[i].code +
        `'})"></ion-icon>` +
        `</div></li>`;
      /*+`<ion-icon class="` +
      res.sessions[i].code +
      `" name="document-text-outline" onclick="$('.` +
      res.sessions[i].code +
      `.sessionNote').toggleClass('off')"></ion-icon></li>` +
      `<div class="` +
      res.sessions[i].code +
      ` sessionNote off">` +
      res.sessions[i].note +
      `</div>`;*/
      htmlString += writeSessionContext(
        res.sessions[i].code,
        res.sessions[i].phrase,
        res.sessions[i].owned
      );
    }
  } else {
    createAndShowAlert("Log in to save sessions", true);
  }
  $("#sessionsContainer").html(htmlString);
  $('.sessionsCheck input[type="checkbox"]').on("click", checkSessionBoxes());
  $(".sessionsCheck").on("click", function () {
    var $el = $(this).children('input[type="checkbox"]').first();
    //$el.prop("checked", !$el.prop("checked"))
    checkSessionBoxes();
  });
}

function checkSessionBoxes() {
  if ($('.sessionsCheck input[type="checkbox"]:checked').length > 0) {
    $("#sessionsContainer").removeClass("slideUp");
    if (
      $('.sessionsCheck input[type="checkbox"]:checked').length ==
      $('.sessionsCheck input[type="checkbox"]').length
    ) {
      selectAllSessions();
    }
  } else {
    closeBulkSessions();
  }
}

function selectAllSessions() {
  $('.sessionsCheck input[type="checkbox"]').prop("checked", true);
  $('ion-icon[name="square-outline"]').addClass("off");
  $('ion-icon[name="checkbox-outline"]').removeClass("off");
}

function closeBulkSessions() {
  $('.sessionsCheck input[type="checkbox"]').prop("checked", false);
  $('ion-icon[name="square-outline"]').removeClass("off");
  $('ion-icon[name="checkbox-outline"]').addClass("off");
  $("#sessionsContainer").addClass("slideUp");
}

function showBulkDeleteSessions() {
  var sessionsCount = $('.sessionsCheck input[type="checkbox"]:checked').length;
  var ownedCount = 0;
  $('.sessionsCheck input[type="checkbox"]:checked').each(function (i, e) {
    if (
      $(e)
        .parent()
        .parent()
        .children(".sessionCode")
        .first()
        .text()
        .indexOf("👑") > -1
    ) {
      ownedCount++;
    }
  });
  var memberCount = sessionsCount - ownedCount;
  var ownedPlural = (memberPlural = "");
  if (ownedCount > 1) {
    ownedPlural = "s";
  }
  if (memberCount > 1) {
    memberPlural = "s";
  }
  var el = `<div class="subContextContainer"><div class="subContextDelete" id="subContext_bulkSessions" >`;
  el +=
    `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
    `<div class="subContextTitle">Really delete ` +
    ownedCount +
    ` session` +
    ownedPlural +
    ` and remove yourself from ` +
    memberCount +
    ` session` +
    memberPlural +
    `?</div><hr/>
    <div class="button greenBtn" id="deleteCancel" onclick="$(this).parent().parent().remove()">Cancel</div>
    <div class="button redBtn" id="deleteConfirm" onclick="bulkDeleteSessions()">Delete</div>`;
  $("body").append(el);
}

function bulkDeleteSessions() {
  var arr = [];
  $('.sessionsCheck input[type="checkbox"]:checked').each(function (i, e) {
    if (
      //$(e).parent().parent().children(".sessionCode").text().substr(-2) == "👑"
      true
    ) {
      arr.push(
        $(e).parent().parent().children(".sessionCode").text().substr(6, 5)
      );
      $(e).parent().parent().remove();
    }
  });
  ttsFetch("/delete_bulk_sessions", { sessions: arr }, (res) => {
    $(".subContextContainer").each(function () {
      $(this).remove();
    });
  });
}

function showSessionLimit() {
  var el = `<div class="subContextContainer"><div class="subContextLimit subContext">`;
  el +=
    `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>
    <div class="subContextTitle">Limit User Submitted Games</div><hr/><div id="sessionLimit">
      <form id="setLimitForm" onsubmit="return submitSetLimit()">
      <div id="limitContainer"><label for="selectLimit">Maximum # of games each player can suggest:</label>
      <input type="number" name="selectLimit" id="selectLimit" min="0" value="` +
    $("#limitMax").html() +
    `">
      <input type="button" class="button redBtn" onclick="removeLimit()" value="Remove"></input>
      <input type="submit" class="button greenBtn" value="Set Limit"></input>
      </div>
      </form>
    </div></div></div>`;
  $("body").append(el);
}

function removeLimit() {
  $("#selectLimit").val(0);
  submitSetLimit();
}

function submitSetLimit() {
  ttsFetch(
    "/set_session_limit",
    { code: $("#code").text(), limit: $("#selectLimit").val() },
    (res) => {
      createAndShowAlert("Limit set successfully");
      $(".subContextContainer").each(function () {
        $(this).remove();
      });
      recheckLimit($("#selectLimit").val());
    }
  );
  return false;
}

function showRenameSession(session) {
  var el =
    `<div class="subContextContainer"><div class="subContextRename" id="subContext_` +
    session.id +
    `" >`;
  el +=
    `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
    `<div class="subContextTitle">Renaming session "` +
    session.name.replace(/\\/g, "") +
    `"</div><hr/><div id="renameGameInputCont" class="textInputCont">
    <form onsubmit="return renameSession(event, this, '` +
    session.id.substr(4) +
    `')" id="renameGameInput"></input>
    <input class="textInput" type="text" autocomplete="off" value="` +
    session.name.replace(/\\/g, "") +
    `"></input>
    <input class="textSubmit" type="submit" value="">`;
  $("body").append(el);
  focusFirstInput(".subContextContainer");
}

function renameSession(event, caller, code) {
  var newName = $(caller).children('input[type="text"]').first().val();
  var oldName = $(".sessionTitle." + code).text();
  ttsFetch(
    "/rename_session",
    {
      code: code,
      newName: $(caller).children('input[type="text"]').first().val(),
    },
    (res) => {
      if ($(".phraseDisplay .owner").length > 0) {
        //Renaming the current session
        $(".phraseDisplay").each(function () {
          $(this).html(
            `<div class="phraseText">Session: ` +
              newName +
              `</div><div class="owner">👑<div class="tooltip">Owner</div></div><ion-icon name="settings-outline"></ion-icon>`
          );
        });
        $(".phraseDisplay>ion-icon").on("click", function () {
          showSessionSettings();
        });
      }
      if ($(".sessionTitle." + code).length == 0) {
        $("#" + code)
          .parent()
          .prepend(
            `<div class="sessionTitle ` + code + `">` + newName + `</div>`
          );
      } else {
        $(".sessionTitle." + code).text(newName);
      }
    }
  );

  $(".subContextContainer").each(function () {
    $(this).remove();
  });
  return false;
}

function showDeleteSession(session) {
  var el =
    `<div class="subContextContainer"><div class="subContextDelete" id="subContext_` +
    session.id +
    `" >`;
  el +=
    `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
    `<div class="subContextTitle">Really delete session "` +
    session.name.replace(/\\/g, "") +
    `"?</div><hr/>
    <div class="button greenBtn" id="deleteCancel" onclick="$(this).parent().parent().remove()">Cancel</div>
    <div class="button redBtn" id="deleteConfirm" onclick="deleteSession('` +
    session.id +
    `')">Delete</div>`;
  $("body").append(el);
}

function deleteSession(code) {
  ttsFetch(
    "/delete_session",
    {
      code: code,
    },
    (res) => {
      if (code) {
        $("#" + code)
          .parent()
          .remove();
      }
      gulp();
      $(".subContextContainer").each(function () {
        $(this).remove();
      });
    }
  );
}

function menuSubmitCode(code) {
  closeMenuItem("#sessionsView");
  if ($("#homeView").hasClass("off") && window.hist) {
    goBack(window.hist[window.hist.length - 1], "#homeView");
    window.hist = ["#homeView"];
    setBackHome();
  }
  $("#contextShadow").addClass("off");
  $(".contextActions.slideUp").remove();
  submitCode(code);
}

function submitCode(code) {
  clearLists(); //Clear any lists in #selectView
  window.hist = ["#homeView"];
  setBackHome();
  $(".errorText").removeClass("shake"); //Stop shaking if started
  ttsFetch("/join_session", { code: code }, (res) => {
    if (res.owned) {
      createSession(res.status);
    } else {
      joinSession(res.status);
    }
  });
  $("#codeInput .textInput").first().val(window.location.pathname.substr(1));
}

/** setPlural(countable, singular, plural)
 * {Desc} Returns singular if countable is singular, plural if otherwise
 *
 * @param {Number} countable
 * @param {String} singular
 * @param {String} plural
 * @returns {String} Singluar or plural
 */
function setPlural(countable, singular, plural) {
  if (countable == 1) {
    return singular;
  }
  return plural;
}

/**
 * Adds a game to user, unsorted
 *
 * @param {*} event
 */
function addNewGame(el) {
  if (
    el == "#menuAddGamesInput" &&
    $(el).parent().children("input[type=checkbox]").first().prop("checked")
  ) {
    var list = $("#addGameList").val();
  } else {
    var list = "";
  }
  var game = $(el)
    .val()
    .replace(/&/, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "\\'");
  $(el).val("");
  ttsFetch("/game_add", { game: game, list: list }, (res) => {
    var name = res.status.name.replace(/\\/g, "");
    var htmlString =
      `<li>
                <div rating="` +
      res.status.rating +
      `" owned="` +
      res.status.owned +
      `" class="gameName" game_id="` +
      res.status._id +
      `">` +
      name +
      `
                </div>
                <div class='toggle'>
                    <label class="switch">
                        <input type="checkbox" onclick="toggleFont(this)" game_id="` +
      res.status._id +
      `">
                        <span class="slider round"></span>
                    </label>
                </div>
            </li>`;
    $("li#0").children(".listGames").first().append(htmlString);
    if (el == "#addGamesInput" || el == "#hitMeGame") {
      var toAdd = $('.listGames input[game_id="' + res.status._id + '"]');
      toAdd.prop("checked", true);
      toggleFont(toAdd);
    } else {
      gulp(true);
      recheckGreenLists();
    }
  });
  return false;
}

/**
 * Adds a list to a user
 *
 * @param {*} event
 */
function addList() {
  var list = menuAddListInput.value;
  ttsFetch("/list_add", { list: list }, (res) => {
    var gamesNum = $("#gamesView #gamesContainer").children("li").length;
    $("#gamesView #gamesContainer").append(
      `<li id="games` +
        gamesNum +
        `">` +
        `<div class="menuGamesContainer">
              <div class="listName" onclick="openList($(this).parent().parent().attr('id'))">` +
        list +
        `
              </div>
            </div>
            <div class="listExpand" onclick="showGameContext({id: 'list'+$(this).parent().attr('id').substr(5)})"> 
              <ion-icon name="ellipsis-vertical"></ion-icon> 
            </div>
            <div class="listGames off"></div>
        </li>`
    );
    $("#listContextContainer").append(
      writeListContext({
        id: "list" + gamesNum,
        name: list,
        listCode: res.listCode,
      })
    );
    $(".subContextContainer").remove();
  });
  return false;
}

function recheckGreenLists() {
  console.log("rechecking...");
  recheckLimit();
  $("#selectLists>li").each(function (ind, ele) {
    var count = 0;
    $(ele)
      .children(".listGames")
      .first()
      .children("li")
      .each(function (i, e) {
        if ($(e).children(".gameName").first().hasClass("greenText")) {
          count++;
          /*console.log(
            count,
            $(ele).children(".listGames").first().children("li").length
          );*/
        }
      });
    var theCount = $(ele).children(".listGames").first().children("li").length;
    if (count == theCount && theCount > 0) {
      $(ele).children(".listName").first().addClass("greenText");
      $(ele)
        .children(".toggle")
        .children(".switch")
        .children("input")
        .prop("checked", true);
    } else {
      $(ele).children(".listName").first().removeClass("greenText");
      $(ele)
        .children(".toggle")
        .first()
        .children(".switch")
        .children("input")
        .prop("checked", false);
    }
  });
  console.log("checked");
}

//Check list boxes and change text to green on first display
//by getting the list of games already added to the session
//and checking to see if every game in a list has been added
function initGreenLists() {
  var sessionGames = [];
  $("session")
    .children()
    .each(function (i, e) {
      sessionGames.push($(e).attr("id"));
    });
  //console.log(sessionGames);

  $("#selectLists>li").each(function (ind, ele) {
    var count = 0;
    $(ele)
      .children(".listGames")
      .first()
      .children("li")
      .each(function (i, e) {
        var eID = $(e).children(".gameName").first().attr("game_id");
        if (sessionGames.findIndex((item) => item == eID) > -1) {
          count++;
          //console.log(count + " ," + $(e).parent().children().length);
          var toggle = $(e)
            .children(".toggle")
            .children(".switch")
            .children("input");
          $(toggle).attr("onclick", "");
          $(toggle).prop("checked", true);
          $(e).children(".gameName").first().addClass("greenText");
          $(toggle).attr("onclick", "toggleFont(this)");
        } else {
          var toggle = $(e)
            .children(".toggle")
            .children(".switch")
            .children("input");
          $(toggle).attr("onclick", "");
          $(toggle).prop("checked", false);
          $(e).children(".gameName").first().removeClass("greenText");
          $(toggle).attr("onclick", "toggleFont(this)");
        }
        if (count == $(e).parent().children().length) {
          $(e)
            .parent()
            .parent()
            .children(".listName")
            .first()
            .addClass("greenText");
          $(e)
            .parent()
            .parent()
            .children(".toggle")
            .first()
            .children(".switch")
            .children("input")
            .first()
            .prop("checked", true);
        }
      });
  });
  recheckLimit();
}

function recheckLimit(limit) {
  if (limit) {
    $("#limitMax").html(limit);
  }
  var arr = [];
  $(".gameName.greenText").each((i, e) => {
    if (arr.findIndex((obj) => obj == $(e).attr("game_id")) == -1) {
      arr.push($(e).attr("game_id"));
    }
  });
  $("#limitCurrent").html(arr.length);
  if (Number($("#limitCurrent").html() < $("#limitMax").html())) {
    $("#limitDisplay").removeClass("red");
  } else {
    $("#limitDisplay").addClass("red");
  }
  if (Number($("#limitMax").html()) > 0) {
    $("#limitDisplay").removeClass("off");
  } else {
    $("#limitDisplay").addClass("off");
  }
}

/***********************************/
/* Change Font color of game names */
/* and handle category checking    */
/***********************************/

function makeGreenSelect(id) {
  $('.gameName[game_id="' + id + '"]').each(function (i, e) {
    $(e).addClass("greenText");
    $(e)
      .parent()
      .children(".toggle")
      .children(".switch")
      .children("input")
      .first()
      .prop("checked", true);
  });
  //recheckGreenLists();
}
function unMakeGreenSelect(id) {
  $('.gameName[game_id="' + id + '"]').each(function (i, e) {
    $(e).removeClass("greenText");
    $(e)
      .parent()
      .children(".toggle")
      .children(".switch")
      .children("input")
      .first()
      .prop("checked", false);
  });
  //recheckGreenLists();
}

/***********************************/
/*       Clear all checkboxes      */
/***********************************/
function clearLists() {
  $("selectLists")
    .children()
    .each(function (i) {
      $(this)
        .children(".listGames")
        .first()
        .children("li")
        .each(function (j) {
          var el = $(this)
            .children(".toggle")
            .first()
            .children(".switch")
            .first()
            .children("input")
            .first();
          el.attr("onclick", "");
          el.prop("checked", false);
          el.attr("onclick", "toggleFont(this)");
        });
    });
}

function toggleEdit(check) {
  var el = $(check).parent().parent().parent().children(".editGame").first();
  var gamesToAdd = [];
  var gamesToRemove = [];
  if ($(check).is(":checked")) {
    el.addClass("greenText");
    gamesToAdd.push($(check).attr("game_id"));
  } else {
    el.removeClass("greenText");
    gamesToRemove.push($(check).attr("game_id"));
  }
  ttsFetch(
    "/modify_edit_list",
    {
      gamesToAdd: gamesToAdd,
      gamesToRemove: gamesToRemove,
      code: document.getElementById("code").innerHTML,
    },
    (res) => {
      var htmlString = "";
      var isChecked = "";
      for (var i = 0; i < res.status.length; i++) {
        res.status[i].active ? (isChecked = " checked") : (isChecked = " ");
        htmlString +=
          `<li><div class="editGame">` +
          res.status[i].name.replace(/\\/g, "") +
          `</div>` +
          `<div class='toggle'>
          <label class="switch">
              <input type="checkbox"` +
          isChecked +
          ` onclick="toggleEdit(this)" game_id="` +
          res.status[i].id +
          `">
              <span class="slider round"></span>
          </label>
      </div></li>`;
      }
      $("#editGameList").html(htmlString);
      sortEditGames();
      registerEGS();
    }
  );
}

function registerEGS() {
  $("#editGameSubmit").off();
  $("#editGameSubmit").on("click", function () {
    ttsFetch(
      "/start_voting",
      {
        code: document.getElementById("code").innerHTML,
      },
      (res) => {
        goForwardFrom("#postSelectView", "#voteView");
      }
    );
  });
}

function toggleFont(check) {
  var current = Number($("#limitCurrent").html());
  var max = Number($("#limitMax").html());
  var el = $(check).parent().parent().parent().children(".gameName").first();

  var gamesToAdd = [];
  var gamesToRemove = [];
  if (el.length > 0) {
    if ($(check).is(":checked")) {
      el.addClass("greenText");
      gamesToAdd.push($(check).attr("game_id"));
      makeGreenSelect($(check).attr("game_id"));
    } else {
      el.removeClass("greenText");
      gamesToRemove.push($(check).attr("game_id"));
      unMakeGreenSelect($(check).attr("game_id"));
    }
  } else {
    $(check)
      .parent()
      .parent()
      .parent()
      .children(".listName")
      .first()
      .toggleClass("greenText");
    var el = $(check)
      .parent()
      .parent()
      .parent()
      .children(".listGames")
      .children("li");
    if ($(check).is(":checked")) {
      el.each(function (i) {
        if (
          !$(this)
            .children(".toggle")
            .children()
            .children("input")
            .is(":checked")
        ) {
          gamesToAdd.push($(this).children(".gameName").attr("game_id"));
          makeGreenSelect($(this).children(".gameName").attr("game_id"));
        }
        $(this)
          .children(".toggle")
          .children()
          .children("input")
          .prop("checked", true);
        $(this).children(".gameName").addClass("greenText");
      });
    } else {
      el.each(function (i) {
        if (
          $(this)
            .children(".toggle")
            .children()
            .children("input")
            .is(":checked")
        ) {
          gamesToRemove.push($(this).children(".gameName").attr("game_id"));
          unMakeGreenSelect($(this).children(".gameName").attr("game_id"));
        }
        $(this)
          .children(".toggle")
          .children()
          .children("input")
          .prop("checked", false);
        $(this).children(".gameName").removeClass("greenText");
      });
    }
  }
  if (gamesToAdd.length <= max - current || gamesToAdd.length == 0 || max < 1) {
    ttsFetch(
      "/add_game_to_session",
      {
        gamesToAdd: gamesToAdd,
        gamesToRemove: gamesToRemove,
        code: document.getElementById("code").innerHTML,
      },
      () => {
        recheckGreenLists();
      }
    );
  } else {
    if (gamesToAdd.length == 1) {
      var plural = "";
    } else {
      var plural = "s";
    }
    createAndShowAlert(
      "You cannot add " +
        gamesToAdd.length +
        " game" +
        plural +
        ". Remove some games to suggest new ones!",
      true
    );
    $(check).prop("checked", false);
    $(check)
      .parent()
      .parent()
      .parent()
      .children()
      .first()
      .removeClass("greenText");
    gamesToAdd.forEach((e) => {
      $("input[game_id=" + e + "]").each((i, e) => {
        $(e).prop("checked", false);
        $(e)
          .parent()
          .parent()
          .parent()
          .children()
          .first()
          .removeClass("greenText");
      });
    });
  }
}

/*****************************/
/*        listToggle(el)     */
/*****************************/
/**
 * {refresh the displayed view after an interval}
 *
 */
function catchDisplay() {
  window.setTimeout(function () {
    $("#mainView")
      .children(".view")
      .each(function () {
        if ("#" + $(this).attr("id") == window.hist[window.hist.length - 1]) {
          $(this).removeClass("off");
        } else {
          $(this).addClass("off");
        }
      });
  }, 3000);
}

/*****************************/
/*        listToggle(el)     */
/*****************************/
/**
 * {Display or remove a particular list of games in the select view}
 *
 * @param {*} el
 */
function listToggle(el) {
  $(el).toggleClass("expanded");
  $(el).parent().children(".listGames").first().toggleClass("off");
}

/*****************************/
/*       setCode(code)       */
/*****************************/
/*
 * Desc: Display the session code in correct places
 *
 * @param {Array} select
 */
function setCode(code) {
  $("#code").html(code);
  history.pushState(
    {},
    "SelectAGame: " + $("#code").html(),
    window.location.origin + "/" + $("#code").html()
  );
  $(".codeDisplay").each(function () {
    $(this).html("Your Code: " + code);
  });
  $(".codeDisplay").click(function () {
    copyText(
      window.location.origin + "/" + $("#code").html(),
      "Link copied to clipboard"
    );
  });
  $("#codeInput .textInput").first().val(code);
}

/*****************************/
/*     setPhrase(phrase)     */
/*****************************/
/*
 * Desc: Display the session phrase in correct places
 *
 * @param {Array} select
 */
function setPhrase(phrase) {
  $(".phraseDisplay").each(function () {
    if (typeof phrase == "undefined") {
      $(this).html();
    } else {
      $(this).html(phrase);
    }
  });
}

/*****************************/
/*    copyText(codeArea)     */
/*****************************/
/**
 * {Desc} Copy text from the codeArea to the clipboard
 *
 * @param {*} codeArea
 */
function copyText(copy, text) {
  createAndShowAlert(text);
  const el = document.createElement("textarea");
  el.value = copy;
  document.body.appendChild(el);

  /* Select the text field */
  el.select();
  el.setSelectionRange(0, 99999); /*For mobile devices*/

  /* Copy the text inside the text field */
  document.execCommand("copy");
  document.body.removeChild(el);
}

function showAlert(alert) {
  $(alert).css({ opacity: 1, "z-index": 11 });
  setTimeout(function () {
    $(alert).css({ opacity: 0 });
    setTimeout(function () {
      $(alert).css({ "z-index": 0 });
    }, 1000);
  }, 1000);
}

function createAndShowAlert(alert, error = false) {
  $("#tempAlert").remove();
  var red = "";
  if (error) {
    red = " red";
  }
  $("body").append(
    '<div id="tempAlert" onclick="$(this).remove()" class="tempAlert' +
      red +
      '">' +
      alert +
      "</div>"
  );
  $("#tempAlert").css({ opacity: 1, "z-index": 101 });
  setTimeout(function () {
    $("#tempAlert").css({ opacity: 0 });
    setTimeout(function () {
      $("#tempAlert").remove();
    }, 3000);
  }, 3000);
}

function focusFirstInput(el) {
  $(el + ' input[type="text"]')
    .first()
    .focus();
}

function updateCurrentGames(curGames) {
  var htmlString = ``;
  console.log(curGames);
  console.log($(".curGameItem"));
  curGames.forEach(function (e) {
    htmlString += `<div class="curGameItem">` + e.replace(/\\/g, "") + `</div>`;
  });
  $("#currentGames").html(htmlString);
  $("#listNotify").html("<span>" + curGames.length + "</span>");
  var games = [];
  $(".curGameItem").each(function (i, e) {
    if ($(e).children("a").length == 0) {
      games.push({ element: e, game: $(e).html() });
    }
  });
  console.log(
    "Wrapping " + games.length + " games that didn't have links in them"
  );
  //This rewraps ALL games because there's no function to salvage old links from the list before it's replaced wholesale
  wrapGameUrls(games);
}

/*****************************/
/*     showSelect(data)    */
/*****************************/
/*
 * Desc: Update user selections in real time
 *
 * @param {Array} select
 */
function showSelect(data, isOwner) {
  htmlString = "";
  var connecting = "";
  var plural = "s";
  $.each(data, function (key, value) {
    if (value.done) {
      connecting = "done";
    } else {
      value.num > 0 ? (connecting = "selecting") : (connecting = "connecting");
    }
    value.num == 1 ? (plural = "") : (plural = "s");
    htmlString +=
      `<div class="conUser ` +
      connecting +
      `">User ` +
      value.name +
      ` has selected ` +
      value.num +
      ` game` +
      plural +
      `...</div>`;
  });
  if (isOwner) {
    htmlString += `<div class="button greenBtn bottomBtn" id="gameLock" type="submit">Lock Game List 🔒</div>`;
  }
  if ($("#postSelectIntro").length > 0) {
    htmlString = $("#postSelectIntro")[0].outerHTML + htmlString;
  }
  $("#postSelectContainer").html(htmlString);
  //Is this setting up too many events?
  $("#gameLock").click(this, function () {
    lockGames($("#code").text());
  });
}

/*****************************/
/*      showToolTip()     */
/*****************************/

/**
 *
 *
 * @param {*} thumb jQuery element to toggle class showVoteThumb on
 * @param {*} container jQuery element (toolTipContainer) to call function showVoteThumb on
 */
function showToolTip(thumb, container) {
  if ($(".toolTipContainer.showToolTip").length === 0) {
    $(thumb).toggleClass("showVoteThumb");
    console.trace();
    console.log({ container });
    showVoteThumb(container);
    setTimeout(function () {
      $(container).toggleClass("showToolTip");
      onClickOutside(
        ".showToolTip",
        ".showToolTip",
        undefined,
        true,
        closeToolTipClickOutside
      );
    }, 10);
  }
}

function closeToolTipClickOutside(el) {
  closeToolTip($(el).children().first());
}

/*****************************/
/*      closeToolTip()     */
/*****************************/
/*
 * Desc: Close the game tooltip
 *
 * @param {*} el Tooltip Container
 */
function closeToolTip(el) {
  $(el).parent().removeClass("showToolTip");
  setTimeout(function () {
    $(el).parent().parent().parent().removeClass("showVoteThumb");
  }, 251);
}

/*****************************/
/*      showVoteThumb()     */
/*****************************/
/*
 * Desc: Get the game thumbnail and description from BGG
 *
 * @param {*} el Tooltip Container
 */
function showVoteThumb(el) {
  var $el = $(el);
  if ($el.children(".BGGDesc").length == 0) {
    $el.append(`<div class="BGGDesc"></div>`);
    var id = $el.children(".voteSubTitle").children("a").attr("href");
    console.log("id: " + id);
    if (id) {
      id = id.substr(0, id.lastIndexOf("/"));
      id = id.substr(id.lastIndexOf("/") + 1);
      if (id == "www.boardgamegeek.com") {
        id = $el.children(".voteSubTitle").children("a").attr("href");
        if (id.indexOf("objecttype=boardgame") > -1) {
          id = id.substring(
            id.lastIndexOf("q=") + 2,
            id.lastIndexOf("&object")
          );
        } else {
          id = id.substr(id.lastIndexOf("q=") + 2);
        }
        console.log({ id });
      }
      parseBGGThing(id, "thumb_url").then(function (res) {
        if (res != "undefined" && typeof res != "undefined") {
          $el
            .children(".BGGDesc")
            .prepend(
              `<div class="BGGThumb"><img src="` + res + `"></img></div>`
            );
        } else {
          $el
            .children(".BGGDesc")
            .prepend(
              `<div class="BGGThumb"><div class="noImage">No Image Found</div></div>`
            );
        }
      });
      parseBGGThing(id, "description_preview").then(function (res) {
        if (typeof res == "undefined") {
          $el
            .children(".BGGDesc")
            .append(
              `<div class="BGGDescText">No description is available for this game.</div>`
            );
        } else {
          res = htmlDecode(res);
          if (res.length > 200) {
            res = reduceUntilNextWordEnd(res.substr(0, 200));
            res =
              "<div>" +
              res +
              `...</div><a target="_blank" href="` +
              $el.children(".voteSubTitle").children("a").attr("href") +
              `">[Read More<ion-icon name="open-outline"></ion-icon>]</a>`;
          }
          $el
            .children(".BGGDesc")
            .append(`<div class="BGGDescText">` + res + `</div>`);
        }
      });
    }
  }
}

function reduceUntilNextWordEnd(input, found = false) {
  var end = input.substr(-1);
  //console.log(end, ": ", input);
  if (end.search(/[a-zA-Z0-9]/) > -1) {
    //Last character is a letter or number
    if (found) {
      //Last character is a letter or number and the previously removed character was not
      //console.log(input);
      return input;
    } else {
      return reduceUntilNextWordEnd(input.substr(0, input.length - 1));
    }
  } else {
    //Found the potential end, unless there's still a space or punctuation to discover
    //
    return reduceUntilNextWordEnd(input.substr(0, input.length - 1), true);
  }
}

function htmlDecode(input) {
  return $("<div />").html(input).text();
}

/*******************************/
/* sortObjectArray(obj, field) */
/*******************************/
/**
 *
 *
 * @param {Array} arr Array of objects to sort
 * @param {String} field Field to sort by
 * @returns {Array} sorted array
 */
function sortObjectArray(arr, field) {
  arr.sort(lowerCaseFieldSort(field));
  return arr;
}

/*****************************/
/*      fillVotes(games)     */
/*****************************/
/*
 * Desc: Create the voting html
 *
 * @param {Array} games
 */

function fillVotes(games) {
  games = games.sort(lowerCaseFieldSort("name"));
  var localGames = localStorage.getItem($("#code").html());
  if (localGames === null) {
    localGames = [];
    for (var i = 0; i < games.length; i++) {
      localGames[i] = { id: games[i].game, vote: "500" };
    }
  } else {
    localGames = JSON.parse(localGames);
  }
  var htmlString = `<div id="voteInfo">Drag the slider for each game to vote! All the way to the right means you ABSOLUTELY have to play the game, all the way to the left means you can't stand the idea of playing the game.</div><div class="voteList">`;
  for (var i = 0; i < games.length; i++) {
    var votes =
      localGames[
        localGames.findIndex((obj) => {
          return obj.id == games[i].game;
        })
      ].vote;
    if (typeof votes == "undefined") {
      votes = 500;
    }
    htmlString +=
      `<div class="voteItem"><div class="voteLabel"><label for="` +
      games[i].game +
      `">` +
      games[i].name.replace(/\\/g, "") +
      `</label><div class="voteToolTip">
          <ion-icon name="help-circle-outline"></ion-icon>
          <div class="toolTipContainer"><div class="voteSubTitle">` +
      games[i].name.replace(/\\/g, "") +
      `</div>
        </div>
      </div></div>`;
    htmlString +=
      `<input type='range' min='1' max='1000' value='` +
      votes +
      `' step='1' id="` +
      games[i].game +
      `"/></div>`;
  }
  htmlString += `</div><div class="submitButton button greenBtn bottomBtn" id="voteButton">Submit Votes</div>`;
  //console.log("The string: ", htmlString);
  $("#voteContainer").html(htmlString);
  /*var voteIncrementer = 0;*/
  $("input[type=range]").on("change", function () {
    if ($(".userName").length > 0) {
      var arr = [];
      /*voteIncrementer++;*/
      $("input[type=range").each(function (i, e) {
        arr.push({ id: $(e).prop("id"), vote: $(e).val() });
      });
      localStorage.setItem($("#code").html(), JSON.stringify(arr));
      /*ttsFetch(
        "save_votes",
        { votes: arr, incrementer: voteIncrementer, code: $("#code").text() },
        () => {}
      );*/
    }
  });
  //sortVotes();

  var gamesToWrap = [];
  for (var i = 0; i < games.length; i++) {
    gamesToWrap.push({
      game: games[i].name,
      element: $(".voteToolTip .voteSubTitle")[i],
    });
  }
  wrapGameUrls(gamesToWrap);
  //$(".voteSubX").on("click", function() {closeToolTip(this)});
  $(".voteLabel label").on("click", function () {
    console.log(".voteLabel label");
    showToolTip(
      $(this).parent(),
      $(this).parent().children(".voteToolTip").children(".toolTipContainer")
    );
  });
  $(".voteToolTip>ion-icon").on("click", function () {
    console.log(".voteToolTip>ion-icon");
    showToolTip(
      $(this).parent().parent(),
      $(this).parent().children(".toolTipContainer")
    );
  });
  $("#voteButton").on("click", function () {
    var theCode = $("#code").text();
    var voteArray = [];
    $(".voteItem").each((i, e) => {
      voteArray.push({
        game: $(e).children("input")[0].id,
        vote: $(e).children("input").val(),
      });
    });
    ttsFetch(
      "/submit_votes",
      {
        code: theCode,
        voteArray: voteArray,
      },
      (res) => {
        localStorage.removeItem(theCode);
        goForwardFrom("#voteView", "#postVoteView");
        window.hist = ["#homeView", "#postVoteView"];
        setBackHome();
      }
    );
  });
}

function sortVotes() {
  $("#voteContainer .voteList")
    .first()
    .children(".voteItem")
    .sort(lowerCaseDivSort(".voteLabel", "label"))
    .appendTo("#voteContainer .voteList")
    .first();
}

/*****************************/
/*    fillPostVote(users)    */
/*****************************/
function fillPostVote(users) {
  console.log("fillPostVote");
  var htmlString = ``;
  var votedText = "";
  var votedClass = "";
  for (var i = 0; i < users.length; i++) {
    if (users[i].doneVoting) {
      votedText = " has finished voting";
      votedClass = " voted";
    } else {
      votedText = " is still voting";
      votedClass = " voting";
    }
    htmlString +=
      `<div class="voteUser` +
      votedClass +
      `">` +
      users[i].name +
      votedText +
      `</div>`;
  }
  htmlString += `<div id="endVoteButton" class="submitButton button greenBtn bottomBtn">End Voting</div>`;
  $("#postVoteContainer").html(htmlString);

  $("#endVoteButton").click(this, function (el) {
    var theCode = $("#code").text();
    ttsFetch(
      "/end_vote",
      {
        code: theCode,
      },
      (res) => {
        goForwardFrom("#postVoteView", "#playView");
      }
    );
  });
}

function textSubmit(el) {
  addNewGame(el);
  $("#addGamesInputCont .textSubmit").first().addClass("green");
  setTimeout(function () {
    $("#addGamesInputCont .textSubmit").first().removeClass("green");
  }, 1000);
  $(".subContextContainer").remove();
  return false;
}

/*****************************/
/*   Submit button handler   */
/* Checks user inputted code */
/*    Calls join_session     */
/*****************************/
function submitSessionCode() {
  submitCode(
    $("#codeInput input")
      .val()
      .replace(/&/, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "\\'")
  );
  return false;
}

function toggleWeight(el) {
  if ($(el).parent().children(".voteWeight").length > 0) {
    $(el).parent().children(".voteWeight").remove();
  } else {
    $(el)
      .parent()
      .append(
        "<div class='voteWeight'>" +
          $(el).parent().attr("data-content") +
          "</div>"
      );
  }
}

function fillGames(games) {
  if (games.length > 0) {
    var htmlString = ``;
    var bottom = games[games.length - 1].votes;
    var top = games[0].votes - bottom;
    for (var i = 0; i < games.length; i++) {
      games[i].weight = ((games[i].votes - bottom) / top) * 100;
      games[i].weight = games[i].weight.toString().substr(0, 4);
    }
    if (games.length == 1) {
      games[0].weight = 100;
    }
    for (var i = 0; i < games.length; i++) {
      if (!$.isEmptyObject(games[i])) {
        htmlString +=
          `<div class="playGame"` +
          ` id="play` +
          i +
          `"><div class="playGameTitle">` +
          games[i].name.replace(/\\/g, "") +
          `</div><div class="voteWeight">(` +
          games[i].weight +
          `)</div><div class="playBGGLink button greenBtn">View on BGA</div></div>`;
      }
    }
    $("#playContainer").html(htmlString);
    $(".playGameTitle").click(function () {
      $(this).parent().children(".playBGGLink").toggleClass("showBGGLink");
    });
    var gamesToWrap = [];
    $(".playGameTitle").each(function (i, e) {
      gamesToWrap.push({
        element: $(e).parent().children(".playBGGLink"),
        game: $(e).text(),
      });
    });
    for (var i = 0; i < games.length; i++) {
      gamesToWrap.push({ element: $(".voteSubTitle")[i], game: games[i].name });
    }
    wrapGameUrls(gamesToWrap);
  }
}

function playShare() {
  if (navigator.share) {
    navigator
      .share({
        title: "SelectAGame",
        text: "View our SelectAGame playlist at ",
        url:
          "https://selectagame.net/" +
          document.getElementById("code").innerHTML,
      })
      .then(() => console.log("Successful share"))
      .catch((error) => console.log("Error sharing", error));
  } else {
    var games = "";
    $(".playGame").each(function (i, e) {
      games +=
        i +
        1 +
        ": " +
        $(e).children(".playGameTitle").first().text() +
        "%0D%0A";
    });
    window.open(
      "mailto:?Subject=SelectAGame%20Playlist%20" +
        document.getElementById("code").innerHTML +
        "&body=Click this link to view our playlist on SelectAGame%0D%0A%0D%0Ahttps://selectagame.net/" +
        document.getElementById("code").innerHTML +
        '%0D%0A%0D%0AIf the above link doesn%27t work, click "Join Game" on the home page and enter this code: ' +
        document.getElementById("code").innerHTML +
        "%0D%0A%0D%0AHere%27s our playlist: %0D%0A%0D%0A" +
        games
    );
  }
}

function importSessionAsList() {
  ttsFetch(
    "find_session_list",
    {
      list: $(".phraseText").first().text().substr(8),
    },
    (res) => {
      $(".subContextContainer").each(function () {
        $(this).remove();
      });
      var code = $(".codeDisplay").first().text().substr(11);

      var text = "Create a new list using the games from this session?";
      var el = `<div class="subContextContainer"><div class="subContextImport">`;
      el +=
        `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
        `<div class="subContextTitle">` +
        text +
        `</div><hr/>`;
      if (res.exists) {
        el += `<div id="importDuplicate">
      <div id="importOverwrite"><input type="radio" name="duplicate" id="importOverwriteCheckbox" checked="true"><label for="importOverwriteCheckbox"> Overwrite?</label></div>
      <div id="importRename"><input type="radio" name="duplicate" id="importRenameCheckbox"><label for="importRenameCheckbox"> Rename?</label><input type="text" id="importRenameText" class="off"></div>
      </div>`;
      }
      el +=
        `<div class="button redBtn" id="importCancel" onclick="cancelImport()">Cancel</div>` +
        `<div class="button greenBtn" id="importSubmit" onclick="performListImport('` +
        $("#code").html() +
        `', '` +
        $(".phraseText").first().text().substr(8) +
        `', true)">Import</div>`;
      $("body").append(el);
    }
  );
}

function cancelImport() {
  $("#importCancel").parent().parent().parent().parent().remove();
  history.pushState({}, "SelectAGame", window.location.origin + "/");
}

/*function submitImportSessionAsList() {
  ttsFetch(
    "import_session_as_list",
    {
      code: $("#code").html(),
    },
    (res) => {
      $(".subContextContainer").each(function () {
        $(this).remove();
      });
      if (res.err) {
        createAndShowAlert(res.err, true);
      }
    }
  );
}*/
function showListSettings(el) {
  if ($(el).hasClass("listExpanded")) {
    $(el).next().children(".listSettings").remove();
    $(el).toggleClass("listExpanded");
  } else {
    htmlString =
      `<div class="listSettings">` +
      `<div id="listMove" onclick="listRename(this)">Move</div>` +
      `<div id="listRename" onclick="listRename(this)">Rename</div>` +
      `<div id="listDelete" onclick="listRename(this)">Delete</div>` +
      `</div>`;
    $(el).next().append(htmlString);
    $(el).toggleClass("listExpanded");
  }
}

function editList(list) {
  ttsFetch(
    "/edit_list",
    {
      gamesToAdd: gamesToAdd,
      gamesToRemove: gamesToRemove,
      code: document.getElementById("code").innerHTML,
    },
    (res) => {
      //console.log("Success");
    }
  );
}

function setAutoComplete(topList) {
  var auto = topList.map((e) => e.name);
  if (document.getElementById("menuAddGamesInput") != null) {
    autocomplete(document.getElementById("menuAddGamesInput"), auto);
  }
  if (document.getElementById("addGamesInput") != null) {
    autocomplete(document.getElementById("addGamesInput"), auto);
  }
}

function hitMe() {
  var arr = [];
  for (var i = 0; i < $("#games0 .listGames").children().length; i++) {
    if (
      !$(
        "#0 .listGames input[game_id='" +
          $($("#games0 .listGames").children()[i]).attr("id") +
          "']"
      ).prop("checked")
    ) {
      arr.push($($("#games0 .listGames").children()[i]).attr("id"));
    }
  }
  if (arr.length > 0) {
    var num = Math.floor(Math.random() * arr.length);
    var game = arr[num];
    /*$("body").append(
    `<input id="hitMeGame" value="` + game + `" class="off"></input>`
  );*/
    /*if (
    $("#0 .gameName").filter(function () {
      return $(this).text().toLowerCase().trim() == game.toLowerCase();
    }) == 0
  ) {*/
    var el = ".listGames li .toggle .switch input[game_id='" + game + "']";
    $(el).prop("checked", true);
    //debugger;
    toggleFont(el);
    $("#tempAlert").remove();
    createAndShowAlert("Added " + $("#" + game).text());
  } else {
    createAndShowAlert("No games to add! Add more games first.");
  }
  //$("#hitMeGame").remove();
  /*} else {
  //Add game to session
  }*/
}

function showSelectFilter() {
  if ($("#selectFilterList").length == 0) {
    $("body").append(
      `
  <div id="selectFilterListContainer" onclick="$('#selectFilterListContainer').remove(); $('#selectFilterItems').remove();"></div>
  <div id="selectFilterItems">
    <button class="closeButton" onclick="$('#selectFilterListContainer').remove(); $('#selectFilterItems').remove();">
      <ion-icon name='close-outline'></ion-icon>
    </button>
    <form id="selectFilterList" onsubmit="return submitSelectFilter()">
      <div id="selectFilterRowOne" class="selectFilterRow">
        <label for="selectNumPlayers">Filter by number of players:</label>
        <input type="number" name="selectNumPlayers" id="selectNumPlayers" min="0" value="` +
        $("#selectFilter").attr("players") +
        `">
      </div>
      <div id="selectFilterRowTwo" class="selectFilterRow">
        <label for="excludeUnknown">Exclude games if game player number is unknown? </label>
        <input type="checkbox" name="excludeUnknown" ` +
        $("#selectFilter").attr("exclude") +
        `></input>
      </div>
      <div id="selectFilterRowThree" class="selectFilterRow">
        <button type="reset" class="filterClear" onclick="$('#selectNumPlayers').val(0);submitSelectFilter();">Remove Filter</button>
        <button type="submit" class="filterSubmit">Set Filter</button>
      </div>
    </form>
  </div>
  `
    );
  }
}

function submitSelectFilter() {
  var players = Number($("#selectNumPlayers").val());
  var exclude = $("#selectFilterItems input[name=excludeUnknown]").prop(
    "checked"
  );
  $("#selectFilter").attr("players", players);
  if (exclude) {
    $("#selectFilter").attr("exclude", "checked");
  } else {
    $("#selectFilter").attr("exclude", "");
  }

  $("#selectLists .listGames li").each(function (i, e) {
    if (players <= 0) {
      $(e).removeClass("off");
      $("#selectFilter").removeClass("filterActive");
    } else {
      $("#selectFilter").addClass("filterActive");
      var topList = localforage.getItem("topList").then((topList) => {
        //TODO: Fix the rest of this function to match localforage
        var match = -1;
        var name = $(e).children(".gameName").first().text().trim();
        for (let i = 0; i < topList.length; i++) {
          if (topList[i].name == name || topList[i].actualName == name) {
            match = i;
            break;
          }
        }
        if (match > -1) {
          if (typeof topList[match].metadata.minplayers != "undefined") {
            min = Number(topList[match].metadata.minplayers);
          } else {
            min = -1;
          }
          if (typeof topList[match].metadata.maxplayers != "undefined") {
            max = Number(topList[match].metadata.maxplayers);
          } else {
            max = -1;
          }
          if (min <= players && players <= max) {
            $(e).removeClass("off");
          } else {
            $(e).addClass("off");
          }
        } else {
          if (exclude) {
            $(e).addClass("off");
          } else {
            $(e).removeClass("off");
          }
        }
      });
    }
  });
  $("#selectFilterListContainer").remove();
  $("#selectFilterItems").remove();
  return false;
}

function checkBGG() {
  ttsFetch(
    "/check_bgg",
    {
      code: document.getElementById("code").innerHTML,
    },
    (res) => {
      if (res.success) {
        var htmlString = `<div id="accountbggConnectTitle" class="title">BoardGameGeek Account</div>
        <div id="accountbggConnectField" class="field">
          <button id="bggConnectButton">Reconnect</button> 
        </div>
        <div id="accountbggCollImportTitle" class="title">BoardGameGeek Collection</div>
        <div id="accountbggCollImportField" class="field">
          <button id="bggCollImportButton">Import</button>
        </div>
        <div id="bggCollection" class="off">`;
        res.success.forEach(function (e) {
          htmlString += `<div class="bggGame">`;
          $.each(e, function (i, el) {
            htmlString += `<div class="` + i + `">` + el + `</div>`;
          });
          htmlString += `</div>`;
        });
        htmlString += `</div>`;
        $("#accountbggConnectTitle").remove();
        $("#accountbggConnectField").remove();
        $("#bggConnected").html(htmlString);
        $("#bggConnectButton").on("click", function () {
          showEditMenu("Enter your BGG username", "connectBGG");
        });
        $("#bggCollImportButton").on("click", function () {
          showBGGImport();
        });
      }
    },
    (res) => {}
  );
}

function showBGGImport() {
  var htmlString = `<div class="bggImport">
      <div class="closeButton" id="bggClose"><ion-icon name="close-outline"></ion-icon></div>
      <div class="bggImportTitle">
        <div class="bggImportTitleText">Select Games to Import</div>
      </div>
      <button class="bggFilterButton button greenBtn" id="bggFilterButton">Show Filters</button>
      <div class="bggFilters off">
        <div class="bggFilterLabel">Num. players:</div>
        <input class="bggFilterInput" id="bfNumP" type="number">
        <div class="bggFilterLabel">Min rank:</div>
        <input class="bggFilterInput" id="bfRank" type="number">
        <div class="bggFilterLabel">Min time:</div>
        <input class="bggFilterInput" id="bfMinT" type="number">
        <div class="bggFilterLabel">Max time:</div>
        <input class="bggFilterInput" id="bfMaxT" type="number">
        <div class="bggFilterLabel">Min plays:</div>
        <input class="bggFilterInput" id="bfMinX" type="number">
        <div class="bggFilterLabel">Max plays:</div>
        <input class="bggFilterInput" id="bfMaxX" type="number">
        <div class="bggFilterLabel">Owned:</div>
        <select class="bggFilterInput" id="bfOwned">
          <option value="b">Both</option>
          <option value="y">Yes</option>
          <option value="n">No</option>
        </select>
        <div class="bggFilterLabel">Wishlist:</div>
        <select class="bggFilterInput" id="bfWish">
          <option value="b">Both</option>
          <option value="y">Yes</option>
          <option value="n">No</option>
        </select>
        <div class="bggFilterLabel">Want to play:</div>
        <select class="bggFilterInput" id="bfWtp">
          <option value="b">Both</option>
          <option value="y">Yes</option>
          <option value="n">No</option>
        </select>
        <div class="bggFilterLabel">Want to buy:</div>
        <select class="bggFilterInput" id="bfWtb">
          <option value="b">Both</option>
          <option value="y">Yes</option>
          <option value="n">No</option>
        </select>
      </div>
      <div id="bggSelectAll"><label><input type="checkbox" onclick="bggSelectAll()"><div class="off">Select All</div></label></div>
      <div id="bggImportList"></div>
      <div class="bggListName">
        <div class="bggListNameTitle">Import into:</div>
        <select id="bggListSelect">`;
  $("#gamesContainer>li").each(function (i, e) {
    htmlString +=
      `<option value="` +
      i +
      `">` +
      $(e).children(".menuGamesContainer").children(".listName").first().text();
    htmlString += `</option>`;
  });
  htmlString += `</select></div>
      <button id="importBGG" class="button greenBtn" onclick="importBGG()">Import</button> 
    </div>`;
  $("body").append(htmlString);
  $("#bggFilterButton").on("click", function () {
    $(".bggFilters").toggleClass("off");
    if ($(".bggFilters").hasClass("off")) {
      $("#bggFilterButton").text("Show Filters");
    } else {
      $("#bggFilterButton").text("Hide Filters");
    }
  });
  updateFilters();
  $(".bggFilterInput").on("change", function () {
    updateFilters();
  });
  $(".bggImport .closeButton").on("click", function () {
    $(this).parent().remove();
  });
}

function bggSelectAll() {
  var checked = $("#bggSelectAll label input").first().prop("checked");
  $("#bggImportList li").each(function (i, e) {
    $(e).parent().children("input").first().prop("checked", checked);
  });
}

function updateFilters() {
  var htmlString = ``;
  $("#bggCollection")
    .children(".bggGame")
    .each(function (i, e) {
      if (
        compBool(e, "bfNumP", "lt", "maxplayers") &&
        compBool(e, "bfNumP", "gt", "minplayers") &&
        compBool(e, "bfRank", "gt", "rank") &&
        compBool(e, "bfMinT", "lt", "playingtime") &&
        compBool(e, "bfMaxT", "gt", "playingtime") &&
        compBool(e, "bfMinX", "lt", "plays") &&
        compBool(e, "bfMaxX", "gt", "plays") &&
        compFlex(e, "bfOwned", "own") &&
        compFlex(e, "bfWish", "wishlist") &&
        compFlex(e, "bfWtp", "wanttoplay") &&
        compFlex(e, "bfWtb", "wanttobuy")
      ) {
        htmlString +=
          `<label><input type="checkbox" id="bggImport` +
          i +
          `"></input><li>` +
          getGameVal(e, "name") +
          `</li></label>`;
      }
    });
  $("#bggImportList").html(htmlString);
}

function compFlex(e, filterVal, gameVal) {
  var f = getFilterVal(filterVal);
  var g = getGameVal(e, gameVal);
  if (f != "" && typeof f != "undefined") {
    if (f == "b") {
      return true;
    }
    if (f == "y") {
      return Number(g);
    }
    if (f == "n") {
      return !Number(g);
    }
    return "Error: filterVal must equal b, y, or n";
  }
}

function compBool(e, filterVal, op, gameVal) {
  var f = Number(getFilterVal(filterVal));
  var g = Number(getGameVal(e, gameVal));
  /*console.log(
    getGameVal(e, "name"),
    ", ",
    filterVal,
    ", f: ",
    f != "" && typeof f != "undefined",
    f,
    "g: ",
    g
  );*/
  if (f != "" && typeof f != "undefined") {
    if (op == "lt") {
      return f <= g;
    }
    if (op == "gt") {
      return f >= g;
    }
    return 'Error, op must be "lt" or "gt"';
  } else {
    return true;
  }
}

function getFilterVal(val) {
  return $("#" + val).val();
}

function getGameVal(e, val) {
  return $(e)
    .children("." + val)
    .first()
    .text();
}

function importBGG() {
  var arr = [];
  $("#bggImportList li").each(function (i, e) {
    if ($(e).parent().children("input").first().prop("checked")) {
      arr.push($(e).text());
    }
  });
  ttsFetch(
    "/game_add_bulk",
    {
      games: arr,
      list: $("#bggListSelect").val(),
    },
    (res) => {
      createAndShowAlert("Imported Games");
    }
  );
}

function showCurrentGames() {
  if ($("#currentGames").hasClass("off")) {
    $("#currentGames").removeClass("off");
    $("#contextShadow").removeClass("off");
    $("#contextShadow").addClass("desktopAlwaysOff");
    $("#curGamesClose").removeClass("off");
  } else {
    closeCurrentGames();
  }
}

function closeCurrentGames() {
  $("#currentGames").addClass("off");
  $("#contextShadow").addClass("off");
  $("#contextShadow").removeClass("desktopAlwaysOff");
  $("#curGamesClose").addClass("off");
}

function startLoader() {
  $(".preloader").fadeIn(1500);
}

function finishLoader() {
  $(".preloader").fadeOut(200);
  //this should somehow resolve a promise since it's Async. Instead it's turning the loader off before start can turn it on.
}

function showEditMenu(text, fn) {
  var htmlString =
    `` +
    `<div class="subContextContainer">
    <div class="subContextAccount" id="accountRename">
      <div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()">
        <ion-icon name="close-outline" role="img" class="md hydrated" aria-label="close outline"></ion-icon>
      </div>
      <div class="subContextTitle">` +
    text +
    `</div>
      <hr>
      <div id="accountInputCont" class="textInputCont">
        <form onsubmit="return ` +
    fn +
    `()" id="accountInput">
          <input class="textSubmit" type="submit" value="">
          <input class="textInput" type="text" autocomplete="off">
        </form>
      </div>
    </div>
  </div>`;
  $("body").append(htmlString);
  focusFirstInput(".subContextContainer");
}

function changeUsername() {
  ttsFetch(
    "/change_username",
    {
      newName: $("#accountInput input.textInput")
        .val()
        .replace(/&/, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "\\'"),
    },
    (res) => {
      $("#hContainer .login .userNameContainer .userName span").text(
        "Hello, " + res.name
      );
      $("#accountUsernameField").html(
        res.name +
          $("#accountUsernameField")
            .html()
            .substr($("#accountUsernameField").text().length)
      );
      $("#accountUsernameField ion-icon").click(this, function (el) {
        showEditMenu("Change Username", "changeUsername");
      });
      $(".subContextContainer").remove();
    }
  );
  return false;
}

/*function changeEmail() {
  const ce_options = {
    method: "POST",
    body: JSON.stringify({
      newEmail: $("#accountInput input.textInput").val(),
    }),
    headers: {
      "Content-Type": "application/json",
    },
  };
  startLoader();
  fetch("/change_email", ce_options).then(function (response) {
    finishLoader();
    return response.json().then((res) => {
      $("#accountEmailField").html(
        res.name +
          $("#accountEmailField")
            .html()
            .substr($("#accountEmailField").text().length)
      );
      $("#accountEmailField ion-icon").click(this, function (el) {
        showEditMenu("Email", "changeEmail");
      });
      $(".subContextContainer").remove();
    });
  });
  return false;
}
*/

function pwdReset() {
  ttsFetch(
    "/reset_password",
    {
      email: $("#accountEmailField").text(),
    },
    (res) => {
      if (res.status) {
        createAndShowAlert(res.status);
      }
    }
  );
}

function showError(err) {
  $el = $("#errorAlert");
  $el.html(err);
  $el.removeClass("off");
  setTimeout(function () {
    $el.css("opacity", 1);
    $el.css("z-index", 999);
    setTimeout(function () {
      $el.css("opacity", 0);
      $el.css("z-index", -1);
      setTimeout(function () {
        $el.addClass("off");
      }, 510);
    }, 2000);
  }, 10);
}

function accountImportCSV() {
  var el = `<div class="subContextContainer"><div class="subContext subContextCSV" id="subContextCSV" >`;
  el +=
    `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
    `<div class="subContextTitle">Choose a file to import</div>` +
    `<div class="subContextSubTitle">The first column of each row should be the name of the game, 
    and all other items on the row will be interpreted as lists to add the game to. This operation may take a long time for large files
    with many records, especially if those games are more obscure.</div>` +
    `<hr/>` +
    `<input type="file" id="uploadfile" onChange="readFile(this)">`;
  $("body").append(el);
}

function readFile(input) {
  var obj_csv = {
    size: 0,
    dataFile: [],
  };
  if (input.files && input.files[0]) {
    let reader = new FileReader();
    reader.readAsBinaryString(input.files[0]);
    reader.onload = function (e) {
      obj_csv.size = e.total;
      obj_csv.dataFile = e.target.result;
      var parsed = Papa.parse(obj_csv.dataFile);
      parsed.data[0][0] = parsed.data[0][0].replace(/ï»¿/, "");
      var data = parsed.data;
      data.forEach((row, rowIndex) => {
        for (var index = row.length; index > -1; index--) {
          if (row[index] == "") {
            data[rowIndex].splice(index, 1);
          }
        }
      });
      console.log(data);
      ttsFetch("/bulk_add_to_lists", { import: data }, (res) => {
        //console.log(res);
        createAndShowAlert("Completed");
        $(".subContextContainer").each(function () {
          $(this).remove();
        });
      });
    };
  }
}
/*
Dark Mode
--main-grey: #aaa
--main-light-grey: #ccc
--main-blue: #436186
--main-background: #03030e
Normal:
--main-blue: #6492c7;
--main-light-grey: #aaa;
--main-grey: #333;
--main-background: #fff
*/
function toggleDarkMode() {
  ttsFetch(
    "/set_dark_mode",
    { darkMode: !$("html").hasClass("dark") },
    (darkMode) => {
      if ($("html").hasClass("dark")) {
        disableDarkMode();
      } else {
        enableDarkMode();
      }
    }
  );
}
function disableDarkMode() {
  localStorage.setItem("darkMode", "false");
  $("html").removeClass("dark");
  $("#darkModeButton").html("Enable");
  $(":root").css("--main-grey", "#333");
  $(":root").css("--main-light-grey", "#aaa");
  $(":root").css("--main-blue", "#6492c7");
  $(":root").css("--main-background", "#fff");
  $(":root").css("--main-white-bg", "#fff");
}

function enableDarkMode() {
  localStorage.setItem("darkMode", "true");
  $("html").addClass("dark");
  $("#darkModeButton").html("Disable");
  $(":root").css("--main-grey", "#aaa");
  $(":root").css("--main-light-grey", "#ccc");
  $(":root").css("--main-blue", "#436186");
  $(":root").css("--main-background", "#03030e");
  $(":root").css("--main-white-bg", "#03030e");
}

function setDarkMode(mode) {
  if (mode) {
    enableDarkMode();
  } else {
    disableDarkMode();
  }
}

function firstSessionMsg() {
  $("body").append(
    `<div class="firstSessionCatch" onclick="$(this).next().remove(); $(this).remove();"></div>
<div class="firstSessionError"><div class="closeButton" onclick="$(this).parent().prev().remove(); $(this).parent().remove();">
<ion-icon name="close-outline"></ion-icon></div><div class="firstSessionErrorMsg">` +
      `Welcome to SelectAGame!<br><br>You're just in time! Other users are currently adding games to this session. Soon, you'll get to vote on which games you want to play. <br><br>Close this box whenever you're ready. You'll be able see which games have been added by clicking the blue list button <span class="listPopupPreview">(<ion-icon name="reader-outline"></ion-icon>).</span> <br><br>If you'd like to add a game to be considered, log in or sign up first.` +
      `</div><div class="firstSessionLogin"><button class="button blueBtn" onclick="window.location.href='/login';">Login/Sign Up</div></div>
`
  );
}

function runListImport(code) {
  ttsFetch(
    "/get_list_code_info",
    { code: code },
    (res) => {
      if (res.list.err) {
        createAndShowAlert(res.list.err);
      } else {
        if (!res.overwrite) {
          var overwrite = ' class="off"';
        } else {
          var overwrite = "";
        }
        var el =
          `<div class="subContextContainer"><div class="subContextImport" id="subContext_` +
          res.list.id +
          `" >`;
        el +=
          `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
          `<div class="subContextTitle">Import list "` +
          res.list.name.replace(/\\/g, "") +
          `" with ` +
          res.list.games.length +
          ` games?</div><hr/>
      <div id="importDuplicate"` +
          overwrite +
          `></div>`;
        $("body").append(el);
        var inner =
          `<div id="importOverwrite"><input type="radio" name="duplicate" id="importOverwriteCheckbox" name="import" checked="true"><label for="importOverwriteCheckbox"> Overwrite?</label></div>
        <div id="importRename"><input type="radio" name="duplicate" id="importRenameCheckbox" name="import" ><label for="importRenameCheckbox"> Rename?</label><input type="text" id="importRenameText" class="off"></input></div>
        </div>
        <div class="importContainer"><div class="button redBtn" id="importCancel" onclick="cancelImport()">Cancel</div>
    <div class="button greenBtn" id="importConfirm" onclick="performListImport('` +
          res.list.listCode +
          `', '` +
          $(".subContextTitle")
            .text()
            .substring(13, $(".subContextTitle").text().lastIndexOf('"')) +
          `')">Import</div>`;
        $("#importDuplicate").html(inner);
      }
    },
    (res) => {
      $("body").append(
        `<div class="listImportCatch" onclick="$(this).next().remove(); $(this).remove();"></div>
    <div class="listImportError"><div class="closeButton" onclick="$(this).parent().prev().remove(); $(this).parent().remove();">
    <ion-icon name="close-outline"></ion-icon></div><div class="listImportErrorMsg">` +
          res.err +
          `</div><div class="listImportLogin"><button class="button blueBtn" onclick="window.location.href='/login';">Login/Sign Up</div></div>
    `
      );
    }
  );
  return false;
}

function performListImport(code, oldListName, isSession = false) {
  if ($("#importRename input").prop("checked")) {
    $(".subContextImport").first().remove();
    $(".subContextContainer")
      .first()
      .append(
        `<div class="subContextRename" id="renameImportList" >` +
          `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
          `<div class="subContextTitle">Renaming "` +
          oldListName +
          `"</div><hr/><div id="renameImportInputCont" class="textInputCont">
    <form onsubmit="return renameAndImportList({code: '` +
          code +
          `', name: $('#renameImportInputCont .textInput').first().val()}, ` +
          isSession +
          `)" id="renameImportListInput">
    <input class="textSubmit" type="submit" value="">` +
          `<input class="textInput" type="text" autocomplete="off"></input>` +
          `</form>` +
          `</div></div>`
      );
    focusFirstInput(".subContextContainer");
  } else {
    if (
      $("#importOverwriteCheckbox").length == 0 ||
      $("#importOverwriteCheckbox").prop("checked")
    ) {
      //TODO: Also change renameAndImportList to handle a final boolean parameter isSession

      if (!isSession) {
        var fetch = "/get_list_from_code";
        var body = { code: code };
      } else {
        var fetch = "/import_session_as_list";
        if ($("#importOverwriteCheckbox").prop("checked")) {
          var body = { code: code, overwrite: true };
        } else {
          var body = { code: code, overwrite: false };
        }
      }
      ttsFetch(fetch, body, (res) => {
        gulp();
        createAndShowAlert("List successfully added!");
        history.pushState({}, "SelectAGame", window.location.origin + "/");
      });
      $(".subContextContainer").each(function () {
        $(this).remove();
      });
    } else {
      createAndShowAlert(
        "List already exists. Select overwrite or rename to add."
      );
    }
  }
}

function renameAndImportList(data, isSession = false) {
  if (!isSession) {
    var fetch = "/get_list_from_code";
    var body = { code: data.code, name: data.name };
  } else {
    var fetch = "/import_session_as_list";
    var body = { code: data.code, name: data.name, overwrite: false };
  }
  ttsFetch(fetch, body, (res) => {
    gulp();
    createAndShowAlert("List successfully added!");
  });
  $(".subContextContainer").each(function () {
    $(this).remove();
  });
  return false;
}

/*****************************/
/*          getvh()          */
/*****************************/
/**
 * {Sets viewport height variables, --vh, --vh5, --vh10, etc}
 *
 */
function getvh() {
  // First we get the viewport height and we multiple it by 1% to get a value for a vh unit
  let vh = window.innerHeight * 0.01;
  // Then we set the value in the --vh custom property to the root of the document
  document.documentElement.style.setProperty("--vh", `${vh}px`);
  document.documentElement.style.setProperty("--vh2", `${vh * 2}px`);
  document.documentElement.style.setProperty("--vh3", `${vh * 3}px`);
  document.documentElement.style.setProperty("--vh4", `${vh * 4}px`);
  document.documentElement.style.setProperty("--vh10", `${vh * 10}px`);
  document.documentElement.style.setProperty("--vh20", `${vh * 20}px`);
  document.documentElement.style.setProperty("--vh30", `${vh * 30}px`);
  document.documentElement.style.setProperty("--vh40", `${vh * 40}px`);
  document.documentElement.style.setProperty("--vh50", `${vh * 50}px`);
  document.documentElement.style.setProperty("--vh60", `${vh * 60}px`);
  document.documentElement.style.setProperty("--vh70", `${vh * 70}px`);
  document.documentElement.style.setProperty("--vh80", `${vh * 80}px`);
  document.documentElement.style.setProperty("--vh90", `${vh * 90}px`);
  document.documentElement.style.setProperty("--vh100", `${vh * 100}px`);
  document.documentElement.style.setProperty("--vh5", `${vh * 5}px`);
  document.documentElement.style.setProperty("--vh15", `${vh * 15}px`);
  document.documentElement.style.setProperty("--vh25", `${vh * 25}px`);
  document.documentElement.style.setProperty("--vh75", `${vh * 75}px`);
}
getvh();

function hashToColor(game) {
  var htmlString =
    `<div class="sprite" onclick="bulkSelectGame(this)" id="sprite_` +
    game +
    `"><div class="spriteChecked spriteUnchecked">✓</div>`;
  for (var i = 0; i < 16; i++) {
    htmlString +=
      `<div class="spriteCell" style="background-color: #` +
      murmurhash3_32_gc(game, i).toString(16).substr(0, 6) +
      `"></div>`;
  }
  htmlString += `</div>`;
  return htmlString;
}

/**
 * JS Implementation of MurmurHash3 (r136) (as of May 20, 2011)
 *
 * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
 * @see http://github.com/garycourt/murmurhash-js
 * @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
 * @see http://sites.google.com/site/murmurhash/
 *
 * @param {string} key ASCII only
 * @param {number} seed Positive integer only
 * @return {number} 32-bit positive integer hash
 */

function murmurhash3_32_gc(key, seed) {
  var remainder, bytes, h1, h1b, c1, c1b, c2, c2b, k1, i;

  remainder = key.length & 3; // key.length % 4
  bytes = key.length - remainder;
  h1 = seed;
  c1 = 0xcc9e2d51;
  c2 = 0x1b873593;
  i = 0;

  while (i < bytes) {
    k1 =
      (key.charCodeAt(i) & 0xff) |
      ((key.charCodeAt(++i) & 0xff) << 8) |
      ((key.charCodeAt(++i) & 0xff) << 16) |
      ((key.charCodeAt(++i) & 0xff) << 24);
    ++i;

    k1 =
      ((k1 & 0xffff) * c1 + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 =
      ((k1 & 0xffff) * c2 + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;

    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    h1b =
      ((h1 & 0xffff) * 5 + ((((h1 >>> 16) * 5) & 0xffff) << 16)) & 0xffffffff;
    h1 = (h1b & 0xffff) + 0x6b64 + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16);
  }

  k1 = 0;

  switch (remainder) {
    case 3:
      k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
    case 2:
      k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
    case 1:
      k1 ^= key.charCodeAt(i) & 0xff;

      k1 =
        ((k1 & 0xffff) * c1 + ((((k1 >>> 16) * c1) & 0xffff) << 16)) &
        0xffffffff;
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 =
        ((k1 & 0xffff) * c2 + ((((k1 >>> 16) * c2) & 0xffff) << 16)) &
        0xffffffff;
      h1 ^= k1;
  }

  h1 ^= key.length;

  h1 ^= h1 >>> 16;
  h1 =
    ((h1 & 0xffff) * 0x85ebca6b +
      ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) &
    0xffffffff;
  h1 ^= h1 >>> 13;
  h1 =
    ((h1 & 0xffff) * 0xc2b2ae35 +
      ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16)) &
    0xffffffff;
  h1 ^= h1 >>> 16;
  var consoleval = h1;
  return h1 >>> 0;
}

/* Autocomplete function lifted from W3Schools because why not */
/* Usage: autocomplete(document.getElementById("myInput"), countries); */

function autocomplete(inp, arr) {
  /*the autocomplete function takes two arguments,
  the text field element and an array of possible autocompleted values:*/
  var currentFocus;
  /*execute a function when someone writes in the text field:*/
  inp.addEventListener("input", function (e) {
    var a,
      b,
      i,
      val = this.value;
    /*close any already open lists of autocompleted values*/
    closeAllLists();
    if (!val) {
      return false;
    }
    currentFocus = -1;
    /*create a DIV element that will contain the items (values):*/
    a = document.createElement("DIV");
    a.setAttribute("id", this.id + "autocomplete-list");
    a.setAttribute("class", "autocomplete-items");
    /*append the DIV element as a child of the autocomplete container:*/
    this.parentNode.appendChild(a);
    /*for each item in the array...*/
    for (i = 0; i < arr.length; i++) {
      /*check if the item starts with the same letters as the text field value:*/
      if (arr[i].substr(0, val.length).toUpperCase() == val.toUpperCase()) {
        /*create a DIV element for each matching element:*/
        b = document.createElement("DIV");
        /*make the matching letters bold:*/
        b.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>";
        b.innerHTML += arr[i].substr(val.length);
        /*insert a input field that will hold the current array item's value:*/
        b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
        /*execute a function when someone clicks on the item value (DIV element):*/
        b.addEventListener("click", function (e) {
          /*insert the value for the autocomplete text field:*/
          inp.value = this.getElementsByTagName("input")[0].value;
          /*close the list of autocompleted values,
              (or any other open lists of autocompleted values:*/
          closeAllLists();
        });
        a.appendChild(b);
      }
    }
  });
  /*execute a function presses a key on the keyboard:*/
  inp.addEventListener("keydown", function (e) {
    var x = document.getElementById(this.id + "autocomplete-list");
    var toSubmit = document.getElementById(this.id).parentElement;
    //console.log(x);
    if (x) x = x.getElementsByTagName("div");
    //console.log(x);
    if (e.keyCode == 40) {
      /*If the arrow DOWN key is pressed,
        increase the currentFocus variable:*/
      currentFocus++;
      /*and and make the current item more visible:*/
      addActive(x);
    } else if (e.keyCode == 38) {
      //up
      /*If the arrow UP key is pressed,
        decrease the currentFocus variable:*/
      currentFocus--;
      /*and and make the current item more visible:*/
      addActive(x);
    } else if (e.keyCode == 39 || e.keyCode == 9) {
      //e.preventDefault();
      var input = toSubmit.querySelector("input[type=text]");
      var autoc = document.querySelector(".autocomplete-active");
      if (input && autoc) {
        var len = input.value.length;
        input.value = autoc.textContent;
        setTimeout(function () {
          input.setSelectionRange(len, autoc.textContent.length);
        }, 10);
      }
    } else if (e.keyCode == 13) {
      /*If the ENTER key is pressed, prevent the form from being submitted,*/
      e.preventDefault();
      if (currentFocus > -1) {
        /*and simulate a click on the "active" item:*/
        if (x) x[currentFocus].click();
        currentFocus = -1;
      } else {
        if (currentFocus == -1) {
          toSubmit.querySelector("input[type=submit]").click();
        }
      }
    }
  });
  function addActive(x) {
    /*a function to classify an item as "active":*/
    if (!x) return false;
    /*start by removing the "active" class on all items:*/
    removeActive(x);
    if (currentFocus >= x.length) currentFocus = 0;
    if (currentFocus < -1) currentFocus = x.length - 1;
    /*add class "autocomplete-active":*/
    x[currentFocus].classList.add("autocomplete-active");
  }
  function removeActive(x) {
    /*a function to remove the "active" class from all autocomplete items:*/
    for (var i = 0; i < x.length; i++) {
      x[i].classList.remove("autocomplete-active");
    }
  }
  function closeAllLists(elmnt) {
    /*close all autocomplete lists in the document,
    except the one passed as an argument:*/
    var x = document.getElementsByClassName("autocomplete-items");
    for (var i = 0; i < x.length; i++) {
      if (elmnt != x[i] && elmnt != inp) {
        x[i].parentNode.removeChild(x[i]);
      }
    }
  }
  /*execute a function when someone clicks in the document:*/
  document.addEventListener("click", function (e) {
    closeAllLists(e.target);
  });
}

function lowerCaseSort() {
  return function (a, b) {
    return a.toLowerCase().localeCompare(b.toLowerCase());
  };
}

function lowerCaseNameSort() {
  return function (a, b) {
    return a.name
      .replace(/\\/g, "")
      .toLowerCase()
      .localeCompare(b.name.toLowerCase());
  };
}

function lowerCaseFieldSort(field) {
  return function (a, b) {
    return a[field].toLowerCase().localeCompare(b[field].toLowerCase());
  };
}

function lowerCaseDivSort() {
  var arr = arguments;
  return function (a, b) {
    for (var i = 0; i < arr.length; i++) {
      a = $(a).children(arr[i]);
    }
    a = $(a).first();
    for (var i = 0; i < arr.length; i++) {
      b = $(b).children(arr[i]);
    }
    b = $(b).first();
    //console.log("Comparing: ", a, b);
    return $(a).text().toLowerCase().localeCompare($(b).text().toLowerCase());
  };
}

/**
 * Fuse.js v6.4.3 - Lightweight fuzzy-search (http://fusejs.io)
 *
 * Copyright (c) 2020 Kiro Risk (http://kiro.me)
 * All Rights Reserved. Apache Software License 2.0
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */
/**
 * Fuse.js v6.4.3 - Lightweight fuzzy-search (http://fusejs.io)
 *
 * Copyright (c) 2020 Kiro Risk (http://kiro.me)
 * All Rights Reserved. Apache Software License 2.0
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */
var e, t;
(e = this),
  (t = function () {
    "use strict";
    function e(t) {
      return (e =
        "function" == typeof Symbol && "symbol" == typeof Symbol.iterator
          ? function (e) {
              return typeof e;
            }
          : function (e) {
              return e &&
                "function" == typeof Symbol &&
                e.constructor === Symbol &&
                e !== Symbol.prototype
                ? "symbol"
                : typeof e;
            })(t);
    }
    function t(e, t) {
      if (!(e instanceof t))
        throw new TypeError("Cannot call a class as a function");
    }
    function n(e, t) {
      for (var n = 0; n < t.length; n++) {
        var r = t[n];
        (r.enumerable = r.enumerable || !1),
          (r.configurable = !0),
          "value" in r && (r.writable = !0),
          Object.defineProperty(e, r.key, r);
      }
    }
    function r(e, t, r) {
      return t && n(e.prototype, t), r && n(e, r), e;
    }
    function i(e, t, n) {
      return (
        t in e
          ? Object.defineProperty(e, t, {
              value: n,
              enumerable: !0,
              configurable: !0,
              writable: !0,
            })
          : (e[t] = n),
        e
      );
    }
    function o(e, t) {
      var n = Object.keys(e);
      if (Object.getOwnPropertySymbols) {
        var r = Object.getOwnPropertySymbols(e);
        t &&
          (r = r.filter(function (t) {
            return Object.getOwnPropertyDescriptor(e, t).enumerable;
          })),
          n.push.apply(n, r);
      }
      return n;
    }
    function c(e) {
      for (var t = 1; t < arguments.length; t++) {
        var n = null != arguments[t] ? arguments[t] : {};
        t % 2
          ? o(Object(n), !0).forEach(function (t) {
              i(e, t, n[t]);
            })
          : Object.getOwnPropertyDescriptors
          ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n))
          : o(Object(n)).forEach(function (t) {
              Object.defineProperty(
                e,
                t,
                Object.getOwnPropertyDescriptor(n, t)
              );
            });
      }
      return e;
    }
    function a(e, t) {
      if ("function" != typeof t && null !== t)
        throw new TypeError(
          "Super expression must either be null or a function"
        );
      (e.prototype = Object.create(t && t.prototype, {
        constructor: { value: e, writable: !0, configurable: !0 },
      })),
        t && u(e, t);
    }
    function s(e) {
      return (s = Object.setPrototypeOf
        ? Object.getPrototypeOf
        : function (e) {
            return e.__proto__ || Object.getPrototypeOf(e);
          })(e);
    }
    function u(e, t) {
      return (u =
        Object.setPrototypeOf ||
        function (e, t) {
          return (e.__proto__ = t), e;
        })(e, t);
    }
    function h(e, t) {
      return !t || ("object" != typeof t && "function" != typeof t)
        ? (function (e) {
            if (void 0 === e)
              throw new ReferenceError(
                "this hasn't been initialised - super() hasn't been called"
              );
            return e;
          })(e)
        : t;
    }
    function f(e) {
      var t = (function () {
        if ("undefined" == typeof Reflect || !Reflect.construct) return !1;
        if (Reflect.construct.sham) return !1;
        if ("function" == typeof Proxy) return !0;
        try {
          return (
            Date.prototype.toString.call(
              Reflect.construct(Date, [], function () {})
            ),
            !0
          );
        } catch (e) {
          return !1;
        }
      })();
      return function () {
        var n,
          r = s(e);
        if (t) {
          var i = s(this).constructor;
          n = Reflect.construct(r, arguments, i);
        } else n = r.apply(this, arguments);
        return h(this, n);
      };
    }
    function l(e) {
      return (
        (function (e) {
          if (Array.isArray(e)) return d(e);
        })(e) ||
        (function (e) {
          if ("undefined" != typeof Symbol && Symbol.iterator in Object(e))
            return Array.from(e);
        })(e) ||
        (function (e, t) {
          if (e) {
            if ("string" == typeof e) return d(e, t);
            var n = Object.prototype.toString.call(e).slice(8, -1);
            return (
              "Object" === n && e.constructor && (n = e.constructor.name),
              "Map" === n || "Set" === n
                ? Array.from(e)
                : "Arguments" === n ||
                  /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)
                ? d(e, t)
                : void 0
            );
          }
        })(e) ||
        (function () {
          throw new TypeError(
            "Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."
          );
        })()
      );
    }
    function d(e, t) {
      (null == t || t > e.length) && (t = e.length);
      for (var n = 0, r = new Array(t); n < t; n++) r[n] = e[n];
      return r;
    }
    function v(e) {
      return Array.isArray ? Array.isArray(e) : "[object Array]" === x(e);
    }
    function g(e) {
      return "string" == typeof e;
    }
    function y(e) {
      return "number" == typeof e;
    }
    function p(e) {
      return (
        !0 === e ||
        !1 === e ||
        ((function (e) {
          return m(e) && null !== e;
        })(e) &&
          "[object Boolean]" == x(e))
      );
    }
    function m(t) {
      return "object" === e(t);
    }
    function k(e) {
      return null != e;
    }
    function M(e) {
      return !e.trim().length;
    }
    function x(e) {
      return null == e
        ? void 0 === e
          ? "[object Undefined]"
          : "[object Null]"
        : Object.prototype.toString.call(e);
    }
    var b = function (e) {
        return "Invalid value for key ".concat(e);
      },
      L = function (e) {
        return "Pattern length exceeds max of ".concat(e, ".");
      },
      S = Object.prototype.hasOwnProperty,
      _ = (function () {
        function e(n) {
          var r = this;
          t(this, e), (this._keys = []), (this._keyMap = {});
          var i = 0;
          n.forEach(function (e) {
            var t = w(e);
            (i += t.weight),
              r._keys.push(t),
              (r._keyMap[t.id] = t),
              (i += t.weight);
          }),
            this._keys.forEach(function (e) {
              e.weight /= i;
            });
        }
        return (
          r(e, [
            {
              key: "get",
              value: function (e) {
                return this._keyMap[e];
              },
            },
            {
              key: "keys",
              value: function () {
                return this._keys;
              },
            },
            {
              key: "toJSON",
              value: function () {
                return JSON.stringify(this._keys);
              },
            },
          ]),
          e
        );
      })();
    function w(e) {
      var t = null,
        n = null,
        r = null,
        i = 1;
      if (g(e) || v(e)) (r = e), (t = O(e)), (n = j(e));
      else {
        if (!S.call(e, "name"))
          throw new Error(
            (function (e) {
              return "Missing ".concat(e, " property in key");
            })("name")
          );
        var o = e.name;
        if (((r = o), S.call(e, "weight") && (i = e.weight) <= 0))
          throw new Error(
            (function (e) {
              return "Property 'weight' in key '".concat(
                e,
                "' must be a positive integer"
              );
            })(o)
          );
        (t = O(o)), (n = j(o));
      }
      return { path: t, id: n, weight: i, src: r };
    }
    function O(e) {
      return v(e) ? e : e.split(".");
    }
    function j(e) {
      return v(e) ? e.join(".") : e;
    }
    var A = c(
        {},
        {
          isCaseSensitive: !1,
          includeScore: !1,
          keys: [],
          shouldSort: !0,
          sortFn: function (e, t) {
            return e.score === t.score
              ? e.idx < t.idx
                ? -1
                : 1
              : e.score < t.score
              ? -1
              : 1;
          },
        },
        {},
        { includeMatches: !1, findAllMatches: !1, minMatchCharLength: 1 },
        {},
        { location: 0, threshold: 0.6, distance: 100 },
        {},
        {
          useExtendedSearch: !1,
          getFn: function (e, t) {
            var n = [],
              r = !1;
            return (
              (function e(t, i, o) {
                if (k(t))
                  if (i[o]) {
                    var c = t[i[o]];
                    if (!k(c)) return;
                    if (o === i.length - 1 && (g(c) || y(c) || p(c)))
                      n.push(
                        (function (e) {
                          return null == e
                            ? ""
                            : (function (e) {
                                if ("string" == typeof e) return e;
                                var t = e + "";
                                return "0" == t && 1 / e == -1 / 0 ? "-0" : t;
                              })(e);
                        })(c)
                      );
                    else if (v(c)) {
                      r = !0;
                      for (var a = 0, s = c.length; a < s; a += 1)
                        e(c[a], i, o + 1);
                    } else i.length && e(c, i, o + 1);
                  } else n.push(t);
              })(e, g(t) ? t.split(".") : t, 0),
              r ? n : n[0]
            );
          },
          ignoreLocation: !1,
          ignoreFieldNorm: !1,
        }
      ),
      I = /[^ ]+/g;
    function C() {
      var e =
          arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : 3,
        t = new Map();
      return {
        get: function (n) {
          var r = n.match(I).length;
          if (t.has(r)) return t.get(r);
          var i = parseFloat((1 / Math.sqrt(r)).toFixed(e));
          return t.set(r, i), i;
        },
        clear: function () {
          t.clear();
        },
      };
    }
    var E = (function () {
      function e() {
        var n =
            arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {},
          r = n.getFn,
          i = void 0 === r ? A.getFn : r;
        t(this, e),
          (this.norm = C(3)),
          (this.getFn = i),
          (this.isCreated = !1),
          this.setIndexRecords();
      }
      return (
        r(e, [
          {
            key: "setSources",
            value: function () {
              var e =
                arguments.length > 0 && void 0 !== arguments[0]
                  ? arguments[0]
                  : [];
              this.docs = e;
            },
          },
          {
            key: "setIndexRecords",
            value: function () {
              var e =
                arguments.length > 0 && void 0 !== arguments[0]
                  ? arguments[0]
                  : [];
              this.records = e;
            },
          },
          {
            key: "setKeys",
            value: function () {
              var e = this,
                t =
                  arguments.length > 0 && void 0 !== arguments[0]
                    ? arguments[0]
                    : [];
              (this.keys = t),
                (this._keysMap = {}),
                t.forEach(function (t, n) {
                  e._keysMap[t.id] = n;
                });
            },
          },
          {
            key: "create",
            value: function () {
              var e = this;
              !this.isCreated &&
                this.docs.length &&
                ((this.isCreated = !0),
                g(this.docs[0])
                  ? this.docs.forEach(function (t, n) {
                      e._addString(t, n);
                    })
                  : this.docs.forEach(function (t, n) {
                      e._addObject(t, n);
                    }),
                this.norm.clear());
            },
          },
          {
            key: "add",
            value: function (e) {
              var t = this.size();
              g(e) ? this._addString(e, t) : this._addObject(e, t);
            },
          },
          {
            key: "removeAt",
            value: function (e) {
              this.records.splice(e, 1);
              for (var t = e, n = this.size(); t < n; t += 1)
                this.records[t].i -= 1;
            },
          },
          {
            key: "getValueForItemAtKeyId",
            value: function (e, t) {
              return e[this._keysMap[t]];
            },
          },
          {
            key: "size",
            value: function () {
              return this.records.length;
            },
          },
          {
            key: "_addString",
            value: function (e, t) {
              if (k(e) && !M(e)) {
                var n = { v: e, i: t, n: this.norm.get(e) };
                this.records.push(n);
              }
            },
          },
          {
            key: "_addObject",
            value: function (e, t) {
              var n = this,
                r = { i: t, $: {} };
              this.keys.forEach(function (t, i) {
                var o = n.getFn(e, t.path);
                if (k(o))
                  if (v(o))
                    !(function () {
                      for (
                        var e = [], t = [{ nestedArrIndex: -1, value: o }];
                        t.length;

                      ) {
                        var c = t.pop(),
                          a = c.nestedArrIndex,
                          s = c.value;
                        if (k(s))
                          if (g(s) && !M(s)) {
                            var u = { v: s, i: a, n: n.norm.get(s) };
                            e.push(u);
                          } else
                            v(s) &&
                              s.forEach(function (e, n) {
                                t.push({ nestedArrIndex: n, value: e });
                              });
                      }
                      r.$[i] = e;
                    })();
                  else if (!M(o)) {
                    var c = { v: o, n: n.norm.get(o) };
                    r.$[i] = c;
                  }
              }),
                this.records.push(r);
            },
          },
          {
            key: "toJSON",
            value: function () {
              return { keys: this.keys, records: this.records };
            },
          },
        ]),
        e
      );
    })();
    function $(e, t) {
      var n =
          arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {},
        r = n.getFn,
        i = void 0 === r ? A.getFn : r,
        o = new E({ getFn: i });
      return o.setKeys(e.map(w)), o.setSources(t), o.create(), o;
    }
    function R(e, t) {
      var n = e.matches;
      (t.matches = []),
        k(n) &&
          n.forEach(function (e) {
            if (k(e.indices) && e.indices.length) {
              var n = { indices: e.indices, value: e.value };
              e.key && (n.key = e.key.src),
                e.idx > -1 && (n.refIndex = e.idx),
                t.matches.push(n);
            }
          });
    }
    function F(e, t) {
      t.score = e.score;
    }
    function P(e) {
      var t =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {},
        n = t.errors,
        r = void 0 === n ? 0 : n,
        i = t.currentLocation,
        o = void 0 === i ? 0 : i,
        c = t.expectedLocation,
        a = void 0 === c ? 0 : c,
        s = t.distance,
        u = void 0 === s ? A.distance : s,
        h = t.ignoreLocation,
        f = void 0 === h ? A.ignoreLocation : h,
        l = r / e.length;
      if (f) return l;
      var d = Math.abs(a - o);
      return u ? l + d / u : d ? 1 : l;
    }
    function N() {
      for (
        var e =
            arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : [],
          t =
            arguments.length > 1 && void 0 !== arguments[1]
              ? arguments[1]
              : A.minMatchCharLength,
          n = [],
          r = -1,
          i = -1,
          o = 0,
          c = e.length;
        o < c;
        o += 1
      ) {
        var a = e[o];
        a && -1 === r
          ? (r = o)
          : a ||
            -1 === r ||
            ((i = o - 1) - r + 1 >= t && n.push([r, i]), (r = -1));
      }
      return e[o - 1] && o - r >= t && n.push([r, o - 1]), n;
    }
    function D(e) {
      for (var t = {}, n = 0, r = e.length; n < r; n += 1) {
        var i = e.charAt(n);
        t[i] = (t[i] || 0) | (1 << (r - n - 1));
      }
      return t;
    }
    var z = (function () {
        function e(n) {
          var r = this,
            i =
              arguments.length > 1 && void 0 !== arguments[1]
                ? arguments[1]
                : {},
            o = i.location,
            c = void 0 === o ? A.location : o,
            a = i.threshold,
            s = void 0 === a ? A.threshold : a,
            u = i.distance,
            h = void 0 === u ? A.distance : u,
            f = i.includeMatches,
            l = void 0 === f ? A.includeMatches : f,
            d = i.findAllMatches,
            v = void 0 === d ? A.findAllMatches : d,
            g = i.minMatchCharLength,
            y = void 0 === g ? A.minMatchCharLength : g,
            p = i.isCaseSensitive,
            m = void 0 === p ? A.isCaseSensitive : p,
            k = i.ignoreLocation,
            M = void 0 === k ? A.ignoreLocation : k;
          if (
            (t(this, e),
            (this.options = {
              location: c,
              threshold: s,
              distance: h,
              includeMatches: l,
              findAllMatches: v,
              minMatchCharLength: y,
              isCaseSensitive: m,
              ignoreLocation: M,
            }),
            (this.pattern = m ? n : n.toLowerCase()),
            (this.chunks = []),
            this.pattern.length)
          ) {
            var x = function (e, t) {
                r.chunks.push({ pattern: e, alphabet: D(e), startIndex: t });
              },
              b = this.pattern.length;
            if (b > 32) {
              for (var L = 0, S = b % 32, _ = b - S; L < _; )
                x(this.pattern.substr(L, 32), L), (L += 32);
              if (S) {
                var w = b - 32;
                x(this.pattern.substr(w), w);
              }
            } else x(this.pattern, 0);
          }
        }
        return (
          r(e, [
            {
              key: "searchIn",
              value: function (e) {
                var t = this.options,
                  n = t.isCaseSensitive,
                  r = t.includeMatches;
                if ((n || (e = e.toLowerCase()), this.pattern === e)) {
                  var i = { isMatch: !0, score: 0 };
                  return r && (i.indices = [[0, e.length - 1]]), i;
                }
                var o = this.options,
                  c = o.location,
                  a = o.distance,
                  s = o.threshold,
                  u = o.findAllMatches,
                  h = o.minMatchCharLength,
                  f = o.ignoreLocation,
                  d = [],
                  v = 0,
                  g = !1;
                this.chunks.forEach(function (t) {
                  var n = t.pattern,
                    i = t.alphabet,
                    o = t.startIndex,
                    y = (function (e, t, n) {
                      var r =
                          arguments.length > 3 && void 0 !== arguments[3]
                            ? arguments[3]
                            : {},
                        i = r.location,
                        o = void 0 === i ? A.location : i,
                        c = r.distance,
                        a = void 0 === c ? A.distance : c,
                        s = r.threshold,
                        u = void 0 === s ? A.threshold : s,
                        h = r.findAllMatches,
                        f = void 0 === h ? A.findAllMatches : h,
                        l = r.minMatchCharLength,
                        d = void 0 === l ? A.minMatchCharLength : l,
                        v = r.includeMatches,
                        g = void 0 === v ? A.includeMatches : v,
                        y = r.ignoreLocation,
                        p = void 0 === y ? A.ignoreLocation : y;
                      if (t.length > 32) throw new Error(L(32));
                      for (
                        var m,
                          k = t.length,
                          M = e.length,
                          x = Math.max(0, Math.min(o, M)),
                          b = u,
                          S = x,
                          _ = d > 1 || g,
                          w = _ ? Array(M) : [];
                        (m = e.indexOf(t, S)) > -1;

                      ) {
                        var O = P(t, {
                          currentLocation: m,
                          expectedLocation: x,
                          distance: a,
                          ignoreLocation: p,
                        });
                        if (((b = Math.min(O, b)), (S = m + k), _))
                          for (var j = 0; j < k; ) (w[m + j] = 1), (j += 1);
                      }
                      S = -1;
                      for (
                        var I = [], C = 1, E = k + M, $ = 1 << (k - 1), R = 0;
                        R < k;
                        R += 1
                      ) {
                        for (var F = 0, D = E; F < D; ) {
                          var z = P(t, {
                            errors: R,
                            currentLocation: x + D,
                            expectedLocation: x,
                            distance: a,
                            ignoreLocation: p,
                          });
                          z <= b ? (F = D) : (E = D),
                            (D = Math.floor((E - F) / 2 + F));
                        }
                        E = D;
                        var K = Math.max(1, x - D + 1),
                          q = f ? M : Math.min(x + D, M) + k,
                          W = Array(q + 2);
                        W[q + 1] = (1 << R) - 1;
                        for (var J = q; J >= K; J -= 1) {
                          var T = J - 1,
                            U = n[e.charAt(T)];
                          if (
                            (_ && (w[T] = +!!U),
                            (W[J] = ((W[J + 1] << 1) | 1) & U),
                            R &&
                              (W[J] |= ((I[J + 1] | I[J]) << 1) | 1 | I[J + 1]),
                            W[J] & $ &&
                              (C = P(t, {
                                errors: R,
                                currentLocation: T,
                                expectedLocation: x,
                                distance: a,
                                ignoreLocation: p,
                              })) <= b)
                          ) {
                            if (((b = C), (S = T) <= x)) break;
                            K = Math.max(1, 2 * x - S);
                          }
                        }
                        var V = P(t, {
                          errors: R + 1,
                          currentLocation: x,
                          expectedLocation: x,
                          distance: a,
                          ignoreLocation: p,
                        });
                        if (V > b) break;
                        I = W;
                      }
                      var B = { isMatch: S >= 0, score: Math.max(0.001, C) };
                      if (_) {
                        var G = N(w, d);
                        G.length ? g && (B.indices = G) : (B.isMatch = !1);
                      }
                      return B;
                    })(e, n, i, {
                      location: c + o,
                      distance: a,
                      threshold: s,
                      findAllMatches: u,
                      minMatchCharLength: h,
                      includeMatches: r,
                      ignoreLocation: f,
                    }),
                    p = y.isMatch,
                    m = y.score,
                    k = y.indices;
                  p && (g = !0),
                    (v += m),
                    p && k && (d = [].concat(l(d), l(k)));
                });
                var y = { isMatch: g, score: g ? v / this.chunks.length : 1 };
                return g && r && (y.indices = d), y;
              },
            },
          ]),
          e
        );
      })(),
      K = (function () {
        function e(n) {
          t(this, e), (this.pattern = n);
        }
        return (
          r(
            e,
            [{ key: "search", value: function () {} }],
            [
              {
                key: "isMultiMatch",
                value: function (e) {
                  return q(e, this.multiRegex);
                },
              },
              {
                key: "isSingleMatch",
                value: function (e) {
                  return q(e, this.singleRegex);
                },
              },
            ]
          ),
          e
        );
      })();
    function q(e, t) {
      var n = e.match(t);
      return n ? n[1] : null;
    }
    var W = (function (e) {
        a(i, e);
        var n = f(i);
        function i(e) {
          return t(this, i), n.call(this, e);
        }
        return (
          r(
            i,
            [
              {
                key: "search",
                value: function (e) {
                  var t = e === this.pattern;
                  return {
                    isMatch: t,
                    score: t ? 0 : 1,
                    indices: [0, this.pattern.length - 1],
                  };
                },
              },
            ],
            [
              {
                key: "type",
                get: function () {
                  return "exact";
                },
              },
              {
                key: "multiRegex",
                get: function () {
                  return /^="(.*)"$/;
                },
              },
              {
                key: "singleRegex",
                get: function () {
                  return /^=(.*)$/;
                },
              },
            ]
          ),
          i
        );
      })(K),
      J = (function (e) {
        a(i, e);
        var n = f(i);
        function i(e) {
          return t(this, i), n.call(this, e);
        }
        return (
          r(
            i,
            [
              {
                key: "search",
                value: function (e) {
                  var t = -1 === e.indexOf(this.pattern);
                  return {
                    isMatch: t,
                    score: t ? 0 : 1,
                    indices: [0, e.length - 1],
                  };
                },
              },
            ],
            [
              {
                key: "type",
                get: function () {
                  return "inverse-exact";
                },
              },
              {
                key: "multiRegex",
                get: function () {
                  return /^!"(.*)"$/;
                },
              },
              {
                key: "singleRegex",
                get: function () {
                  return /^!(.*)$/;
                },
              },
            ]
          ),
          i
        );
      })(K),
      T = (function (e) {
        a(i, e);
        var n = f(i);
        function i(e) {
          return t(this, i), n.call(this, e);
        }
        return (
          r(
            i,
            [
              {
                key: "search",
                value: function (e) {
                  var t = e.startsWith(this.pattern);
                  return {
                    isMatch: t,
                    score: t ? 0 : 1,
                    indices: [0, this.pattern.length - 1],
                  };
                },
              },
            ],
            [
              {
                key: "type",
                get: function () {
                  return "prefix-exact";
                },
              },
              {
                key: "multiRegex",
                get: function () {
                  return /^\^"(.*)"$/;
                },
              },
              {
                key: "singleRegex",
                get: function () {
                  return /^\^(.*)$/;
                },
              },
            ]
          ),
          i
        );
      })(K),
      U = (function (e) {
        a(i, e);
        var n = f(i);
        function i(e) {
          return t(this, i), n.call(this, e);
        }
        return (
          r(
            i,
            [
              {
                key: "search",
                value: function (e) {
                  var t = !e.startsWith(this.pattern);
                  return {
                    isMatch: t,
                    score: t ? 0 : 1,
                    indices: [0, e.length - 1],
                  };
                },
              },
            ],
            [
              {
                key: "type",
                get: function () {
                  return "inverse-prefix-exact";
                },
              },
              {
                key: "multiRegex",
                get: function () {
                  return /^!\^"(.*)"$/;
                },
              },
              {
                key: "singleRegex",
                get: function () {
                  return /^!\^(.*)$/;
                },
              },
            ]
          ),
          i
        );
      })(K),
      V = (function (e) {
        a(i, e);
        var n = f(i);
        function i(e) {
          return t(this, i), n.call(this, e);
        }
        return (
          r(
            i,
            [
              {
                key: "search",
                value: function (e) {
                  var t = e.endsWith(this.pattern);
                  return {
                    isMatch: t,
                    score: t ? 0 : 1,
                    indices: [e.length - this.pattern.length, e.length - 1],
                  };
                },
              },
            ],
            [
              {
                key: "type",
                get: function () {
                  return "suffix-exact";
                },
              },
              {
                key: "multiRegex",
                get: function () {
                  return /^"(.*)"\$$/;
                },
              },
              {
                key: "singleRegex",
                get: function () {
                  return /^(.*)\$$/;
                },
              },
            ]
          ),
          i
        );
      })(K),
      B = (function (e) {
        a(i, e);
        var n = f(i);
        function i(e) {
          return t(this, i), n.call(this, e);
        }
        return (
          r(
            i,
            [
              {
                key: "search",
                value: function (e) {
                  var t = !e.endsWith(this.pattern);
                  return {
                    isMatch: t,
                    score: t ? 0 : 1,
                    indices: [0, e.length - 1],
                  };
                },
              },
            ],
            [
              {
                key: "type",
                get: function () {
                  return "inverse-suffix-exact";
                },
              },
              {
                key: "multiRegex",
                get: function () {
                  return /^!"(.*)"\$$/;
                },
              },
              {
                key: "singleRegex",
                get: function () {
                  return /^!(.*)\$$/;
                },
              },
            ]
          ),
          i
        );
      })(K),
      G = (function (e) {
        a(i, e);
        var n = f(i);
        function i(e) {
          var r,
            o =
              arguments.length > 1 && void 0 !== arguments[1]
                ? arguments[1]
                : {},
            c = o.location,
            a = void 0 === c ? A.location : c,
            s = o.threshold,
            u = void 0 === s ? A.threshold : s,
            h = o.distance,
            f = void 0 === h ? A.distance : h,
            l = o.includeMatches,
            d = void 0 === l ? A.includeMatches : l,
            v = o.findAllMatches,
            g = void 0 === v ? A.findAllMatches : v,
            y = o.minMatchCharLength,
            p = void 0 === y ? A.minMatchCharLength : y,
            m = o.isCaseSensitive,
            k = void 0 === m ? A.isCaseSensitive : m,
            M = o.ignoreLocation,
            x = void 0 === M ? A.ignoreLocation : M;
          return (
            t(this, i),
            ((r = n.call(this, e))._bitapSearch = new z(e, {
              location: a,
              threshold: u,
              distance: f,
              includeMatches: d,
              findAllMatches: g,
              minMatchCharLength: p,
              isCaseSensitive: k,
              ignoreLocation: x,
            })),
            r
          );
        }
        return (
          r(
            i,
            [
              {
                key: "search",
                value: function (e) {
                  return this._bitapSearch.searchIn(e);
                },
              },
            ],
            [
              {
                key: "type",
                get: function () {
                  return "fuzzy";
                },
              },
              {
                key: "multiRegex",
                get: function () {
                  return /^"(.*)"$/;
                },
              },
              {
                key: "singleRegex",
                get: function () {
                  return /^(.*)$/;
                },
              },
            ]
          ),
          i
        );
      })(K),
      H = (function (e) {
        a(i, e);
        var n = f(i);
        function i(e) {
          return t(this, i), n.call(this, e);
        }
        return (
          r(
            i,
            [
              {
                key: "search",
                value: function (e) {
                  for (
                    var t, n = 0, r = [], i = this.pattern.length;
                    (t = e.indexOf(this.pattern, n)) > -1;

                  )
                    (n = t + i), r.push([t, n - 1]);
                  var o = !!r.length;
                  return { isMatch: o, score: o ? 1 : 0, indices: r };
                },
              },
            ],
            [
              {
                key: "type",
                get: function () {
                  return "include";
                },
              },
              {
                key: "multiRegex",
                get: function () {
                  return /^'"(.*)"$/;
                },
              },
              {
                key: "singleRegex",
                get: function () {
                  return /^'(.*)$/;
                },
              },
            ]
          ),
          i
        );
      })(K),
      Q = [W, H, T, U, B, V, J, G],
      X = Q.length,
      Y = / +(?=([^\"]*\"[^\"]*\")*[^\"]*$)/;
    function Z(e) {
      var t =
        arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
      return e.split("|").map(function (e) {
        for (
          var n = e
              .trim()
              .split(Y)
              .filter(function (e) {
                return e && !!e.trim();
              }),
            r = [],
            i = 0,
            o = n.length;
          i < o;
          i += 1
        ) {
          for (var c = n[i], a = !1, s = -1; !a && ++s < X; ) {
            var u = Q[s],
              h = u.isMultiMatch(c);
            h && (r.push(new u(h, t)), (a = !0));
          }
          if (!a)
            for (s = -1; ++s < X; ) {
              var f = Q[s],
                l = f.isSingleMatch(c);
              if (l) {
                r.push(new f(l, t));
                break;
              }
            }
        }
        return r;
      });
    }
    var ee = new Set([G.type, H.type]),
      te = (function () {
        function e(n) {
          var r =
              arguments.length > 1 && void 0 !== arguments[1]
                ? arguments[1]
                : {},
            i = r.isCaseSensitive,
            o = void 0 === i ? A.isCaseSensitive : i,
            c = r.includeMatches,
            a = void 0 === c ? A.includeMatches : c,
            s = r.minMatchCharLength,
            u = void 0 === s ? A.minMatchCharLength : s,
            h = r.ignoreLocation,
            f = void 0 === h ? A.ignoreLocation : h,
            l = r.findAllMatches,
            d = void 0 === l ? A.findAllMatches : l,
            v = r.location,
            g = void 0 === v ? A.location : v,
            y = r.threshold,
            p = void 0 === y ? A.threshold : y,
            m = r.distance,
            k = void 0 === m ? A.distance : m;
          t(this, e),
            (this.query = null),
            (this.options = {
              isCaseSensitive: o,
              includeMatches: a,
              minMatchCharLength: u,
              findAllMatches: d,
              ignoreLocation: f,
              location: g,
              threshold: p,
              distance: k,
            }),
            (this.pattern = o ? n : n.toLowerCase()),
            (this.query = Z(this.pattern, this.options));
        }
        return (
          r(
            e,
            [
              {
                key: "searchIn",
                value: function (e) {
                  var t = this.query;
                  if (!t) return { isMatch: !1, score: 1 };
                  var n = this.options,
                    r = n.includeMatches;
                  e = n.isCaseSensitive ? e : e.toLowerCase();
                  for (
                    var i = 0, o = [], c = 0, a = 0, s = t.length;
                    a < s;
                    a += 1
                  ) {
                    var u = t[a];
                    (o.length = 0), (i = 0);
                    for (var h = 0, f = u.length; h < f; h += 1) {
                      var d = u[h],
                        v = d.search(e),
                        g = v.isMatch,
                        y = v.indices,
                        p = v.score;
                      if (!g) {
                        (c = 0), (i = 0), (o.length = 0);
                        break;
                      }
                      if (((i += 1), (c += p), r)) {
                        var m = d.constructor.type;
                        ee.has(m) ? (o = [].concat(l(o), l(y))) : o.push(y);
                      }
                    }
                    if (i) {
                      var k = { isMatch: !0, score: c / i };
                      return r && (k.indices = o), k;
                    }
                  }
                  return { isMatch: !1, score: 1 };
                },
              },
            ],
            [
              {
                key: "condition",
                value: function (e, t) {
                  return t.useExtendedSearch;
                },
              },
            ]
          ),
          e
        );
      })(),
      ne = [];
    function re(e, t) {
      for (var n = 0, r = ne.length; n < r; n += 1) {
        var i = ne[n];
        if (i.condition(e, t)) return new i(e, t);
      }
      return new z(e, t);
    }
    var ie = "$and",
      oe = "$or",
      ce = "$path",
      ae = "$val",
      se = function (e) {
        return !(!e[ie] && !e[oe]);
      },
      ue = function (e) {
        return !!e[ce];
      },
      he = function (e) {
        return !v(e) && m(e) && !se(e);
      },
      fe = function (e) {
        return i(
          {},
          ie,
          Object.keys(e).map(function (t) {
            return i({}, t, e[t]);
          })
        );
      },
      le = (function () {
        function e(n) {
          var r =
              arguments.length > 1 && void 0 !== arguments[1]
                ? arguments[1]
                : {},
            i = arguments.length > 2 ? arguments[2] : void 0;
          t(this, e),
            (this.options = c({}, A, {}, r)),
            this.options.useExtendedSearch,
            (this._keyStore = new _(this.options.keys)),
            this.setCollection(n, i);
        }
        return (
          r(e, [
            {
              key: "setCollection",
              value: function (e, t) {
                if (((this._docs = e), t && !(t instanceof E)))
                  throw new Error("Incorrect 'index' type");
                this._myIndex =
                  t ||
                  $(this.options.keys, this._docs, {
                    getFn: this.options.getFn,
                  });
              },
            },
            {
              key: "add",
              value: function (e) {
                k(e) && (this._docs.push(e), this._myIndex.add(e));
              },
            },
            {
              key: "remove",
              value: function () {
                for (
                  var e =
                      arguments.length > 0 && void 0 !== arguments[0]
                        ? arguments[0]
                        : function () {
                            return !1;
                          },
                    t = [],
                    n = 0,
                    r = this._docs.length;
                  n < r;
                  n += 1
                ) {
                  var i = this._docs[n];
                  e(i, n) && (this.removeAt(n), (n -= 1), (r -= 1), t.push(i));
                }
                return t;
              },
            },
            {
              key: "removeAt",
              value: function (e) {
                this._docs.splice(e, 1), this._myIndex.removeAt(e);
              },
            },
            {
              key: "getIndex",
              value: function () {
                return this._myIndex;
              },
            },
            {
              key: "search",
              value: function (e) {
                var t =
                    arguments.length > 1 && void 0 !== arguments[1]
                      ? arguments[1]
                      : {},
                  n = t.limit,
                  r = void 0 === n ? -1 : n,
                  i = this.options,
                  o = i.includeMatches,
                  c = i.includeScore,
                  a = i.shouldSort,
                  s = i.sortFn,
                  u = i.ignoreFieldNorm,
                  h = g(e)
                    ? g(this._docs[0])
                      ? this._searchStringList(e)
                      : this._searchObjectList(e)
                    : this._searchLogical(e);
                return (
                  de(h, { ignoreFieldNorm: u }),
                  a && h.sort(s),
                  y(r) && r > -1 && (h = h.slice(0, r)),
                  ve(h, this._docs, { includeMatches: o, includeScore: c })
                );
              },
            },
            {
              key: "_searchStringList",
              value: function (e) {
                var t = re(e, this.options),
                  n = this._myIndex.records,
                  r = [];
                return (
                  n.forEach(function (e) {
                    var n = e.v,
                      i = e.i,
                      o = e.n;
                    if (k(n)) {
                      var c = t.searchIn(n),
                        a = c.isMatch,
                        s = c.score,
                        u = c.indices;
                      a &&
                        r.push({
                          item: n,
                          idx: i,
                          matches: [
                            { score: s, value: n, norm: o, indices: u },
                          ],
                        });
                    }
                  }),
                  r
                );
              },
            },
            {
              key: "_searchLogical",
              value: function (e) {
                var t = this,
                  n = (function (e, t) {
                    var n =
                        arguments.length > 2 && void 0 !== arguments[2]
                          ? arguments[2]
                          : {},
                      r = n.auto,
                      i = void 0 === r || r,
                      o = function e(n) {
                        var r = Object.keys(n),
                          o = ue(n);
                        if (!o && r.length > 1 && !se(n)) return e(fe(n));
                        if (he(n)) {
                          var c = o ? n[ce] : r[0],
                            a = o ? n[ae] : n[c];
                          if (!g(a)) throw new Error(b(c));
                          var s = { keyId: j(c), pattern: a };
                          return i && (s.searcher = re(a, t)), s;
                        }
                        var u = { children: [], operator: r[0] };
                        return (
                          r.forEach(function (t) {
                            var r = n[t];
                            v(r) &&
                              r.forEach(function (t) {
                                u.children.push(e(t));
                              });
                          }),
                          u
                        );
                      };
                    return se(e) || (e = fe(e)), o(e);
                  })(e, this.options),
                  r = this._myIndex.records,
                  i = {},
                  o = [];
                return (
                  r.forEach(function (e) {
                    var r = e.$,
                      c = e.i;
                    if (k(r)) {
                      var a = (function e(n, r, i) {
                        if (!n.children) {
                          var o = n.keyId,
                            c = n.searcher,
                            a = t._findMatches({
                              key: t._keyStore.get(o),
                              value: t._myIndex.getValueForItemAtKeyId(r, o),
                              searcher: c,
                            });
                          return a && a.length
                            ? [{ idx: i, item: r, matches: a }]
                            : [];
                        }
                        switch (n.operator) {
                          case ie:
                            for (
                              var s = [], u = 0, h = n.children.length;
                              u < h;
                              u += 1
                            ) {
                              var f = e(n.children[u], r, i);
                              if (!f.length) return [];
                              s.push.apply(s, l(f));
                            }
                            return s;
                          case oe:
                            for (
                              var d = [], v = 0, g = n.children.length;
                              v < g;
                              v += 1
                            ) {
                              var y = e(n.children[v], r, i);
                              if (y.length) {
                                d.push.apply(d, l(y));
                                break;
                              }
                            }
                            return d;
                        }
                      })(n, r, c);
                      a.length &&
                        (i[c] ||
                          ((i[c] = { idx: c, item: r, matches: [] }),
                          o.push(i[c])),
                        a.forEach(function (e) {
                          var t,
                            n = e.matches;
                          (t = i[c].matches).push.apply(t, l(n));
                        }));
                    }
                  }),
                  o
                );
              },
            },
            {
              key: "_searchObjectList",
              value: function (e) {
                var t = this,
                  n = re(e, this.options),
                  r = this._myIndex,
                  i = r.keys,
                  o = r.records,
                  c = [];
                return (
                  o.forEach(function (e) {
                    var r = e.$,
                      o = e.i;
                    if (k(r)) {
                      var a = [];
                      i.forEach(function (e, i) {
                        a.push.apply(
                          a,
                          l(
                            t._findMatches({ key: e, value: r[i], searcher: n })
                          )
                        );
                      }),
                        a.length && c.push({ idx: o, item: r, matches: a });
                    }
                  }),
                  c
                );
              },
            },
            {
              key: "_findMatches",
              value: function (e) {
                var t = e.key,
                  n = e.value,
                  r = e.searcher;
                if (!k(n)) return [];
                var i = [];
                if (v(n))
                  n.forEach(function (e) {
                    var n = e.v,
                      o = e.i,
                      c = e.n;
                    if (k(n)) {
                      var a = r.searchIn(n),
                        s = a.isMatch,
                        u = a.score,
                        h = a.indices;
                      s &&
                        i.push({
                          score: u,
                          key: t,
                          value: n,
                          idx: o,
                          norm: c,
                          indices: h,
                        });
                    }
                  });
                else {
                  var o = n.v,
                    c = n.n,
                    a = r.searchIn(o),
                    s = a.isMatch,
                    u = a.score,
                    h = a.indices;
                  s &&
                    i.push({ score: u, key: t, value: o, norm: c, indices: h });
                }
                return i;
              },
            },
          ]),
          e
        );
      })();
    function de(e, t) {
      var n = t.ignoreFieldNorm,
        r = void 0 === n ? A.ignoreFieldNorm : n;
      e.forEach(function (e) {
        var t = 1;
        e.matches.forEach(function (e) {
          var n = e.key,
            i = e.norm,
            o = e.score,
            c = n ? n.weight : null;
          t *= Math.pow(
            0 === o && c ? Number.EPSILON : o,
            (c || 1) * (r ? 1 : i)
          );
        }),
          (e.score = t);
      });
    }
    function ve(e, t) {
      var n =
          arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {},
        r = n.includeMatches,
        i = void 0 === r ? A.includeMatches : r,
        o = n.includeScore,
        c = void 0 === o ? A.includeScore : o,
        a = [];
      return (
        i && a.push(R),
        c && a.push(F),
        e.map(function (e) {
          var n = e.idx,
            r = { item: t[n], refIndex: n };
          return (
            a.length &&
              a.forEach(function (t) {
                t(e, r);
              }),
            r
          );
        })
      );
    }
    return (
      (le.version = "6.4.3"),
      (le.createIndex = $),
      (le.parseIndex = function (e) {
        var t =
            arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {},
          n = t.getFn,
          r = void 0 === n ? A.getFn : n,
          i = e.keys,
          o = e.records,
          c = new E({ getFn: r });
        return c.setKeys(i), c.setIndexRecords(o), c;
      }),
      (le.config = A),
      (function () {
        ne.push.apply(ne, arguments);
      })(te),
      le
    );
  }),
  "object" == typeof exports && "undefined" != typeof module
    ? (module.exports = t())
    : "function" == typeof define && define.amd
    ? define(t)
    : ((e = e || self).Fuse = t());

/* @license
Papa Parse
v5.3.0
https://github.com/mholt/PapaParse
License: MIT
*/
!(function (e, t) {
  "function" == typeof define && define.amd
    ? define([], t)
    : "object" == typeof module && "undefined" != typeof exports
    ? (module.exports = t())
    : (e.Papa = t());
})(this, function s() {
  "use strict";
  var f =
    "undefined" != typeof self
      ? self
      : "undefined" != typeof window
      ? window
      : void 0 !== f
      ? f
      : {};
  var n = !f.document && !!f.postMessage,
    o = n && /blob:/i.test((f.location || {}).protocol),
    a = {},
    h = 0,
    b = {
      parse: function (e, t) {
        var i = (t = t || {}).dynamicTyping || !1;
        U(i) && ((t.dynamicTypingFunction = i), (i = {}));
        if (
          ((t.dynamicTyping = i),
          (t.transform = !!U(t.transform) && t.transform),
          t.worker && b.WORKERS_SUPPORTED)
        ) {
          var r = (function () {
            if (!b.WORKERS_SUPPORTED) return !1;
            var e =
                ((i = f.URL || f.webkitURL || null),
                (r = s.toString()),
                b.BLOB_URL ||
                  (b.BLOB_URL = i.createObjectURL(
                    new Blob(["(", r, ")();"], { type: "text/javascript" })
                  ))),
              t = new f.Worker(e);
            var i, r;
            return (t.onmessage = m), (t.id = h++), (a[t.id] = t);
          })();
          return (
            (r.userStep = t.step),
            (r.userChunk = t.chunk),
            (r.userComplete = t.complete),
            (r.userError = t.error),
            (t.step = U(t.step)),
            (t.chunk = U(t.chunk)),
            (t.complete = U(t.complete)),
            (t.error = U(t.error)),
            delete t.worker,
            void r.postMessage({ input: e, config: t, workerId: r.id })
          );
        }
        var n = null;
        b.NODE_STREAM_INPUT,
          "string" == typeof e
            ? (n = t.download ? new l(t) : new p(t))
            : !0 === e.readable && U(e.read) && U(e.on)
            ? (n = new g(t))
            : ((f.File && e instanceof File) || e instanceof Object) &&
              (n = new c(t));
        return n.stream(e);
      },
      unparse: function (e, t) {
        var n = !1,
          m = !0,
          _ = ",",
          v = "\r\n",
          s = '"',
          a = s + s,
          i = !1,
          r = null,
          o = !1;
        !(function () {
          if ("object" != typeof t) return;
          "string" != typeof t.delimiter ||
            b.BAD_DELIMITERS.filter(function (e) {
              return -1 !== t.delimiter.indexOf(e);
            }).length ||
            (_ = t.delimiter);
          ("boolean" == typeof t.quotes ||
            "function" == typeof t.quotes ||
            Array.isArray(t.quotes)) &&
            (n = t.quotes);
          ("boolean" != typeof t.skipEmptyLines &&
            "string" != typeof t.skipEmptyLines) ||
            (i = t.skipEmptyLines);
          "string" == typeof t.newline && (v = t.newline);
          "string" == typeof t.quoteChar && (s = t.quoteChar);
          "boolean" == typeof t.header && (m = t.header);
          if (Array.isArray(t.columns)) {
            if (0 === t.columns.length)
              throw new Error("Option columns is empty");
            r = t.columns;
          }
          void 0 !== t.escapeChar && (a = t.escapeChar + s);
          "boolean" == typeof t.escapeFormulae && (o = t.escapeFormulae);
        })();
        var h = new RegExp(q(s), "g");
        "string" == typeof e && (e = JSON.parse(e));
        if (Array.isArray(e)) {
          if (!e.length || Array.isArray(e[0])) return f(null, e, i);
          if ("object" == typeof e[0]) return f(r || u(e[0]), e, i);
        } else if ("object" == typeof e)
          return (
            "string" == typeof e.data && (e.data = JSON.parse(e.data)),
            Array.isArray(e.data) &&
              (e.fields || (e.fields = e.meta && e.meta.fields),
              e.fields ||
                (e.fields = Array.isArray(e.data[0]) ? e.fields : u(e.data[0])),
              Array.isArray(e.data[0]) ||
                "object" == typeof e.data[0] ||
                (e.data = [e.data])),
            f(e.fields || [], e.data || [], i)
          );
        throw new Error("Unable to serialize unrecognized input");
        function u(e) {
          if ("object" != typeof e) return [];
          var t = [];
          for (var i in e) t.push(i);
          return t;
        }
        function f(e, t, i) {
          var r = "";
          "string" == typeof e && (e = JSON.parse(e)),
            "string" == typeof t && (t = JSON.parse(t));
          var n = Array.isArray(e) && 0 < e.length,
            s = !Array.isArray(t[0]);
          if (n && m) {
            for (var a = 0; a < e.length; a++)
              0 < a && (r += _), (r += y(e[a], a));
            0 < t.length && (r += v);
          }
          for (var o = 0; o < t.length; o++) {
            var h = n ? e.length : t[o].length,
              u = !1,
              f = n ? 0 === Object.keys(t[o]).length : 0 === t[o].length;
            if (
              (i &&
                !n &&
                (u =
                  "greedy" === i
                    ? "" === t[o].join("").trim()
                    : 1 === t[o].length && 0 === t[o][0].length),
              "greedy" === i && n)
            ) {
              for (var d = [], l = 0; l < h; l++) {
                var c = s ? e[l] : l;
                d.push(t[o][c]);
              }
              u = "" === d.join("").trim();
            }
            if (!u) {
              for (var p = 0; p < h; p++) {
                0 < p && !f && (r += _);
                var g = n && s ? e[p] : p;
                r += y(t[o][g], p);
              }
              o < t.length - 1 && (!i || (0 < h && !f)) && (r += v);
            }
          }
          return r;
        }
        function y(e, t) {
          if (null == e) return "";
          if (e.constructor === Date) return JSON.stringify(e).slice(1, 25);
          !0 === o &&
            "string" == typeof e &&
            null !== e.match(/^[=+\-@].*$/) &&
            (e = "'" + e);
          var i = e.toString().replace(h, a),
            r =
              ("boolean" == typeof n && n) ||
              ("function" == typeof n && n(e, t)) ||
              (Array.isArray(n) && n[t]) ||
              (function (e, t) {
                for (var i = 0; i < t.length; i++)
                  if (-1 < e.indexOf(t[i])) return !0;
                return !1;
              })(i, b.BAD_DELIMITERS) ||
              -1 < i.indexOf(_) ||
              " " === i.charAt(0) ||
              " " === i.charAt(i.length - 1);
          return r ? s + i + s : i;
        }
      },
    };
  if (
    ((b.RECORD_SEP = String.fromCharCode(30)),
    (b.UNIT_SEP = String.fromCharCode(31)),
    (b.BYTE_ORDER_MARK = "\ufeff"),
    (b.BAD_DELIMITERS = ["\r", "\n", '"', b.BYTE_ORDER_MARK]),
    (b.WORKERS_SUPPORTED = !n && !!f.Worker),
    (b.NODE_STREAM_INPUT = 1),
    (b.LocalChunkSize = 10485760),
    (b.RemoteChunkSize = 5242880),
    (b.DefaultDelimiter = ","),
    (b.Parser = w),
    (b.ParserHandle = i),
    (b.NetworkStreamer = l),
    (b.FileStreamer = c),
    (b.StringStreamer = p),
    (b.ReadableStreamStreamer = g),
    f.jQuery)
  ) {
    var d = f.jQuery;
    d.fn.parse = function (o) {
      var i = o.config || {},
        h = [];
      return (
        this.each(function (e) {
          if (
            !(
              "INPUT" === d(this).prop("tagName").toUpperCase() &&
              "file" === d(this).attr("type").toLowerCase() &&
              f.FileReader
            ) ||
            !this.files ||
            0 === this.files.length
          )
            return !0;
          for (var t = 0; t < this.files.length; t++)
            h.push({
              file: this.files[t],
              inputElem: this,
              instanceConfig: d.extend({}, i),
            });
        }),
        e(),
        this
      );
      function e() {
        if (0 !== h.length) {
          var e,
            t,
            i,
            r,
            n = h[0];
          if (U(o.before)) {
            var s = o.before(n.file, n.inputElem);
            if ("object" == typeof s) {
              if ("abort" === s.action)
                return (
                  (e = "AbortError"),
                  (t = n.file),
                  (i = n.inputElem),
                  (r = s.reason),
                  void (U(o.error) && o.error({ name: e }, t, i, r))
                );
              if ("skip" === s.action) return void u();
              "object" == typeof s.config &&
                (n.instanceConfig = d.extend(n.instanceConfig, s.config));
            } else if ("skip" === s) return void u();
          }
          var a = n.instanceConfig.complete;
          (n.instanceConfig.complete = function (e) {
            U(a) && a(e, n.file, n.inputElem), u();
          }),
            b.parse(n.file, n.instanceConfig);
        } else U(o.complete) && o.complete();
      }
      function u() {
        h.splice(0, 1), e();
      }
    };
  }
  function u(e) {
    (this._handle = null),
      (this._finished = !1),
      (this._completed = !1),
      (this._halted = !1),
      (this._input = null),
      (this._baseIndex = 0),
      (this._partialLine = ""),
      (this._rowCount = 0),
      (this._start = 0),
      (this._nextChunk = null),
      (this.isFirstChunk = !0),
      (this._completeResults = { data: [], errors: [], meta: {} }),
      function (e) {
        var t = E(e);
        (t.chunkSize = parseInt(t.chunkSize)),
          e.step || e.chunk || (t.chunkSize = null);
        (this._handle = new i(t)), ((this._handle.streamer = this)._config = t);
      }.call(this, e),
      (this.parseChunk = function (e, t) {
        if (this.isFirstChunk && U(this._config.beforeFirstChunk)) {
          var i = this._config.beforeFirstChunk(e);
          void 0 !== i && (e = i);
        }
        (this.isFirstChunk = !1), (this._halted = !1);
        var r = this._partialLine + e;
        this._partialLine = "";
        var n = this._handle.parse(r, this._baseIndex, !this._finished);
        if (!this._handle.paused() && !this._handle.aborted()) {
          var s = n.meta.cursor;
          this._finished ||
            ((this._partialLine = r.substring(s - this._baseIndex)),
            (this._baseIndex = s)),
            n && n.data && (this._rowCount += n.data.length);
          var a =
            this._finished ||
            (this._config.preview && this._rowCount >= this._config.preview);
          if (o)
            f.postMessage({ results: n, workerId: b.WORKER_ID, finished: a });
          else if (U(this._config.chunk) && !t) {
            if (
              (this._config.chunk(n, this._handle),
              this._handle.paused() || this._handle.aborted())
            )
              return void (this._halted = !0);
            (n = void 0), (this._completeResults = void 0);
          }
          return (
            this._config.step ||
              this._config.chunk ||
              ((this._completeResults.data = this._completeResults.data.concat(
                n.data
              )),
              (this._completeResults.errors = this._completeResults.errors.concat(
                n.errors
              )),
              (this._completeResults.meta = n.meta)),
            this._completed ||
              !a ||
              !U(this._config.complete) ||
              (n && n.meta.aborted) ||
              (this._config.complete(this._completeResults, this._input),
              (this._completed = !0)),
            a || (n && n.meta.paused) || this._nextChunk(),
            n
          );
        }
        this._halted = !0;
      }),
      (this._sendError = function (e) {
        U(this._config.error)
          ? this._config.error(e)
          : o &&
            this._config.error &&
            f.postMessage({ workerId: b.WORKER_ID, error: e, finished: !1 });
      });
  }
  function l(e) {
    var r;
    (e = e || {}).chunkSize || (e.chunkSize = b.RemoteChunkSize),
      u.call(this, e),
      (this._nextChunk = n
        ? function () {
            this._readChunk(), this._chunkLoaded();
          }
        : function () {
            this._readChunk();
          }),
      (this.stream = function (e) {
        (this._input = e), this._nextChunk();
      }),
      (this._readChunk = function () {
        if (this._finished) this._chunkLoaded();
        else {
          if (
            ((r = new XMLHttpRequest()),
            this._config.withCredentials &&
              (r.withCredentials = this._config.withCredentials),
            n ||
              ((r.onload = y(this._chunkLoaded, this)),
              (r.onerror = y(this._chunkError, this))),
            r.open(
              this._config.downloadRequestBody ? "POST" : "GET",
              this._input,
              !n
            ),
            this._config.downloadRequestHeaders)
          ) {
            var e = this._config.downloadRequestHeaders;
            for (var t in e) r.setRequestHeader(t, e[t]);
          }
          if (this._config.chunkSize) {
            var i = this._start + this._config.chunkSize - 1;
            r.setRequestHeader("Range", "bytes=" + this._start + "-" + i);
          }
          try {
            r.send(this._config.downloadRequestBody);
          } catch (e) {
            this._chunkError(e.message);
          }
          n && 0 === r.status && this._chunkError();
        }
      }),
      (this._chunkLoaded = function () {
        4 === r.readyState &&
          (r.status < 200 || 400 <= r.status
            ? this._chunkError()
            : ((this._start += this._config.chunkSize
                ? this._config.chunkSize
                : r.responseText.length),
              (this._finished =
                !this._config.chunkSize ||
                this._start >=
                  (function (e) {
                    var t = e.getResponseHeader("Content-Range");
                    if (null === t) return -1;
                    return parseInt(t.substring(t.lastIndexOf("/") + 1));
                  })(r)),
              this.parseChunk(r.responseText)));
      }),
      (this._chunkError = function (e) {
        var t = r.statusText || e;
        this._sendError(new Error(t));
      });
  }
  function c(e) {
    var r, n;
    (e = e || {}).chunkSize || (e.chunkSize = b.LocalChunkSize),
      u.call(this, e);
    var s = "undefined" != typeof FileReader;
    (this.stream = function (e) {
      (this._input = e),
        (n = e.slice || e.webkitSlice || e.mozSlice),
        s
          ? (((r = new FileReader()).onload = y(this._chunkLoaded, this)),
            (r.onerror = y(this._chunkError, this)))
          : (r = new FileReaderSync()),
        this._nextChunk();
    }),
      (this._nextChunk = function () {
        this._finished ||
          (this._config.preview && !(this._rowCount < this._config.preview)) ||
          this._readChunk();
      }),
      (this._readChunk = function () {
        var e = this._input;
        if (this._config.chunkSize) {
          var t = Math.min(
            this._start + this._config.chunkSize,
            this._input.size
          );
          e = n.call(e, this._start, t);
        }
        var i = r.readAsText(e, this._config.encoding);
        s || this._chunkLoaded({ target: { result: i } });
      }),
      (this._chunkLoaded = function (e) {
        (this._start += this._config.chunkSize),
          (this._finished =
            !this._config.chunkSize || this._start >= this._input.size),
          this.parseChunk(e.target.result);
      }),
      (this._chunkError = function () {
        this._sendError(r.error);
      });
  }
  function p(e) {
    var i;
    u.call(this, (e = e || {})),
      (this.stream = function (e) {
        return (i = e), this._nextChunk();
      }),
      (this._nextChunk = function () {
        if (!this._finished) {
          var e,
            t = this._config.chunkSize;
          return (
            t
              ? ((e = i.substring(0, t)), (i = i.substring(t)))
              : ((e = i), (i = "")),
            (this._finished = !i),
            this.parseChunk(e)
          );
        }
      });
  }
  function g(e) {
    u.call(this, (e = e || {}));
    var t = [],
      i = !0,
      r = !1;
    (this.pause = function () {
      u.prototype.pause.apply(this, arguments), this._input.pause();
    }),
      (this.resume = function () {
        u.prototype.resume.apply(this, arguments), this._input.resume();
      }),
      (this.stream = function (e) {
        (this._input = e),
          this._input.on("data", this._streamData),
          this._input.on("end", this._streamEnd),
          this._input.on("error", this._streamError);
      }),
      (this._checkIsFinished = function () {
        r && 1 === t.length && (this._finished = !0);
      }),
      (this._nextChunk = function () {
        this._checkIsFinished(),
          t.length ? this.parseChunk(t.shift()) : (i = !0);
      }),
      (this._streamData = y(function (e) {
        try {
          t.push("string" == typeof e ? e : e.toString(this._config.encoding)),
            i &&
              ((i = !1), this._checkIsFinished(), this.parseChunk(t.shift()));
        } catch (e) {
          this._streamError(e);
        }
      }, this)),
      (this._streamError = y(function (e) {
        this._streamCleanUp(), this._sendError(e);
      }, this)),
      (this._streamEnd = y(function () {
        this._streamCleanUp(), (r = !0), this._streamData("");
      }, this)),
      (this._streamCleanUp = y(function () {
        this._input.removeListener("data", this._streamData),
          this._input.removeListener("end", this._streamEnd),
          this._input.removeListener("error", this._streamError);
      }, this));
  }
  function i(_) {
    var a,
      o,
      h,
      r = Math.pow(2, 53),
      n = -r,
      s = /^\s*-?(\d+\.?|\.\d+|\d+\.\d+)(e[-+]?\d+)?\s*$/,
      u = /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/,
      t = this,
      i = 0,
      f = 0,
      d = !1,
      e = !1,
      l = [],
      c = { data: [], errors: [], meta: {} };
    if (U(_.step)) {
      var p = _.step;
      _.step = function (e) {
        if (((c = e), m())) g();
        else {
          if ((g(), 0 === c.data.length)) return;
          (i += e.data.length),
            _.preview && i > _.preview
              ? o.abort()
              : ((c.data = c.data[0]), p(c, t));
        }
      };
    }
    function v(e) {
      return "greedy" === _.skipEmptyLines
        ? "" === e.join("").trim()
        : 1 === e.length && 0 === e[0].length;
    }
    function g() {
      if (
        (c &&
          h &&
          (k(
            "Delimiter",
            "UndetectableDelimiter",
            "Unable to auto-detect delimiting character; defaulted to '" +
              b.DefaultDelimiter +
              "'"
          ),
          (h = !1)),
        _.skipEmptyLines)
      )
        for (var e = 0; e < c.data.length; e++)
          v(c.data[e]) && c.data.splice(e--, 1);
      return (
        m() &&
          (function () {
            if (!c) return;
            function e(e, t) {
              U(_.transformHeader) && (e = _.transformHeader(e, t)), l.push(e);
            }
            if (Array.isArray(c.data[0])) {
              for (var t = 0; m() && t < c.data.length; t++)
                c.data[t].forEach(e);
              c.data.splice(0, 1);
            } else c.data.forEach(e);
          })(),
        (function () {
          if (!c || (!_.header && !_.dynamicTyping && !_.transform)) return c;
          function e(e, t) {
            var i,
              r = _.header ? {} : [];
            for (i = 0; i < e.length; i++) {
              var n = i,
                s = e[i];
              _.header && (n = i >= l.length ? "__parsed_extra" : l[i]),
                _.transform && (s = _.transform(s, n)),
                (s = y(n, s)),
                "__parsed_extra" === n
                  ? ((r[n] = r[n] || []), r[n].push(s))
                  : (r[n] = s);
            }
            return (
              _.header &&
                (i > l.length
                  ? k(
                      "FieldMismatch",
                      "TooManyFields",
                      "Too many fields: expected " +
                        l.length +
                        " fields but parsed " +
                        i,
                      f + t
                    )
                  : i < l.length &&
                    k(
                      "FieldMismatch",
                      "TooFewFields",
                      "Too few fields: expected " +
                        l.length +
                        " fields but parsed " +
                        i,
                      f + t
                    )),
              r
            );
          }
          var t = 1;
          !c.data.length || Array.isArray(c.data[0])
            ? ((c.data = c.data.map(e)), (t = c.data.length))
            : (c.data = e(c.data, 0));
          _.header && c.meta && (c.meta.fields = l);
          return (f += t), c;
        })()
      );
    }
    function m() {
      return _.header && 0 === l.length;
    }
    function y(e, t) {
      return (
        (i = e),
        _.dynamicTypingFunction &&
          void 0 === _.dynamicTyping[i] &&
          (_.dynamicTyping[i] = _.dynamicTypingFunction(i)),
        !0 === (_.dynamicTyping[i] || _.dynamicTyping)
          ? "true" === t ||
            "TRUE" === t ||
            ("false" !== t &&
              "FALSE" !== t &&
              ((function (e) {
                if (s.test(e)) {
                  var t = parseFloat(e);
                  if (n < t && t < r) return !0;
                }
                return !1;
              })(t)
                ? parseFloat(t)
                : u.test(t)
                ? new Date(t)
                : "" === t
                ? null
                : t))
          : t
      );
      var i;
    }
    function k(e, t, i, r) {
      var n = { type: e, code: t, message: i };
      void 0 !== r && (n.row = r), c.errors.push(n);
    }
    (this.parse = function (e, t, i) {
      var r = _.quoteChar || '"';
      if (
        (_.newline ||
          (_.newline = (function (e, t) {
            e = e.substring(0, 1048576);
            var i = new RegExp(q(t) + "([^]*?)" + q(t), "gm"),
              r = (e = e.replace(i, "")).split("\r"),
              n = e.split("\n"),
              s = 1 < n.length && n[0].length < r[0].length;
            if (1 === r.length || s) return "\n";
            for (var a = 0, o = 0; o < r.length; o++) "\n" === r[o][0] && a++;
            return a >= r.length / 2 ? "\r\n" : "\r";
          })(e, r)),
        (h = !1),
        _.delimiter)
      )
        U(_.delimiter) &&
          ((_.delimiter = _.delimiter(e)), (c.meta.delimiter = _.delimiter));
      else {
        var n = (function (e, t, i, r, n) {
          var s, a, o, h;
          n = n || [",", "\t", "|", ";", b.RECORD_SEP, b.UNIT_SEP];
          for (var u = 0; u < n.length; u++) {
            var f = n[u],
              d = 0,
              l = 0,
              c = 0;
            o = void 0;
            for (
              var p = new w({
                  comments: r,
                  delimiter: f,
                  newline: t,
                  preview: 10,
                }).parse(e),
                g = 0;
              g < p.data.length;
              g++
            )
              if (i && v(p.data[g])) c++;
              else {
                var m = p.data[g].length;
                (l += m),
                  void 0 !== o
                    ? 0 < m && ((d += Math.abs(m - o)), (o = m))
                    : (o = m);
              }
            0 < p.data.length && (l /= p.data.length - c),
              (void 0 === a || d <= a) &&
                (void 0 === h || h < l) &&
                1.99 < l &&
                ((a = d), (s = f), (h = l));
          }
          return { successful: !!(_.delimiter = s), bestDelimiter: s };
        })(e, _.newline, _.skipEmptyLines, _.comments, _.delimitersToGuess);
        n.successful
          ? (_.delimiter = n.bestDelimiter)
          : ((h = !0), (_.delimiter = b.DefaultDelimiter)),
          (c.meta.delimiter = _.delimiter);
      }
      var s = E(_);
      return (
        _.preview && _.header && s.preview++,
        (a = e),
        (o = new w(s)),
        (c = o.parse(a, t, i)),
        g(),
        d ? { meta: { paused: !0 } } : c || { meta: { paused: !1 } }
      );
    }),
      (this.paused = function () {
        return d;
      }),
      (this.pause = function () {
        (d = !0),
          o.abort(),
          (a = U(_.chunk) ? "" : a.substring(o.getCharIndex()));
      }),
      (this.resume = function () {
        t.streamer._halted
          ? ((d = !1), t.streamer.parseChunk(a, !0))
          : setTimeout(t.resume, 3);
      }),
      (this.aborted = function () {
        return e;
      }),
      (this.abort = function () {
        (e = !0),
          o.abort(),
          (c.meta.aborted = !0),
          U(_.complete) && _.complete(c),
          (a = "");
      });
  }
  function q(e) {
    return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function w(e) {
    var O,
      D = (e = e || {}).delimiter,
      I = e.newline,
      T = e.comments,
      A = e.step,
      L = e.preview,
      F = e.fastMode,
      z = (O = void 0 === e.quoteChar ? '"' : e.quoteChar);
    if (
      (void 0 !== e.escapeChar && (z = e.escapeChar),
      ("string" != typeof D || -1 < b.BAD_DELIMITERS.indexOf(D)) && (D = ","),
      T === D)
    )
      throw new Error("Comment character same as delimiter");
    !0 === T
      ? (T = "#")
      : ("string" != typeof T || -1 < b.BAD_DELIMITERS.indexOf(T)) && (T = !1),
      "\n" !== I && "\r" !== I && "\r\n" !== I && (I = "\n");
    var M = 0,
      j = !1;
    (this.parse = function (a, t, i) {
      if ("string" != typeof a) throw new Error("Input must be a string");
      var r = a.length,
        e = D.length,
        n = I.length,
        s = T.length,
        o = U(A),
        h = [],
        u = [],
        f = [],
        d = (M = 0);
      if (!a) return R();
      if (F || (!1 !== F && -1 === a.indexOf(O))) {
        for (var l = a.split(I), c = 0; c < l.length; c++) {
          if (((f = l[c]), (M += f.length), c !== l.length - 1)) M += I.length;
          else if (i) return R();
          if (!T || f.substring(0, s) !== T) {
            if (o) {
              if (((h = []), b(f.split(D)), S(), j)) return R();
            } else b(f.split(D));
            if (L && L <= c) return (h = h.slice(0, L)), R(!0);
          }
        }
        return R();
      }
      for (
        var p = a.indexOf(D, M),
          g = a.indexOf(I, M),
          m = new RegExp(q(z) + q(O), "g"),
          _ = a.indexOf(O, M);
        ;

      )
        if (a[M] !== O)
          if (T && 0 === f.length && a.substring(M, M + s) === T) {
            if (-1 === g) return R();
            (M = g + n), (g = a.indexOf(I, M)), (p = a.indexOf(D, M));
          } else {
            if (-1 !== p && (p < g || -1 === g)) {
              if (!(p < _)) {
                f.push(a.substring(M, p)), (M = p + e), (p = a.indexOf(D, M));
                continue;
              }
              var v = x(p, _, g);
              if (v && void 0 !== v.nextDelim) {
                (p = v.nextDelim),
                  (_ = v.quoteSearch),
                  f.push(a.substring(M, p)),
                  (M = p + e),
                  (p = a.indexOf(D, M));
                continue;
              }
            }
            if (-1 === g) break;
            if ((f.push(a.substring(M, g)), C(g + n), o && (S(), j)))
              return R();
            if (L && h.length >= L) return R(!0);
          }
        else
          for (_ = M, M++; ; ) {
            if (-1 === (_ = a.indexOf(O, _ + 1)))
              return (
                i ||
                  u.push({
                    type: "Quotes",
                    code: "MissingQuotes",
                    message: "Quoted field unterminated",
                    row: h.length,
                    index: M,
                  }),
                E()
              );
            if (_ === r - 1) return E(a.substring(M, _).replace(m, O));
            if (O !== z || a[_ + 1] !== z) {
              if (O === z || 0 === _ || a[_ - 1] !== z) {
                -1 !== p && p < _ + 1 && (p = a.indexOf(D, _ + 1)),
                  -1 !== g && g < _ + 1 && (g = a.indexOf(I, _ + 1));
                var y = w(-1 === g ? p : Math.min(p, g));
                if (a[_ + 1 + y] === D) {
                  f.push(a.substring(M, _).replace(m, O)),
                    a[(M = _ + 1 + y + e)] !== O && (_ = a.indexOf(O, M)),
                    (p = a.indexOf(D, M)),
                    (g = a.indexOf(I, M));
                  break;
                }
                var k = w(g);
                if (a.substring(_ + 1 + k, _ + 1 + k + n) === I) {
                  if (
                    (f.push(a.substring(M, _).replace(m, O)),
                    C(_ + 1 + k + n),
                    (p = a.indexOf(D, M)),
                    (_ = a.indexOf(O, M)),
                    o && (S(), j))
                  )
                    return R();
                  if (L && h.length >= L) return R(!0);
                  break;
                }
                u.push({
                  type: "Quotes",
                  code: "InvalidQuotes",
                  message: "Trailing quote on quoted field is malformed",
                  row: h.length,
                  index: M,
                }),
                  _++;
              }
            } else _++;
          }
      return E();
      function b(e) {
        h.push(e), (d = M);
      }
      function w(e) {
        var t = 0;
        if (-1 !== e) {
          var i = a.substring(_ + 1, e);
          i && "" === i.trim() && (t = i.length);
        }
        return t;
      }
      function E(e) {
        return (
          i ||
            (void 0 === e && (e = a.substring(M)),
            f.push(e),
            (M = r),
            b(f),
            o && S()),
          R()
        );
      }
      function C(e) {
        (M = e), b(f), (f = []), (g = a.indexOf(I, M));
      }
      function R(e) {
        return {
          data: h,
          errors: u,
          meta: {
            delimiter: D,
            linebreak: I,
            aborted: j,
            truncated: !!e,
            cursor: d + (t || 0),
          },
        };
      }
      function S() {
        A(R()), (h = []), (u = []);
      }
      function x(e, t, i) {
        var r = { nextDelim: void 0, quoteSearch: void 0 },
          n = a.indexOf(O, t + 1);
        if (t < e && e < n && (n < i || -1 === i)) {
          var s = a.indexOf(D, n);
          if (-1 === s) return r;
          n < s && (n = a.indexOf(O, n + 1)), (r = x(s, n, i));
        } else r = { nextDelim: e, quoteSearch: t };
        return r;
      }
    }),
      (this.abort = function () {
        j = !0;
      }),
      (this.getCharIndex = function () {
        return M;
      });
  }
  function m(e) {
    var t = e.data,
      i = a[t.workerId],
      r = !1;
    if (t.error) i.userError(t.error, t.file);
    else if (t.results && t.results.data) {
      var n = {
        abort: function () {
          (r = !0),
            _(t.workerId, { data: [], errors: [], meta: { aborted: !0 } });
        },
        pause: v,
        resume: v,
      };
      if (U(i.userStep)) {
        for (
          var s = 0;
          s < t.results.data.length &&
          (i.userStep(
            {
              data: t.results.data[s],
              errors: t.results.errors,
              meta: t.results.meta,
            },
            n
          ),
          !r);
          s++
        );
        delete t.results;
      } else
        U(i.userChunk) && (i.userChunk(t.results, n, t.file), delete t.results);
    }
    t.finished && !r && _(t.workerId, t.results);
  }
  function _(e, t) {
    var i = a[e];
    U(i.userComplete) && i.userComplete(t), i.terminate(), delete a[e];
  }
  function v() {
    throw new Error("Not implemented.");
  }
  function E(e) {
    if ("object" != typeof e || null === e) return e;
    var t = Array.isArray(e) ? [] : {};
    for (var i in e) t[i] = E(e[i]);
    return t;
  }
  function y(e, t) {
    return function () {
      e.apply(t, arguments);
    };
  }
  function U(e) {
    return "function" == typeof e;
  }
  return (
    o &&
      (f.onmessage = function (e) {
        var t = e.data;
        void 0 === b.WORKER_ID && t && (b.WORKER_ID = t.workerId);
        if ("string" == typeof t.input)
          f.postMessage({
            workerId: b.WORKER_ID,
            results: b.parse(t.input, t.config),
            finished: !0,
          });
        else if (
          (f.File && t.input instanceof File) ||
          t.input instanceof Object
        ) {
          var i = b.parse(t.input, t.config);
          i &&
            f.postMessage({ workerId: b.WORKER_ID, results: i, finished: !0 });
        }
      }),
    ((l.prototype = Object.create(u.prototype)).constructor = l),
    ((c.prototype = Object.create(u.prototype)).constructor = c),
    ((p.prototype = Object.create(p.prototype)).constructor = p),
    ((g.prototype = Object.create(u.prototype)).constructor = g),
    b
  );
});
