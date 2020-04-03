//All DOM manipulation
window.addEventListener('load', function () {

    /*****************************/
    /* Join button click handler */
    /*****************************/
    $('#joinButton').click(this, function(el) {
        console.log('join click');
        $("#codeInputGroup").removeClass("off");
        window.setTimeout(function() {
            console.log('wait 1')
            $('#joinButton').css({
                "opacity" : "0%",
                "transform" : "translateX(100vw)"
            });
            $("#codeInputGroup").css({
                "opacity"   : "100%",
                "transform" : "translateX(0px)"
            });
            $("#createButton").css({
                "transform" : "translateY(12vh)"
            });
            window.setTimeout(function () {
                console.log('wait 2')
                $("#joinButton").addClass("off");
            }, 600);
        }, 10);
    });

    /*****************************/
    /*         Menu toggle       */
    /*****************************/
    function closeMenu () {
        $('#menu').css('transform','translateX(-60vh)');
        $('#menuCatch').addClass('off');
        window.setTimeout(function () {
            $('#menu').addClass('off');
        }, 550);
    }
    $('#menuClose').on( "click", closeMenu);
    $('#menuCatch').on( "click", closeMenu);
    $('#menuIcon').click(this, function(el) {
        $('#menu').removeClass('off');
        $('#menuCatch').removeClass('off');
        window.setTimeout(function () {
            $('#menu').css('transform','translateX(0vh)');
        }, 10);
    });

    /*****************************/
    /*  Text input clear button  */
    /*****************************/
    $('.textClear').click(this, function(el) {
        if ($(this).parent().children('input').first().val() == '') {
            $("#joinButton").removeClass("off");
            window.setTimeout(function() {
                console.log('wait 1')
                $('#joinButton').css({
                    "opacity" : "100%",
                    "transform" : "translateX(0vw)"
                });
                $("#codeInputGroup").css({
                    "opacity"   : "0%",
                    "transform" : "translateX(-100vw)"
                });
                $("#createButton").css({
                    "transform" : "translateY(0vh)"
                });
                window.setTimeout(function () {
                    console.log('wait 2')
                    $("#codeInputGroup").addClass("off");
                    $('.errorText').addClass("off");
                }, 600);
            }, 10);
        } else {
            $(this).parent().children('input').first().val('');
            console.log($(this).parent().children('input').first().val());
        }
    });

    /*****************************/
    /*   Submit button handler   */
    /*****************************/
    $('#codeSubmit').click(this, function(el) {
        $('.errorText').removeClass('shake')
        window.setTimeout(function () {
            $('.errorText').removeClass('off').addClass('shake');
        }, 5);
        $('#createButton').css({
            "transform" : "translateY(14vh)"
        });

    });

    /*****************************/
    /*      Set font sizes       */
    /*****************************/
    function cFont (e) {
        var iH = window.innerHeight;
        var iW = window.innerWidth;
        var fS = ( (iW / (100/e.data.fWidth) ) > (iH / (100/e.data.fHeight) ) ) ? e.data.fHeight+'vh' : e.data.fWidth+'vw';
        $(e.data.el).css('font-size', fS);
        console.log('width: '+iW / (100/e.data.fWidth)+', height: '+iH / (100/e.data.fHeight)+', result: '+fS);
    }
    $(window).on("resize", {el: ".pageTitle", mHeight: "10", mWidth: "10", fHeight: '8', fWidth: '10'}, cFont);
    cFont({data: {el: '.pageTitle', mHeight: '10', mWidth: '10', fHeight: '8', fWidth: '10'}});
    $(window).on("resize", {el: ".login", mHeight: '10', mWidth: '10', fHeight: "4", fWidth: "6"}, cFont);
    cFont({data: {el: '.login', mHeight: '10', mWidth: '10', fHeight: '4', fWidth: '6'}});
    $(window).on("resize", {el: "#addGamesTitle", mHeight: '10', mWidth: '10', fHeight: "4", fWidth: "6"}, cFont);
    cFont({data: {el: '#addGamesTitle', mHeight: '10', mWidth: '10', fHeight: '4', fWidth: '6'}});

    /***********************************/
    /* Change Font color of game names */
    /***********************************/
    $('input[type="checkbox"]').on("click", function() {
        var el = $(this).parent().parent().parent().children('.gameName').first();
        if ($(this).is(':checked')) {
            el.css('color', "var('--main-green')");
        } else {
            el.css('color', "var('--main-black')");
        }
        console.log()
    });

    /*****************************/
    /*Game submit button handler */
    /*****************************/
    $('.button').click(this, function() {
        console.log('hi');
        fetch('/pull').then(function(res) {$('#results').html(res)});
    });
    
    /*****************************/
    /*      Game list puller     */
    /*****************************/
    /*
    //test variable
    const game = {
        id: 2
    };

    const options = {
        method: 'POST',
        body: JSON.stringify(game),
        headers: {
            'Content-Type': 'application/json'
        }
    };
    fetch('/getgames', options)
        .then(function(response) {
            return response.json().then( text => {
                console.log(text);
                console.log(typeof text);
                for (var i=0; i<text.length; i++) {
                    var htmlString = `
                        <li>
                            <div class="gamename">`
                                +text[i].list_name+`
                            </div>
                            <div class='toggle'>
                                <label class="switch">
                                    <input type="checkbox" id=`+text[i].list_id+`>
                                    <span class="slider round"></span>
                                </label>
                            </div>
                        </li>`;
                    $('#lists').append(htmlString);
                    console.log(text[i]);
                }
            });
        })
        .catch(function(err) {
            console.log(err);
        })
*/
    /*****************************/
    /*   Real Game list puller   */
    /*****************************/
    

    const options = {
        method: 'POST',
        body: '',
        headers: {
            'Content-Type': 'application/json'
        }
    };
    fetch('/getuser', options)
        .then(function(response) {
            return response.json().then( obj => {
                console.log(obj);
                console.log(typeof obj);
                for (var i=0; i<obj.length; i++) {
                    var htmlString = `
                        <li>
                            <div class="gamename">`
                                +obj[i].list_name+`
                            </div>
                            <div class='toggle'>
                                <label class="switch">
                                    <input type="checkbox" id=`+obj[i].list_id+`>
                                    <span class="slider round"></span>
                                </label>
                            </div>
                        </li>`;
                    $('#lists').append(htmlString);
                }
            });
        })
        //.catch(function(err) {
          //  console.log(err);
        //});



});
//End all DOM manipulation
/*[
    {
        "list_id":1,
        "list_name":"Strategy",
        "list_user_id":"<00u3agmkuCgKnKBbz4x6>"
    },
    {
        "list_id":3,
        "list_name":"More than 4 players",
        "list_user_id":"<00u3agmkuCgKnKBbz4x6>"
    }
]*/







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