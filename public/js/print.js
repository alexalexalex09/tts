function setupTemplatePrint(theCode) {
  ttsFetch("/get_template_info", { code: theCode }, (res) => {
    $("#printTemplate").html(res.template.name);
    $("#printURL").html("selectagame.net/t/" + res.template.templateCode);
    $("#printQR").html(
      `<img id="qrDisplay" style="content: url('data:image/png;base64,` +
        res.qr +
        `')"></img>`
    );
  });
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
  fetch(req, tts_options).then(function (response) {
    return response.json().then((res) => {
      if (res.err) {
        if (errorHandler) {
          errorHandler(res);
        } else {
          alert(res.err);
        }
      } else {
        handler(res);
      }
    });
  });
  return;
}

if (/^p\/([A-Z0-9]{6})$/.test(window.location.pathname.substr(1))) {
  setupTemplatePrint(window.location.pathname.substr(3));
} else {
  alert("Sorry, an error occurred");
}
