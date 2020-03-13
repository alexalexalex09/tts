//All DOM manipulation
window.addEventListener('load', function () {

    //Join button click handler
    document.getElementById('joinButton').addEventListener('click', function(el) {
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

    //Menu toggle
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

    //Text input clear button handler
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

    //Submit button handler
    $('#codeSubmit').click(this, function(el) {
        $('.errorText').removeClass('shake')
        window.setTimeout(function () {
            $('.errorText').removeClass('off').addClass('shake');
        }, 5);
        $('#createButton').css({
            "transform" : "translateY(14vh)"
        });

    });


});
//End all DOM manipulation