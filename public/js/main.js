//All DOM manipulation
var createSession = function () {};
var joinSession = function () {};
//import Sprite from "./sprite.mjs";

window.addEventListener("load", function () {
  /*****************************/
  /*      Socket.io logic      */
  /*****************************/
  var socket = io();

  createSession = function (res) {
    console.log(res);
    socket.on(res.session.code + "owner", (data) => {
      console.log("received ", data);
      if (data.selectEvent) {
        //Rewrite #postSelectContainer in real time for owner
        showSelect(data.select);
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
    });
    $("#backArrow").removeClass("off");
    setCode(res.session.code);
    var index = res.session.users.findIndex((obj) => obj.user == res.user);
    var dest = res.session.lock;
    console.log("dest", dest);
    if (res.session.users[index].done == false && dest == "#postSelectView") {
      dest = "#selectView";
      console.log("changing");
    }
    var toLock = false;
    if (dest == "#postPostSelectView") {
      dest = "#postSelectView";
      toLock = true;
    }
    if (dest == "#selectView") {
      dest = "#codeView";
    }
    if (dest == "#voteView") {
      var games = [];
      for (var i = 0; i < res.session.votes.length; i++) {
        if (res.session.votes[i].active) {
          games.push({
            game: res.session.votes[i].game,
            name: res.session.votes[i].name,
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
        games[i] = { name: res.session.votes[i].name, votes: 0 };
        for (var j = 0; j < res.session.votes[i].voters.length; j++) {
          games[i].votes += res.session.votes[i].voters[j].vote;
        }
      }
      games.sort(function (a, b) {
        var x = a.votes;
        var y = b.votes;
        return x < y ? 1 : x > y ? -1 : 0;
      });
      fillGames(games);
    }
    console.log("dest: " + dest);
    goForwardFrom("#homeView", dest);
    console.log("hist after creating: ", window.hist);
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
    console.log("initGreenLists");
    initGreenLists();
  };

  joinSession = function (res) {
    $("#backArrow").removeClass("off"); //Show the back arrow
    setCode(res.code);
    console.log(res.lock);

    var sessionGames = "<session>";
    for (var i = 0; i < res.games.length; i++) {
      sessionGames +=
        '<sessionGame id="' + res.games[i].game + '"></sessionGame>';
    }
    $("#sessionContainer").html(sessionGames);

    console.log("initGreenLists");
    initGreenLists();

    var isLockBack = false;
    switch (res.lock) {
      case "#postSelectView":
        goForwardFrom("#homeView", "#postSelectView");
        window.hist = ["#homeView", "#selectView", "#postSelectView"];
      case "#postPostSelectView":
        goForwardFrom("#homeView", "#postSelectView");
        //lockback();
        break;
      case "#voteView":
        const gv_options = {
          method: "POST",
          body: JSON.stringify({ code: $("#code").text() }),
          headers: {
            "Content-Type": "application/json",
          },
        };
        fetch("/get_votes", gv_options).then(function (response) {
          return response.json().then((res) => {
            console.log(res);
            fillVotes(res.games);
            goForwardFrom("#homeView", "#voteView");
          });
        });
        break;
      case "#playView":
        const gg_options = {
          method: "POST",
          body: JSON.stringify({ code: $("#code").text() }),
          headers: {
            "Content-Type": "application/json",
          },
        };
        fetch("/get_games", gg_options).then(function (response) {
          return response.json().then((res) => {
            fillGames(res.games);
            goForwardFrom("#homeView", "#playView");
          });
        });
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
    console.log("Setting up client event with " + res.code);
    socket.on(res.code + "client", (data) => {
      console.log("Got client event", data);
      if (data.lockBack && data.lock) {
        goForwardFrom(window.hist[window.hist.length - 1], data.lock);
        lockBack();
      }
      if (data.unlockBack && data.unlock) {
        console.log(data);
        if (data.unlock == "selectView") {
          window.hist = ["#homeView", "#selectView", "#postSelectView"];
        }
        goBackFrom(
          window.hist[window.hist.length - 1],
          window.hist[window.hist.length - 2]
        );
      }
      if (data.startVoting) {
        console.log("this isn't done yet!");
        //parse the voting data and output
        fillVotes(data.games);
        goForwardFrom(window.hist[window.hist.length - 1], "#voteView");
        window.hist = ["#homeView", "#voteView"];
      }
      if (data.play) {
        fillGames(data.games);
        goForwardFrom(window.hist[window.hist.length - 1], "#playView");
        window.hist = ["#homeView", "#playView"];
      }
    });
    catchDisplay();
  };

  /*****************************/
  /*     Set History State     */
  /*****************************/
  //Set an extra history state to prevent back button from closing the page
  window.history.pushState({ page: "home", noBackExitsApp: true }, "");
  window.addEventListener("popstate", function (event) {
    if (event.state && event.state.noBackExitsApp) {
      window.history.pushState({ noBackExitsApp: true }, "");
    }
  });

  /*****************************/
  /*      Set Window Height    */
  /*****************************/

  window.addEventListener("resize", getvh);

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
  $(window).on(
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
  /*    My Sessions Handler    */
  /*****************************/

  $("#sessionsItem").click(this, function (el) {
    if ($("#sessionsView").hasClass("off")) {
      closeMenu();
      closeMenuItem("#gamesView");
      const gs_options = {
        method: "POST",
        body: "",
        headers: {
          "Content-Type": "application/json",
        },
      };
      window.setTimeout(showMenuItem("#sessionsView"), 600);
      fetch("/get_sessions", gs_options).then(function (response) {
        return response.json().then((res) => {
          writeSessions(res);
        });
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
      closeMenuItem("#sessionsView");
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
  /* Join button click handler */
  /*****************************/
  $("#joinButton").click(this, function () {
    console.log("join clicked");
    joinClick();
  });
  function joinClick() {
    console.log("join click");
    var oldCode = $("#code").html();
    if (oldCode != false) {
      socket.off(oldCode + "select");
    }
    $("#code").html("");
    $("#postSelectContainer").html("");
    $("#codeInputGroup").removeClass("off");
    window.setTimeout(function () {
      console.log("wait 1");
      $("#joinButton").css({
        opacity: "0%",
        transform: "translateX(100vw)",
      });
      $("#codeInputGroup").css({
        opacity: "100%",
        transform: "translateX(0px)",
      });
      $("#createButton").css({
        transform: "translateY(12vh)",
      });
      window.setTimeout(function () {
        console.log("wait 2");
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
        console.log("wait 1");
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
          console.log("wait 2");
          $("#codeInputGroup").addClass("off");
          $(".errorText").addClass("off");
        }, 600);
      }, 10);
    } else {
      $(this).parent().children("input").first().val("");
      console.log($(this).parent().children("input").first().val());
    }
  });

  /*****************************/
  /*     Back arrow handler    */
  /*****************************/
  $("#backArrow").click(this, function (el) {
    //Going to have to notify the server so that the owner of a session
    //can know that someone went back to a previous step

    var dest = $("#backArrow").attr("data-gobackto");

    const gb_options = {
      method: "POST",
      body: JSON.stringify({
        to: window.hist[window.hist.length - 2],
        from: window.hist[window.hist.length - 1],
        code: $("#code").text(),
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
    fetch("/going_back", gb_options);

    goBackFrom(
      window.hist[window.hist.length - 1],
      window.hist[window.hist.length - 2]
    );
  });

  /*****************************/
  /*   Submit button handler   */
  /* Checks user inputted code */
  /*    Calls join_session     */
  /*****************************/
  $("#codeSubmit").click(this, function (e) {
    submitCode(this, $("#codeInput input").val());
  });

  /*****************************/
  /*   Create Button Handler   */
  /*****************************/
  $("#createButton").click(this, function () {
    console.log("create");
    window.hist = ["#homeView"];
    clearLists();
    const cs_options = {
      method: "POST",
      body: "",
      headers: {
        "Content-Type": "application/json",
      },
    };
    fetch("/create_session", cs_options).then(function (response) {
      return response.json().then((res) => {
        console.log(!res.err, " create_session res: ", res);
        if (!res.err) {
          createSession(res.status);
        }
      });
    });
  });

  /***********************************/
  /*   Copy the code to clipboard    */
  /***********************************/
  $("#copyButton").on("click", function () {
    copyText(window.location.origin + "/" + $("#code").html());
  });

  /***********************************/
  /*         Share the code          */
  /*  This won't work without HTTPS  */
  /***********************************/

  document.getElementById("shareButton").addEventListener("click", async () => {
    if (navigator.share) {
      navigator
        .share({
          title: "Tidy Squirrel",
          text: "Join my TidySquirrel session! ",
          url:
            "https://tts.alexscottbecker.com/" +
            document.getElementById("code").innerHTML,
        })
        .then(() => console.log("Successful share"))
        .catch((error) => console.log("Error sharing", error));
    }
  });

  /*****************************/
  /* Select button transition  */
  /*****************************/

  //On the first run through, get user lists populated and add them to #selectLists
  gulp();
  $("#selectButton").click(this, function () {
    //$("#backArrow").attr("data-gobackto", "code");
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
  $("#gameSubmit").click(this, function () {
    const gs_options = {
      method: "POST",
      body: JSON.stringify({
        code: document.getElementById("code").innerHTML,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
    fetch("/submit_games", gs_options).then(function (response) {
      return response.json().then((res) => {
        console.log("submit res: ", res);
        //$("#backArrow").attr("data-gobackto", "select");
        goForwardFrom("#selectView", "#postSelectView");
      });
    });
  });

  console.log("code: ", window.location.search.substr(2));
  console.log(/^([a-zA-Z0-9]{5})$/.test(window.location.search.substr(3)));
  if (
    window.location.search.substr(1, 2) == "s=" &&
    /^([a-zA-Z0-9]{5})$/.test(window.location.search.substr(3))
  ) {
    joinClick();
    console.log("code: ", window.location.search.substr(3));
    submitCode($("codeSubmit"), window.location.search.substr(3));
  }

  const gtl_options = {
    method: "POST",
    body: JSON.stringify({ code: code }),
    headers: {
      "Content-Type": "application/json",
    },
  };
  fetch("/get_top_list", gtl_options).then(function (response) {
    return response.json().then((res) => {
      if (!res.err) {
        autocomplete(document.getElementById("menuAddGamesInput"), res.games);
        autocomplete(document.getElementById("addGamesInput"), res.games);
        console.log("added Autocomplete");
      } else {
        console.log("Couldn't find topGames");
      }
    });
  });

  /*
   *
   *
   * End of window functions
   * The rest of the content and click handlers are added programmatically
   *
   */
});
//End all DOM manipulation

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
  $("#backArrow").attr("data-gobackto", window.hist[0]);
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
    console.log("going forward from " + from + " to " + to);
    console.log(window.hist);
    if (typeof window.hist == "undefined") {
      window.hist = [from];
    }
    window.hist.push(to);
    $("#backArrow").attr("data-gobackto", window.hist[window.hist.length - 2]);
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
    if (typeof from != "undefined" && typeof to != "undefined") {
      console.log("going back from " + from + " to " + to);
      console.log(window.hist);
      if (from == "#postSelectView" && to == "#selectView") {
        const gb_options = {
          method: "POST",
          body: JSON.stringify({
            code: document.getElementById("code").innerHTML,
            from: from,
            to: to,
          }),
          headers: {
            "Content-Type": "application/json",
          },
        };
        fetch("/going_back", gb_options).then(function (response) {
          return response.json().then((res) => {
            goBack(from, to);
          });
        });
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
  }
  console.log("...Going back to " + to + " from " + from);
  window.setTimeout(function () {
    $(to).css({ transform: "translateX(0vw)" });
    $(from).css({ transform: "translateX(200vw)" });
  }, 100);
  window.setTimeout(function () {
    $(from).addClass("off");
    catchDisplay();
  }, 1000);
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
  const lg_options = {
    method: "POST",
    body: JSON.stringify({ code: code }),
    headers: {
      "Content-Type": "application/json",
    },
  };
  fetch("/lock_games", lg_options).then(function (lresponse) {
    return lresponse.json().then((lres) => {
      $("#backArrow").addClass("off");
      $("#postSelectView").css({
        transform: "translateX(-200vw)",
      });
      window.setTimeout(function () {
        $("#postSelectTitle").html("Edit Games List 🐿️");
        $("#postSelectContainer").html();
        $("#postSelectContainer").html(lres.htmlString);
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
          $("#backArrow").removeClass("off");
          /*$("#addGroupGamesInput").on("keyup", function (event) {
            // Number 13 is the "Enter" key on the keyboard
            if (event.keyCode === 13) {
              event.preventDefault();
              addGroupGame();
            }
            return false;
          });*/

          $("#gameUnlock").click(this, function () {
            console.log("gameUnlock");
            const ug_options = {
              method: "POST",
              body: JSON.stringify({
                code: $("#code").text(),
                unlock: "selectView",
                unlockBack: true,
              }),
              headers: {
                "Content-Type": "application/json",
              },
            };
            fetch("/unlock_games", ug_options).then(function (uresponse) {
              return uresponse.json().then((ures) => {
                $("#backArrow").removeClass("off");
                goBackFrom("#postSelectView", "#selectView");
              });
            });
          });
        }, 10);
      }, 300);
    });
  });
}

function addGroupGame() {
  console.log("submitting new group game");
  var game = addGroupGamesInput.value;
  const gga_options = {
    method: "POST",
    body: JSON.stringify({ game: game, code: $("#code").text() }),
    headers: {
      "Content-Type": "application/json",
    },
  };
  //add_user_game_unsorted
  fetch("/group_game_add", gga_options).then(function (response) {
    return response.json().then((res) => {
      if (res.err) {
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
        }
      } else {
        $("#editGameList").append(res.status);
        registerEGS();
      }
    });
  });
  return false;
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
      name +
      `
    </div></div>`;
  } else {
    console.log(dest, name);
    listString +=
      `<div class="listName" onclick="` +
      titleFunc +
      `">` +
      name +
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
/*   Get all of a User's Games    */
/**********************************/
function guag() {
  const guag_options = {
    method: "POST",
    body: "",
    headers: {
      "Content-Type": "application/json",
    },
  };
  fetch("/get_user_all_games", guag_options).then(function (response) {
    return response.json().then((res) => {
      if (!res.err) {
        var htmlString = "";
        for (var i = 0; i < res.lists.allGames.length; i++) {
          htmlString +=
            `<li id="` +
            res.lists.allGames[i]._id +
            `">` +
            res.lists.allGames[i].name +
            `</li>`;
        }
      }
    });
  });
}

/**********************************/
/*  Get a User's Populated Lists  */
/**********************************/

function gulp(showAllGames = false) {
  const gulp_options = {
    method: "POST",
    body: "",
    headers: {
      "Content-Type": "application/json",
    },
  };
  fetch("/get_user_lists_populated", gulp_options).then(function (response) {
    //Gets the populated list, which is an object with two arrays,
    //"allGames", which is supposed to have every game, and "custom",
    //which has the user's custom lists. Array elements in allGames
    //are objects which have the properties "rating", "name", and "owned".
    //Array elements in custom are objects which have the properties "games"
    //and "name". "Games" is an array of objects that each have the properties "rating",
    //"name", and "owned".
    return response.json().then((res) => {
      if (!res.err) {
        console.log("gulp", res);
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
            res.lists.allGames[i].name +
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
            res.lists.allGames[i].name +
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
              res.lists.allGames[i].name +
              `</div>` +
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
              `&quot;')">Delete</li>`
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
          addListDisplay(
            curId,
            res.lists.custom[i].name,
            "#selectLists",
            true,
            "listToggle(this.nextElementSibling)",
            "listToggle(this)",
            "chevron-down-outline"
          );
          addListDisplay(
            "games" + curId,
            res.lists.custom[i].name,
            "#gamesContainer",
            false,
            "openList($(this).parent().parent().attr('id'))",
            "showGameContext({id: 'list'+$(this).parent().attr('id').substr(5)})",
            "ellipsis-vertical"
          );
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
              res.lists.custom[i].games[j].name +
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
              res.lists.custom[i].games[j].name +
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
              name: res.lists.custom[i].name,
            })
          );
        }

        $("#listsContainer").html(htmlString);
        writeSessions(res);
      } else {
        console.log(res.err);
      }
    });
  });
}

/**
 * Hide or show the add game and add list buttons in the menu
 *
 */
function toggleGamesAdder() {
  if ($(".gamesAdder").hasClass("off")) {
    $(".gamesAdder").removeClass("off");
    $("#menuAddListContainer").addClass("slideDown");
    $("#menuAddGamesContainer").addClass("slideDown");
    setTimeout(function () {
      $("#menuAddListContainer").addClass("off");
      $("#menuAddGamesContainer").addClass("off");
    }, 501);
    setTimeout(function () {
      $(".gamesAdder").removeClass("slideDown");
      $("#addListButton").addClass("rotated");
    }, 20);
  } else {
    hideGamesAdderButtons();
    $("#addListButton").removeClass("rotated");
  }
}

function hideGamesAdderButtons() {
  $(".gamesAdder").addClass("slideDown");
  setTimeout(function () {
    $(".gamesAdder").addClass("off");
  }, 501);
}

/**
 * Shows the add Game menu in My Games and Lists
 *
 */
function showMenuAddGame() {
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
}

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
  console.log("list: ", list);
  var arr = [];
  $("#" + list)
    .children(".listGames")
    .first()
    .children()
    .each(function (ind, el) {
      console.log("gLg: ", $(el)[0].outerHTML);
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
  console.log($(el).parent().parent().children().children(".flipped"));
  if ($(el).parent().parent().children().children(".flipped").length > 0) {
    console.log("showing bulk");
    $(".bulkSelect").removeClass("off");
    $(".listContents.slideUp").addClass("bulkShowing");
    if (
      $(el).parent().parent().children().children(".flipped").length ==
      $(el).parent().parent().children().children(".sprite").length
    ) {
      $('.bulkSelect ion-icon[name="square-outline"]').addClass("off");
      $('.bulkSelect ion-icon[name="checkbox-outline"]').removeClass("off");
    } else {
      $('.bulkSelect ion-icon[name="square-outline"]').removeClass("off");
      $('.bulkSelect ion-icon[name="checkbox-outline"]').addClass("off");
    }
  } else {
    console.log("hiding bulk");
    $(".bulkSelect").addClass("off");
    $(".listContents.slideUp").removeClass("bulkShowing");
    $('.bulkSelect ion-icon[name="square-outline"]').removeClass("off");
    $('.bulkSelect ion-icon[name="checkbox-outline"]').addClass("off");
  }
  console.log($(el).children("spriteChecked"));
}

function closeBulk() {
  $(".bulkShowing")
    .children()
    .children(".flipped")
    .each(function () {
      $(this).removeClass("flipped");
      $(this).children(".spriteChecked").first().addClass("spriteUnchecked");
    });
  $(".bulkSelect").addClass("off");
  $(".listContents.slideUp").removeClass("bulkShowing");
  $('.bulkSelect ion-icon[name="square-outline"]').removeClass("off");
  $('.bulkSelect ion-icon[name="checkbox-outline"]').addClass("off");
}

function selectAllBulk() {
  $('.bulkSelect ion-icon[name="square-outline"]').addClass("off");
  $('.bulkSelect ion-icon[name="checkbox-outline"]').removeClass("off");
  $(".bulkShowing")
    .children()
    .children(".sprite")
    .each(function () {
      $(this).addClass("flipped");
      $(this).children(".spriteChecked").first().removeClass("spriteUnchecked");
    });
}

function deleteRemoveBulk() {
  if ($(".bulkSelect").attr("list") == "games0") {
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
  console.log(games);
  $(".bulkSelect")
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
  console.log(games);
  return { games: games, count: count };
}

function showRemoveBulk() {
  var toRemove = "";
  var toRemove = getBulkChecked();
  var list = $(".bulkSelect").attr("list");

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
  console.log($(".bulkSelect").first().attr("list"));
  var lists = getMenuLists($(".bulkSelect").first().attr("list"));
  var bc = getBulkChecked();
  var games = bc.games;
  games.forEach(function (e) {
    e.list = $(".bulkSelect").first().attr("list");
  });

  console.log(games);
  displaySubContext(
    "Copying",
    games,
    lists,
    "copyToList",
    $(".bulkSelect").first().attr("list")
  );
}

function moveBulk() {
  var lists = getMenuLists($(".bulkSelect").first().attr("list"));
  var bc = getBulkChecked();
  var games = bc.games;
  games.forEach(function (e) {
    e.list = $(".bulkSelect").first().attr("list");
  });

  console.log(games);
  displaySubContext(
    "Moving",
    games,
    lists,
    "moveToList",
    $(".bulkSelect").first().attr("list")
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
  $(".bulkSelect").each(function () {
    this.remove();
  });
  $(subList).removeClass("slideUp");
  $(".listTitle").removeClass("slideUp");
  setTimeout(function () {
    $(subList).remove();
    $(".listTitle").remove();
  }, 510);
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

function showGameContext(game) {
  console.log("game: ", game);
  console.log("#context_" + game.id);
  console.log($("#context_" + game.id).length);
  if ($("#context_" + game.id).length == 0) {
    console.log("#context_stage_" + game.id + "[list=games" + game.list + "]");
    console.log(
      $("#context_stage_" + game.id + "[list=games" + game.list + "]")
    );
    $("#context_stage_" + game.id + "[list=games" + game.list + "]")
      .clone(true)
      .prop("id", "context_" + game.id)
      .appendTo($("body"));
    setTimeout(function () {
      hideOnClickOutside(
        "#context_" + game.id,
        "#context_" + game.id,
        ".subContextContainer"
      );
      $("#contextShadow").removeClass("off");
    }, 10);
    $("#context_" + game.id).removeClass("off");
    $("#context_" + game.id).addClass("slideUp");
  } else {
    console.log("already clicked");
  }
}

function contextMove(games) {
  console.log("contextMove ", games);
  console.log($(".contextActions.slideUp").first().attr("list"));
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
  console.log("gml ", fromList);
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
  console.log("display games, ", games);
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
    el += `], fromList: '` + fromList + `'})">` + items[i].name + `</li>`;
  }
  el += `</div></div>`;
  $("body").append(el);
}

function moveToList(options) {
  console.log(options);
  const mtl_options = {
    method: "POST",
    body: JSON.stringify({
      code: document.getElementById("code").innerHTML,
      games: options.games,
      toList: options.toList,
      fromList: options.fromList,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  };
  fetch("/move_to_list", mtl_options).then(function (response) {
    return response.json().then((res) => {
      if (res.err) {
        alert(res.err);
        //TODO: Nice notification for handling moving to a list already containing the game, as well as confirmation before moving
      } else {
        $(".subContextContainer").each(function () {
          $(this).remove();
        });
        gulp();
      }
    });
  });
}

function contextCopy(games) {
  console.log("gml: ", $(".contextActions.slideUp").first().attr("list"));
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
  const ctl_options = {
    method: "POST",
    body: JSON.stringify({
      code: document.getElementById("code").innerHTML,
      games: options.games,
      toList: options.toList,
      fromList: options.fromList,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  };
  fetch("/copy_to_list", ctl_options).then(function (response) {
    return response.json().then((res) => {
      if (res.err) {
        alert(res.err);
        //TODO: Nice notification for handling copying to a list already containing the game, as well as confirmation before moving
      } else {
        console.log("copied with " + res.errors + " errors");
        $($("#" + options.games))
          .first()
          .clone(true)
          .appendTo("#" + options.toList + " .listGames");
        $(".subContextContainer").each(function () {
          $(this).remove();
        });
        gulp();
      }
    });
  });
}

function contextRename(game, caller) {
  var el =
    `<div class="subContextContainer"><div class="subContextRename" id="subContext_` +
    game.id +
    `" >`;
  el +=
    `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
    `<div class="subContextTitle">Renaming "` +
    game.name +
    `"</div><hr/><div id="renameGameInputCont" class="textInputCont">
    <input class="textInput" type="text" onkeyup='renameGame(event, this, "` +
    game.id.substr(5 + game.length) +
    `", "` +
    game.name +
    `")' id="renameGameInput"></input>
    <div class="textSubmit"></div>`;
  $("body").append(el);
}

function renameGame(event, caller, game, oldGame) {
  if (event.keyCode === 13) {
    const rg_options = {
      method: "POST",
      body: JSON.stringify({
        game: game,
        newName: $(caller).val(),
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
    fetch("/rename_game", rg_options).then(function (response) {
      return response.json().then((res) => {
        if (res.err) {
          console.log(res.err);
          //TODO: Nice notification for handling copying to a list already containing the game, as well as confirmation before moving
        } else {
          console.log("renamed");
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
      });
    });
  }
}

function showRenameList(list) {
  var el =
    `<div class="subContextContainer"><div class="subContextRename" id="subContext_` +
    list.id +
    `" >`;
  el +=
    `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
    `<div class="subContextTitle">Renaming list "` +
    list.name +
    `"</div><hr/><div id="renameGameInputCont" class="textInputCont">
    <input class="textInput" type="text" onkeyup='renameList(event, this, "` +
    list.id.substr(4) +
    `")' id="renameGameInput"></input>
    <div class="textSubmit"></div>`;
  $("body").append(el);
}

function renameList(event, caller, list) {
  if (event.keyCode === 13) {
    const rl_options = {
      method: "POST",
      body: JSON.stringify({
        list: list,
        newName: $(caller).val(),
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
    fetch("/rename_list", rl_options).then(function (response) {
      return response.json().then((res) => {
        if (res.err) {
          console.log(res.err);
          //TODO: Nice notification for handling copying to a list already containing the game, as well as confirmation before moving
        } else {
          console.log("renamed list");
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
      });
    });
  }
}

function showDeleteList(list) {
  var el =
    `<div class="subContextContainer"><div class="subContextDelete" id="subContext_` +
    list.id +
    `" >`;
  el +=
    `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
    `<div class="subContextTitle">Really delete list "` +
    list.name +
    `"?</div><hr/>
  <div class="button greenBtn" id="deleteCancel" onclick="$(this).parent().parent().remove()">Cancel</div>
  <div class="button redBtn" id="deleteConfirm" onclick="deleteList('` +
    list.id +
    `')">Delete</div>`;
  $("body").append(el);
}

function deleteList(list) {
  const dl_options = {
    method: "POST",
    body: JSON.stringify({
      list: list,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  };
  fetch("/delete_list", dl_options).then(function (response) {
    return response.json().then((res) => {
      if (res.err) {
        console.log(res.err);
        //TODO: Nice notification for handling copying to a list already containing the game, as well as confirmation before moving
      } else {
        $("#gamesContainer")
          .children("#games" + list.substr(5))
          .remove();
        gulp();
        $(".subContextContainer").each(function () {
          $(this).remove();
        });
      }
    });
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
  console.log("arr: ", arr);
  const dg_options = {
    method: "POST",
    body: JSON.stringify({
      games: arr,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  };
  fetch("/delete_game", dg_options).then(function (response) {
    return response.json().then((res) => {
      if (res.err) {
        console.log(res.err);
        //TODO: Nice notification for handling copying to a list already containing the game, as well as confirmation before moving
      } else {
        res.arr.forEach(function (e, i) {
          $("#gamesContainer")
            .children()
            .children(".listGames")
            .children("li")
            .each(function () {
              if ($(this).text() == e) {
                console.log("removing...");
                console.log(this);
                $(this).remove();
              }
            });
          $("#gamesContainer")
            .children(".listContents")
            .children(".displayGameContainer")
            .children("li")
            .each(function () {
              if ($(this).text() == e) {
                console.log("removing...");
                console.log(this);
                $(this).parent().remove();
              }
            });
        });
        $(".subContextContainer").each(function () {
          $(this).remove();
        });
        gulp();
      }
    });
  });
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
    console.log("e: ", e, e.list.substr(e.list.length - 1));
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
  const rg_options = {
    method: "POST",
    body: JSON.stringify({
      games: arr,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  };
  fetch("/remove_game", rg_options).then(function (response) {
    return response.json().then((res) => {
      if (res.err) {
        console.log(res.err);
        //TODO: Nice notification for handling copying to a list already containing the game, as well as confirmation before moving
      } else {
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
    });
  });
}

function hideOnClickOutside(selector, toHide, extraSelector) {
  const outsideClickListener = (event) => {
    const $target = $(event.target);
    console.log("clicked: ", $target);
    console.log("extra: ", $(extraSelector));
    if (
      (!$target.closest(selector).length && $(selector).is(":visible")) ||
      (!$target.closest(extraSelector).length &&
        $(extraSelector).is(":visible"))
    ) {
      $("#contextShadow").addClass("off");
      $(toHide).remove();
      console.log("clicked outside: ", $target);
      removeClickListener();
    }
  };

  const removeClickListener = () => {
    document.removeEventListener("click", outsideClickListener);
  };

  document.addEventListener("click", outsideClickListener);
}

function writeGameContext(contextObj) {
  console.log("dGC '", contextObj.list, "'");
  var co = createContextObjectString(
    contextObj.id,
    contextObj.name,
    contextObj.list
  );
  var htmlString =
    `<div class="contextActions off" list="games` +
    contextObj.list +
    `" id="context_stage_` +
    contextObj.id +
    `">` +
    `<div class="contextTitle">` +
    contextObj.name +
    `</div>` +
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
  var htmlString =
    `<div class="contextActions off" list="` +
    contextObj.id +
    `"id="context_stage_` +
    contextObj.id +
    `">` +
    `<div class="contextTitle">` +
    contextObj.name +
    `</div>` +
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

/**
 * {Desc} Takes the sessions object from /get_sessions and fills #sessionsContainer
 *
 * @param {Object} res
 */
function writeSessions(res) {
  var htmlString = "";
  for (var i = 0; i < res.sessions.length; i++) {
    var usersplural = setPlural(res.sessions[i].users, " user, ", " users, ");
    var gamesplural = setPlural(res.sessions[i].games, " game", " games");
    htmlString +=
      `<li id="` +
      res.sessions[i].code +
      `" onclick="menuSubmitCode(this, '` +
      res.sessions[i].code +
      `')">` +
      res.sessions[i].code +
      `: ` +
      res.sessions[i].users +
      usersplural +
      res.sessions[i].games +
      gamesplural +
      `</li>`;
  }
  $("#sessionsContainer").html(htmlString);
}

function menuSubmitCode(el, code) {
  closeMenuItem("#sessionsView");
  submitCode(el, code);
}

function submitCode(el, code) {
  console.log(el);
  clearLists(); //Clear any lists in #selectView
  window.hist = ["#homeView"];
  $(".errorText").removeClass("shake"); //Stop shaking if started
  const js_options = {
    method: "POST",
    body: JSON.stringify({ code: code }),
    headers: {
      "Content-Type": "application/json",
    },
  };
  fetch("/join_session", js_options).then(function (response) {
    return response.json().then((res) => {
      console.log("join session ", res);
      if (res.err) {
        //If there is no session to join, tell the user
        window.setTimeout(function () {
          $(".errorText").removeClass("off").addClass("shake");
        }, 5);
        //Move the create button out of the way of the error text:
        $("#createButton").css({
          transform: "translateY(14vh)",
        });
      } else {
        //If the session join was successful:
        if (res.owned) {
          createSession(res.status);
        } else {
          joinSession(res.status);
        }
      }
    });
  });
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
  console.log("submitting new game");
  var game = $(el).val();
  $(el).val("");
  const options = {
    method: "POST",
    body: JSON.stringify({ game: game }),
    headers: {
      "Content-Type": "application/json",
    },
  };
  fetch("/game_add", options).then(function (response) {
    return response.json().then((res) => {
      if (!res.err) {
        console.log(res);
        var htmlString =
          `
            <li>
                <div rating="` +
          res.status.rating +
          `" owned="` +
          res.status.owned +
          `" class="gameName" game_id="` +
          res.status._id +
          `">` +
          res.status.name +
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
        gulp(true);
        recheckGreenLists();
      } else {
        console.log(res.err);
        if ((res.err = "Log in first")) {
          showAlert("#loginAlert");
        }
      }
    });
  });
}

/**
 * Adds a list to a user
 *
 * @param {*} event
 */
function addList() {
  // Number 13 is the "Enter" key on the keyboard
  console.log("addList");
  //if (event.keyCode === 13) {
  console.log("submitting new game");
  //event.preventDefault();
  var list = menuAddListInput.value;
  const options = {
    method: "POST",
    body: JSON.stringify({ list: list }),
    headers: {
      "Content-Type": "application/json",
    },
  };
  //add_user_game_unsorted
  fetch("/list_add", options).then(function (response) {
    return response.json().then((res) => {
      if (res.err) {
        console.log(res);
      } else {
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
              <ion-icon name="ellipsis-vertical" role="img" class="md hydrated" aria-label="ellipsis vertical"></ion-icon> 
            </div>
            <div class="listGames off"></div>
        </li>`
        );
        $("#listContextContainer").append(
          writeListContext({
            id: "list" + gamesNum,
            name: list,
          })
        );
      }
    });
  });
  //}
  return false;
}

function recheckGreenLists() {
  console.log("recheck");
  $("#selectLists>li").each(function (ind, ele) {
    var count = 0;
    $(ele)
      .children(".listGames")
      .first()
      .children("li")
      .each(function (i, e) {
        if ($(e).children(".gameName").first().hasClass("greenText")) {
          count++;
          console.log(
            count,
            $(ele).children(".listGames").first().children("li").length
          );
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
      console.log("checked one box");
    } else {
      $(ele).children(".listName").first().removeClass("greenText");
      $(ele)
        .children(".toggle")
        .first()
        .children(".switch")
        .children("input")
        .prop("checked", false);
      console.log("unchecked!");
    }
  });
}

//Check list boxes and change text to green on first display
//by getting the list of games already added to the session
//and checking to see if every game in a list has been added
function initGreenLists() {
  console.log("initGreenLists");
  var sessionGames = [];
  $("session")
    .children()
    .each(function (i, e) {
      sessionGames.push($(e).attr("id"));
    });
  console.log(sessionGames);

  $("#selectLists li").each(function (ind, ele) {
    var count = 0;
    $(ele)
      .children(".listGames")
      .first()
      .children("li")
      .each(function (i, e) {
        var eID = $(e).children(".gameName").first().attr("game_id");
        if (sessionGames.findIndex((item) => item == eID) > -1) {
          count++;
          console.log(count + " ," + $(e).parent().children().length);
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
  console.log("unmake " + id);
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
  console.log("clearing...");
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
          console.log("cleared: ", el);
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
  const mel_options = {
    method: "POST",
    body: JSON.stringify({
      gamesToAdd: gamesToAdd,
      gamesToRemove: gamesToRemove,
      code: document.getElementById("code").innerHTML,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  };
  fetch("/modify_edit_list", mel_options).then(function (response) {
    return response.json().then((res) => {
      if (!res.err) {
        var htmlString = "";
        for (var i = 0; i < res.status.length; i++) {
          htmlString +=
            `<li><div class="editGame">` +
            res.status[i].name +
            `</div>` +
            `<div class='toggle'>
          <label class="switch">
              <input type="checkbox" checked onclick="toggleEdit(this)" game_id="` +
            res.status[i].id +
            `">
              <span class="slider round"></span>
          </label>
      </div></li>`;
        }
        $("#editGameList").html = htmlString;
        registerEGS();
      } else {
        console.log(res.err);
      }
    });
  });
}

function registerEGS() {
  console.log("egs");
  $("#editGameSubmit").click(this, function () {
    console.log("egs fired");
    const egs_options = {
      method: "POST",
      body: JSON.stringify({
        code: document.getElementById("code").innerHTML,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
    fetch("/start_voting", egs_options).then(function (response) {
      return response.json().then((res) => {
        console.log("starting voting: ", res);
        goForwardFrom("#postSelectView", "#voteView");
      });
    });
  });
}

function toggleFont(check) {
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
    console.log("Add: ", gamesToAdd);
    console.log("Remove: ", gamesToRemove);
  }
  const agts_options = {
    method: "POST",
    body: JSON.stringify({
      gamesToAdd: gamesToAdd,
      gamesToRemove: gamesToRemove,
      code: document.getElementById("code").innerHTML,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  };
  fetch("/add_game_to_session", agts_options).then(function (response) {
    return response.json().then((res) => {
      if (!res.err) {
        console.log(res);
      } else {
        console.log(res.err);
      }
    });
  });
  recheckGreenLists();
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
  $(".codeDisplay").each(function () {
    $(this).html("Your Code: " + code);
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
function copyText(copy) {
  console.log("copying");
  showAlert("#copiedAlert");
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

/*****************************/
/*     showSelect(data)    */
/*****************************/
/*
 * Desc: Update user selections in real time
 *
 * @param {Array} select
 */
function showSelect(data) {
  console.log("received select event ", data);
  htmlString = "";
  var connecting = "";
  var plural = "s";
  $.each(data, function (key, value) {
    console.log("User object: ", key, value);
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
  htmlString += `<div class="button greenBtn bottomBtn" id="gameLock" type="submit">Lock Game List 🔒</div>`;
  $("#postSelectContainer").html(htmlString);
  console.log("registered lockGames");
  //Is this setting up too many events?
  $("#gameLock").click(this, function () {
    console.log("clicked gameLock");
    lockGames($("#code").text());
  });
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
  var htmlString = `<div id="voteInfo">Drag the slider for each game to vote! All the way to the right means you ABSOLUTELY have to play the game, all the way to the left means you can't stand the idea of playing the game.</div><ul>`;
  for (var i = 0; i < games.length; i++) {
    htmlString +=
      `<li><div class="voteLabel"><label for="` +
      games[i].game +
      `">` +
      games[i].name +
      `</label></div>`;
    htmlString +=
      `<input type='range' min='1' max='1000' value='500' step='1' id="` +
      games[i].game +
      `"/></li>`;
  }
  htmlString += `</ul><div class="submitButton button greenBtn bottomBtn" id="voteButton">Submit Votes</div>`;
  //console.log("The string: ", htmlString);
  $("#voteContainer").html(htmlString);
  $("#voteButton").on("click", function () {
    var theCode = $("#code").text();
    var voteArray = [];
    var theVotes = $("#voteContainer ul").children();
    for (var i = 0; i < theVotes.length; i++) {
      voteArray.push({
        game: $(theVotes[i]).children("input").first().attr("id"),
        vote: $(theVotes[i]).children("input").first().val(),
      });
    }
    console.log("voteArray", voteArray);
    const sv_options = {
      method: "POST",
      body: JSON.stringify({
        code: theCode,
        voteArray: voteArray,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
    fetch("/submit_votes", sv_options).then(function (response) {
      return response.json().then((res) => {
        goForwardFrom("#voteView", "#postVoteView");
        window.hist = ["#homeView", "#postVoteView"];
      });
    });
  });
}

/*****************************/
/*    fillPostVote(users)    */
/*****************************/
function fillPostVote(users) {
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
    const ev_options = {
      method: "POST",
      body: JSON.stringify({
        code: theCode,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
    fetch("/end_vote", ev_options).then(function (response) {
      return response.json().then((res) => {
        goForwardFrom("#postVoteView", "#playView");
        //window.hist = ["#homeView", "#codeView", "#playView"];
      });
    });
  });
}

function textSubmit(el) {
  addNewGame(el);
  $("#addGamesInputCont .textSubmit").first().addClass("green");
  setTimeout(function () {
    $("#addGamesInputCont .textSubmit").first().removeClass("green");
  }, 1000);
  console.log("Toggled: ", $("#0").children(".listExpand")[0]);
  return false;
}

function fillGames(games) {
  var htmlString = ``;
  for (var i = 0; i < games.length; i++) {
    if (!$.isEmptyObject(games[i])) {
      htmlString += `<div class="playGame">` + games[i].name + `</div>`;
    }
  }
  $("#playContainer").html(htmlString);
  console.log("fillgames");
}

function showListSettings(el) {
  console.log(el);
  if ($(el).hasClass("listExpanded")) {
    console.log($(el).children(".listSettings"));
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
  const el_options = {
    method: "POST",
    body: JSON.stringify({
      gamesToAdd: gamesToAdd,
      gamesToRemove: gamesToRemove,
      code: document.getElementById("code").innerHTML,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  };
  fetch("/edit_list", el_options).then(function (response) {
    return response.json().then((res) => {
      if (!res.err) {
      } else {
        console.log(res);
      }
    });
  });
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
    if (x) x = x.getElementsByTagName("div");
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
    } else if (e.keyCode == 13) {
      /*If the ENTER key is pressed, prevent the form from being submitted,*/
      e.preventDefault();
      if (currentFocus > -1) {
        /*and simulate a click on the "active" item:*/
        if (x) x[currentFocus].click();
      }
    }
  });
  function addActive(x) {
    /*a function to classify an item as "active":*/
    if (!x) return false;
    /*start by removing the "active" class on all items:*/
    removeActive(x);
    if (currentFocus >= x.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = x.length - 1;
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
