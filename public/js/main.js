//All DOM manipulation
window.addEventListener("load", function () {
  /*****************************/
  /*      Socket.io logic      */
  /*****************************/
  var socket = io();

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
  $(window).on(
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
  });
  $(window).on(
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
  });
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
  function closeMenu() {
    $("#menu").css("transform", "translateX(-60vh)");
    $("#menuCatch").addClass("off");
    window.setTimeout(function () {
      $("#menu").addClass("off");
    }, 550);
  }
  $("#menuClose").on("click", closeMenu);
  $("#menuCatch").on("click", closeMenu);
  //Open menu
  $("#menuIcon").click(this, function (el) {
    $("#menu").removeClass("off");
    $("#menuCatch").removeClass("off");
    window.setTimeout(function () {
      $("#menu").css("transform", "translateX(0vh)");
    }, 10);
  });

  /*****************************/
  /*    My Sessions Handler    */
  /*****************************/

  $("#sessionsItem").click(this, function (el) {
    closeMenu();
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
  });

  $("#sessionsClose").click(this, function (el) {
    closeMenuItem("#sessionsView");
  });

  /*****************************/
  /*      My Games Handler     */
  /*****************************/
  //Populate all games on the first run through
  $("#gamesItem").click(this, function (el) {
    gulp();
    closeMenu();
    window.setTimeout(showMenuItem("#gamesView"), 600);
  });

  $("#gamesClose").click(this, function (el) {
    closeMenuItem("#gamesView");
  });

  /*****************************/
  /* Join button click handler */
  /*****************************/
  $("#joinButton").click(this, function (el) {
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
  });

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
  $("#codeSubmit").click(this, function (el) {
    clearLists(); //Clear any lists in #selectView
    window.hist = ["#homeView"];
    $(".errorText").removeClass("shake"); //Stop shaking if started
    const js_options = {
      method: "POST",
      body: JSON.stringify({ code: $("#codeInput input").val() }),
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
    copyText($("#code").html());
  });

  /***********************************/
  /*         Share the code          */
  /*  This won't work without HTTPS  */
  /***********************************/

  document.getElementById("shareButton").addEventListener("click", async () => {
    var resultPara = "";
    var shareData =
      "Join my TidySquirrel session! Our code is " +
      document.getElementById("code").innerHTML;
    try {
      await navigator.share(shareData);
      resultPara.textContent = "MDN shared successfully";
      console.log(resultPara.textContent);
    } catch (err) {
      if (resultPara) {
        resultPara.textContent = "Error: " + err;
        console.log(resultPara.textContent);
      } else {
        console.log("didn't work");
      }
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

  function createSession(res) {
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
  }

  function joinSession(res) {
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
  }

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
/*                                                 */
/*               Universal Functions               */
/*                                                 */
/***************************************************/

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
            console.log(res);
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
      console.log(lres);
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
          $("#addGroupGamesInput").on("keyup", function (event) {
            // Number 13 is the "Enter" key on the keyboard
            if (event.keyCode === 13) {
              console.log("submitting new group game");
              event.preventDefault();
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
                    console.log(res);
                    if ((res.err = "added")) {
                      $("#addGroupGamesInput").css("color", "var(--main-red)");
                      $('input[game_id="' + res.game + '"]').each(function () {
                        $(this)
                          .parent()
                          .parent()
                          .parent()
                          .css("color", "var(--main-red)");
                      });
                      $("#addGroupGamesInput").addClass("shake");
                      window.setTimeout(function () {
                        $("#addGroupGamesInput").css(
                          "color",
                          "var(--main-black)"
                        );
                        $("#addGroupGamesInput").removeClass("shake");
                        $('input[game_id="' + res.game + '"]').each(
                          function () {
                            $(this)
                              .parent()
                              .parent()
                              .parent()
                              .css("color", "var(--main-black)");
                          }
                        );
                      }, 600);
                    }
                  } else {
                    $("#editGameList").append(res.status);
                    registerEGS();
                  }
                });
              });
            }
          });

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
                console.log(ures);
              });
            });
          });
        }, 10);
      }, 300);
    });
  });
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
function addListDisplay(theId, name, dest, toggle) {
  var listString =
    `<li id="` +
    theId +
    `">
      <div class="listName" onclick="listToggle(this.nextElementSibling)">` +
    name +
    `
    </div>
      <div class="listExpand" onclick="listToggle(this)">
          <ion-icon name="chevron-down-outline"></ion-icon>
      </div>`;
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
        console.log(res);
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

function gulp() {
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
        $("#selectLists").html(" ");
        addListDisplay(0, "All Games", "#selectLists", true);
        addListDisplay("games0", "All Games", "#gamesContainer", false);
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
            `<li id="games0` +
            res.lists.allGames[i]._id +
            `" onclick="showGameContext({id: 'games0` +
            res.lists.allGames[i]._id +
            `', name: '` +
            res.lists.allGames[i].name +
            `'})">` +
            res.lists.allGames[i].name +
            `</li>`;
          //Append the "All Games" list to the first <li>
          $("li#0").children(".listGames").first().append(htmlString);
          $("li#games0").children(".listGames").first().append(gameString);
          $("#gamesContextContainer").append(
            `<div class="contextActions off" id="context_stage_games0` +
              res.lists.allGames[i]._id +
              `">` +
              `<li onclick="contextCopy({id: 'games0` +
              res.lists.allGames[i]._id +
              `', name:'` +
              res.lists.allGames[i].name +
              `'}, this)">Copy</li>` +
              `<li onclick="contextRename({id: 'games0` +
              res.lists.allGames[i]._id +
              `', name:'` +
              res.lists.allGames[i].name +
              `'}, this)">Rename</li>` +
              `<li onclick="contextDelete({id: 'games0` +
              res.lists.allGames[i]._id +
              `', name:'` +
              res.lists.allGames[i].name +
              `'}, this)">Delete</li>`
          );
        }
        for (var i = 0; i < res.lists.custom.length; i++) {
          var curId = i + 1;
          addListDisplay(curId, res.lists.custom[i].name, "#selectLists", true);
          addListDisplay(
            "games" + curId,
            res.lists.custom[i].name,
            "#gamesContainer",
            false
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
            var gameString =
              `<li id="games` +
              curId +
              res.lists.custom[i].games[j]._id +
              `" onclick="showGameContext({id: 'games` +
              curId +
              res.lists.custom[i].games[j]._id +
              `', name: '` +
              res.lists.custom[i].games[j].name +
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
                id: "games" + curId + res.lists.custom[i].games[j]._id,
                name: res.lists.custom[i].games[j].name,
              })
            );
          }
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

/**
 * {Desc} Shows a menu view
 *
 * @param {*} view
 */
function showMenuItem(view) {
  $(view).removeClass("off");
  window.setTimeout(function () {
    $(view).css("transform", "translateY(0vh)");
  }, 10);
}

/**
 * {Desc} Closes a menu view
 *
 * @param {*} view
 */
function closeMenuItem(view) {
  $(view).css("transform", "translateY(var(--vh100))");
  window.setTimeout(function () {
    $(view).addClass("off");
  }, 600);
}

function showGameContext(game) {
  console.log("#context_" + game.id);
  console.log($("#context_" + game.id).length);
  if ($("#context_" + game.id).length == 0) {
    $("#context_stage_" + game.id)
      .clone(true)
      .prop("id", "context_" + game.id)
      .insertAfter($("#" + game.id));
    setTimeout(function () {
      hideOnClickOutside(
        "#context_" + game.id,
        "#context_" + game.id,
        "#" + game.id
      );
    }, 10);
    $("#context_" + game.id).removeClass("off");
  } else {
    console.log("already clicked");
  }
}

function contextMove(game, caller) {
  console.log("contextMove ", game);
  var lists = getMenuLists(caller);
  displaySubContext("Moving", game, lists, "moveToList");
}

function getMenuLists(caller) {
  var lists = [];
  $("#gamesContainer")
    .children()
    .children(".listName")
    .each(function () {
      lists.push({
        name: $(this).text().trim(),
        id: $(this).parent().attr("id"),
      });
    });
  var index = lists.findIndex(
    (obj) => obj.id == $(caller).parent().parent().parent().attr("id")
  );
  console.log({
    caller: caller,
    index: index,
    parent: $(caller).parent().parent().parent().attr("id"),
    lists: lists,
  });
  //Remove the origin list and All Games
  lists.splice(index, 1);
  if (index > 0) {
    lists.splice(0, 1);
  }
  return lists;
}

function closeSubContext(view) {
  closeMenuItem(view);
  $(view).remove();
}

function displaySubContext(text, game, items, fname) {
  var el =
    `<div class="subContextContainer"><div class="subContext" id="subContext_` +
    game.id +
    `">`;
  el +=
    `<div class="closeButton" id="subContextClose" onclick="$(this).parent().parent().remove()"><ion-icon name="close-outline"></div>` +
    `<div class="subContextTitle">` +
    text +
    ` ` +
    game.name +
    `</div><hr/>`;
  for (var i = 0; i < items.length; i++) {
    el +=
      `<li id="subContextGame_` +
      game.id +
      `" onclick="` +
      fname +
      `({toList: '` +
      items[i].id +
      `', game:'` +
      game.id +
      `', fromList: '` +
      $("#" + game.id)
        .parent()
        .parent()
        .attr("id") +
      `'})">` +
      items[i].name +
      `</li>`;
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
      game: options.game,
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
        $("#" + options.toList + " .listGames")
          .first()
          .append($("#" + options.game));
        $(".subContextContainer").each(function () {
          $(this).remove();
        });
      }
    });
  });
}

function contextCopy(game, caller) {
  var lists = getMenuLists(caller);
  displaySubContext("Copying", game, lists, "copyToList");
}

function copyToList(options) {
  const ctl_options = {
    method: "POST",
    body: JSON.stringify({
      code: document.getElementById("code").innerHTML,
      game: options.game,
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
        console.log("copied");
        $($("#" + options.game))
          .first()
          .clone(true)
          .appendTo("#" + options.toList + " .listGames");
        $(".subContextContainer").each(function () {
          $(this).remove();
        });
      }
    });
  });
}

function contextRename(game, caller) {}

function contextDelete(game, caller) {}

function hideOnClickOutside(selector, toHide, extraSelector) {
  const outsideClickListener = (event) => {
    console.log("listening", event);
    const $target = $(event.target);
    if (
      (!$target.closest(selector).length && $(selector).is(":visible")) ||
      $(extraSelector) == $target
    ) {
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
  console.log("dGC");
  var htmlString =
    `<div class="contextActions off" id="context_stage_` +
    contextObj.id +
    `">` +
    `<li onclick="contextMove({id: '` +
    contextObj.id +
    `', name:'` +
    contextObj.name +
    `'}, this)">Move</li>` +
    `<li onclick="contextCopy({id: '` +
    contextObj.id +
    `', name:'` +
    contextObj.name +
    `'}, this)">Copy</li>` +
    `<li onclick="contextRename({id: '` +
    contextObj.id +
    `', name:'` +
    contextObj.name +
    `'}, this)">Rename</li>` +
    `<li onclick="contextDelete({id: '` +
    contextObj.id +
    `', name:'` +
    contextObj.name +
    `'}, this)">Delete</li>` +
    `</div>`;
  return htmlString;
}

/**
 * {Desc} Takes the sessions object from /get_sessions and fills #sessionsContainer
 *
 * @param {Object} res
 */
function writeSessions(res) {
  htmlString = "";
  for (var i = 0; i < res.sessions.length; i++) {
    var usersplural = setPlural(res.sessions[i].users, " user, ", " users, ");
    var gamesplural = setPlural(res.sessions[i].games, " game", " games");
    htmlString +=
      `<li id="` +
      res.sessions[i].code +
      `" onclick="copyText('` +
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
function addGame(event, el) {
  // Number 13 is the "Enter" key on the keyboard
  if (event.keyCode === 13) {
    console.log("submitting new game");
    event.preventDefault();
    var game = $(el).val();
    const options = {
      method: "POST",
      body: JSON.stringify({ game: game }),
      headers: {
        "Content-Type": "application/json",
      },
    };
    //add_user_game_unsorted
    fetch("/game_add", options).then(function (response) {
      return response.json().then((res) => {
        if (!res.err) {
          console.log(res);
          //if (obj.err) {console.log('add_games err: ' + obj.err ); }

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
          gulp();
          recheckGreenLists();
        } else {
          console.log(res.err);
        }
      });
    });
  }
}

/**
 * Adds a list to a user
 *
 * @param {*} event
 */
function addList(event) {
  // Number 13 is the "Enter" key on the keyboard
  console.log("addList");
  if (event.keyCode === 13) {
    console.log("submitting new game");
    event.preventDefault();
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
              `">
          <div class="listName" onclick="listToggle(this.nextElementSibling)">` +
              list +
              `
              <ion-icon name="ellipsis-horizontal-outline" onclick="editList($(this).parent().parent().attr('id'))"></ion-icon></div>
          <div class="listExpand" onclick="listToggle(this)">
              <ion-icon name="chevron-down-outline"></ion-icon>
          </div>
          <div class="listGames off"></div>
        </li>`
          );
        }
      });
    });
  }
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
    if (count == $(ele).children(".listGames").first().children("li").length) {
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
  $("#selectCodeDisplay").html("Your Code: " + code);
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
  $("#copiedAlert").css({ opacity: 1, "z-index": 11 });
  const el = document.createElement("textarea");
  el.value = copy;
  document.body.appendChild(el);

  /* Select the text field */
  el.select();
  el.setSelectionRange(0, 99999); /*For mobile devices*/

  /* Copy the text inside the text field */
  document.execCommand("copy");
  document.body.removeChild(el);

  setTimeout(function () {
    $("#copiedAlert").css({ opacity: 0 });
    setTimeout(function () {
      $("#copiedAlert").css({ "z-index": 0 });
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
  htmlString += `<div class="button greenBtn" id="gameLock" type="submit">Lock Game List 🔒</div>`;
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
  htmlString += `</ul><div class="submitButton button greenBtn" id="voteButton">Submit Votes</div>`;
  console.log("The string: ", htmlString);
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
