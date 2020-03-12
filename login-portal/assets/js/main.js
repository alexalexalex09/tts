//All DOM manipulation
window.addEventListener('load', function () {

    //Join button click handler
    document.getElementById('joinButton').addEventListener('click', function(el) {
        console.log('join click');
        $("#codeInputGroup").removeClass("off");
        window.setTimeout(function() {
            console.log('wait 1')
            $('#createButton').css({"opacity" : "0%"});
            $("#codeInputGroup").css({
                "opacity"   : "100%",
                "transform" : "translateY(0px)"
        });
            window.setTimeout(function () {
                console.log('wait 2')
                $("#createButton").addClass("off");
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
        $(this).parent().children('input').first().val('');
        console.log($(this).parent().children('input').first().val());
    });
});
