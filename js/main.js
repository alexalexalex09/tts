window.addEventListener('load', function () {

    $('#mainView').after(`
    <div id="codeView" class="main">
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
        <div class="createButton button greyBtn">Create</div>
    </div>
    `); 


});