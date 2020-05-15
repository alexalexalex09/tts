//All DOM manipulation
window.addEventListener("load", function () {
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
    var dest = $("#backArrow").attr("data-gobackto");
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
        console.log(res);
        if (res.err) {
          window.setTimeout(function () {
            $(".errorText").removeClass("off").addClass("shake");
          }, 5);
          $("#createButton").css({
            transform: "translateY(14vh)",
          });
        } else {
          $("#backArrow").removeClass("off");
          $("#backArrow").attr("data-gobackto", "home");
          document.getElementById("code").innerHTML = res.code;
          document.getElementById("selectCodeDisplay").innerHTML =
            "Your Code: " + res.code;
          console.log("#" + res.lock);
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
  /*Game submit button handler */
  /*****************************/
  $("#gameSubmit").click(this, function () {
    console.log("hi");
    fetch("/pull").then(function (res) {
      $("#results").html(res);
    });
  });

  /*****************************/
  /*   Create Button Handler   */
  /*****************************/

  $("#createButton").click(this, function () {
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
        console.log(res);
        if (!res.err) {
          $("#backArrow").removeClass("off");
          $("#backArrow").attr("data-gobackto", "home");
          document.getElementById("code").innerHTML = res.status.code;
          document.getElementById("selectCodeDisplay").innerHTML =
            "Your Code: " + res.status.code;
          goForwardFrom("#homeView", "#codeView");
          history.pushState(
            { code: res.status.code, page: "code" },
            "",
            "#code"
          );
        }
      });
    });
  });

  /*****************************/
  /* Select button transition  */
  /*****************************/

  $("#selectButton").click(this, function () {
    $("#backArrow").attr("data-gobackto", "code");
    goForwardFrom("#codeView", "#selectView");
  });

  /*****************************/
  /*   Real Game list puller   */
  /*****************************/

  const gul_options = {
    method: "POST",
    body: "",
    headers: {
      "Content-Type": "application/json",
    },
  };
  fetch("/get_user_lists", gul_options).then(function (response) {
    return response.json().then((res) => {
      console.log(res);

      //console.log(typeof res);
      if (!res.err) {
        for (var i = 0; i < res.length; i++) {
          var htmlString =
            `<li id="` +
            i +
            `">
              <div class="listName">` +
            res[i] +
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
              <div class="listGames"></div>
            </li>`;
          $("#selectLists").append(htmlString);
        }
      } else {
        console.log("Error: no user");
      }
    });
  });

  /*****************************/
  /*  Get populated user lists */
  /*****************************/
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
        console.log(res);
        var htmlString = `` + `<list listid="0" name="All Games">`;
        for (var i = 0; i < res.allGames.length; i++) {
          htmlString +=
            `<game name="` +
            res.allGames[i].name +
            `" game_id="` +
            res.allGames[i]._id +
            `"rating="` +
            res.allGames[i].rating +
            `" owned="` +
            res.allGames[i].owned +
            `">` +
            res.allGames[i].name +
            `</game>`;
        }
        htmlString += "</list>";
        console.log("here's the object");
        console.log(res.custom);
        for (var i = 0; i < res.custom.length; i++) {
          htmlString +=
            `<list listid="` + (i + 1) + `" name="` + res.custom[i].name + `">`;
          for (var j = 0; j < res.custom[i].games.length; j++) {
            htmlString +=
              `<game name="` +
              res.custom[i].games[j].name +
              `" game_id="` +
              res.custom[i].games[j]._id +
              `" rating="` +
              res.custom[i].games[j].rating +
              `" owned="` +
              res.custom[i].games[j].owned +
              `">` +
              res.custom[i].games[j].name +
              `</game>`;
          }
          htmlString += `</list>`;
        }
        document.getElementById("listsContainer").innerHTML = htmlString;
      } else {
        console.log(res.err);
      }
    });
  });

  /*****************************/
  /*   All Game list puller (depr)   */
  /*****************************/

  $("#selectLists li .listExpand")
    .first()
    .click(this, function () {
      el = $("#selectLists li .listExpand").first();
      $(el).toggleClass("expanded");
      if ($(el).hasClass("expanded")) {
        var theid = $(el).parent().attr("id");
        console.log("the id: " + theid);
        const options = {
          method: "POST",
          body: JSON.stringify({ list: theid }),
          headers: {
            "Content-Type": "application/json",
          },
        };
        fetch("/get_user_all_games", options).then(function (response) {
          return response.json().then((obj) => {
            console.log("list_games" + obj);
            if (!obj.err) {
              for (var i = 0; i < obj.length; i++) {
                var htmlString =
                  `
                                <li>
                                    <div class="gameName" id=` +
                  obj[i].game_id +
                  `>` +
                  obj[i].game_name +
                  `
                                    </div>
                                    <div class='toggle'>
                                        <label class="switch">
                                            <input type="checkbox" onclick = "toggleFont(this)" id=` +
                  obj[i].game_id +
                  `>
                                            <span class="slider round"></span>
                                        </label>
                                    </div>
                                </li>`;
                $(el)
                  .parent()
                  .children(".listGames")
                  .first()
                  .prepend(htmlString);
              }
            } else {
              console.log("list_games err: " + obj.err);
            }
          });
        });
      } else {
        $(el).parent().children(".listGames").first().empty();
      }
    });

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
        return response.text().then((obj) => {
          console.log(obj);
          console.log(obj.insertId);
          //if (obj.err) {console.log('add_games err: ' + obj.err ); }
        });
      });
    }
  });
});
//End all DOM manipulation

/***************************************************/
/*               Universal Functions               */
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
  $(to).css({ transform: "translateX(-200vw)" });
  $(to).removeClass("off");
  window.setTimeout(function () {
    $(to).css({ transform: "translateX(0vw)" });
    $(from).css({ transform: "translateX(200vw)" });
  }, 100);
  window.setTimeout(function () {
    $(from).addClass("off");
  }, 1000);
}

/***********************************/
/* Change Font color of game names */
/* and handle category checking    */
/***********************************/
function toggleFont(check) {
  var el = $(check).parent().parent().parent().children(".gameName").first();
  var gamesToAdd = [];
  var gamesToRemove = [];
  if (el.length > 0) {
    if ($(check).is(":checked")) {
      el.addClass("greenText");
      gamesToAdd.push($(check).attr("id"));
    } else {
      el.removeClass("greenText");
      gamesToRemove.push($(check).attr("id"));
    }
  } else {
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
          gamesToAdd.push($(this).children(".gameName").attr("id"));
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
          gamesToRemove.push($(this).children(".gameName").attr("id"));
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
  const adts_options = {
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
  fetch("/add_game_to_session", adts_options).then(function (response) {
    return response.json().then((res) => {
      if (!res.err) {
        console.log(res);
      } else {
        console.log(res.err);
      }
    });
  });
}

/*****************************/
/*        listToggle(el)       */
/*****************************/
/**
 * {Display or remove a particular list of games in the select view}
 *
 * @param {*} el
 */
function listToggle(el) {
  $(el).toggleClass("expanded");
  if ($(el).hasClass("expanded")) {
    var theid = $(el).parent().attr("id");
    console.log("the id: " + theid);

    $("[listid=" + theid + "]")
      .children()
      .each(function (i, e) {
        var htmlString =
          `
        <li>
            <div class="gameName" id=` +
          e.getAttribute("game_id") +
          `>` +
          e.getAttribute("name") +
          `
            </div>
            <div class='toggle'>
                <label class="switch">
                    <input type="checkbox" onclick="toggleFont(this)" id=` +
          e.getAttribute("game_id") +
          `>
                    <span class="slider round"></span>
                </label>
            </div>
        </li>`;
        $(el).parent().children(".listGames").first().prepend(htmlString);
      });
  } else {
    $(el).parent().children(".listGames").first().empty();
  }
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

/*****************************/
/*    Testing for homework   */
/*****************************/
/*$('#gamenum').on("input", function() {
        var gameInput = document.getElementById("gamenum").value;

        if(gameInput) {
            const game = {
                id: gameInput
            };

            const options = {
                method: 'POST',
                body: JSON.stringify(game),
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
            fetch('/logindata', options)
                .then(function(response) {
                    return response.text().then(function(text) {
                        document.getElementById("results").innerHTML = text;
                    });
                })
                .catch( function(err) {
                    //console.log("error: "+err)
                });
        }

    });
    */
