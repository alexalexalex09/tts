window.addEventListener('load', function () {

    /*$('#mainView').after(`
    <div id="codeView" class="main off">
        <div class="menu">
        <svg viewBox="0 0 100 80" width="30" height="30">
            <rect width="100" height="15" rx="8"></rect>
            <rect y="30" width="100" height="15" rx="8"></rect>
            <rect y="60" width="100" height="15" rx="8"></rect>
        </svg>
        </div>
        <div class="login">Login</div>
        <div class="siteTitle">The Tidy Squirrel 🐿️</div>
        <div class="joinButton button blueBtn">Join</div>
        <div id="codeForm" class="form">
            <div id="cfTitle" class="inputTitle">Enter Code</div>
            <div id="codeInput" class="textInput"></div>
            <div id="codeSubmit" class="submitButton button greyBtn">Submit</div>
        </div>
    </div>
    `);*/

    document.getElementById('joinButton').addEventListener('click', function(el) {
        console.log('join click');
        $("#codeInputGroup").removeClass("off");
        window.setTimeout(function() {
            console.log('wait 1')
            $('#createButton').css("opacity", "0%");
            $("#codeInputGroup").css("opacity", "100%");
            window.setTimeout(function () {
                console.log('wait 2')
                $("#createButton").addClass("off");
            }, 1100);
        }, 10);
    });
});



/*window.addEventListener('click', function(el) {
    console.log("login");
    $("#mainView").css("opacity", "0%");
    $("#codeView").css("opacity", "0%");
    this.setTimeout(function () {
        $("#mainView").addClass("off");
        $("#codeView").removeClass("off");
        this.setTimeout(function() {
            $("#codeView").css("opacity", "100%");
        }, 10);
    }, 600);
    
});*/