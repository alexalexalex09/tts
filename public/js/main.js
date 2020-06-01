//All DOM manipulation
window.addEventListener("load", function () {
  /*****************************/
  /*      Socket.io logic      */
  /*****************************/
  var socket = io();

  socket.on("hello", (data) => {
    console.log(data.msg);
  });

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

  /*****************************/
  /*     Back arrow handler    */
  /*****************************/
  $("#backArrow").click(this, function (el) {
    //Going to have to notify the server so that the owner of a session
    //can know that someone went back to a previous step

    var dest = $("#backArrow").attr("data-gobackto");

    const gb_options = {
      method: "POST",
      body: JSON.stringify({ dest: dest }),
      headers: {
        "Content-Type": "application/json",
      },
    };
    fetch("/going_back", gb_options);

    goBackFrom(
      window.hist[window.hist.length - 1],
      window.hist[window.hist.length - 2]
    );
    /*
    if (!$("#codeView").hasClass("off")) {
      $("#backArrow").addClass("off");
      goBackFrom("#codeView", "#homeView");
      return;
    }
    if (!$("#selectView").hasClass("off")) {
      if (dest == "code") {
        goBackFrom("#selectView", "#codeView");
      }
      if (dest == "home") {
        goBackFrom("#selectView", "#homeView");
      }
      return;
    }
    if (!$("#postSelectView").hasClass("off")) {
      if (dest == "select") {
        goBackFrom("#postSelectView", "#selectView");
      }
    }*/
  });

  /*****************************/
  /* Join button click handler */
  /*****************************/
  $("#joinButton").click(this, function (el) {
    console.log("join click");
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
  /*         Menu toggle       */
  /*****************************/
  function closeMenu() {
    $("#menu").css("transform", "translateX(-60vh)");
    $("#menuCatch").addClass("off");
    window.setTimeout(function () {
      $("#menu").addClass("off");
    }, 550);
  }
  $("#menuClose").on("click", closeMenu);
  $("#menuCatch").on("click", closeMenu);
  $("#menuIcon").click(this, function (el) {
    $("#menu").removeClass("off");
    $("#menuCatch").removeClass("off");
    window.setTimeout(function () {
      $("#menu").css("transform", "translateX(0vh)");
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
  /*   Submit button handler   */
  /*****************************/
  $("#codeSubmit").click(this, function (el) {
    //TODO: Erase all previously added games
    $(".errorText").removeClass("shake");
    $("#backArrow").removeClass("off");
    var theCode = $("#codeInput input").val();
    const cs_options = {
      method: "POST",
      body: JSON.stringify({ code: theCode }),
      headers: {
        "Content-Type": "application/json",
      },
    };
    fetch("/join_session", cs_options).then(function (response) {
      return response.json().then((res) => {
        console.log("join session ", res);
        if (res.err) {
          window.setTimeout(function () {
            $(".errorText").removeClass("off").addClass("shake");
          }, 5);
          $("#createButton").css({
            transform: "translateY(14vh)",
          });
        } else {
          $("#backArrow").removeClass("off");
          //$("#backArrow").attr("data-gobackto", "home");
          document.getElementById("code").innerHTML = res.code;
          document.getElementById("selectCodeDisplay").innerHTML =
            "Your Code: " + res.code;
          console.log("#" + res.lock);
          var sessionGames = "<session>";
          for (var i = 0; i < res.games.length; i++) {
            sessionGames +=
              '<sessionGame id="' + res.games[i].game + '"></sessionGame>';
          }
          document.getElementById("sessionContainer").innerHTML = sessionGames;
          console.log("initGreenLists");
          initGreenLists();
          goForwardFrom("#homeView", "#" + res.lock);
          history.pushState(
            { code: res.code, page: "select", last: "home" },
            "",
            "#select"
          );
        }
      });
    });
  });

  /***********************************/
  /*   Copy the code to clipboard    */
  /***********************************/
  $("#copyButton").on("click", function () {
    $("#copiedAlert").css({ opacity: 1 });
    var copyText = document.getElementById("code").innerHTML;
    const el = document.createElement("textarea");
    el.value = copyText;
    document.body.appendChild(el);

    /* Select the text field */
    el.select();
    el.setSelectionRange(0, 99999); /*For mobile devices*/

    /* Copy the text inside the text field */
    document.execCommand("copy");
    document.body.removeChild(el);

    window.setTimeout(function () {
      $("#copiedAlert").css({ opacity: 0 });
    }, 1000);
  });

  /***********************************/
  /*         Share the code          */
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
  /*   Create Button Handler   */
  /*****************************/

  $("#createButton").click(this, function () {
    //TODO: Erase all previously added games
    console.log("create");
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
          socket.on(res.status.code, (data) => {
            console.log("received special event ", data);
            htmlString = "";
            var connecting = "";
            var plural = "s";
            //TODO: This doesn't work if it's only been initialized, because
            //if another user adds a game, it erases all other users who haven't
            //added a game since it initialized. Their games haven't been added
            //to that numGames object. Maybe this should send the current list of
            //users+games as a guarantee, or only update what it receives
            $.each(data, function (key, value) {
              value > 0
                ? (connecting = "selecting")
                : (connecting = "connecting");
              value == 1 ? (plural = "") : (plural = "s");
              htmlString +=
                `<div class="conUser ` +
                connecting +
                `">User ` +
                key +
                ` has selected ` +
                value +
                ` game` +
                plural +
                `...</div>`;
            });
            $("#postSelectContainer").html(htmlString);
          });
          $("#backArrow").removeClass("off");
          //$("#backArrow").attr("data-gobackto", "home");
          document.getElementById("code").innerHTML = res.status.code;
          document.getElementById("selectCodeDisplay").innerHTML =
            "Your Code: " + res.status.code;
          goForwardFrom("#homeView", "#codeView");
          history.pushState(
            { code: res.status.code, page: "code" },
            "",
            "#code"
          );
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
      });
    });
  });

  /*****************************/
  /* Select button transition  */
  /*****************************/

  $("#selectButton").click(this, function () {
    //$("#backArrow").attr("data-gobackto", "code");
    goForwardFrom("#codeView", "#selectView");
  });

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
          addListDisplay(0, "All Games");
          for (var i = 0; i < res.allGames.length; i++) {
            var curSession = document.getElementsByTagName("session")[0];
            var checked = "";
            var greenText = "";
            $(curSession)
              .children()
              .each(function (ind, el) {
                if ($(el).attr("id") == res.allGames[i]._id.toString()) {
                  checked = " checked";
                  greenText = " greenText";
                }
              });
            var htmlString =
              `
            <li>
                <div rating="` +
              res.allGames[i].rating +
              `" owned="` +
              res.allGames[i].owned +
              `" class="gameName` +
              greenText +
              `" game_id="` +
              res.allGames[i]._id +
              `">` +
              res.allGames[i].name +
              `
                </div>
                <div class='toggle'>
                    <label class="switch">
                        <input type="checkbox"` +
              checked +
              ` onclick="toggleFont(this)" game_id="` +
              res.allGames[i]._id +
              `">
                        <span class="slider round"></span>
                    </label>
                </div>
            </li>`;
            $("li#0").children(".listGames").first().append(htmlString);
          }
          for (var i = 0; i < res.custom.length; i++) {
            var curId = i + 1;
            addListDisplay(curId, res.custom[i].name);
            for (var j = 0; j < res.custom[i].games.length; j++) {
              var htmlString =
                `
            <li>
              <div rating="` +
                res.custom[i].games[j].rating +
                `" owned="` +
                res.custom[i].games[j].owned +
                `" class="gameName` +
                greenText +
                `" game_id="` +
                res.custom[i].games[j]._id +
                `">` +
                res.custom[i].games[j].name +
                `
              </div>
              <div class='toggle'>
                  <label class="switch">
                      <input type="checkbox"` +
                checked +
                ` onclick="toggleFont(this)" game_id="` +
                res.custom[i].games[j]._id +
                `">
                      <span class="slider round"></span>
                  </label>
              </div>
            </li>`;
              $("li#" + curId)
                .children(".listGames")
                .first()
                .append(htmlString);
            }
          }
          document.getElementById("listsContainer").innerHTML = htmlString;
        } else {
          console.log(res.err);
        }
      });
    });
  }
  gulp();

  /*****************************/
  /*    Unsorted Game Adder    */
  /*****************************/
  //Add a game to the unsorted list
  //Used in the select view
  var addGamesInput = document.getElementById("addGamesInput");

  addGamesInput.addEventListener("keyup", function (event) {
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13) {
      console.log("submitting new game");
      event.preventDefault();
      var game = addGamesInput.value;
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
          } else {
            console.log(res.err);
          }
        });
      });
    }
  });

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
});

//End all DOM manipulation

/***************************************************/
/*                                                 */
/*               Universal Functions               */
/*                                                 */
/***************************************************/

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
  //console.log("going forward from " + from + " to " + to);
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
  }, 1000);
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
  //console.log("going back from " + from + " to " + to);
  window.hist.pop();
  $("#backArrow").attr("data-gobackto", window.hist[window.hist.length - 2]);
  $(to).css({ transform: "translateX(-200vw)" });
  $(to).removeClass("off");
  if (to == "#homeView") {
    $("#backArrow").addClass("off");
  }
  window.setTimeout(function () {
    $(to).css({ transform: "translateX(0vw)" });
    $(from).css({ transform: "translateX(200vw)" });
  }, 100);
  window.setTimeout(function () {
    $(from).addClass("off");
  }, 1000);
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
function addListDisplay(theId, name) {
  var listString =
    `<li id="` +
    theId +
    `">
      <div class="listName">` +
    name +
    `
      </div>
      <div class="listExpand" onclick="listToggle(this)">
          <ion-icon name="chevron-down-outline"></ion-icon>
      </div>
      <div class='toggle' >
          <label class="switch">
              <input type="checkbox" onclick="toggleFont(this)">
              <span class="slider round"></span>
          </label>
      </div>
      <div class="listGames off"></div>
    </li>`;
  $("#selectLists").append(listString);
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
          $(e)
            .children(".toggle")
            .children(".switch")
            .children("input")
            .prop("checked", true);
          $(e).children(".gameName").first().addClass("greenText");
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

function makeGreen(id) {
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
function unMakeGreen(id) {
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

function toggleFont(check) {
  var el = $(check).parent().parent().parent().children(".gameName").first();
  var gamesToAdd = [];
  var gamesToRemove = [];
  if (el.length > 0) {
    if ($(check).is(":checked")) {
      el.addClass("greenText");
      gamesToAdd.push($(check).attr("game_id"));
      makeGreen($(check).attr("game_id"));
    } else {
      el.removeClass("greenText");
      gamesToRemove.push($(check).attr("game_id"));
      unMakeGreen($(check).attr("game_id"));
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
          makeGreen($(this).children(".gameName").attr("game_id"));
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
          unMakeGreen($(this).children(".gameName").attr("game_id"));
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
 * {Display or remove a particular list of games in the select view}
 *
 * @param {*} el
 */
function listToggle(el) {
  $(el).toggleClass("expanded");
  $(el).parent().children(".listGames").first().toggleClass("off");
}

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
